import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/api/comments';

/** Comment thread for any commentable entity (RISK, ISSUE, ASSUMPTION, DEPENDENCY, TASK, ...). */
export function useEntityComments(entityType, entityId) {
  const queryClient = useQueryClient();
  const queryKey = ['entity-comments', entityType, entityId];
  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: () => commentsApi.listThread(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
  const addComment = useMutation({
    mutationFn: (text) => commentsApi.addToThread(entityType, entityId, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  return { comments, addComment: addComment.mutateAsync, isAdding: addComment.isPending };
}
