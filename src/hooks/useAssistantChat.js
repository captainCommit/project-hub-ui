import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiChatApi, aiSettingsApi } from '@/api/ai';
import { toastError } from '@/components/ui/use-toast';

const POLL_MS = 1000;

/**
 * Everything the assistant page and the floating widget share: whether the assistant can be used, the person's
 * conversations, the open one (polled while an answer is being written), and sending a question.
 * The widget passes enabled=false until it is opened, so pages don't load the assistant needlessly.
 */
export function useAssistantChat(accountId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(/** @type {string | null} */ (null));
  const [pending, setPending] = useState(/** @type {string | null} */ (null));

  const statusQuery = useQuery({
    queryKey: ['ai-status', accountId],
    queryFn: () => aiSettingsApi.status(accountId),
    enabled: !!accountId && enabled,
  });
  const conversationsQuery = useQuery({
    queryKey: ['ai-conversations', accountId],
    queryFn: () => aiChatApi.list(accountId),
    enabled: !!accountId && enabled,
  });
  const conversationQuery = useQuery({
    queryKey: ['ai-conversation', activeId],
    queryFn: () => aiChatApi.get(activeId),
    enabled: !!activeId,
    refetchInterval: (query) => (query.state.data?.active_run_id ? POLL_MS : false),
  });

  const send = useMutation({
    mutationFn: async (/** @type {string} */ text) => {
      let id = activeId;
      if (!id) {
        id = (await aiChatApi.create(accountId)).id;
        setActiveId(id);
      }
      return aiChatApi.ask(id, text);
    },
    onMutate: (text) => setPending(text),
    onSuccess: (detail) => {
      queryClient.setQueryData(['ai-conversation', detail.id], detail);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', accountId] });
    },
    onError: (error) => {
      toastError(error?.message || 'Your question could not be sent.');
      queryClient.invalidateQueries({ queryKey: ['ai-status', accountId] });
    },
    onSettled: () => setPending(null),
  });

  const remove = useMutation({
    mutationFn: (/** @type {string} */ id) => aiChatApi.remove(id),
    onSuccess: (_result, id) => {
      if (id === activeId) setActiveId(null);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', accountId] });
    },
    onError: (error) => toastError(error?.message || 'The conversation could not be deleted.'),
  });

  const detail = activeId ? conversationQuery.data : null;
  const messages = [...(detail?.messages || [])];
  // Show the question straight away, with a "thinking" answer, while it is being sent.
  if (pending) {
    const now = new Date().toISOString();
    messages.push({ id: 'pending-question', role: 'user', content: pending, created_at: now });
    messages.push({ id: 'pending-answer', role: 'assistant', content: '', status: 'QUEUED', created_at: now });
  }

  return {
    status: statusQuery.data,
    statusLoading: statusQuery.isLoading,
    conversations: conversationsQuery.data || [],
    activeId,
    activeTitle: detail?.title || null,
    messages,
    busy: send.isPending || !!detail?.active_run_id,
    select: (id) => setActiveId(id),
    newChat: () => setActiveId(null),
    send: (text) => send.mutate(text),
    remove: (id) => remove.mutate(id),
  };
}
