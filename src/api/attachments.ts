import { apiClient } from './client';

type ApiRecord = Record<string, any>;

export interface UploadedFile {
  attachment_id: string;
  name: string;
  type: string;
}

export const attachmentsApi = {
  createPresignedUpload: (entityType: string, entityId: string, data: unknown) => apiClient.post(`/api/v1/entities/${entityType}/${entityId}/attachments/presigned-upload`, data),
  list: (entityType: string, entityId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/entities/${entityType}/${entityId}/attachments`, query),
  createPresignedDownload: (attachmentId: string) => apiClient.get(`/api/v1/attachments/${attachmentId}/presigned-download`),
  delete: (attachmentId: string) => apiClient.delete(`/api/v1/attachments/${attachmentId}`),

  /** Register the file with the API, then PUT the bytes straight to S3. */
  upload: async (entityType: string, entityId: string, file: File): Promise<UploadedFile> => {
    const presigned = await apiClient.post<ApiRecord>(`/api/v1/entities/${entityType}/${entityId}/attachments/presigned-upload`, {
      file_name: file.name,
      content_type: file.type || null,
      size_bytes: file.size || null,
    });
    const response = await fetch(presigned.upload_url, {
      method: presigned.method || 'PUT',
      headers: presigned.headers || {},
      body: file,
    });
    if (!response.ok) {
      await apiClient.delete(`/api/v1/attachments/${presigned.attachment_id}`).catch(() => undefined);
      throw new Error(`Upload of ${file.name} failed (${response.status}).`);
    }
    return { attachment_id: String(presigned.attachment_id), name: file.name, type: file.type };
  },

  /** Resolve a short-lived download URL for an attachment. */
  downloadUrl: async (attachmentId: string) =>
    String((await apiClient.get<ApiRecord>(`/api/v1/attachments/${attachmentId}/presigned-download`)).download_url),
};
