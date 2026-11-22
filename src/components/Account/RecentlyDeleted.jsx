import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, subDays } from 'date-fns';
import { Calendar, Info, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { toast, toastError } from '@/components/ui/use-toast';
import { DataTable, FilterSelect, SearchInput, NAVY, MUTED } from '@/components/projects/DirectoryKit';
import { invalidateHierarchy } from '@/hooks/useAccountLookups';
import { recentlyDeletedApi, RECENTLY_DELETED_QUERY_KEY } from '@/api/recentlyDeleted';

const TYPE_LABELS = { portfolio: 'Portfolio', program: 'Program', project: 'Project' };
const TYPE_COLORS = {
  portfolio: { bg: '#E0E7FF', fg: '#4338CA' },
  program: { bg: '#DBEAFE', fg: '#1D4ED8' },
  project: { bg: '#FEF3C7', fg: '#B45309' },
};
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const DATE_WINDOWS = [
  { value: '1', label: 'Deleted: Last 24 hours' },
  { value: '7', label: 'Deleted: Last 7 days' },
  { value: '30', label: 'Deleted: Last 30 days' },
];

const fmt = (iso) => { try { return format(parseISO(iso), 'MMM d, yyyy, h:mm a'); } catch { return '—'; } };

function TypePill({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.project;
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.fg }}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

/** What a restore brings back, in words: "the program and its 3 projects". */
const contents = (item) => {
  const label = TYPE_LABELS[item.type]?.toLowerCase() || 'item';
  if (item.type === 'project' || !item.project_count) return `the ${label}`;
  return `the ${label} and its ${item.project_count} project${item.project_count === 1 ? '' : 's'}`;
};

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-2 text-sm border-b border-slate-100 last:border-b-0">
      <span style={{ color: MUTED }}>{label}</span>
      <span className="text-slate-800 break-words">{children || '—'}</span>
    </div>
  );
}

/**
 * Account > Recently deleted: one table of deleted portfolios, programs and projects that can be restored
 * (with everything under them) or permanently deleted. Owners see the whole account; others what they deleted.
 */
export default function RecentlyDeleted({ accountId, onBack }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [days, setDays] = useState('30');
  const [selected, setSelected] = useState(() => new Set());
  const [details, setDetails] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [RECENTLY_DELETED_QUERY_KEY, accountId],
    queryFn: () => recentlyDeletedApi.list(accountId),
    enabled: !!accountId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: [RECENTLY_DELETED_QUERY_KEY, accountId] });

  const filtered = useMemo(() => {
    const since = subDays(new Date(), Number(days));
    const term = search.trim().toLowerCase();
    return items.filter(item => {
      if (type && item.type !== type) return false;
      if (parseISO(item.deleted_at) < since) return false;
      if (term && ![item.name, item.description, item.location, item.deleted_by_name].some(v => (v || '').toLowerCase().includes(term))) return false;
      return true;
    });
  }, [items, search, type, days]);

  // Only rows still on the list count as selected.
  const selectedIds = filtered.filter(item => selected.has(item.id)).map(item => item.id);
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(item => item.id)));

  const restore = useMutation({
    mutationFn: (item) => recentlyDeletedApi.restore(item.id),
    onSuccess: (_result, item) => {
      invalidateHierarchy(queryClient);
      refresh();
      toast({ title: `${TYPE_LABELS[item.type]} restored`, description: `${item.name} is back where it was, with everything that was in it.` });
    },
    onError: (error) => toastError(error.message || 'This item could not be restored.'),
  });

  const removeForever = async (list) => {
    if (!list.length) return;
    const one = list.length === 1 ? list[0] : null;
    const ok = await confirmAction({
      title: one ? `Permanently delete "${one.name}"?` : `Permanently delete ${list.length} items?`,
      description: one
        ? `This removes ${contents(one)} for good. It cannot be restored afterwards.`
        : 'These items, and everything that was in them, are removed for good. They cannot be restored afterwards.',
      confirmLabel: 'Permanently Delete',
    });
    if (!ok) return;
    const results = await Promise.allSettled(list.map(item => recentlyDeletedApi.deletePermanently(item.id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    setSelected(new Set());
    refresh();
    if (failed) toastError(`${failed} of ${list.length} items could not be permanently deleted.`);
    else toast({ title: list.length === 1 ? 'Permanently deleted' : `${list.length} items permanently deleted` });
  };

  const columns = [
    {
      key: 'select', headerClassName: 'w-10', className: 'w-10',
      label: <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#002046]" />,
      render: r => <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} />,
    },
    {
      key: 'name', label: 'Name', sortValue: r => r.name.toLowerCase(), render: r => (
        <div className="min-w-0 max-w-[420px]">
          <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{r.name}</p>
          {(r.description || r.location) && <p className="text-xs truncate" style={{ color: MUTED }}>{r.description || r.location}</p>}
        </div>
      ),
    },
    { key: 'type', label: 'Type', sortValue: r => r.type, render: r => <TypePill type={r.type} /> },
    { key: 'deleted', label: 'Deleted On', sortValue: r => r.deleted_at, render: r => <span className="text-sm text-slate-600 whitespace-nowrap">{fmt(r.deleted_at)}</span> },
    { key: 'by', label: 'Deleted By', sortValue: r => r.deleted_by_name, render: r => <span className="text-sm text-slate-700">{r.deleted_by_name || '—'}</span> },
    {
      key: 'action', label: 'Action', headerClassName: 'text-right', render: r => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white" style={{ color: NAVY }}
            disabled={!r.can_restore || (restore.isPending && restore.variables?.id === r.id)} onClick={() => restore.mutate(r)}>
            <RotateCcw className="w-3.5 h-3.5" /> Restore
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="p-1.5 rounded border border-slate-200 hover:bg-slate-100" aria-label="More actions">
                <MoreHorizontal className="w-4 h-4" style={{ color: NAVY }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-red-600 focus:text-red-600" disabled={!r.can_restore} onClick={() => removeForever([r])}>
                <Trash2 className="w-4 h-4 mr-2" /> Permanently Delete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDetails(r)}>
                <Info className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="text-xs mb-2" style={{ color: MUTED }}>
            <button type="button" className="hover:underline" onClick={onBack}>Settings</button>
            <span className="mx-1.5">/</span>
            <span style={{ color: NAVY }}>Recently Deleted</span>
          </nav>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight" style={{ color: NAVY }}>Recently Deleted</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Deleted items are retained for 30 days. Restore items to return them to their original location with all associated data.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#EEF4FF', color: '#1D4ED8' }}>
          <Info className="w-4 h-4 flex-shrink-0" />
          Items are automatically and permanently deleted after 30 days.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search deleted items..." />
        <FilterSelect value={type} onChange={setType} allLabel="All Types" options={TYPE_OPTIONS} />
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-10 w-auto min-w-[200px] gap-2 rounded-lg text-[15px] border-slate-200" style={{ color: NAVY }}>
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto h-10 gap-2 bg-white" disabled={!selectedIds.length}
          onClick={() => removeForever(filtered.filter(item => selected.has(item.id)))}>
          <Trash2 className="w-4 h-4" /> Permanently Delete
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        noun="deleted items"
        minWidth={860}
        empty={isLoading ? 'Loading…' : items.length ? 'Nothing matches these filters.' : 'Nothing has been deleted in the last 30 days.'}
      />
      <p className="text-xs -mt-1" style={{ color: MUTED }}>{selectedIds.length} of {filtered.length} selected</p>

      <Dialog open={!!details} onOpenChange={(open) => { if (!open) setDetails(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: NAVY }}>{details?.name}</DialogTitle>
          </DialogHeader>
          {details && (
            <div>
              <DetailRow label="Type"><TypePill type={details.type} /></DetailRow>
              <DetailRow label="Description">{details.description}</DetailRow>
              <DetailRow label="Was in">{details.location || (details.type === 'portfolio' ? 'Top level' : '')}</DetailRow>
              {details.type !== 'project' && <DetailRow label="Projects inside">{details.project_count}</DetailRow>}
              <DetailRow label="Deleted on">{fmt(details.deleted_at)}</DetailRow>
              <DetailRow label="Deleted by">{details.deleted_by_name}</DetailRow>
              <DetailRow label="Permanently deleted on">{fmt(details.expires_at)}</DetailRow>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
                <Button disabled={!details.can_restore} className="gap-1.5 text-white" style={{ backgroundColor: NAVY }}
                  onClick={() => { restore.mutate(details); setDetails(null); }}>
                  <RotateCcw className="w-4 h-4" /> Restore
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
