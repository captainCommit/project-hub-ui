import { apiClient } from './client';

export interface ProjectHubAccount {
  id: string;
  account_id: string;
  name: string;
  slug: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  /** The current user's role in this account. */
  role: ProjectHubAccountRole | null;
}

export type ProjectHubAccountRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface ProjectHubAccountUser {
  id: string;
  email: string;
  full_name: string | null;
  role: ProjectHubAccountRole;
  is_active: boolean;
  /** False until the person signs in for the first time. */
  has_signed_in: boolean;
}

/** Every account, as platform admins see it. */
export interface ProjectHubPlatformAccount {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  member_count: number;
  admins: { email: string; full_name: string | null; role: ProjectHubAccountRole }[];
}

export interface ProjectHubSidebarStatus {
  id: string;
  label: string;
  value: string;
  color: string | null;
}

export interface ProjectHubSidebarProject {
  id: string;
  name: string;
  type: 'project';
  portfolio_id: string;
  program_id: string;
  status: ProjectHubSidebarStatus | null;
  color: string | null;
  route: string;
}

export interface ProjectHubSidebarProgram {
  id: string;
  name: string;
  type: 'program';
  portfolio_id: string;
  status: ProjectHubSidebarStatus | null;
  color: string | null;
  route: string;
  projects: ProjectHubSidebarProject[];
}

export interface ProjectHubSidebarPortfolio {
  id: string;
  name: string;
  type: 'portfolio';
  status: ProjectHubSidebarStatus | null;
  color: string | null;
  route: string;
  programs: ProjectHubSidebarProgram[];
}

export interface ProjectHubSidebarHierarchy {
  portfolios: ProjectHubSidebarPortfolio[];
  programs: ProjectHubSidebarProgram[];
  projects: ProjectHubSidebarProject[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

export const mapAccountResponse = (payload: unknown): ProjectHubAccount => {
  if (!isRecord(payload)) {
    throw new Error('Project Hub account response was not in the expected format.');
  }

  const normalizedId = payload.id ?? payload.account_id;
  if (normalizedId === undefined || payload.name === undefined) {
    throw new Error('Project Hub account response was missing required account fields.');
  }

  const id = String(normalizedId);

  return {
    id,
    account_id: id,
    name: String(payload.name),
    slug: nullableString(payload.slug),
    created_by: nullableString(payload.created_by),
    created_at: nullableString(payload.created_at) ?? undefined,
    updated_at: nullableString(payload.updated_at) ?? undefined,
    role: (nullableString(payload.role) as ProjectHubAccountRole | null),
  };
};

export const mapAccountsResponse = (payload: unknown): ProjectHubAccount[] => {
  const accounts = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : null;

  if (!accounts) {
    throw new Error('Project Hub accounts response was not in the expected format.');
  }

  return accounts.map(mapAccountResponse);
};

const mapSidebarStatus = (payload: unknown): ProjectHubSidebarStatus | null => {
  if (!payload) return null;
  if (!isRecord(payload) || payload.id === undefined || payload.label === undefined || payload.value === undefined) {
    throw new Error('Project Hub sidebar status response was not in the expected format.');
  }

  return {
    id: String(payload.id),
    label: String(payload.label),
    value: String(payload.value),
    color: nullableString(payload.color),
  };
};

const mapSidebarProject = (
  payload: unknown,
  portfolioId: string,
  programId: string
): ProjectHubSidebarProject => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub sidebar project response was not in the expected format.');
  }

  const id = String(payload.id);

  return {
    id,
    name: String(payload.name),
    type: 'project',
    portfolio_id: portfolioId,
    program_id: programId,
    status: mapSidebarStatus(payload.status),
    color: nullableString(payload.color),
    route: `/projects/${id}/sheet`,
  };
};

const mapSidebarProgram = (payload: unknown, portfolioId: string): ProjectHubSidebarProgram => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub sidebar program response was not in the expected format.');
  }

  const id = String(payload.id);
  const projects = Array.isArray(payload.projects) ? payload.projects : [];

  return {
    id,
    name: String(payload.name),
    type: 'program',
    portfolio_id: portfolioId,
    status: mapSidebarStatus(payload.status),
    color: nullableString(payload.color),
    route: `/programs/${id}`,
    projects: projects.map((project) => mapSidebarProject(project, portfolioId, id)),
  };
};

const mapSidebarPortfolio = (payload: unknown): ProjectHubSidebarPortfolio => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub sidebar portfolio response was not in the expected format.');
  }

  const id = String(payload.id);
  const programs = Array.isArray(payload.programs) ? payload.programs : [];

  return {
    id,
    name: String(payload.name),
    type: 'portfolio',
    status: mapSidebarStatus(payload.status),
    color: nullableString(payload.color),
    route: `/portfolios/${id}`,
    programs: programs.map((program) => mapSidebarProgram(program, id)),
  };
};

export const mapSidebarResponse = (payload: unknown): ProjectHubSidebarHierarchy => {
  if (!isRecord(payload) || !Array.isArray(payload.portfolios)) {
    throw new Error('Project Hub sidebar response was not in the expected format.');
  }

  const portfolios = payload.portfolios.map(mapSidebarPortfolio);
  const programs = portfolios.flatMap((portfolio) => portfolio.programs);
  const projects = programs.flatMap((program) => program.projects);

  return { portfolios, programs, projects };
};

const listItems = (payload: unknown): unknown[] =>
  Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];

const mapAccountUser = (payload: unknown): ProjectHubAccountUser => {
  const record = isRecord(payload) ? payload : {};
  return {
    id: String(record.id),
    email: String(record.email),
    full_name: nullableString(record.full_name),
    role: String(record.role ?? 'MEMBER') as ProjectHubAccountRole,
    is_active: Boolean(record.is_active),
    has_signed_in: Boolean(record.has_signed_in),
  };
};

const mapPlatformAccount = (payload: unknown): ProjectHubPlatformAccount => {
  const record = isRecord(payload) ? payload : {};
  return {
    id: String(record.id),
    name: String(record.name),
    slug: String(record.slug),
    created_at: String(record.created_at),
    member_count: Number(record.member_count ?? 0),
    admins: listItems(record.admins).map((admin) => {
      const a = isRecord(admin) ? admin : {};
      return { email: String(a.email), full_name: nullableString(a.full_name), role: String(a.role) as ProjectHubAccountRole };
    }),
  };
};

export const accountsApi = {
  list: async () => mapAccountsResponse(await apiClient.get('/api/v1/accounts')),
  getSidebar: async (accountId: string) => mapSidebarResponse(await apiClient.get(`/api/v1/accounts/${accountId}/sidebar`)),
  create: (data: unknown) => apiClient.post('/api/v1/accounts', data),
  get: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}`),
  update: (accountId: string, data: unknown) => apiClient.patch(`/api/v1/accounts/${accountId}`, data),
  delete: (accountId: string) => apiClient.delete(`/api/v1/accounts/${accountId}`),
  listUsers: (accountId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/accounts/${accountId}/users`, query),
  /** Account members with their role, for the Users tab. */
  listMembers: async (accountId: string) =>
    listItems(await apiClient.get(`/api/v1/accounts/${accountId}/users`)).map(mapAccountUser),
  /** Platform admins only: every account with its owners and admins. */
  listAllAccounts: async () => listItems(await apiClient.get('/api/v1/admin/accounts')).map(mapPlatformAccount),
  inviteUser: (accountId: string, data: unknown) => apiClient.post(`/api/v1/accounts/${accountId}/users/invite`, data),
  bulkInviteUsers: (accountId: string, data: unknown) => apiClient.post(`/api/v1/accounts/${accountId}/users/bulk-invite`, data),
  searchUsers: (accountId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/accounts/${accountId}/users/search`, query),
};