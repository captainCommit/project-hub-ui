import { apiClient } from './client';

export interface ProjectHubPortfolio {
  id: string;
  account_id: string;
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
  program_count?: number;
  project_count?: number;
  progress?: number | null;
}

export interface ProjectHubPortfolioOverview {
  portfolio: ProjectHubPortfolio;
  program_count: number;
  project_count: number;
  progress: number | null;
}

export interface ProjectHubPortfolioProgram {
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
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nullableString = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

const optionalString = (value: unknown): string | undefined => nullableString(value) ?? undefined;

const statusValue = (payload: Record<string, unknown>): string | null => {
  const status = payload.status;
  if (isRecord(status) && status.value !== undefined) return String(status.value).toLowerCase();
  return nullableString(status);
};

const optionalDate = (value: unknown): string | undefined => optionalString(value);

export const mapPortfolioResponse = (payload: unknown): ProjectHubPortfolio => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub portfolio response was not in the expected format.');
  }

  const targetEndDate = nullableString(payload.target_end_date);

  return {
    id: String(payload.id),
    account_id: String(payload.account_id ?? ''),
    name: String(payload.name),
    description: nullableString(payload.description),
    status: statusValue(payload),
    status_id: nullableString(payload.status_id),
    color: nullableString(payload.color),
    start_date: nullableString(payload.start_date),
    end_date: targetEndDate,
    target_end_date: targetEndDate,
    created_by: nullableString(payload.created_by),
    created_at: optionalString(payload.created_at),
    updated_at: optionalString(payload.updated_at),
  };
};

export const mapPortfoliosResponse = (payload: unknown): ProjectHubPortfolio[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Project Hub portfolios response was not in the expected format.');
  }

  return payload.map(mapPortfolioResponse);
};

export const mapPortfolioOverviewResponse = (payload: unknown): ProjectHubPortfolioOverview => {
  if (!isRecord(payload) || payload.portfolio === undefined) {
    throw new Error('Project Hub portfolio overview response was not in the expected format.');
  }

  const portfolio = mapPortfolioResponse(payload.portfolio);
  const programCount = Number(payload.program_count ?? 0);
  const projectCount = Number(payload.project_count ?? 0);

  return {
    portfolio: {
      ...portfolio,
      program_count: programCount,
      project_count: projectCount,
      progress: null,
    },
    program_count: programCount,
    project_count: projectCount,
    progress: null,
  };
};

export const mapPortfolioProgramResponse = (payload: unknown): ProjectHubPortfolioProgram => {
  if (!isRecord(payload) || payload.id === undefined || payload.name === undefined) {
    throw new Error('Project Hub portfolio program response was not in the expected format.');
  }

  const targetEndDate = nullableString(payload.target_end_date);

  return {
    id: String(payload.id),
    account_id: String(payload.account_id ?? ''),
    portfolio_id: String(payload.portfolio_id ?? ''),
    name: String(payload.name),
    description: nullableString(payload.description),
    status: statusValue(payload),
    status_id: nullableString(payload.status_id),
    color: nullableString(payload.color),
    start_date: nullableString(payload.start_date),
    end_date: targetEndDate,
    target_end_date: targetEndDate,
    created_by: nullableString(payload.created_by),
    created_at: optionalString(payload.created_at),
    updated_at: optionalString(payload.updated_at),
  };
};

export const mapPortfolioProgramsResponse = (payload: unknown): ProjectHubPortfolioProgram[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Project Hub portfolio programs response was not in the expected format.');
  }

  return payload.map(mapPortfolioProgramResponse);
};

export const mapPortfolioCreatePayload = (formValues: Record<string, unknown>) => ({
  name: String(formValues.name ?? '').trim(),
  ...(optionalString(formValues.description) ? { description: optionalString(formValues.description) } : {}),
  ...(optionalString(formValues.color) ? { color: optionalString(formValues.color) } : {}),
  ...(optionalDate(formValues.start_date) ? { start_date: optionalDate(formValues.start_date) } : {}),
  ...(optionalDate(formValues.end_date ?? formValues.target_end_date)
    ? { target_end_date: optionalDate(formValues.end_date ?? formValues.target_end_date) }
    : {}),
  ...(optionalString(formValues.status_id) ? { status_id: optionalString(formValues.status_id) } : {}),
});

export const mapPortfolioUpdatePayload = (formValues: Record<string, unknown>) => mapPortfolioCreatePayload(formValues);

export const portfoliosApi = {
  list: async (accountId: string) => mapPortfoliosResponse(await apiClient.get(`/api/v1/accounts/${accountId}/portfolios`)),
  create: async (accountId: string, data: Record<string, unknown>) =>
    mapPortfolioResponse(await apiClient.post(`/api/v1/accounts/${accountId}/portfolios`, mapPortfolioCreatePayload(data))),
  get: async (portfolioId: string) => mapPortfolioResponse(await apiClient.get(`/api/v1/portfolios/${portfolioId}`)),
  update: async (portfolioId: string, data: Record<string, unknown>) =>
    mapPortfolioResponse(await apiClient.patch(`/api/v1/portfolios/${portfolioId}`, mapPortfolioUpdatePayload(data))),
  getOverview: async (portfolioId: string) =>
    mapPortfolioOverviewResponse(await apiClient.get(`/api/v1/portfolios/${portfolioId}/overview`)),
  listPrograms: async (portfolioId: string) =>
    mapPortfolioProgramsResponse(await apiClient.get(`/api/v1/portfolios/${portfolioId}/programs`)),
};