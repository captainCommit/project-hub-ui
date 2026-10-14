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
export type TicketStatus = 'OPEN' | 'AWAITING_RESPONSE' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicketMessage {
  role: 'user' | 'support';
  author: string;
  /** Support replies only: which platform admin wrote it (customers just see "Project Hub Support"). */
  agent?: string;
  content: string;
  attachments: { attachment_id: string; name: string }[];
  date: string;
}

export interface AdminSupportTicket {
  id: string;
  account_id: string;
  account_name: string;
  ticket_number: string;
  category: string;
  subject: string | null;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: TicketStatus;
  requester_name: string;
  requester_email: string;
  message_count: number;
  /** Not resolved or closed, and the customer spoke last. */
  needs_reply: boolean;
  /** Empty in lists. */
  messages: SupportTicketMessage[];
  created_at: string;
  updated_at: string;
}

export const platformApi = {
  getBilling: () => apiClient.get<BillingSummary>('/api/v1/admin/billing'),
  getSystem: () => apiClient.get<SystemStatus>('/api/v1/admin/system'),
  getAudit: (page: number, pageSize = 50) =>
    apiClient.get<Page<PlatformAuditEvent>>('/api/v1/admin/audit', { page, page_size: pageSize, paginated: true }),
  /** status: a ticket status, 'ACTIVE' (not resolved or closed), or 'ALL'. */
  listTickets: (status: TicketStatus | 'ACTIVE' | 'ALL', search: string) =>
    apiClient.get<AdminSupportTicket[]>('/api/v1/admin/support-tickets', { status, search: search || undefined }),
  ticketSummary: () => apiClient.get<{ active: number; needs_reply: number }>('/api/v1/admin/support-tickets/summary', undefined, { silent: true }),
  getTicket: (id: string) => apiClient.get<AdminSupportTicket>(`/api/v1/admin/support-tickets/${id}`),
  replyToTicket: (id: string, content: string, attachments: { attachment_id: string; name: string }[]) =>
    apiClient.post<AdminSupportTicket>(`/api/v1/admin/support-tickets/${id}/messages`, { content, attachments }),
  updateTicket: (id: string, changes: Partial<Pick<AdminSupportTicket, 'status' | 'priority'>>) =>
    apiClient.patch<AdminSupportTicket>(`/api/v1/admin/support-tickets/${id}`, changes),
};
