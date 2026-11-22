import { apiClient } from './client';

// Account > Recently deleted: deleted portfolios, programs and projects kept for 30 days.
// The API uses PORTFOLIO / PROGRAM / PROJECT; the UI uses lower-case types like everywhere else.

type ApiRecord = Record<string, any>;

export type DeletedItem = {
  id: string;
  type: 'portfolio' | 'program' | 'project';
  entity_id: string;
  name: string;
  description: string;
  location: string;
  project_count: number;
  deleted_at: string;
  deleted_by_name: string;
  expires_at: string;
  can_restore: boolean;
};

export const mapDeletedItem = (item: ApiRecord): DeletedItem => ({
  id: item.id,
  type: String(item.entity_type || '').toLowerCase() as DeletedItem['type'],
  entity_id: item.entity_id,
  name: item.name,
  description: item.description || '',
  location: item.location || '',
  project_count: item.project_count ?? 0,
  deleted_at: item.deleted_at,
  deleted_by_name: item.deleted_by_name || '',
  expires_at: item.expires_at,
  can_restore: item.can_restore !== false,
});

export const recentlyDeletedApi = {
  list: async (accountId: string) => {
    const response = await apiClient.get(`/api/v1/accounts/${accountId}/recently-deleted`);
    return (Array.isArray(response) ? response : []).map(mapDeletedItem);
  },
  restore: (id: string) => apiClient.post(`/api/v1/recently-deleted/${id}/restore`),
  deletePermanently: (id: string) => apiClient.delete(`/api/v1/recently-deleted/${id}`),
};

export const RECENTLY_DELETED_QUERY_KEY = 'recently-deleted';
