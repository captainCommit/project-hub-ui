import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseISO, isValid, startOfMonth, addMonths, differenceInCalendarDays, format, startOfYear, endOfYear } from 'date-fns';
import { Edit2, Check, X, ChevronRight, ChevronDown, AlertTriangle, AlertCircle, CheckCircle2, Calendar, BarChart3, Coins, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAccountResources, useAccountTasks, useAllocationOverrides } from '@/hooks/useAccountLookups';
import StarButton from './StarButton';
import { RAG } from './HealthIndicator';
import { Pill, NAVY, MUTED, TONES, isOpenRaid, isHighOrCritical } from './DirectoryKit';
import { computeResourceWeekly, allocationPct } from '@/components/resources/ResourceKit';

// Building blocks for the portfolio and program dashboards: header, stat tiles, performance table,
// critical/high RAID list, timeline, budget and resource cards. Everything is worked out from the
// account's tasks, resources and RAID lists so the numbers match the directories and Resources pages.

const CARD = 'bg-white rounded-xl border border-[#E6ECF4]';
const toDate = (s) => { const d = s ? parseISO(s) : null; return d && isValid(d) ? d : null; };
const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const isDoneTask = (t) => t.status === 'done' || Number(t.progress) >= 100;
const isMilestone = (t) => /milestone/i.test(String(t.task_type || ''));

const HEALTH_PILL = { red: 'red', amber: 'amber', green: 'green', grey: 'grey' };

/** RAG health from open critical/high RAID items — the same rule the directories use. */
export function healthFor({ critHighRisks, critHighIssues, started }) {
  if (critHighIssues > 0 || critHighRisks > 3) return RAG.red;
  if (critHighRisks > 0) return RAG.amber;
  if (!started) return RAG.grey;
  return RAG.green;
}

export function HealthBadge({ rag }) {
  return <span title={rag.description}><Pill tone={HEALTH_PILL[rag.key]} className="px-2.5 py-0.5 text-[13px]">{rag.label.charAt(0).toUpperCase() + rag.label.slice(1)}</Pill></span>;
}

export function ProgressBar({ pct, width = 'w-[120px]' }) {
  const value = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="text-sm font-semibold w-10" style={{ color: NAVY }}>{value}%</span>
      <span className={cn('h-2 rounded-full overflow-hidden', width)} style={{ backgroundColor: '#E6ECF4' }}>
        <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: '#1D4ED8' }} />
      </span>
    </span>
  );
}

/**
 * Per project: task completion, health from its open critical/high RAID, and the next upcoming milestone.
 * Returns { byProject: Map(projectId -> { pct, rag, nextMilestone }), tasks }.
 */
export function useProjectRollups(projects, risks, issues) {
  const { tasks } = useAccountTasks();
  const byProject = useMemo(() => {
    const today = new Date();
    const map = new Map();
    projects.forEach(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const done = projectTasks.filter(isDoneTask).length;
      const pct = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0;
      const openRisks = risks.filter(r => r.project_id === project.id && isOpenRaid(r));
      const openIssues = issues.filter(i => i.project_id === project.id && isOpenRaid(i));
      const milestones = projectTasks.filter(t => isMilestone(t) && toDate(t.due_date || t.start_date))
        .map(t => ({ name: t.title, date: toDate(t.due_date || t.start_date), done: isDoneTask(t) }))
        .sort((a, b) => a.date - b.date);
      const nextMilestone = milestones.find(m => !m.done && m.date >= today) || null;
      map.set(project.id, {
        pct,
        rag: healthFor({
          critHighRisks: openRisks.filter(isHighOrCritical).length,
          critHighIssues: openIssues.filter(isHighOrCritical).length,
          started: pct > 0 || !['planning', 'not_started', undefined, null, ''].includes(project.status),
        }),
        nextMilestone,
        milestones,
      });
    });
    return map;
  }, [projects, tasks, risks, issues]);
  return { byProject, tasks };
}

export function DashboardHeader({ crumbs = [], title, onRename, starType, starId, color, status, progress, ownerLabel, owner, actions }) {
  const [renaming, setRenaming] = useState(false);
  const [text, setText] = useState('');
  const save = () => {
    if (text.trim() && text.trim() !== title) onRename?.(text.trim());
    setRenaming(false);
  };
  return (
    <div className="space-y-2">
      {crumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm" style={{ color: MUTED }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {c.to ? <Link to={c.to} className="hover:underline">{c.label}</Link> : <span style={{ color: NAVY }}>{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input value={text} autoFocus onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setRenaming(false); }}
                className="text-2xl font-bold h-10 max-w-sm" />
              <button type="button" onClick={save} className="p-1.5 rounded bg-emerald-600 text-white"><Check className="w-4 h-4" /></button>
              <button type="button" onClick={() => setRenaming(false)} className="p-1.5 rounded bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[28px] font-bold leading-tight truncate" style={{ color: NAVY }}>{title}</h1>
              {onRename && (
                <button type="button" title="Rename" onClick={() => { setText(title); setRenaming(true); }} className="p-1.5 rounded hover:bg-slate-100">
                  <Edit2 className="w-4 h-4" style={{ color: NAVY }} />
                </button>
              )}
              {starType && <StarButton type={starType} id={starId} name={title} color={color} iconClassName="w-5 h-5" />}
            </div>
          )}
          <span className="hidden md:block w-px h-6 bg-slate-200" />
          <span className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>Status: <HealthBadge rag={status} /></span>
          <span className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>Progress: <ProgressBar pct={progress} /></span>
          <span className="hidden md:block w-px h-6 bg-slate-300" />
          <span className="text-sm" style={{ color: MUTED }}>{ownerLabel}: <span className="font-semibold" style={{ color: NAVY }}>{owner || 'Not assigned'}</span></span>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

function Donut({ pct }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#E6ECF4" strokeWidth="6" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="#1D4ED8" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`} transform="rotate(-90 22 22)" />
    </svg>
  );
}

/** A stat tile: tinted icon (or a progress ring), a big value and a label. */
export function StatTile({ icon: Icon, tone = 'blue', value, label, ring = undefined }) {
  const t = TONES[tone];
  return (
    <div className={`${CARD} px-5 py-4 flex items-center gap-4 min-w-0`}>
      {ring !== undefined ? <Donut pct={ring} /> : (
        <span className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.bg }}>
          <Icon className="w-6 h-6" style={{ color: t.fg }} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[26px] font-bold leading-none" style={{ color: NAVY }}>{value}</p>
        <p className="text-sm mt-1 truncate" style={{ color: MUTED }}>{label}</p>
      </div>
    </div>
  );
}

export function SectionCard({ icon: Icon, title, badge = undefined, right = undefined, children, className = undefined }) {
  return (
    <div className={cn(CARD, 'p-5', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5" style={{ color: NAVY }} />
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>{title}</h2>
        {badge !== undefined && <span className="min-w-[24px] h-6 px-1.5 rounded-full text-sm font-bold flex items-center justify-center" style={{ backgroundColor: TONES.red.bg, color: TONES.red.fg }}>{badge}</span>}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </div>
  );
}

/**
 * Performance table: one row per item with its status, progress and owner, expandable to show children.
 * columns: [{ key, label, render(row) }]; rows: [{ id, name, onOpen?, children?: [{ id, name, onOpen?, cells }] , cells }].
 */
export function PerformanceTable({ columns, rows, empty }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (!rows.length) return <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left" style={{ color: NAVY }}>
            <th className="w-8" />
            {columns.map(c => <th key={c.key} className="px-3 py-2.5 font-semibold whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <React.Fragment key={row.id}>
              <tr className="border-t border-slate-100 hover:bg-slate-50">
                <td className="pl-2">
                  {row.children?.length ? (
                    <button type="button" onClick={() => toggle(row.id)} className="p-1 rounded hover:bg-slate-100" aria-label={open.has(row.id) ? 'Collapse' : 'Expand'}>
                      {open.has(row.id) ? <ChevronDown className="w-4 h-4" style={{ color: NAVY }} /> : <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />}
                    </button>
                  ) : null}
                </td>
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-3">
                    {c.key === 'name'
                      ? <button type="button" onClick={row.onOpen} className="font-semibold text-left hover:underline" style={{ color: NAVY }}>{row.name}</button>
                      : c.render(row)}
                  </td>
                ))}
              </tr>
              {open.has(row.id) && row.children.map(child => (
                <tr key={child.id} className="border-t border-slate-50 bg-slate-50/50">
                  <td />
                  {columns.map(c => (
                    <td key={c.key} className="px-3 py-2">
                      {c.key === 'name'
                        ? <button type="button" onClick={child.onOpen} className="pl-4 text-left hover:underline text-slate-600">{child.name}</button>
                        : c.render(child)}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Open critical and high priority RAID items, most severe first. items: [{ id, kind, title, where, priority, to }] */
export function AttentionList({ items }) {
  if (!items.length) {
    return (
      <div className="flex items-center gap-2 text-sm py-6 justify-center" style={{ color: MUTED }}>
        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No open critical or high RAID items.
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-[260px] overflow-y-auto">
      {items.map(item => {
        const critical = item.priority === 'critical';
        const tone = critical ? TONES.red : TONES.amber;
        const Icon = item.kind === 'Issue' ? AlertCircle : AlertTriangle;
        return (
          <Link key={`${item.kind}-${item.id}`} to={item.to} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tone.bg }}>
              <Icon className="w-5 h-5" style={{ color: tone.fg }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{item.title}</p>
              <p className="text-xs truncate" style={{ color: MUTED }}>{item.kind} · {item.where}</p>
            </div>
            <Pill tone={critical ? 'red' : 'amber'} className="px-3 py-1 text-[13px]">{critical ? 'Critical' : 'High'}</Pill>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} />
          </Link>
        );
      })}
    </div>
  );
}

const PRIORITY_RANK = { critical: 0, high: 1 };
const RAID_KINDS = [
  { key: 'risks', kind: 'Risk', tab: 'risks' },
  { key: 'issues', kind: 'Issue', tab: 'issues' },
  { key: 'assumptions', kind: 'Assumption', tab: 'assumptions' },
  { key: 'dependencies', kind: 'Dependency', tab: 'dependencies' },
];

/** The attention list's items from RAID lists: open, critical/high, in the given projects or programs. */
export function attentionItems(lists, { projectIds, programIds = [], whereFor }) {
  const projectSet = new Set(projectIds);
  const programSet = new Set(programIds);
  return RAID_KINDS.flatMap(({ key, kind, tab }) => (lists[key] || [])
    .filter(r => (projectSet.has(r.project_id) || programSet.has(r.program_id)) && isOpenRaid(r) && isHighOrCritical(r))
    .map(r => ({ id: r.id, kind, title: r.title || r.description || 'Untitled', where: whereFor(r), priority: r.priority, to: `/RiskLog?tab=${tab}&id=${r.id}` })))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

const WINDOWS = {
  next12: { label: 'Next 12 months', range: () => { const s = startOfMonth(new Date()); return [s, addMonths(s, 12)]; } },
  year: { label: 'This year', range: () => [startOfYear(new Date()), addMonths(startOfMonth(endOfYear(new Date())), 1)] },
  all: { label: 'All dates', range: null },
};

/**
 * Month timeline with a bar per row and a diamond for its key milestone.
 * rows: [{ id, name, start, end, milestone?: { name, date }, children?: rows }].
 */
export function TimelineCard({ title, rowLabel, rows }) {
  const [windowKey, setWindowKey] = useState('next12');
  const [open, setOpen] = useState(() => new Set());
  const dated = (list) => list.flatMap(r => [toDate(r.start), toDate(r.end), ...(r.children ? dated(r.children) : [])]).filter(Boolean);
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (WINDOWS[windowKey].range) return WINDOWS[windowKey].range();
    const dates = dated(rows);
    if (!dates.length) return WINDOWS.next12.range();
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    return [startOfMonth(min), addMonths(startOfMonth(max), 1)];
  }, [windowKey, rows]);
  const months = [];
  for (let m = rangeStart; m < rangeEnd; m = addMonths(m, 1)) months.push(m);
  const span = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart));
  const at = (d) => Math.max(0, Math.min(100, differenceInCalendarDays(d, rangeStart) / span * 100));
  const today = new Date();
  const showToday = today >= rangeStart && today < rangeEnd;

  const renderRow = (row, child = false) => {
    const s = toDate(row.start) || toDate(row.end), e = toDate(row.end) || toDate(row.start);
    const visible = s && e && e >= rangeStart && s < rangeEnd;
    const ms = row.milestone && row.milestone.date >= rangeStart && row.milestone.date < rangeEnd ? row.milestone : null;
    return (
      <div key={row.id} className="flex items-center border-t border-slate-100" style={{ minHeight: 40 }}>
        <div className={cn('w-[220px] flex-shrink-0 flex items-center gap-1 pr-2 text-sm truncate', child ? 'pl-7 text-slate-600' : 'pl-2 font-semibold')} style={child ? undefined : { color: NAVY }}>
          {!child && row.children?.length ? (
            <button type="button" onClick={() => setOpen(prev => { const n = new Set(prev); if (n.has(row.id)) n.delete(row.id); else n.add(row.id); return n; })} className="p-0.5">
              {open.has(row.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : !child && <span className="w-4" />}
          <span className="truncate" title={row.name}>{row.name}</span>
        </div>
        <div className="relative flex-1 h-10">
          {visible && (
            <div className="absolute top-1/2 -translate-y-1/2 h-3.5 rounded-full" title={`${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`}
              style={{ left: `${at(s)}%`, width: `${Math.max(1, at(e) - at(s))}%`, backgroundColor: child ? '#3B6FD8' : '#0B2A6F' }} />
          )}
          {ms && (
            <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 whitespace-nowrap" style={{ left: `calc(${at(ms.date)}% - 7px)` }}
              title={`${ms.name} · ${format(ms.date, 'MMM d, yyyy')}`}>
              <span className="w-3.5 h-3.5 rotate-45 bg-[#c87b14] rounded-[2px] flex-shrink-0" />
              <span className="text-xs font-medium" style={{ color: '#C2410C' }}>{ms.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <SectionCard icon={BarChart3} title={title}
      right={(
        <Select value={windowKey} onValueChange={setWindowKey}>
          <SelectTrigger className="h-9 w-[170px] gap-2"><Calendar className="w-4 h-4" /><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(WINDOWS).map(([k, w]) => <SelectItem key={k} value={k}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
      )}>
      <div className="flex items-center gap-5 -mt-2 mb-3 text-xs" style={{ color: MUTED }}>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0B2A6F]" />{rowLabel}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-[#c87b14]" />Key milestone</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px] border border-slate-100 rounded-lg">
          <div className="flex">
            <div className="w-[220px] flex-shrink-0" />
            <div className="flex-1 flex">
              {months.map(m => <div key={m.toISOString()} className="flex-1 text-center text-xs py-2 border-l border-slate-100" style={{ color: MUTED }}>{format(m, 'MMM yyyy')}</div>)}
            </div>
          </div>
          <div className="relative">
            {showToday && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none" style={{ left: `calc(220px + (100% - 220px) * ${at(today) / 100})` }} title="Today" />
            )}
            {rows.length === 0 && <p className="text-sm text-slate-400 text-center py-6 border-t border-slate-100">Nothing with dates to show.</p>}
            {rows.map(row => (
              <React.Fragment key={row.id}>
                {renderRow(row)}
                {open.has(row.id) && (row.children || []).map(child => renderRow(child, true))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/** Budget against planned and actual cost (hours × rate) for the projects in scope. */
export function BudgetCard({ totalBudget, projectIds }) {
  const { tasks } = useAccountTasks();
  const resources = useAccountResources();
  const { planned, actual } = useMemo(() => {
    const scope = new Set(projectIds);
    const rate = Object.fromEntries(resources.map(r => [r.full_name, Number(r.rate) || 0]));
    let p = 0, a = 0;
    tasks.forEach(t => {
      if (!scope.has(t.project_id)) return;
      (t.resource_hours_planned || []).forEach(h => { p += (Number(h?.hours) || 0) * (rate[h?.resource] || 0); });
      (t.resource_hours || []).forEach(h => { a += (Number(h?.hours) || 0) * (rate[h?.resource] || 0); });
    });
    return { planned: p, actual: a };
  }, [tasks, resources, projectIds]);
  const remaining = (totalBudget || 0) - actual;
  return (
    <SectionCard icon={Coins} title="Resource Budget & Forecast">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
        {[{ label: 'Total Budget', value: totalBudget }, { label: 'Actual Cost', value: actual }, { label: 'Planned Cost', value: planned }].map(s => (
          <div key={s.label} className="px-2 py-2 md:border-r border-slate-100">
            <p className="text-xl font-bold" style={{ color: NAVY }}>{money(s.value)}</p>
            <p className="text-xs" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
        <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: remaining >= 0 ? TONES.green.bg : TONES.red.bg }}>
          <p className="text-xl font-bold" style={{ color: remaining >= 0 ? TONES.green.fg : TONES.red.fg }}>{money(remaining)}</p>
          <p className="text-xs" style={{ color: MUTED }}>Remaining Budget</p>
        </div>
      </div>
      {!totalBudget && <p className="text-xs mt-3" style={{ color: MUTED }}>No budget set yet. Add one in the settings.</p>}
    </SectionCard>
  );
}

/** People working in the projects in scope, their average load and whether anyone is over capacity. */
export function ResourceCard({ title, projectIds, projects }) {
  const { tasks } = useAccountTasks();
  const resources = useAccountResources();
  const allocationOverrides = useAllocationOverrides();
  const { assigned, avg, over } = useMemo(() => {
    const scope = new Set(projectIds);
    const scopedTasks = tasks.filter(t => scope.has(t.project_id));
    const weekly = computeResourceWeekly(resources, scopedTasks, projects, allocationOverrides);
    const involved = resources.filter(r => (weekly[r.full_name]?.projects.length || 0) > 0);
    // Overallocation looks at each person's whole week, not just this scope.
    const allWeekly = computeResourceWeekly(involved, tasks, projects, allocationOverrides);
    const pcts = involved.map(r => allocationPct(allWeekly[r.full_name]?.weekly, r.weekly_capacity)).filter(p => p !== null);
    return {
      assigned: involved.length,
      avg: pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0,
      over: pcts.filter(p => p > 100).length,
    };
  }, [tasks, resources, projectIds, projects]);
  return (
    <SectionCard icon={Users} title={title}>
      <div className="grid grid-cols-3 gap-3 items-center">
        <div className="md:border-r border-slate-100"><p className="text-xl font-bold" style={{ color: NAVY }}>{assigned}</p><p className="text-xs" style={{ color: MUTED }}>Resources Assigned</p></div>
        <div className="md:border-r border-slate-100"><p className="text-xl font-bold" style={{ color: NAVY }}>{avg}%</p><p className="text-xs" style={{ color: MUTED }}>Average Utilization</p></div>
        <Link to="/ResourceManagementHub" className="flex items-start gap-2 hover:underline">
          {over > 0
            ? <><AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: TONES.red.fg }} /><span><span className="block text-sm font-semibold" style={{ color: NAVY }}>{over} overallocated</span><span className="text-xs" style={{ color: MUTED }}>Review on the Resources page</span></span></>
            : <><CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" /><span><span className="block text-sm font-semibold" style={{ color: NAVY }}>No capacity risks</span><span className="text-xs" style={{ color: MUTED }}>Capacity is within plan</span></span></>}
        </Link>
      </div>
    </SectionCard>
  );
}
