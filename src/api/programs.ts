import { apiClient } from './client';

export interface ProjectHubProgram {
  id: string;
  account_id: string;
  portfolio_id: string;
  name: string;
  description: string | null;
  status: string | null;
  status_id: string | null;
  color: string | null;
  start_date: string | null;
  end_date: string | null;
  target_end_date: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  project_count?: number;
  completed_count?: number;
  progress?: number | null;
  risk_count?: number;
  issue_count?: number;
}

export interface ProjectHubProgramOverview {
  program: ProjectHubProgram;
  project_count: number;
  completed_count?: number;
  progress: number | null;
  risk_count?: number;
  issue_count?: number;
}

export interface ProjectHubProjectSummary {
  id: string;
  account_id?: string;
  portfolio_id?: string;
  program_id: string;
  name: string;
  description: string | null;
  status: string | null;
  status_id: string | null;
  color: string | null;
  start_date: string | null;
  end_date: string | null;
  target_end_date: string | null;
  progress?: number | null;
  percent_complete?: number | null;
  owner?: string | null;
  budget?: number | null;
  project_manager?: string | null;
  delivery_type?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectHubProgramsProjectsHierarchy {
  portfolios: Array<{
    id: string;
    name: string;
    status: ProjectHubStatus | null;
    programs: ProjectHubProgram[];
  }>;
  programs: ProjectHubProgram[];
  projects: ProjectHubProjectSummary[];
}

interface ProjectHubStatus {
  id: string;
  label: string;
  value: string;
  color: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nullableString = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

const optionalString = (value: unknown): string | undefined => nullableString(value) ?? undefined;

const optionalDate = (value: unknown): string | undefined => optionalString(value);

const maybeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const statusValue = (payload: Record<string, unknown>): string | null => {
  const status = payload.status;
  if (isRecord(status) && status.value !== undefined) return String(status.value).toLowerCase();
  return nullableString(status);
};

const mapStatus = (payload: unknown): ProjectHubStatus | null => {
  if (!payload) return null;
  if (!isRecord(payload) || payload.id === undefined || payload.label === undefined || payload.value === undefined) {
    throw new Error('Project Hub status response was not in the expected format.');
  }

  return {
    id: String(payload.id),
    label: String(payload.label),
    value: String(payload.value),
    color: nullableString(payload.color),
  };
};

export const mapProgramResponse = (payload: unknown): ProjectHubProgram => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub program response was not in the expected format.');
  }

  const status = mapStatus(payload.status);
  const targetEndDate = nullableString(payload.target_end_date ?? payload.end_date);
  const projectCount = maybeNumber(payload.project_count);

  return {
    id: String(payload.id),
    account_id: String(payload.account_id ?? ''),
    portfolio_id: String(payload.portfolio_id ?? ''),
    name: String(payload.name),
    description: nullableString(payload.description),
    status: status?.value.toLowerCase() ?? statusValue(payload),
    status_id: nullableString(payload.status_id ?? status?.id),
    color: nullableString(payload.color),
    start_date: nullableString(payload.start_date),
    end_date: targetEndDate,
    target_end_date: targetEndDate,
    created_by: nullableString(payload.created_by),
    created_at: optionalString(payload.created_at),
    updated_at: optionalString(payload.updated_at),
    ...(projectCount !== undefined ? { project_count: projectCount } : {}),
    ...(maybeNumber(payload.completed_count) !== undefined ? { completed_count: maybeNumber(payload.completed_count) } : {}),
    ...(maybeNumber(payload.progress) !== undefined ? { progress: maybeNumber(payload.progress) ?? null } : {}),
    ...(maybeNumber(payload.risk_count) !== undefined ? { risk_count: maybeNumber(payload.risk_count) } : {}),
    ...(maybeNumber(payload.issue_count) !== undefined ? { issue_count: maybeNumber(payload.issue_count) } : {}),
  };
};

export const mapProgramsResponse = (payload: unknown): ProjectHubProgram[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Project Hub programs response was not in the expected format.');
  }

  return payload.map(mapProgramResponse);
};

export const mapProjectSummaryResponse = (payload: unknown, fallbackProgramId = '', fallbackPortfolioId = ''): ProjectHubProjectSummary => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub project summary response was not in the expected format.');
  }

  const status = mapStatus(payload.status);
  const targetEndDate = nullableString(payload.target_end_date ?? payload.end_date);
  const progress = maybeNumber(payload.progress ?? payload.percent_complete);
  const manager = nullableString(payload.project_manager ?? payload.owner ?? payload.manager);

  return {
    id: String(payload.id),
    account_id: optionalString(payload.account_id),
    portfolio_id: optionalString(payload.portfolio_id ?? fallbackPortfolioId),
    program_id: String(payload.program_id ?? fallbackProgramId),
    name: String(payload.name),
    description: nullableString(payload.description),
    status: status?.value.toLowerCase() ?? statusValue(payload),
    status_id: nullableString(payload.status_id ?? status?.id),
    color: nullableString(payload.color),
    start_date: nullableString(payload.start_date),
    end_date: targetEndDate,
    target_end_date: targetEndDate,
    ...(progress !== undefined ? { progress, percent_complete: progress } : {}),
    owner: manager,
    project_manager: manager,
    budget: maybeNumber(payload.budget) ?? null,
    delivery_type: nullableString(payload.delivery_type),
    created_by: nullableString(payload.created_by),
    created_at: optionalString(payload.created_at),
    updated_at: optionalString(payload.updated_at),
  };
};

export const mapProjectSummariesResponse = (payload: unknown, fallbackProgramId = ''): ProjectHubProjectSummary[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Project Hub program projects response was not in the expected format.');
  }

  return payload.map(project => mapProjectSummaryResponse(project, fallbackProgramId));
};

export const mapProgramsProjectsHierarchyResponse = (payload: unknown): ProjectHubProgramsProjectsHierarchy => {
  if (!isRecord(payload) || !Array.isArray(payload.portfolios)) {
    throw new Error('Project Hub programs-projects response was not in the expected format.');
  }

  const portfolios = payload.portfolios.map((portfolioPayload) => {
    if (!isRecord(portfolioPayload) || portfolioPayload.id === undefined || portfolioPayload.name === undefined) {
      throw new Error('Project Hub programs-projects portfolio response was not in the expected format.');
    }

    const portfolioId = String(portfolioPayload.id);
    const rawPrograms = Array.isArray(portfolioPayload.programs) ? portfolioPayload.programs : [];
    const programs = rawPrograms.map((programPayload) => {
      const program = mapProgramResponse({
        ...(isRecord(programPayload) ? programPayload : {}),
        account_id: isRecord(programPayload) ? programPayload.account_id : undefined,
        portfolio_id: portfolioId,
      });
      const rawProjects = isRecord(programPayload) && Array.isArray(programPayload.projects) ? programPayload.projects : [];
      const projects = rawProjects.map(project => mapProjectSummaryResponse(project, program.id, portfolioId));
      return { ...program, project_count: program.project_count ?? projects.length, projects };
    });

    return {
      id: portfolioId,
      name: String(portfolioPayload.name),
      status: mapStatus(portfolioPayload.status),
      programs,
    };
  });

  const programs = portfolios.flatMap(portfolio => portfolio.programs);
  const projects = programs.flatMap(program => (Array.isArray((program as ProjectHubProgram & { projects?: ProjectHubProjectSummary[] }).projects)
    ? (program as ProjectHubProgram & { projects: ProjectHubProjectSummary[] }).projects
    : []));

  return { portfolios, programs, projects };
};

export const mapProgramOverviewResponse = (payload: unknown): ProjectHubProgramOverview => {
  if (!isRecord(payload) || payload.program === undefined) {
    throw new Error('Project Hub program overview response was not in the expected format.');
  }

  const projectCount = Number(payload.project_count ?? 0);
  const completedCount = maybeNumber(payload.completed_count);
  const progress = maybeNumber(payload.progress);
  const riskCount = maybeNumber(payload.risk_count);
  const issueCount = maybeNumber(payload.issue_count);
  const program = {
    ...mapProgramResponse(payload.program),
    project_count: projectCount,
    ...(completedCount !== undefined ? { completed_count: completedCount } : {}),
    progress: progress ?? null,
    ...(riskCount !== undefined ? { risk_count: riskCount } : {}),
    ...(issueCount !== undefined ? { issue_count: issueCount } : {}),
  };

  return {
    program,
    project_count: projectCount,
    ...(completedCount !== undefined ? { completed_count: completedCount } : {}),
    progress: progress ?? null,
    ...(riskCount !== undefined ? { risk_count: riskCount } : {}),
    ...(issueCount !== undefined ? { issue_count: issueCount } : {}),
  };
};

export const mapProgramCreatePayload = (formValues: Record<string, unknown>) => ({
  name: String(formValues.name ?? '').trim(),
  ...(optionalString(formValues.description) ? { description: optionalString(formValues.description) } : {}),
  ...(optionalString(formValues.color) ? { color: optionalString(formValues.color) } : {}),
  ...(optionalDate(formValues.start_date) ? { start_date: optionalDate(formValues.start_date) } : {}),
  ...(optionalDate(formValues.end_date ?? formValues.target_end_date)
    ? { target_end_date: optionalDate(formValues.end_date ?? formValues.target_end_date) }
    : {}),
  ...(optionalString(formValues.status_id) ? { status_id: optionalString(formValues.status_id) } : {}),
});

export const mapProgramUpdatePayload = (formValues: Record<string, unknown>) => mapProgramCreatePayload(formValues);

export const mapProgramProjectCreatePayload = (formValues: Record<string, unknown>) => ({
  name: String(formValues.name ?? '').trim(),
  ...(optionalString(formValues.description) ? { description: optionalString(formValues.description) } : {}),
  ...(optionalString(formValues.color) ? { color: optionalString(formValues.color) } : {}),
  ...(optionalDate(formValues.start_date) ? { start_date: optionalDate(formValues.start_date) } : {}),
  ...(optionalDate(formValues.end_date ?? formValues.target_end_date)
    ? { target_end_date: optionalDate(formValues.end_date ?? formValues.target_end_date) }
    : {}),
  ...(optionalString(formValues.status_id) ? { status_id: optionalString(formValues.status_id) } : {}),
  ...(optionalString(formValues.portfolio_id) ? { portfolio_id: optionalString(formValues.portfolio_id) } : {}),
  ...(optionalString(formValues.delivery_type) ? { delivery_type: optionalString(formValues.delivery_type) } : {}),
  ...(formValues.budget !== undefined && formValues.budget !== '' && formValues.budget !== null ? { budget: Number(formValues.budget) } : {}),
});

export const programsApi = {
  getAccountProgramsProjects: async (accountId: string) =>
    mapProgramsProjectsHierarchyResponse(await apiClient.get(`/api/v1/accounts/${accountId}/programs-projects`)),
  list: async (portfolioId: string) => mapProgramsResponse(await apiClient.get(`/api/v1/portfolios/${portfolioId}/programs`)),
  create: async (portfolioId: string, data: Record<string, unknown>) =>
    mapProgramResponse(await apiClient.post(`/api/v1/portfolios/${portfolioId}/programs`, mapProgramCreatePayload(data))),
  get: async (programId: string) => mapProgramResponse(await apiClient.get(`/api/v1/programs/${programId}`)),
  update: async (programId: string, data: Record<string, unknown>) =>
    mapProgramResponse(await apiClient.patch(`/api/v1/programs/${programId}`, mapProgramUpdatePayload(data))),
  /** Deletes the program with every project under it. */
  delete: (programId: string) => apiClient.delete(`/api/v1/programs/${programId}`),
  getOverview: async (programId: string) =>
    mapProgramOverviewResponse(await apiClient.get(`/api/v1/programs/${programId}/overview`)),
  getProjects: async (programId: string) =>
    mapProjectSummariesResponse(await apiClient.get(`/api/v1/programs/${programId}/projects`), programId),
  createProject: async (programId: string, data: Record<string, unknown>) =>
    mapProjectSummaryResponse(
      await apiClient.post(`/api/v1/programs/${programId}/projects`, mapProgramProjectCreatePayload(data)),
      programId
    ),
};