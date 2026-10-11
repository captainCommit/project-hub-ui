import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, Building2, CreditCard, Loader2, LogOut, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { platformApi } from '@/api/platform';
import PlatformAccounts from '@/components/Account/PlatformAccounts';

const TABS = [
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'system', label: 'System', icon: Activity },
];

const ROLE_COLUMNS = [
  ['OWNER', 'Owner'],
  ['ADMIN', 'Admin'],
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

function BillingView() {
  const { data, isLoading, error } = useQuery({ queryKey: ['platform-billing'], queryFn: platformApi.getBilling });
  if (isLoading) return <Loading />;
  if (error || !data) return <LoadError error={error} />;
  const money = (cents) => formatMoney(cents, data.currency);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Monthly Recurring" value={money(data.monthly_total_cents)} hint={`${data.accounts.length} accounts`} />
        <Stat label="Full Seats" value={data.full_seats} hint={`${money(data.seat_price_cents)} / seat / month`} />
        <Stat label="Viewer Seats" value={data.viewer_seats} hint={`${money(data.viewer_seat_price_cents)} / seat / month`} />
        <Stat label="Pending Invites" value={data.pending_invites} hint="Not billed until they sign in" />
      </div>

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
                <th className="text-right font-medium px-5 py-2.5">Monthly</th>
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
                  <td className="text-right px-5 py-3 font-medium text-slate-800 tabular-nums">{money(line.monthly_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-xs text-slate-500">
        A seat is a member who has signed in and is active. Viewers are billed at the viewer rate; owners, admins, managers and members at the full rate.
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

/** The platform owner's portal: accounts, seats and billing, and system status. No account business data. */
export default function PlatformAdmin() {
  const { user, accounts, logout } = useAuth();
  const [tab, setTab] = useState('accounts');

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
            {accounts.length > 0 && (
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
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {tab === 'accounts' ? <div className="max-w-3xl"><PlatformAccounts /></div> : tab === 'billing' ? <BillingView /> : <SystemView />}
      </main>
    </div>
  );
}
