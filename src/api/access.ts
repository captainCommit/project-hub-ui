import { apiClient } from './client';

export type GrantRole = 'MANAGER' | 'MEMBER' | 'VIEWER';
export type GrantScopeType = 'PORTFOLIO' | 'PROGRAM' | 'PROJECT';
export type ProjectModule =
  | 'TASKS'
  | 'SPRINTS'
  | 'RISKS'
  | 'ISSUES'
  | 'ASSUMPTIONS'
  | 'DECISIONS'
  | 'DEPENDENCIES'
  | 'CHANGE_REQUESTS'
  | 'REQUIREMENTS'
  | 'TESTING'
  | 'FINANCIALS';

/** The toggles a member grant can switch on, in display order. */
export const PROJECT_MODULES: { value: ProjectModule; label: string }[] = [
  { value: 'TASKS', label: 'Tasks' },
  { value: 'SPRINTS', label: 'Sprints' },
  { value: 'RISKS', label: 'Risks' },
  { value: 'ISSUES', label: 'Issues' },
  { value: 'ASSUMPTIONS', label: 'Assumptions' },
  { value: 'DECISIONS', label: 'Decisions' },
  { value: 'DEPENDENCIES', label: 'Dependencies' },
  { value: 'CHANGE_REQUESTS', label: 'Change Requests' },
  { value: 'REQUIREMENTS', label: 'Requirements' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'FINANCIALS', label: 'Financials' },
];

/** Exactly one of these is set. */
export interface GrantScope {
  portfolio_id?: string;
  program_id?: string;
  project_id?: string;
}

export interface AccessGrant {
  id: string;
  user: { id: string; email: string; full_name: string | null; account_role: string };
  scope_type: GrantScopeType;
  scope_id: string;
  scope_name: string;
  role: GrantRole;
  modules: ProjectModule[];
  /** Modules they can see; null means all of them. */
  view_modules: ProjectModule[] | null;
  /** The grant sits on a parent portfolio or program of the item asked about. */
  inherited: boolean;
  created_at: string;
}

export interface Permission {
  role: 'OWNER' | GrantRole;
  can_manage: boolean;
  editable_modules: ProjectModule[];
  visible_modules: ProjectModule[];
}

export interface MyAccess {
  account_role: string;
  is_owner: boolean;
  portfolios: Record<string, Permission | null>;
  programs: Record<string, Permission | null>;
  projects: Record<string, Permission>;
}

export const accessApi = {
  listGrants: (accountId: string, scope: GrantScope) =>
    apiClient.get<AccessGrant[]>(`/api/v1/accounts/${accountId}/access-grants`, { ...scope }),
  grant: (
    accountId: string,
    data: GrantScope & { user_id: string; role: GrantRole; modules?: ProjectModule[]; view_modules?: ProjectModule[] | null },
  ) =>
    apiClient.post<AccessGrant>(`/api/v1/accounts/${accountId}/access-grants`, data),
  updateGrant: (grantId: string, data: { role?: GrantRole; modules?: ProjectModule[]; view_modules?: ProjectModule[] | null }) =>
    apiClient.patch<AccessGrant>(`/api/v1/access-grants/${grantId}`, data),
  removeGrant: (grantId: string) => apiClient.delete(`/api/v1/access-grants/${grantId}`),
  getMyAccess: (accountId: string) => apiClient.get<MyAccess>(`/api/v1/accounts/${accountId}/my-access`),
};
