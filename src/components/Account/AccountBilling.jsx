import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { billingApi, formatMoney } from '@/api/billing';

const STATUS_LABELS = {
  active: { text: 'Active', tone: 'ok' },
  trialing: { text: 'Trial', tone: 'ok' },
  past_due: { text: 'Payment overdue', tone: 'warn' },
  incomplete: { text: 'Waiting for payment', tone: 'warn' },
  unpaid: { text: 'Unpaid · read-only', tone: 'bad' },
  canceled: { text: 'Cancelled · read-only', tone: 'bad' },
  incomplete_expired: { text: 'Expired · read-only', tone: 'bad' },
};
const TONES = { ok: 'bg-emerald-50 text-emerald-700', warn: 'bg-amber-50 text-amber-700', bad: 'bg-red-50 text-red-700' };
const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <p className="text-sm text-slate-600">{label}</p>
      <div className="text-sm font-medium text-slate-800 text-right tabular-nums">{children}</div>
    </div>
  );
}

/** An owner's view of their account's subscription: seats, Stripe checkout and portal, invoices. */
export default function AccountBilling({ accountId, checkoutResult = null }) {
  const [error, setError] = useState(null);
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['account-billing', accountId],
    queryFn: () => billingApi.get(accountId),
    enabled: !!accountId,
  });
  const goTo = (request) => ({
    mutationFn: request,
    onSuccess: (/** @type {{ url: string }} */ result) => { window.location.href = result.url; },
    onError: (e) => setError(e?.message || 'That did not work.'),
  });
  const checkout = useMutation(goTo(() => billingApi.startCheckout(accountId)));
  const portal = useMutation(goTo(() => billingApi.openPortal(accountId)));

  if (isLoading) return <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  if (loadError || !data) return <p className="text-sm text-red-600">{loadError?.message || 'Billing could not load.'}</p>;

  const money = (cents) => formatMoney(cents, data.currency);
  const status = STATUS_LABELS[data.subscription_status];
  const subscribed = !!status && !data.needs_setup && !data.read_only;

  return (
    <div className="space-y-6">
      {checkoutResult === 'success' && (
        <p className="text-sm rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3">Thanks, your payment method is saved. It can take a moment for the subscription to show here.</p>
      )}
      {!data.billing_enabled && (
        <p className="text-sm rounded-lg bg-slate-100 text-slate-600 px-4 py-3">This account isn't billed yet. Seats and costs below are what billing would look like.</p>
      )}
      {data.read_only && (
        <p className="text-sm rounded-lg bg-red-50 text-red-700 px-4 py-3">
          The account is read-only until billing is sorted out. Update the payment method or pay the open invoice below, and editing comes back straight away.
        </p>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscription</p>
          {status && <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TONES[status.tone])}>{status.text}</span>}
        </div>
        <div className="divide-y divide-slate-100">
          <Row label={`Full seats · ${money(data.seat_price_cents)} each`}>{data.full_seats}</Row>
          <Row label={`Viewer seats · ${money(data.viewer_seat_price_cents)} each`}>{data.viewer_seats}</Row>
          <Row label="Pending invites (not billed)">{data.pending_invites}</Row>
          <Row label="Monthly, before tax">{money(data.estimated_monthly_cents)}</Row>
          {data.ai_usage && (
            <Row label={`AI assistant this month · ${new Intl.NumberFormat().format(data.ai_usage.tokens)} tokens`}>
              {money(data.ai_usage.billable_cents)}
              <span className="block text-xs font-normal text-slate-500">
                {data.ai_usage.allowance_kind === 'CREDIT'
                  ? `after ${money(data.ai_usage.allowance_amount)} free`
                  : `after ${new Intl.NumberFormat().format(data.ai_usage.allowance_amount)} free tokens`}
                {data.ai_usage.cap_cents != null ? ` · capped at ${money(data.ai_usage.cap_cents)}` : ''}
              </span>
            </Row>
          )}
          {subscribed && (
            <Row label={data.cancel_at_period_end ? 'Ends on' : 'Renews on'}>{formatDate(data.current_period_end)}</Row>
          )}
        </div>
        {data.billing_enabled && (
          <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {(data.needs_setup || (data.read_only && !data.has_payment_account) || data.subscription_status === 'canceled') && (
              <Button size="sm" disabled={checkout.isPending} onClick={() => checkout.mutate()} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
                {checkout.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5 mr-1.5" />}
                Set up billing
              </Button>
            )}
            {data.has_payment_account && (
              <Button size="sm" variant="outline" disabled={portal.isPending} onClick={() => portal.mutate()}>
                {portal.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
                Manage billing
              </Button>
            )}
            <p className="text-xs text-slate-400">Seats are counted as people sign in. Changes are prorated on the next invoice.</p>
            {error && <p className="text-xs text-red-600 w-full">{error}</p>}
          </div>
        )}
      </div>

      {data.invoices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{invoice.number || 'Draft invoice'}</p>
                  <p className="text-xs text-slate-500">{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm tabular-nums text-slate-700">{formatMoney(invoice.total, invoice.currency)}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', invoice.status === 'paid' ? TONES.ok : invoice.status === 'open' ? TONES.warn : 'bg-slate-100 text-slate-600')}>
                    {invoice.status || '—'}
                  </span>
                  {invoice.hosted_invoice_url && (
                    <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-xs text-[#002046] underline">
                      {invoice.status === 'open' ? 'Pay' : 'View'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
