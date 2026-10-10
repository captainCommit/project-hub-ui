import { apiClient } from './client';

const TOKEN_KEY = 'project_hub_access_token';
const LEGACY_TOKEN_KEYS = ['access_token', 'token'];

export interface ProjectHubUser {
  id: string;
  cognito_sub: string | null;
  email: string;
  full_name: string | null;
  name: string;
  is_active: boolean;
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
    is_active: Boolean(payload.is_active),
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

export const authApi = {
  getCurrentUser: async () => mapUserResponse(await apiClient.get('/api/v1/me')),
};