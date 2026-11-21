export const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  validated: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  declined: 'bg-red-100 text-red-700',
  invalidated: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-600',
  draft: 'bg-slate-100 text-slate-600',
  in_review: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-orange-100 text-orange-700',
  no_longer_required: 'bg-slate-200 text-slate-500',
};

export const getStatusColor = (value) => {
  if (!value) return 'bg-slate-100 text-slate-500';
  if (STATUS_COLORS[value]) return STATUS_COLORS[value];
  // Auto-assign by keyword
  const v = value.toLowerCase();
  if (['open', 'active', 'in_progress'].some(k => v.includes(k))) return 'bg-blue-100 text-blue-700';
  if (['resolv', 'valid', 'approv', 'complet', 'done'].some(k => v.includes(k))) return 'bg-emerald-100 text-emerald-700';
  if (['cancel', 'declin', 'invalid', 'reject'].some(k => v.includes(k))) return 'bg-red-100 text-red-600';
  if (['review', 'pending'].some(k => v.includes(k))) return 'bg-yellow-100 text-yellow-700';
  if (['close', 'draft', 'no_longer'].some(k => v.includes(k))) return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-500';
};

// Used until the account's own lists load (see useStatusOptions); Account > Settings edits those.
export const RAID_DEFAULTS = {
  risk: [
    { value: 'open', label: 'Open' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  issue: [
    { value: 'open', label: 'Open' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  assumption: [
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'In Review' },
    { value: 'validated', label: 'Validated' },
    { value: 'invalidated', label: 'Invalidated' },
    { value: 'closed', label: 'Closed' },
  ],
  decision: [
    { value: 'draft', label: 'Draft' },
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'deferred', label: 'Deferred' },
  ],
  dependency: [
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'In Review' },
    { value: 'closed', label: 'Closed' },
    { value: 'escalated', label: 'Escalated' },
  ],
  change_request: [
    { value: 'draft', label: 'Draft' },
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'implemented', label: 'Implemented' },
  ],
};
