import { apiClient } from './client';
import type { ProjectHubAccountRole } from './accounts';

export type SeatCounts = Record<ProjectHubAccountRole, number>;

export interface AccountBillingLine {
  account_id: string;
  name: string;
  slug: string;
  created_at: string;
  seats: SeatCounts;
  /** Seats billed at the full rate (every role but VIEWER). */
  full_seats: number;
  viewer_seats: number;
  pending_invites: number;
  monthly_total_cents: number;
  billing_enabled: boolean;
  subscription_status: string | null;
  past_due: boolean;
  read_only: boolean;
  /** Unpaid balance on open invoices. */
  outstanding_cents: number;
}

export interface BillingSummary {
  currency: string;
  seat_price_cents: number;
  viewer_seat_price_cents: number;
  accounts: AccountBillingLine[];
  full_seats: number;
  viewer_seats: number;
  pending_invites: number;
  monthly_total_cents: number;
}

export interface SystemStatus {
  environment: string;
  auth_mode: string;
  database: 'connected' | 'disconnected';
  database_latency_ms: number | null;
  migration_version: string | null;
  account_count: number;
  user_count: number;
  signed_in_user_count: number;
  checked_at: string;
}

export interface PlatformAuditEvent {
  id: string;
  actor_email: string;
  action: string;
  account_id: string | null;
  account_name: string | null;
  target: string | null;
  details: Record<string, unknown> | null;
  request_id: string | null;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

/** Platform admins only. Account metadata and aggregates, never an account's business data. */
export const platformApi = {
  getBilling: () => apiClient.get<BillingSummary>('/api/v1/admin/billing'),
  getSystem: () => apiClient.get<SystemStatus>('/api/v1/admin/system'),
  getAudit: (page: number, pageSize = 50) =>
    apiClient.get<Page<PlatformAuditEvent>>('/api/v1/admin/audit', { page, page_size: pageSize, paginated: true }),
};
