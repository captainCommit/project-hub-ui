import { apiClient } from './client';
import type { Page } from './platform';

export interface BillingState {
  billing_enabled: boolean;
  /** Billing is on but no card / subscription yet. */
  needs_setup: boolean;
  past_due: boolean;
  /** Locked for non-payment: everything can be read, nothing changed. */
  read_only: boolean;
}

export interface Invoice {
  id: string;
  account_id: string;
  number: string | null;
  status: string | null;
  currency: string;
  total: number;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  period_start: string | null;
  period_end: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  issued_at: string | null;
}

export interface AccountBilling extends BillingState {
  currency: string;
  seat_price_cents: number;
  viewer_seat_price_cents: number;
  full_seats: number;
  viewer_seats: number;
  pending_invites: number;
  estimated_monthly_cents: number;
  /** This month's platform AI usage, when the account uses a platform-provided model. */
  ai_usage?: import('./ai').AiUsage | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_payment_account: boolean;
  invoices: Invoice[];
}

export const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);

export const billingApi = {
  get: (accountId: string) => apiClient.get<AccountBilling>(`/api/v1/accounts/${accountId}/billing`),
  /** Returns Stripe's URL; send the browser there. */
  startCheckout: (accountId: string) => apiClient.post<{ url: string }>(`/api/v1/accounts/${accountId}/billing/checkout`),
  openPortal: (accountId: string) => apiClient.post<{ url: string }>(`/api/v1/accounts/${accountId}/billing/portal`),
  // Platform admins
  setEnabled: (accountId: string, enabled: boolean) =>
    apiClient.patch<BillingState>(`/api/v1/admin/accounts/${accountId}/billing`, { billing_enabled: enabled }),
  syncSeats: (accountId: string) => apiClient.post<{ changed: boolean }>(`/api/v1/admin/accounts/${accountId}/billing/sync`),
  listInvoices: (page: number, accountId?: string) =>
    apiClient.get<Page<Invoice>>('/api/v1/admin/invoices', { page, paginated: true, account_id: accountId }),
};
