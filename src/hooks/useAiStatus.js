import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { aiSettingsApi } from '@/api/ai';

/**
 * Whether the selected account can use the AI assistant. aiEnabled is the platform admin's switch: off means no
 * Ask Compass, reports or AI settings, and owners can request it in Account > Connected apps.
 */
export function useAiStatus() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['ai-status', selectedAccountId],
    queryFn: () => aiSettingsApi.status(selectedAccountId),
    enabled: !!selectedAccountId,
    staleTime: 60_000,
  });
  return { status: query.data ?? null, aiEnabled: query.data?.enabled === true, isLoading: query.isLoading };
}
