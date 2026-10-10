import { apiClient } from './client';

export const attachmentsApi = {
  createPresignedUpload: (entityType: string, entityId: string, data: unknown) => apiClient.post(`/api/v1/entities/${entityType}/${entityId}/attachments/presigned-upload`, data),
  list: (entityType: string, entityId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/entities/${entityType}/${entityId}/attachments`, query),
  createPresignedDownload: (attachmentId: string) => apiClient.get(`/api/v1/attachments/${attachmentId}/presigned-download`),
  delete: (attachmentId: string) => apiClient.delete(`/api/v1/attachments/${attachmentId}`),
};