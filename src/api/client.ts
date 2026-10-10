import { clearSession, getIdToken, isCognitoMode } from '@/lib/cognitoSession';

/** Fired when the API rejects the session; the auth provider sends the user to sign in. */
export const AUTH_EXPIRED_EVENT = 'project-hub:auth-expired';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[] | unknown>;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  query?: QueryParams;
  body?: unknown;
}

export class ProjectHubApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ProjectHubApiError';
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const AUTH_TOKEN_KEYS = ['project_hub_access_token', 'access_token', 'token'];

/** Local mode: a manually stored dev token, if any (the API's local auth needs none). */
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  for (const key of AUTH_TOKEN_KEYS) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

export const getBearerToken = async (forceRefresh = false): Promise<string | null> =>
  isCognitoMode() ? getIdToken(forceRefresh) : getStoredToken();

const appendQueryParams = (url: URL, query?: QueryParams) => {
  if (!query) return;

  Object.entries(query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item === null || item === undefined || item === '') return;
      url.searchParams.append(key, String(item));
    });
  });
};

const buildUrl = (path: string, query?: QueryParams): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`, origin);
  appendQueryParams(url, query);
  return url.toString();
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiRequest = async <T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { query, body, headers, ...requestOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const send = async (forceRefresh: boolean) => {
    const token = await getBearerToken(forceRefresh);
    const requestHeaders = new Headers(headers);
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
    if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    return fetch(buildUrl(path, query), {
      ...requestOptions,
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  };

  let response = await send(false);
  if (response.status === 401 && isCognitoMode()) {
    // The token may have been revoked or expired early: refresh once, then ask the user to sign in.
    response = await send(true);
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      typeof responseBody === 'object' && responseBody && 'detail' in responseBody
        ? String((responseBody as { detail?: unknown }).detail)
        : response.statusText || 'Project Hub API request failed';
    throw new ProjectHubApiError(message, response.status, responseBody);
  }

  return responseBody as T;
};

export const apiClient = {
  get: <T = unknown>(path: string, query?: QueryParams, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET', query }),
  post: <T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE', body }),
};