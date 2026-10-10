import { apiClient } from './client';

type ApiRecord = Record<string, any>;

/** API comment -> the {text, author, date} shape Base44-era comment threads render. */
export const mapCommentFromApi = (comment: ApiRecord = {}) => ({
  id: comment.id,
  parent_comment_id: comment.parent_comment_id || null,
  text: comment.body || '',
  author: comment.created_by_name || 'Unknown',
  date: comment.created_at,
  created_by: comment.created_by,
  attachments: (comment.attachments || []).map((a: ApiRecord) => ({ id: a.id, name: a.file_name, type: a.content_type })),
});

/** Group flat comments into top-level comments with their replies (oldest first). */
export const buildCommentThreads = (comments: ReturnType<typeof mapCommentFromApi>[]) => {
  const roots = comments.filter((c) => !c.parent_comment_id);
  return roots.map((root) => ({ ...root, replies: comments.filter((c) => c.parent_comment_id === root.id) }));
};

const asArray = (response: any): ApiRecord[] => (Array.isArray(response) ? response : response?.items || []);

export const commentsApi = {
  list: (entityType: string, entityId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/entities/${entityType}/${entityId}/comments`, query),
  create: (entityType: string, entityId: string, data: unknown) => apiClient.post(`/api/v1/entities/${entityType}/${entityId}/comments`, data),
  update: (commentId: string, data: unknown) => apiClient.patch(`/api/v1/comments/${commentId}`, data),
  delete: (commentId: string) => apiClient.delete(`/api/v1/comments/${commentId}`),
  listMentions: (commentId: string) => apiClient.get(`/api/v1/comments/${commentId}/mentions`),
  listThread: async (entityType: string, entityId: string) =>
    asArray(await apiClient.get(`/api/v1/entities/${entityType}/${entityId}/comments`)).map(mapCommentFromApi),
  addToThread: async (entityType: string, entityId: string, text: string, parentCommentId?: string) =>
    mapCommentFromApi(await apiClient.post(`/api/v1/entities/${entityType}/${entityId}/comments`, {
      body: text,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    })),
};
