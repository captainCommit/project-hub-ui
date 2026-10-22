import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Download, Info, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Shared building blocks for the list pages (directories, requirements, testing, RAID): a page header, stat cards,
// a filter bar and a navy-headed table with sorting and pages.
// Colours are hex values on purpose: index.css remaps Tailwind's blue/green/amber classes to the brand navy/orange.

export const NAVY = '#002046';
export const ORANGE = '#c87b14';
export const MUTED = '#6B7C99';
// Secondary cell text (owners, counts, dates): a softer navy than titles.
export const SOFT = '#2F4B7E';
const CARD_BORDER = '#E6ECF4';

// Sampled from the designer's mockups.
export const TONES = {
  red: { bg: '#FDE8E8', fg: '#E5242A', dot: '#EE1111' },
  amber: { bg: '#FEF1DC', fg: '#E09A00', dot: '#F9B305' },
  yellow: { bg: '#FDF0C6', fg: '#B86A05', dot: '#E9A10B' },
  orange: { bg: '#FDE6D9', fg: '#E35B10', dot: '#EA580C' },
  green: { bg: '#DDF5E7', fg: '#0E9254', dot: '#0A9D63' },
  blue: { bg: '#E1EDFE', fg: '#1A73F0', dot: '#1677FF' },
  purple: { bg: '#E4E0FD', fg: '#3A1FC0', dot: '#5B3FE0' },
  grey: { bg: '#EEF1F5', fg: '#3B4B68', dot: '#94A3B8' },
  // The sprint board and Testing draw priorities in their own softer set.
  coral: { bg: '#FDE2D3', fg: '#DC250C', dot: '#DC250C' },
  sand: { bg: '#FCF0D8', fg: '#94470F', dot: '#D98A06' },
  mint: { bg: '#E0F4EC', fg: '#0C7754', dot: '#0C7754' },
};

/** Page title row: icon, title and subtitle on the left, the main actions on the right. */
export function PageHeader({ icon: Icon = undefined, iconBox = true, title, subtitle = undefined, actions = undefined, className = undefined }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (iconBox ? (
            <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF2F8' }}>
              <Icon className="w-5 h-5" style={{ color: NAVY }} />
            </span>
          ) : <Icon className="w-6 h-6 flex-shrink-0" style={{ color: NAVY }} />)}
          <h1 className="text-[30px] leading-tight font-bold tracking-tight" style={{ color: NAVY }}>{title}</h1>
        </div>
        {subtitle && <p className="text-[15px] mt-1" style={{ color: MUTED }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/** The orange call to action ("New Portfolio", "New Risk", ...). */
export function PrimaryButton({ icon: Icon = undefined, children, className = undefined, ...props }) {
  return (
    <Button {...props} className={cn('h-11 px-5 rounded-lg text-[15px] font-semibold text-white border-0 shadow-sm hover:opacity-90', className)}
      style={{ background: 'linear-gradient(180deg, #D27D14 0%, #C66E0C 100%)' }}>
      {Icon && <Icon className="w-5 h-5 mr-2" />}{children}
    </Button>
  );
}

export function ExportButton({ onClick, disabled = false }) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled} className="h-10 px-4 rounded-lg bg-white text-[15px] font-medium border-slate-200" style={{ color: NAVY }}>
      <Download className="w-4 h-4 mr-2" /> Export
    </Button>
  );
}

export function StatGrid({ children, className = undefined }) {
  return <div className={cn('grid gap-3 grid-cols-1 sm:grid-cols-2', className)}>{children}</div>;
}

/** A white card with a big number, a label and a muted line underneath, and an optional icon in the corner (or, with iconLeft, before the number). */
export function StatCard({ value, label, sub = undefined, icon: Icon = undefined, iconLeft = false }) {
  if (iconLeft) {
    return (
      <div className="bg-white rounded-xl border px-5 py-4 flex items-center gap-4 min-w-0" style={{ borderColor: CARD_BORDER }}>
        {Icon && (
          <span className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF2F8' }}>
            <Icon className="w-5 h-5" style={{ color: NAVY }} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[26px] font-bold leading-none" style={{ color: NAVY }}>{value}</p>
          <p className="text-[15px] font-bold mt-1.5 truncate" style={{ color: NAVY }}>{label}</p>
          {sub && <p className="text-[13px] truncate" style={{ color: MUTED }}>{sub}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border px-5 py-5 flex items-start justify-between gap-3 min-w-0" style={{ borderColor: CARD_BORDER }}>
      <div className="min-w-0">
        <p className="text-[30px] font-bold leading-none" style={{ color: NAVY }}>{value}</p>
        <p className="text-[15px] font-bold mt-3 truncate" style={{ color: NAVY }}>{label}</p>
        {sub && <p className="text-[13px] mt-0.5 leading-snug" style={{ color: MUTED }}>{sub}</p>}
      </div>
      {Icon && (
        <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF2F8' }}>
          <Icon className="w-5 h-5" style={{ color: NAVY }} />
        </span>
      )}
    </div>
  );
}

/** The white bar that holds the search box, filter dropdowns and (on the right) export. */
export function FilterBar({ children, right = undefined, bare = false }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', !bare && 'bg-white rounded-xl border p-3')} style={bare ? undefined : { borderColor: CARD_BORDER }}>
      {children}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = undefined, className = undefined }) {
  return (
    <div className={cn('relative flex-1 min-w-[220px] max-w-sm', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: NAVY }} />
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-10 pl-10 rounded-lg text-[15px] border-slate-200" />
    </div>
  );
}

const ALL = '__all';

/** A dropdown whose first option means "no filter". value '' is that option; options are [{ value, label }]. */
export function FilterSelect({ value, onChange, allLabel, options, className = undefined }) {
  return (
    <Select value={value || ALL} onValueChange={v => onChange(v === ALL ? '' : v)}>
      <SelectTrigger className={cn('h-10 w-auto min-w-[140px] max-w-[240px] gap-3 rounded-lg text-[15px] border-slate-200', className)} style={{ color: NAVY }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Distinct, sorted dropdown options from a list of values (blanks left out). */
export const optionsFrom = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  .map(v => ({ value: v, label: v }));

export function Pill({ tone = 'grey', dot = false, icon = undefined, children, className = undefined }) {
  const t = TONES[tone] || TONES.grey;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', className)}
      style={{ backgroundColor: t.bg, color: t.fg }}>
      {dot && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.dot }} />}
      {icon}
      {children}
    </span>
  );
}

const PRIORITY_TONES = { critical: 'red', high: 'orange', medium: 'grey', low: 'grey' };

export function PriorityPill({ priority, className = undefined, tones = PRIORITY_TONES }) {
  const key = String(priority || 'medium').toLowerCase();
  return <Pill tone={tones[key] || 'grey'} className={className}>{key.charAt(0).toUpperCase() + key.slice(1)}</Pill>;
}

// Portfolio, program and project statuses. The API's option values are Active / On Hold / Complete / Cancelled;
// older records use planning / active / completed.
const WORK_STATUS = {
  planning: { label: 'Not started', tone: 'grey' },
  not_started: { label: 'Not started', tone: 'grey' },
  active: { label: 'In progress', tone: 'blue' },
  in_progress: { label: 'In progress', tone: 'blue' },
  on_hold: { label: 'On hold', tone: 'amber' },
  complete: { label: 'Completed', tone: 'green' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const isCompleteStatus = (status) => status === 'complete' || status === 'completed';

export const workStatusInfo = (status) => WORK_STATUS[status] || { label: status ? String(status).replace(/_/g, ' ') : 'Not started', tone: 'grey' };

/** Status filter options covering both spellings, keyed by the label so "Completed" matches complete and completed. */
export const WORK_STATUS_OPTIONS = ['Not started', 'In progress', 'On hold', 'Completed', 'Cancelled'].map(l => ({ value: l, label: l }));

/** The small filled blue square the design puts in front of "In progress". */
const InProgressIcon = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="flex-shrink-0">
    <rect width="12" height="12" rx="2.5" fill="#2563EB" />
    <path d="M6 3.2v5.6M3.2 6h5.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export function WorkStatusPill({ status }) {
  const info = workStatusInfo(status);
  return (
    <Pill tone={info.tone} dot={info.tone === 'amber'} icon={info.tone === 'blue' ? InProgressIcon : undefined} className="px-3 py-1 text-[13px]">
      {info.label}
    </Pill>
  );
}

const CLOSED_RAID = new Set(['closed', 'resolved', 'mitigated', 'cancelled']);
export const isOpenRaid = (item) => !CLOSED_RAID.has(item.status);
export const isHighOrCritical = (item) => item.priority === 'critical' || item.priority === 'high';

/** "12 risks · 6 issues" */
export const riskIssueLine = (risks, issues) => `${risks} risk${risks === 1 ? '' : 's'} · ${issues} issue${issues === 1 ? '' : 's'}`;

// RAG health ('red' | 'amber' | 'green' | 'grey') as a pill.
const HEALTH_TONES = { red: 'red', amber: 'amber', green: 'green', grey: 'grey' };

export function HealthPill({ rag }) {
  return (
    <span title={rag.description}>
      <Pill tone={HEALTH_TONES[rag.key] || 'grey'} dot className="px-3 py-1 text-[13px]">{rag.label}</Pill>
    </span>
  );
}

export function CompletionBar({ pct }) {
  const value = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return (
    <div className="flex items-center gap-2.5 min-w-[140px]">
      <div className="w-[92px] h-2 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#EAF0F6' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: value >= 100 ? '#00306E' : '#3392FD' }} />
      </div>
      <span className="text-[13px]" style={{ color: MUTED }}>{value}%</span>
    </div>
  );
}

/** A table's main cell: a small code line, the title in bold, and a muted line (usually the project). */
export function TitleCell({ code = undefined, title, sub = undefined, leading = undefined, dense = false }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {leading}
      <div className="min-w-0">
        {code && <p className={cn('leading-tight', dense ? 'text-[11px]' : 'text-xs')} style={{ color: MUTED }}>{code}</p>}
        <p className={cn('font-bold leading-snug', dense ? 'text-[13px] leading-tight' : 'text-sm')} style={{ color: NAVY }}>{title}</p>
        {sub && <p className={cn('leading-tight', dense ? 'text-[11px]' : 'text-xs mt-0.5')} style={{ color: MUTED }}>{sub}</p>}
      </div>
    </div>
  );
}

/** Red when there is something open, a muted dash-free zero otherwise. */
export function CountCell({ value }) {
  return <span className="text-sm font-medium" style={{ color: value > 0 ? '#F21818' : SOFT }}>{value}</span>;
}

const compare = (a, b) => {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * A navy-headed table with click-to-sort headers and pages.
 * columns: [{ key, label, render(row), sortValue?(row), info?, className?, headerClassName? }]; a column sorts when it has sortValue.
 * noun: what a row is, for the "Showing 10 of 24 projects" line.
 */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick = undefined, noun = 'items', empty = undefined, initialSort = undefined, minWidth = 900, rowClassName = undefined, dense = false }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sorted = useMemo(() => {
    const column = sort && columns.find(c => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const out = [...rows].sort((a, b) => compare(column.sortValue(a), column.sortValue(b)));
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // A filter that shrinks the list shouldn't strand the person on an empty page.
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const shown = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key) => setSort(prev => (prev?.key === key
    ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null)
    : { key, dir: 'asc' }));

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth }}>
            <thead>
              <tr style={{ backgroundColor: NAVY }}>
                {columns.map(c => (
                  <th key={c.key} className={cn('text-left px-4 text-[13px] font-semibold text-white whitespace-nowrap', dense ? 'py-2.5' : 'py-3.5', c.headerClassName)}>
                    <span className="inline-flex items-center gap-1">
                      {c.sortValue ? (
                        <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:opacity-80">
                          {c.label}
                          {sort?.key === c.key
                            ? (sort.dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
                            : <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />}
                        </button>
                      ) : c.label}
                      {c.info && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="w-3.5 h-3.5 opacity-80 cursor-help" /></TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-xs font-normal">{c.info}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={columns.length} className="px-4 py-14 text-center text-sm text-slate-400">{empty || `No ${noun} found.`}</td></tr>
              )}
              {shown.map(row => (
                <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('border-b border-slate-100 last:border-b-0 hover:bg-slate-50', onRowClick && 'cursor-pointer', rowClassName?.(row))}>
                  {columns.map(c => <td key={c.key} className={cn('px-4 align-middle', dense ? 'py-1.5' : 'py-3', c.className)}>{c.render(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination noun={noun} total={sorted.length} shown={shown.length} page={page} pageCount={pageCount} pageSize={pageSize}
        onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
    </div>
  );
}

function pageWindow(page, pageCount) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
}

export function Pagination({ noun, total, shown, page, pageCount, pageSize, onPage, onPageSize }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm" style={{ color: MUTED }}>
      <span>Showing {shown} of {total} {noun}</span>
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={v => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[72px] text-sm bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pageWindow(page, pageCount).map(n => (
          <button key={n} type="button" onClick={() => onPage(n)}
            className={cn('min-w-[32px] h-8 px-2 rounded-md text-sm', n === page ? 'border bg-white font-semibold' : 'hover:bg-slate-100')}
            style={n === page ? { borderColor: '#3B82F6', color: NAVY } : undefined}>
            {n}
          </button>
        ))}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function DetailsChevron() {
  return <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />;
}

/** The light grey page body the list pages sit on. */
export function PageBody({ children, className = undefined }) {
  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: '#F7F9FC' }}>
      <div className={cn('px-6 py-6 space-y-4', className)}>{children}</div>
    </div>
  );
}
