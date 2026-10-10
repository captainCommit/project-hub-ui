import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { lookupsApi } from '@/api/lookups';
import { resourcesApi } from '@/api/resources';
import { accountDataApi } from '@/api/accountData';
import { changeRequestsApi, mapChangeRequestFromApi, mapRequirementFromApi, mapTestCaseFromApi, requirementsApi, testCasesApi } from '@/api/projectLogs';
import { mapDecisionListFromApi, raidApi } from '@/api/raid';

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

/** Every task in the account with assignment (actual) and allocation (planned) hours. */
export function useAccountTasks() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['account-tasks', selectedAccountId],
    queryFn: () => accountDataApi.listTasks(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  return { tasks: query.data ?? EMPTY, isLoading: query.isLoading };
}

export function useAccountSprints() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['account-sprints', selectedAccountId],
    queryFn: () => accountDataApi.listSprints(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  return query.data ?? EMPTY;
}

/** Resource time off in the Base44 ResourceVacation shape. */
export function useAccountVacations() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['account-time-off', selectedAccountId],
    queryFn: () => accountDataApi.listVacations(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  return query.data ?? EMPTY;
}

export function useAccountRequirements() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['requirements', selectedAccountId],
    queryFn: async () => (await requirementsApi.listForAccount(selectedAccountId)).map(mapRequirementFromApi),
    enabled: !!selectedAccountId,
  });
  return { requirements: query.data ?? EMPTY, isLoading: query.isLoading };
}

export function useAccountTestCases() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['test_cases', selectedAccountId],
    queryFn: async () => (await testCasesApi.listForAccount(selectedAccountId)).map(mapTestCaseFromApi),
    enabled: !!selectedAccountId,
  });
  return { testCases: query.data ?? EMPTY, isLoading: query.isLoading };
}

export function useAccountDecisions() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['account-decisions', selectedAccountId],
    queryFn: async () => mapDecisionListFromApi(await raidApi.listAccountDecisions(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  return query.data ?? EMPTY;
}

export function useAccountChangeRequests() {
  const { selectedAccountId } = useAuth();
  const query = useQuery({
    queryKey: ['change_requests', selectedAccountId],
    queryFn: async () => (await changeRequestsApi.listForAccount(selectedAccountId)).map(mapChangeRequestFromApi),
    enabled: !!selectedAccountId,
  });
  return { changeRequests: query.data ?? EMPTY, isLoading: query.isLoading };
}
