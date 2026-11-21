import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { tasksApi } from '@/api/tasks';
import { RAID_DEFAULTS, getStatusColor } from '@/lib/raidStatuses';

// The account's status lists come from its option sets in the API (Account > Settings edits them), so everyone in the
// account sees the same choices. Values are the API's keys in lower case ('IN_REVIEW' -> 'in_review'), which is what the
// records carry and what the API accepts back.
const ENTITY_TYPES = {
  risk: 'RISK',
  issue: 'ISSUE',
  assumption: 'ASSUMPTION',
  dependency: 'DEPENDENCY',
  decision: 'DECISION',
  change_request: 'CHANGE_REQUEST',
};

export const ACCOUNT_OPTIONS_KEY = 'account-options';

/** Every option set of the selected account, with its active values (GET /accounts/{id}/options). */
export function useAccountOptions() {
  const { selectedAccountId } = useAuth();
  return useQuery({
    queryKey: [ACCOUNT_OPTIONS_KEY, selectedAccountId],
    queryFn: () => tasksApi.getAccountOptions(selectedAccountId),
    enabled: !!selectedAccountId,
    staleTime: 60_000,
  });
}

/**
 * The active statuses for risks, issues, assumptions, dependencies, decisions or change requests, in order:
 * [{ value, label, color }]. Until the account's list loads (or if it has none) the built-in defaults are used.
 */
export function useStatusOptions(type) {
  const { data } = useAccountOptions();
  return useMemo(() => {
    const sets = Array.isArray(data) ? data : [];
    const set = sets.find(s => s.entity_type === ENTITY_TYPES[type] && s.name === 'STATUS');
    const values = (set?.values || [])
      .filter(v => v.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(v => ({ value: String(v.value).toLowerCase(), label: v.label }));
    const list = values.length ? values : (RAID_DEFAULTS[type] || []);
    return list.map(s => ({ ...s, color: getStatusColor(s.value) }));
  }, [data, type]);
}
