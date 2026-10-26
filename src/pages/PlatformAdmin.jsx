import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, Bot, Building2, ChevronLeft, ChevronRight, CreditCard, LifeBuoy, Loader2, LogOut, RefreshCw, ScrollText, Shield } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isCognitoMode } from '@/lib/cognitoSession';
import { cn } from '@/lib/utils';
import { platformApi } from '@/api/platform';
import { billingApi } from '@/api/billing';
import PlatformAccounts from '@/components/Account/PlatformAccounts';
import PlatformAiAdmin from '@/components/Account/PlatformAiAdmin';
import PlatformSupport from '@/components/Account/PlatformSupport';

const TABS = [
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'system', label: 'System', icon: Activity },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

const AUDIT_ACTION_LABELS = {
  'account.created': 'Created account',
  'account.users_viewed': 'Viewed users',
  'account.user_invited': 'Invited user',
  'account.user_role_changed': 'Changed role',
  'account.user_removed': 'Removed user',
  'account.users_bulk_invited': 'Bulk invited users',
  'account.billing_enabled': 'Turned billing on',
  'account.billing_disabled': 'Turned billing off',
  'account.billing_synced': 'Synced seats to Stripe',
  'account.ai_enabled': 'Turned on AI',
  'account.ai_disabled': 'Turned off AI',
  'account.ai_platform_enabled': 'Switched on the AI model',
  'account.ai_platform_disabled': 'Switched off the AI model',
  'account.ai_platform_declined': 'Declined the AI model request',
  'account.ai_platform_updated': 'Changed AI terms',
  'ai.platform_model_created': 'Added an AI model',
  'ai.platform_model_updated': 'Changed an AI model',
  'support.ticket_replied': 'Replied to a support ticket',
  'support.ticket_updated': 'Changed a support ticket',
};

const describeAuditDetails = (event) => {
  const details = event.details || {};
  if (Array.isArray(details.users)) {
    return details.users.map((u) => `${u.email} (${String(u.role).toLowerCase()})`).join(', ');
  }
  return [event.target, details.role && String(details.role).toLowerCase()].filter(Boolean).join(' · ');
};

const ROLE_COLUMNS = [
  ['OWNER', 'Owner'],
  ['MANAGER', 'Manager'],
  ['MEMBER', 'Member'],
  ['VIEWER', 'Viewer'],
];

const formatMoney = (cents, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);

function Panel({ title, aside = null, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, hint = null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#002046] tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Loading() {
  return <div className="p-5 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
}

function LoadError({ error }) {
  return <div className="p-5 text-sm text-red-600">{error?.message || 'Could not load this view.'}</div>;
}

const billingStatus = (line) => {
  if (!line.billing_enabled) return { text: 'Off', className: 'bg-slate-100 text-slate-500' };
  if (line.read_only) return { text: 'Read-only', className: 'bg-red-50 text-red-700' };
  if (line.past_due) return { text: 'Past due', className: 'bg-amber-50 text-amber-700' };
  if (['active', 'trialing'].includes(line.subscription_status)) return { text: 'Active', className: 'bg-emerald-50 text-emerald-700' };
  return { text: 'Awaiting card', className: 'bg-amber-50 text-amber-700' };
};

function BillingView() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['platform-billing'], queryFn: platformApi.getBilling });
  const afterAction = {
    onSuccess: () => { setActionError(null); queryClient.invalidateQueries({ queryKey: ['platform-billing'] }); },
    onError: (e) => setActionError(e?.message || 'That did not work.'),
  };
  const toggle = useMutation({
    mutationFn: (/** @type {{ accountId: string, enabled: boolean }} */ { accountId, enabled }) => billingApi.setEnabled(accountId, enabled),
    ...afterAction,
  });
  const sync = useMutation({ mutationFn: (/** @type {string} */ accountId) => billingApi.syncSeats(accountId), ...afterAction });
  if (isLoading) return <Loading />;
  if (error || !data) return <LoadError error={error} />;
  const money = (cents) => formatMoney(cents, data.currency);
  const billed = data.accounts.filter((line) => line.billing_enabled);
  const outstanding = data.accounts.reduce((sum, line) => sum + line.outstanding_cents, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Monthly, Billed Accounts"
          value={money(billed.reduce((sum, line) => sum + line.monthly_total_cents, 0))}
          hint={`${billed.length} of ${data.accounts.length} accounts · ${money(data.monthly_total_cents)} if all were billed`}
        />
        <Stat label="Full Seats" value={data.full_seats} hint={`${money(data.seat_price_cents)} / seat / month`} />
        <Stat label="Viewer Seats" value={data.viewer_seats} hint={`${money(data.viewer_seat_price_cents)} / seat / month`} />
        <Stat label="Outstanding" value={money(outstanding)} hint={`${data.pending_invites} pending invites, not billed`} />
      </div>
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <Panel title="Seats by Account">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left font-medium px-5 py-2.5">Account</th>
                {ROLE_COLUMNS.map(([role, label]) => (
                  <th key={role} className="text-right font-medium px-3 py-2.5">{label}</th>
                ))}
                <th className="text-right font-medium px-3 py-2.5">Pending</th>
                <th className="text-right font-medium px-3 py-2.5">Monthly</th>
                <th className="text-left font-medium px-3 py-2.5">Billing</th>
                <th className="text-right font-medium px-5 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.accounts.map((line) => (
                <tr key={line.account_id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{line.name}</p>
                    <p className="text-xs text-slate-400">{line.full_seats + line.viewer_seats} seats</p>
                  </td>
                  {ROLE_COLUMNS.map(([role]) => (
                    <td key={role} className={cn('text-right px-3 py-3 tabular-nums', line.seats[role] ? 'text-slate-700' : 'text-slate-300')}>
                      {line.seats[role]}
                    </td>
                  ))}
                  <td className={cn('text-right px-3 py-3 tabular-nums', line.pending_invites ? 'text-amber-600' : 'text-slate-300')}>
                    {line.pending_invites}
                  </td>
                  <td className="text-right px-3 py-3 font-medium text-slate-800 tabular-nums">
                    {money(line.monthly_total_cents)}
                    {line.outstanding_cents > 0 && <p className="text-xs font-normal text-red-600">{money(line.outstanding_cents)} due</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', billingStatus(line).className)}>{billingStatus(line).text}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {line.billing_enabled && line.subscription_status && (
                        <button
                          onClick={() => sync.mutate(line.account_id)}
                          disabled={sync.isPending}
                          title="Send current seat counts to Stripe"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          aria-label={`Sync seats for ${line.name}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => toggle.mutate({ accountId: line.account_id, enabled: !line.billing_enabled })}
                        disabled={toggle.isPending}
                        className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap disabled:opacity-40"
                      >
                        {line.billing_enabled ? 'Turn off' : 'Turn on'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-xs text-slate-500">
        A seat is a member who has signed in and is active. Viewers are billed at the viewer rate; owners, managers and members at the full rate.
        Turning billing on asks the account's owners to add a card. Turning it off lifts any read-only lock but doesn't cancel an existing Stripe subscription.
      </p>
    </div>
  );
}

function StatusRow({ label, value, tone = null }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={cn('text-sm font-medium tabular-nums', tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-800')}>{value}</p>
    </div>
  );
}

function SystemView() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['platform-system'], queryFn: platformApi.getSystem });
  if (isLoading) return <Loading />;
  if (error || !data) return <LoadError error={error} />;
  const connected = data.database === 'connected';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Accounts" value={data.account_count} />
        <Stat label="Users" value={data.user_count} />
        <Stat label="Signed-in Users" value={data.signed_in_user_count} hint="Have completed first sign-in" />
      </div>
      <Panel
        title="Status"
        aside={
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800">
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} /> Refresh
          </button>
        }
      >
        <div className="divide-y divide-slate-100">
          <StatusRow label="API" value="Up" tone="ok" />
          <StatusRow label="Database" value={connected ? 'Connected' : 'Disconnected'} tone={connected ? 'ok' : 'bad'} />
          <StatusRow label="Database latency" value={data.database_latency_ms == null ? '—' : `${data.database_latency_ms} ms`} />
          <StatusRow label="Migration version" value={data.migration_version || '—'} />
          <StatusRow label="Environment" value={data.environment} />
          <StatusRow label="Auth mode" value={data.auth_mode} />
          <StatusRow label="Checked" value={new Date(data.checked_at).toLocaleString()} />
        </div>
      </Panel>
    </div>
  );
}

function AuditView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-audit', page],
    queryFn: () => platformApi.getAudit(page),
    placeholderData: keepPreviousData,
  });
  if (isLoading) return <Loading />;
  if (error || !data) return <LoadError error={error} />;
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <div className="space-y-3">
      <Panel title="Platform Admin Actions" aside={<p className="text-xs text-slate-400">{data.total}</p>}>
        {data.items.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left font-medium px-5 py-2.5">When</th>
                  <th className="text-left font-medium px-3 py-2.5">Who</th>
                  <th className="text-left font-medium px-3 py-2.5">Action</th>
                  <th className="text-left font-medium px-3 py-2.5">Account</th>
                  <th className="text-left font-medium px-5 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap tabular-nums">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-700">{event.actor_email}</td>
                    <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">{AUDIT_ACTION_LABELS[event.action] || event.action}</td>
                    <td className="px-3 py-3 text-slate-700">{event.account_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{describeAuditDetails(event) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </button>
          Page {page} of {pages}
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40" aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** The platform owner's portal: accounts, seats and billing, and system status. No account business data. */
export default function PlatformAdmin() {
  const { user, accounts, logout } = useAuth();
  const [tab, setTab] = useState('accounts');
  // Tickets waiting for a reply, shown on the Support tab.
  const { data: ticketSummary } = useQuery({
    queryKey: ['admin-ticket-summary'],
    queryFn: platformApi.ticketSummary,
    enabled: !!user?.is_platform_admin,
    refetchInterval: 60_000,
  });

  if (!user?.is_platform_admin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <header className="bg-[#002046] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Shield className="w-5 h-5 text-[#d97706] shrink-0" />
            <p className="text-sm font-semibold truncate">Project Hub · Platform Admin</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isCognitoMode() && accounts.length > 0 && (
              <Link to="/" className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/10">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to app
              </Link>
            )}
            <button type="button" onClick={() => logout()} title="Sign out" aria-label="Sign out"
              className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-8 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === id ? 'border-[#d97706] text-white' : 'border-transparent text-white/60 hover:text-white')}>
              <Icon className="w-4 h-4" /> {label}
              {id === 'support' && ticketSummary?.needs_reply > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#d97706] text-white text-[10px] font-bold leading-[18px] text-center">{ticketSummary.needs_reply}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {tab === 'accounts' ? <div className="max-w-3xl"><PlatformAccounts /></div>
          : tab === 'billing' ? <BillingView />
          : tab === 'support' ? <PlatformSupport />
          : tab === 'ai' ? <PlatformAiAdmin />
          : tab === 'system' ? <SystemView />
          : <AuditView />}
      </main>
    </div>
  );
}
