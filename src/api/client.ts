import { isCognitoMode } from '@/lib/cognitoSession';

/** Fired when the session can't be renewed; the auth provider sends the user to sign in. */
export const AUTH_EXPIRED_EVENT = 'project-hub:auth-expired';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[] | unknown>;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  query?: QueryParams;
  body?: unknown;
  /** Internal: skip the refresh-and-retry on 401 (used by the auth endpoints themselves). */
  skipAuthRetry?: boolean;
  /** Background request (e.g. polling): don't show the global loading indicator. */
  silent?: boolean;
}

export class ProjectHubApiError extends Error {
  status: number;
  data: unknown;
  /** The API's machine-readable code, e.g. TOKEN_EXPIRED, USER_DISABLED. */
  code: string | null;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ProjectHubApiError';
    this.status = status;
    this.data = data;
    this.code = typeof data === 'object' && data && 'error_code' in data ? String((data as { error_code: unknown }).error_code) : null;
  }
}

/** The API could not be reached at all (offline, DNS, server down, CORS). */
export class ProjectHubNetworkError extends Error {
  constructor(cause: unknown) {
    super('Project Hub could not be reached. Check your connection and try again.');
    this.name = 'ProjectHubNetworkError';
    this.cause = cause;
  }
}

// Same-origin by default ("" -> /api/...), which keeps the SameSite=Strict session cookie flowing.
const API_BASE_URL = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const AUTH_TOKEN_KEYS = ['project_hub_access_token', 'access_token', 'token'];
const SESSION_RENEWABLE_CODES = new Set(['TOKEN_EXPIRED', 'AUTH_REQUIRED', 'TOKEN_INVALID']);

/** Local mode only: a manually stored dev token, if any (the API's local auth needs none). */
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined' || isCognitoMode()) return null;
  for (const key of AUTH_TOKEN_KEYS) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

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

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const errorMessage = (body: unknown, response: Response) => {
  if (typeof body === 'object' && body) {
    const record = body as { message?: unknown; detail?: unknown };
    if (typeof record.message === 'string' && record.message) return record.message;
    if (typeof record.detail === 'string' && record.detail) return record.detail;
  }
  return response.statusText || 'Project Hub API request failed';
};

const rawFetch = async (path: string, init: RequestInit & { query?: QueryParams }) => {
  const { query, ...rest } = init;
  const headers = new Headers(rest.headers);
  // Required by the API for cookie-authenticated writes (CSRF defence alongside SameSite=Strict).
  headers.set('X-Requested-With', 'XMLHttpRequest');
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    return await fetch(buildUrl(path, query), { ...rest, headers, credentials: 'include' });
  } catch (error) {
    throw new ProjectHubNetworkError(error);
  }
};

let refreshInFlight: Promise<boolean> | null = null;

/** Renew the session cookie once, shared by every request that hit an expired session. */
export const refreshSession = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = rawFetch('/api/v1/auth/refresh', { method: 'POST' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

/** In-flight request counts, split into reads (GET) and writes, for the global loading indicator. */
export type ApiActivity = { reads: number; writes: number };
let apiActivity: ApiActivity = { reads: 0, writes: 0 };
const apiActivityListeners = new Set<() => void>();

export const getApiActivity = (): ApiActivity => apiActivity;
export const subscribeApiActivity = (listener: () => void) => {
  apiActivityListeners.add(listener);
  return () => { apiActivityListeners.delete(listener); };
};
const trackApiActivity = (kind: keyof ApiActivity, delta: number) => {
  apiActivity = { ...apiActivity, [kind]: Math.max(0, apiActivity[kind] + delta) };
  apiActivityListeners.forEach((listener) => listener());
};

export const apiRequest = async <T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  if (options.silent) return sendApiRequest<T>(path, options);
  const kind: keyof ApiActivity = (options.method || 'GET').toUpperCase() === 'GET' ? 'reads' : 'writes';
  trackApiActivity(kind, 1);
  try {
    return await sendApiRequest<T>(path, options);
  } finally {
    trackApiActivity(kind, -1);
  }
};

const sendApiRequest = async <T>(path: string, options: ApiRequestOptions): Promise<T> => {
  const { query, body, headers, skipAuthRetry, silent: _silent, ...requestOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const send = () => {
    const requestHeaders = new Headers(headers);
    if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    return rawFetch(path, {
      ...requestOptions,
      query,
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  };

  let response = await send();
  let responseBody = await parseResponseBody(response);

  if (response.status === 401 && isCognitoMode() && !skipAuthRetry) {
    const code = new ProjectHubApiError('', 401, responseBody).code;
    if (code && SESSION_RENEWABLE_CODES.has(code) && await refreshSession()) {
      response = await send();
      responseBody = await parseResponseBody(response);
    }
    if (response.status === 401) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    throw new ProjectHubApiError(errorMessage(responseBody, response), response.status, responseBody);
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
