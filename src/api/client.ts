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

export const getBearerToken = (): string | null => {
  if (typeof window === 'undefined') return null;
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
  const token = getBearerToken();
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path, query), {
    ...requestOptions,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

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