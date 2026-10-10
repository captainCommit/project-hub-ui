import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { lookupsApi } from '@/api/lookups';
import { resourcesApi } from '@/api/resources';

export const HIERARCHY_QUERY_KEY = 'account-hierarchy';
export const RESOURCES_QUERY_KEY = 'account-resources';

const EMPTY = [];

/** Portfolios, programs and projects for the selected account, as flat lists. */
export function useAccountHierarchy() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: [HIERARCHY_QUERY_KEY, selectedAccountId],
    queryFn: () => lookupsApi.getHierarchy(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  return {
    portfolios: query.data?.portfolios ?? EMPTY,
    programs: query.data?.programs ?? EMPTY,
    projects: query.data?.projects ?? EMPTY,
    isLoading: query.isLoading,
  };
}

/** Account resources (people) in the Base44 ProjectResource shape. */
export function useAccountResources() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: [RESOURCES_QUERY_KEY, selectedAccountId],
    queryFn: () => resourcesApi.listAccountResources(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  return query.data ?? EMPTY;
}

/** Invalidate everything derived from the portfolio/program/project tree. */
export const invalidateHierarchy = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: [HIERARCHY_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: ['account-programs-projects'] });
  queryClient.invalidateQueries({ queryKey: ['account-portfolios'] });
};
