import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyAccess } from '@/hooks/useMyAccess';

const BILLING_LINK = '/Account?tab=billing';

/** Billing notices for the selected account: read-only (everyone), overdue or no card yet (owners). */
export default function BillingBanner() {
  const { access, isOwner } = useMyAccess();
  const [dismissed, setDismissed] = useState(false);
  const billing = access?.billing;
  if (!billing) return null;

  let notice = null;
  if (billing.read_only) {
    notice = {
      tone: 'bad',
      text: isOwner
        ? 'This account is read-only until billing is sorted out.'
        : 'This account is read-only until an owner sorts out billing. You can still view everything.',
      sticky: true,
    };
  } else if (isOwner && billing.past_due) {
    notice = { tone: 'warn', text: "The last payment didn't go through. Stripe will retry; update the card to avoid interruption." };
  } else if (isOwner && billing.needs_setup) {
    notice = { tone: 'warn', text: 'Billing is now on for this account. Add a payment method to keep things running.' };
  }
  if (!notice || (dismissed && !notice.sticky)) return null;

  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 text-sm',
        notice.tone === 'bad' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900',
      )}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="flex-1">
        {notice.text}
        {isOwner && (
          <> <Link to={BILLING_LINK} className="font-semibold underline">Go to billing</Link></>
        )}
      </p>
      {!notice.sticky && (
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
