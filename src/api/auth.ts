import { apiClient } from './client';

const TOKEN_KEY = 'project_hub_access_token';
const LEGACY_TOKEN_KEYS = ['access_token', 'token'];

export interface ProjectHubUser {
  id: string;
  cognito_sub: string | null;
  email: string;
  full_name: string | null;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  department: string;
  company: string;
  phone: string;
  photo_url: string;
  is_active: boolean;
  /** Can create accounts and manage users in any account. */
  is_platform_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

export const mapUserResponse = (payload: unknown): ProjectHubUser => {
  if (!isRecord(payload) || payload.id === undefined || payload.email === undefined) {
    throw new Error('Project Hub user response was not in the expected format.');
  }

  const fullName = nullableString(payload.full_name);

  return {
    id: String(payload.id),
    cognito_sub: nullableString(payload.cognito_sub),
    email: String(payload.email),
    full_name: fullName,
    name: fullName || String(payload.email),
    first_name: nullableString(payload.first_name) ?? '',
    last_name: nullableString(payload.last_name) ?? '',
    title: nullableString(payload.title) ?? '',
    department: nullableString(payload.department) ?? '',
    company: nullableString(payload.company) ?? '',
    phone: nullableString(payload.phone) ?? '',
    photo_url: nullableString(payload.photo_url) ?? '',
    is_active: Boolean(payload.is_active),
    is_platform_admin: Boolean(payload.is_platform_admin),
    created_at: nullableString(payload.created_at) ?? undefined,
    updated_at: nullableString(payload.updated_at) ?? undefined,
  };
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY) || LEGACY_TOKEN_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) || null;
};

export const setAuthToken = (token: string) => {
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  LEGACY_TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

const PROFILE_FIELDS = ['first_name', 'last_name', 'title', 'department', 'company', 'phone'] as const;

export const authApi = {
  getCurrentUser: async () => mapUserResponse(await apiClient.get('/api/v1/me')),
  /** Trade the hosted-login code for a session cookie set by the API. */
  createSession: async (data: { code: string; codeVerifier: string; redirectUri: string }) =>
    mapUserResponse(await apiClient.post('/api/v1/auth/session', {
      code: data.code,
      code_verifier: data.codeVerifier,
      redirect_uri: data.redirectUri,
    }, { skipAuthRetry: true })),
  /** Clear the session cookies and revoke the refresh token. */
  endSession: () => apiClient.post('/api/v1/auth/logout', undefined, { skipAuthRetry: true }),
  updateMe: async (data: Record<string, unknown>) => {
    const payload = Object.fromEntries(
      PROFILE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field] || null])
    );
    return mapUserResponse(await apiClient.patch('/api/v1/me', payload));
  },
  /** Upload a profile photo straight to S3; returns the refreshed user (with a signed photo_url). */
  uploadPhoto: async (file: File) => {
    const presigned = await apiClient.post<Record<string, any>>('/api/v1/me/photo/presigned-upload', {
      file_name: file.name,
      content_type: file.type || null,
      size_bytes: file.size || null,
    });
    const response = await fetch(presigned.upload_url, { method: presigned.method || 'PUT', headers: presigned.headers || {}, body: file });
    if (!response.ok) throw new Error(`Photo upload failed (${response.status}).`);
    return mapUserResponse(await apiClient.get('/api/v1/me'));
  },
};