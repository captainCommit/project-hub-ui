import { apiClient } from './client';

export interface ProjectHubProject {
  id: string;
  account_id: string;
  portfolio_id: string;
  program_id: string;
  name: string;
  description: string | null;
  delivery_type?: string | null;
  status: string | null;
  status_id: string | null;
  color: string | null;
  start_date: string | null;
  end_date: string | null;
  target_end_date: string | null;
  progress?: number | null;
  percent_complete?: number | null;
  project_manager?: string | null;
  owner?: string | null;
  budget?: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectHubProjectOverview {
  project: ProjectHubProject;
  stats: Record<string, number>;
  health?: unknown;
  total_tasks?: number;
  completed_tasks?: number;
  in_progress_tasks?: number;
  overdue_tasks?: number;
  upcoming_milestones?: number;
  open_risks?: number;
  open_issues?: number;
  progress?: number | null;
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

export const mapProjectResponse = (payload: unknown): ProjectHubProject => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub project response was not in the expected format.');
  }

  const targetEndDate = nullableString(payload.target_end_date ?? payload.end_date);
  const progress = maybeNumber(payload.progress ?? payload.percent_complete);
  const manager = nullableString(payload.project_manager ?? payload.owner ?? payload.manager);
  const status = payload.status;

  return {
    id: String(payload.id),
    account_id: String(payload.account_id ?? ''),
    portfolio_id: String(payload.portfolio_id ?? ''),
    program_id: String(payload.program_id ?? ''),
    name: String(payload.name),
    description: nullableString(payload.description),
    delivery_type: nullableString(payload.delivery_type),
    status: statusValue(payload),
    status_id: nullableString(payload.status_id ?? (isRecord(status) ? status.id : undefined)),
    color: nullableString(payload.color),
    start_date: nullableString(payload.start_date),
    end_date: targetEndDate,
    target_end_date: targetEndDate,
    ...(progress !== undefined ? { progress, percent_complete: progress } : {}),
    project_manager: manager,
    budget: maybeNumber(payload.budget) ?? null,
    owner: manager,
    created_by: nullableString(payload.created_by),
    created_at: optionalString(payload.created_at),
    updated_at: optionalString(payload.updated_at),
  };
};

export const mapProjectOverviewResponse = (payload: unknown): ProjectHubProjectOverview => {
  if (!isRecord(payload) || payload.project === undefined) {
    throw new Error('Project Hub project overview response was not in the expected format.');
  }

  const rawStats = isRecord(payload.stats) ? payload.stats : {};
  const stats = Object.fromEntries(
    Object.entries(rawStats)
      .map(([key, value]) => [key, maybeNumber(value)])
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
  );
  const totalTasks = stats.total_tasks;
  const completedTasks = stats.completed_tasks;
  const progress = totalTasks && completedTasks !== undefined
    ? Math.round((completedTasks / totalTasks) * 100)
    : maybeNumber(payload.progress);
  const project = {
    ...mapProjectResponse(payload.project),
    ...(progress !== undefined ? { progress, percent_complete: progress } : {}),
  };

  return {
    project,
    stats,
    ...(payload.health !== undefined ? { health: payload.health } : {}),
    ...(stats.total_tasks !== undefined ? { total_tasks: stats.total_tasks } : {}),
    ...(stats.completed_tasks !== undefined ? { completed_tasks: stats.completed_tasks } : {}),
    ...(stats.in_progress_tasks !== undefined ? { in_progress_tasks: stats.in_progress_tasks } : {}),
    ...(stats.overdue_tasks !== undefined ? { overdue_tasks: stats.overdue_tasks } : {}),
    ...(stats.upcoming_milestones !== undefined ? { upcoming_milestones: stats.upcoming_milestones } : {}),
    ...(stats.open_risks !== undefined ? { open_risks: stats.open_risks } : {}),
    ...(stats.open_issues !== undefined ? { open_issues: stats.open_issues } : {}),
    progress: progress ?? null,
  };
};

export const mapProjectUpdatePayload = (formValues: Record<string, unknown>) => ({
  ...(optionalString(formValues.name) ? { name: optionalString(formValues.name) } : {}),
  ...(formValues.description !== undefined ? { description: nullableString(formValues.description) } : {}),
  ...(optionalString(formValues.color) ? { color: optionalString(formValues.color) } : {}),
  ...(optionalDate(formValues.start_date) ? { start_date: optionalDate(formValues.start_date) } : {}),
  ...(optionalDate(formValues.end_date ?? formValues.target_end_date)
    ? { target_end_date: optionalDate(formValues.end_date ?? formValues.target_end_date) }
    : {}),
  ...(optionalString(formValues.status_id) ? { status_id: optionalString(formValues.status_id) } : {}),
  ...(optionalString(formValues.delivery_type) ? { delivery_type: optionalString(formValues.delivery_type) } : {}),
  // Sent as null to clear it.
  ...(formValues.project_manager !== undefined ? { project_manager: nullableString(formValues.project_manager) } : {}),
  // Only sent when the budget was changed; empty clears it.
  ...(formValues.budget !== undefined ? { budget: formValues.budget === '' || formValues.budget === null ? null : Number(formValues.budget) } : {}),
});

export const projectsApi = {
  list: (programId: string) => apiClient.get(`/api/v1/programs/${programId}/projects`),
  create: (programId: string, data: unknown) => apiClient.post(`/api/v1/programs/${programId}/projects`, data),
  get: async (projectId: string) => mapProjectResponse(await apiClient.get(`/api/v1/projects/${projectId}`)),
  getOverview: async (projectId: string) => mapProjectOverviewResponse(await apiClient.get(`/api/v1/projects/${projectId}/overview`)),
  update: async (projectId: string, data: Record<string, unknown>) =>
    mapProjectResponse(await apiClient.patch(`/api/v1/projects/${projectId}`, mapProjectUpdatePayload(data))),
  delete: (projectId: string) => apiClient.delete(`/api/v1/projects/${projectId}`),
  getSidebar: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/sidebar`),
  getProgramsProjects: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/programs-projects`),
};