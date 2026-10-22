import { apiClient } from './client';

// Account-wide lookups (portfolios, programs, projects) in the shape the
// Base44-era components expect: flat lists linked by *_id, lowercase status keys.

type ApiRecord = Record<string, any>;

export interface UiPortfolio {
  id: string;
  name: string;
  description: string;
  color: string | null;
  owner: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_date: string | null;
}

export interface UiProgram extends UiPortfolio {
  portfolio_id: string;
}

export interface UiProject extends UiPortfolio {
  portfolio_id: string;
  program_id: string;
  delivery_type: string | null;
  budget: number | null;
  project_manager: string | null;
}

export interface UiHierarchy {
  portfolios: UiPortfolio[];
  programs: UiProgram[];
  projects: UiProject[];
}

/** Option summaries come back as {value: "IN_PROGRESS", ...}; the UI keys on "in_progress". */
export const optionKey = (option: unknown): string | null => {
  if (option && typeof option === 'object' && 'value' in option) {
    const value = (option as ApiRecord).value;
    return value ? String(value).toLowerCase() : null;
  }
  return typeof option === 'string' && option ? option.toLowerCase() : null;
};

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const nullable = (value: unknown) => (value === null || value === undefined || value === '' ? null : String(value));
const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapNode = (node: ApiRecord): UiPortfolio => ({
  id: String(node.id),
  name: text(node.name),
  description: text(node.description),
  color: nullable(node.color),
  owner: nullable(node.owner),
  status: optionKey(node.status),
  start_date: nullable(node.start_date),
  end_date: nullable(node.target_end_date),
  created_date: nullable(node.created_at),
});

export const mapHierarchyToUi = (payload: unknown): UiHierarchy => {
  const portfolios: UiPortfolio[] = [];
  const programs: UiProgram[] = [];
  const projects: UiProject[] = [];
  const rawPortfolios = Array.isArray((payload as ApiRecord)?.portfolios) ? (payload as ApiRecord).portfolios : [];

  rawPortfolios.forEach((portfolio: ApiRecord) => {
    portfolios.push(mapNode(portfolio));
    (portfolio.programs || []).forEach((program: ApiRecord) => {
      programs.push({ ...mapNode(program), portfolio_id: String(portfolio.id) });
      (program.projects || []).forEach((project: ApiRecord) => {
        projects.push({
          ...mapNode(project),
          portfolio_id: String(project.portfolio_id ?? portfolio.id),
          program_id: String(project.program_id ?? program.id),
          delivery_type: nullable(project.delivery_type),
          budget: numberOrNull(project.budget),
          project_manager: nullable(project.project_manager),
          owner: nullable(project.project_manager),
        });
      });
    });
  });

  return { portfolios, programs, projects };
};

export const lookupsApi = {
  getHierarchy: async (accountId: string) =>
    mapHierarchyToUi(await apiClient.get(`/api/v1/accounts/${accountId}/programs-projects`)),
};
