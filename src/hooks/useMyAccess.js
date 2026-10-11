import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { accessApi } from '@/api/access';

export const MY_ACCESS_QUERY_KEY = 'my-access';

/**
 * What the current user may do in the selected account, for showing or hiding controls.
 * The API enforces the same rules; this only keeps people from reaching for buttons that would fail.
 */
export function useMyAccess() {
  const { selectedAccountId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: [MY_ACCESS_QUERY_KEY, selectedAccountId],
    queryFn: () => accessApi.getMyAccess(selectedAccountId),
    enabled: !!selectedAccountId,
    staleTime: 60_000,
  });
  const isOwner = !!data?.is_owner;

  const projectPermission = useCallback((projectId) => data?.projects?.[projectId] ?? null, [data]);

  /** Edit rights on one module of a project, e.g. canEdit(projectId, 'TASKS'). */
  const canEdit = useCallback(
    (projectId, module) => isOwner || !!projectPermission(projectId)?.editable_modules?.includes(module),
    [isOwner, projectPermission],
  );

  /** Manager rights (settings, people) on a project, program or portfolio. */
  const canManage = useCallback(
    (kind, id) => {
      if (isOwner) return true;
      const permissions = kind === 'project' ? data?.projects : kind === 'program' ? data?.programs : data?.portfolios;
      return !!permissions?.[id]?.can_manage;
    },
    [data, isOwner],
  );

  return { access: data, isLoading, isOwner, projectPermission, canEdit, canManage };
}
