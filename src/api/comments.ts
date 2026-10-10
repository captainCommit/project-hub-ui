import { apiClient } from './client';

export const commentsApi = {
  list: (entityType: string, entityId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/entities/${entityType}/${entityId}/comments`, query),
  create: (entityType: string, entityId: string, data: unknown) => apiClient.post(`/api/v1/entities/${entityType}/${entityId}/comments`, data),
  update: (commentId: string, data: unknown) => apiClient.patch(`/api/v1/comments/${commentId}`, data),
  delete: (commentId: string) => apiClient.delete(`/api/v1/comments/${commentId}`),
  listMentions: (commentId: string) => apiClient.get(`/api/v1/comments/${commentId}/mentions`),
};