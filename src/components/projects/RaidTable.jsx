import React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import { parseDate } from '@/lib/dateUtils';
import {
  FilterBar, SearchInput, FilterSelect, optionsFrom, Pill, PriorityPill, TitleCell, DetailsChevron, ExportButton, PrimaryButton, NAVY,
} from './DirectoryKit';

// What the RAID tabs share. The filters live on the RAID page, so picking Project A on Risks still shows Project A on
// Issues; the status filter is cleared on a tab change because each log has its own statuses.

export const EMPTY_RAID_FILTERS = { portfolios: [], programs: [], projects: [], search: '', status: '', priority: '', assignee: '' };

const STATUS_TONES = {
  open: 'grey', draft: 'grey', closed: 'grey', cancelled: 'grey',
  mitigating: 'blue', in_progress: 'blue',
  in_review: 'amber', pending: 'amber',
  resolved: 'green', validated: 'green', approved: 'green',
  blocked: 'orange',
  escalated: 'red', invalidated: 'red',
};

export const raidStatusLabel = (status) => (status
  ? String(status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  : 'Open');

const RAID_PILL = 'rounded-md px-3 py-1 text-[13px] font-semibold';

export function RaidStatusPill({ status, openTone = 'grey' }) {
  const tone = status === 'open' ? openTone : (STATUS_TONES[status] || 'grey');
  return <Pill tone={tone} className={RAID_PILL}>{raidStatusLabel(status)}</Pill>;
}

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

/** Whether an item falls inside the chosen portfolios, programs and projects. */
export function inRaidScope(item, filters, programs) {
  if (filters.portfolios.length) {
    const programIds = programs.filter(p => filters.portfolios.includes(p.portfolio_id)).map(p => p.id);
    if (!item.program_id || !programIds.includes(item.program_id)) return false;
  }
  if (filters.programs.length && !filters.programs.includes(item.program_id)) return false;
  if (filters.projects.length && !filters.projects.includes(item.project_id)) return false;
  return true;
}

/** Scope plus the search box (code or title), status, priority and assignee. */
export function filterRaidItems(items, filters, programs, idField) {
  const q = filters.search.trim().toLowerCase();
  return items.filter(item => {
    if (!inRaidScope(item, filters, programs)) return false;
    if (q && !(item.title || '').toLowerCase().includes(q) && !String(item[idField] || '').toLowerCase().includes(q)) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && (item.priority || 'medium') !== filters.priority) return false;
    if (filters.assignee && item.assigned_to !== filters.assignee) return false;
    return true;
  });
}

/** Projects offered in the project filter: those inside the chosen portfolios and programs. */
function projectOptions(filters, projects, programs) {
  const programIds = programs
    .filter(p => (!filters.portfolios.length || filters.portfolios.includes(p.portfolio_id)))
    .filter(p => (!filters.programs.length || filters.programs.includes(p.id)))
    .map(p => p.id);
  return projects.filter(p => programIds.includes(p.program_id)).map(p => ({ value: p.id, label: p.name }));
}

export function RaidToolbar({
  filters, onFiltersChange, items, projects, programs, statuses = undefined, showPriority = true, assigneeLabel = 'Assigned To',
  searchPlaceholder = undefined,
}) {
  const set = (patch) => onFiltersChange({ ...filters, ...patch });
  const statusOptions = statuses
    || optionsFrom(items.map(i => i.status)).map(o => ({ value: o.value, label: raidStatusLabel(o.value) }));
  const narrowedAbove = filters.portfolios.length > 0 || filters.programs.length > 0;
  return (
    <FilterBar bare>
      <SearchInput value={filters.search} onChange={search => set({ search })} placeholder={searchPlaceholder} className="max-w-[760px] flex-[2]" />
      <MultiSelectFilter
        options={projectOptions(filters, projects, programs)}
        selected={filters.projects}
        onChange={projectIds => set({ projects: projectIds })}
        allLabel="All Projects"
        className="h-10 w-auto min-w-[200px] px-4 gap-6 rounded-lg border-slate-200 text-[15px] font-semibold text-[#002046] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#002046]"
      />
      <FilterSelect value={filters.status} onChange={status => set({ status })} allLabel="Status" options={statusOptions} />
      {showPriority && <FilterSelect value={filters.priority} onChange={priority => set({ priority })} allLabel="Priority" options={PRIORITY_OPTIONS} />}
      <FilterSelect value={filters.assignee} onChange={assignee => set({ assignee })} allLabel={assigneeLabel} options={optionsFrom(items.map(i => i.assigned_to))} />
      {narrowedAbove && (
        <button type="button" onClick={() => set({ portfolios: [], programs: [] })} title="Portfolio and program filters set on the Overview"
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
          <X className="w-3.5 h-3.5" /> Clear portfolio/program
        </button>
      )}
    </FilterBar>
  );
}

/** Export and New buttons, shown on the RAID tab row (slot) when there is one, otherwise in place. */
export function RaidActions({ slot, noun, onExport, onNew, exportDisabled = false }) {
  const buttons = (
    <>
      <ExportButton onClick={onExport} disabled={exportDisabled} />
      <PrimaryButton icon={Plus} onClick={onNew}>New {noun}</PrimaryButton>
    </>
  );
  return slot ? createPortal(buttons, slot) : <div className="flex justify-end gap-2">{buttons}</div>;
}

const formatDay = (value) => {
  if (!value) return '—';
  try { return format(parseDate(value), 'MMM d, yyyy'); } catch { return value; }
};

/**
 * The columns the RAID tabs use: the item (code, title, project), then priority, status, a person and a date.
 * dateLabel/dateField and person (label) vary by log; showPriority is off for assumptions.
 */
export function raidColumns({ noun, idField, getProjectName, showPriority = true, person = undefined, dateLabel = 'Target Date', dateField = 'target_date' }) {
  return [
    {
      key: 'item', label: noun, sortValue: r => r[idField],
      render: r => <TitleCell code={r[idField]} title={r.title || r.description || '—'} sub={`Project: ${getProjectName(r.project_id)}`} />,
    },
    ...(showPriority ? [{ key: 'priority', label: 'Priority', sortValue: r => PRIORITY_RANK[r.priority || 'medium'], render: r => <PriorityPill priority={r.priority} className={RAID_PILL} /> }] : []),
    { key: 'status', label: 'Status', sortValue: r => raidStatusLabel(r.status), render: r => <RaidStatusPill status={r.status} openTone={noun === 'Dependency' ? 'blue' : 'grey'} /> },
    ...(person ? [{ key: 'person', label: person, sortValue: r => r.assigned_to, render: r => <span className="text-sm" style={{ color: NAVY }}>{r.assigned_to || '—'}</span> }] : []),
    { key: 'date', label: dateLabel, sortValue: r => r[dateField], render: r => <span className="text-sm whitespace-nowrap" style={{ color: NAVY }}>{formatDay(r[dateField])}</span> },
    { key: 'open', label: 'Details', className: 'w-16', render: () => <DetailsChevron /> },
  ];
}
