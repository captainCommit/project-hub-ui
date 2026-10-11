import { apiClient } from './client';

// Account dashboard rollup. The API scopes it to what the signed-in person can see.

export type DashboardStatus = { id: string; label: string; value: string; color: string | null };

export type DashboardHealthStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export type DashboardProjectAtRisk = {
  id: string;
  portfolio_id: string;
  program_id: string;
  name: string;
  status: DashboardStatus | null;
  target_end_date: string | null;
  health: { overall: DashboardHealthStatus };
  overdue_tasks: number;
  open_risks: number;
  open_issues: number;
};

export type AccountDashboard = {
  projects_at_risk: DashboardProjectAtRisk[];
  [key: string]: unknown;
};

export type DashboardScope = { portfolio_id?: string; program_id?: string; project_id?: string };

export const dashboardApi = {
  getAccountDashboard: (accountId: string, scope?: DashboardScope) =>
    apiClient.get<AccountDashboard>(`/api/v1/accounts/${accountId}/dashboard`, scope),
};
