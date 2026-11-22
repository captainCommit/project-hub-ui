import { apiClient } from './client';

// Account > Users & Roles: the account's roles, each with rights per area and a scope.

export const ROLE_AREAS = [
  { key: 'PORTFOLIOS', label: 'Portfolios' },
  { key: 'PROGRAMS', label: 'Programs' },
  { key: 'PROJECTS', label: 'Projects' },
  { key: 'REQUIREMENTS', label: 'Requirements' },
  { key: 'TESTING', label: 'Testing' },
  { key: 'SPRINTS', label: 'Sprints' },
  { key: 'RAID', label: 'RAID' },
  { key: 'GOVERNANCE', label: 'Governance' },
  { key: 'RESOURCES', label: 'Resources' },
  { key: 'REPORTING', label: 'Reporting Center' },
] as const;

export const ROLE_ACTIONS = [
  { key: 'VIEW', label: 'View' },
  { key: 'CREATE', label: 'Create' },
  { key: 'EDIT', label: 'Edit' },
  { key: 'DELETE', label: 'Delete' },
  { key: 'APPROVE', label: 'Approve' },
] as const;

export type AccountRole = {
  id: string;
  key: string | null;
  name: string;
  description: string | null;
  permissions: Record<string, string[]>;
  scope: 'ASSIGNED' | 'ALL';
  is_system: boolean;
  editable: boolean;
  is_default: boolean;
  seat: 'OWNER' | 'MEMBER' | 'VIEWER';
  member_count: number;
};

export type AccountRoleInput = {
  name?: string;
  description?: string | null;
  permissions?: Record<string, string[]>;
  scope?: 'ASSIGNED' | 'ALL';
};

export const rolesQueryKey = (accountId: string | null | undefined) => ['account-roles', accountId];

export const rolesApi = {
  list: async (accountId: string) => {
    const response = await apiClient.get(`/api/v1/accounts/${accountId}/roles`);
    return (Array.isArray(response) ? response : []) as AccountRole[];
  },
  create: (accountId: string, data: AccountRoleInput) =>
    apiClient.post<AccountRole>(`/api/v1/accounts/${accountId}/roles`, data),
  update: (roleId: string, data: AccountRoleInput) => apiClient.patch<AccountRole>(`/api/v1/account-roles/${roleId}`, data),
  reset: (roleId: string) => apiClient.post<AccountRole>(`/api/v1/account-roles/${roleId}/reset`),
  remove: (roleId: string) => apiClient.delete(`/api/v1/account-roles/${roleId}`),
};
