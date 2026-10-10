import { apiClient } from './client';

type ApiRecord = Record<string, any>;

/** API comment -> the {text, author, date} shape Base44-era comment threads render. */
export const mapCommentFromApi = (comment: ApiRecord = {}) => ({
  id: comment.id,
  text: comment.body || '',
  author: comment.created_by_name || 'Unknown',
  date: comment.created_at,
  created_by: comment.created_by,
});

const asArray = (response: any): ApiRecord[] => (Array.isArray(response) ? response : response?.items || []);

export const commentsApi = {
  list: (entityType: string, entityId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/entities/${entityType}/${entityId}/comments`, query),
  create: (entityType: string, entityId: string, data: unknown) => apiClient.post(`/api/v1/entities/${entityType}/${entityId}/comments`, data),
  update: (commentId: string, data: unknown) => apiClient.patch(`/api/v1/comments/${commentId}`, data),
  delete: (commentId: string) => apiClient.delete(`/api/v1/comments/${commentId}`),
  listMentions: (commentId: string) => apiClient.get(`/api/v1/comments/${commentId}/mentions`),
  listThread: async (entityType: string, entityId: string) =>
    asArray(await apiClient.get(`/api/v1/entities/${entityType}/${entityId}/comments`)).map(mapCommentFromApi),
  addToThread: async (entityType: string, entityId: string, text: string) =>
    mapCommentFromApi(await apiClient.post(`/api/v1/entities/${entityType}/${entityId}/comments`, { body: text })),
};
