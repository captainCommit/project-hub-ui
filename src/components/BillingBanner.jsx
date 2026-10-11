import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useMyAccess } from '@/hooks/useMyAccess';

const BILLING_LINK = '/Account?tab=billing';

const dismissKey = (accountId, kind) => `billing-banner-dismissed:${accountId}:${kind}`;

function wasDismissed(key) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * A slim bar above the page for the selected account's billing: read-only (everyone), or a failed
 * payment or missing card (owners). It sits in the layout, so it never covers drawers or content.
 */
export default function BillingBanner() {
  const { selectedAccountId } = useAuth();
  const { access, isOwner } = useMyAccess();
  const [dismissedKeys, setDismissedKeys] = useState(() => new Set());
  const billing = access?.billing;
  if (!billing) return null;

  let notice = null;
  if (billing.read_only) {
    notice = isOwner
      ? {
          kind: 'read-only',
          tone: 'bad',
          text: 'This account is read-only because payment failed after every retry. Nothing has been deleted.',
          action: 'Update payment to unlock',
          sticky: true,
        }
      : {
          kind: 'read-only',
          tone: 'bad',
          text: 'This account is read-only until an account owner updates billing. You can still view everything.',
          sticky: true,
        };
  } else if (isOwner && billing.past_due) {
    notice = {
      kind: 'past-due',
      tone: 'warn',
      text: "The last payment didn't go through. Stripe will retry over the next few days; if every retry fails, the account becomes read-only.",
      action: 'Update card',
    };
  } else if (isOwner && billing.needs_setup) {
    notice = {
      kind: 'needs-setup',
      tone: 'warn',
      text: 'Billing is on for this account. Add a payment method to start the subscription.',
      action: 'Add payment method',
    };
  }
  if (!notice) return null;
  const key = dismissKey(selectedAccountId, notice.kind);
  if (!notice.sticky && (dismissedKeys.has(key) || wasDismissed(key))) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // Private windows can refuse storage; hiding it for this page view is enough.
    }
    setDismissedKeys((prev) => new Set(prev).add(key));
  };

  return (
    <div
      role="status"
      className={cn(
        'shrink-0 h-9 px-4 flex items-center gap-2 text-xs border-b',
        notice.tone === 'bad' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900',
      )}
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <p className="flex-1 min-w-0 truncate" title={notice.text}>{notice.text}</p>
      {isOwner && notice.action && (
        <Link
          to={BILLING_LINK}
          className={cn(
            'shrink-0 rounded-md px-2.5 py-1 font-semibold',
            notice.tone === 'bad' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700',
          )}
        >
          {notice.action}
        </Link>
      )}
      {!notice.sticky && (
        <button type="button" onClick={dismiss} aria-label="Dismiss for now" className="shrink-0 opacity-60 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
