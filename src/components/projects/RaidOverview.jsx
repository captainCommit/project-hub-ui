import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, BookOpen, Link2, X, Layers, ListChecks, FolderOpen, CircleCheck } from 'lucide-react';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import { StatCard } from '@/components/projects/DirectoryKit';
import { inRaidScope } from '@/components/projects/RaidTable';

const CLOSED = new Set(['closed', 'resolved', 'cancelled', 'invalidated', 'implemented_closed', 'no_longer_required', 'declined', 'rejected']);

const summarize = (arr) => {
  const total = arr.length;
  const escalated = arr.filter(r => (r.status || '').toLowerCase() === 'escalated').length;
  const closed = arr.filter(r => CLOSED.has((r.status || '').toLowerCase())).length;
  const open = total - closed;
  return { total, open, closed, escalated };
};

const PRIORITIES = [
  { key: 'critical', label: 'Critical', color: '#dc2626' },
  { key: 'high', label: 'High', color: '#c87b14' },
  { key: 'medium', label: 'Medium', color: '#eab676' },
  { key: 'low', label: 'Low', color: '#94a3b8' },
];
const pCount = (arr, k) => arr.filter(r => (r.priority || 'medium') === k).length;

// filters are the RAID page's shared filters; the overview uses their portfolio, program and project parts.
export default function RaidOverview({ risks = [], issues = [], assumptions = [], dependencies = [], projects = [], programs = [], portfolios = [], filters, onFiltersChange }) {
  const { portfolios: filterPortfolios, programs: filterPrograms, projects: filterProjects } = filters;
  const setScope = (patch) => onFiltersChange({ ...filters, ...patch });

  const portfolioProgramIds = filterPortfolios.length ? programs.filter(p => filterPortfolios.includes(p.portfolio_id)).map(p => p.id) : null;
  const scopedProgramIds = portfolioProgramIds || programs.map(p => p.id);
  const programOptions = programs.filter(p => scopedProgramIds.includes(p.id));
  const activeProgramIds = filterPrograms.length ? filterPrograms.filter(id => scopedProgramIds.includes(id)) : scopedProgramIds;
  const projectOptions = projects.filter(p => activeProgramIds.includes(p.program_id));

  const inScope = (r) => inRaidScope(r, filters, programs);

  const fRisks = risks.filter(inScope);
  const fIssues = issues.filter(inScope);
  const fAssumptions = assumptions.filter(inScope);
  const fDependencies = dependencies.filter(inScope);

  const cards = [
    { label: 'Risks', Icon: AlertTriangle, data: summarize(fRisks), arr: fRisks, accent: '#c87b14', tint: 'bg-orange-50' },
    { label: 'Issues', Icon: AlertCircle, data: summarize(fIssues), arr: fIssues, accent: '#dc2626', tint: 'bg-red-50' },
    { label: 'Assumptions', Icon: BookOpen, data: summarize(fAssumptions), arr: fAssumptions, accent: '#002046', tint: 'bg-slate-100' },
    { label: 'Dependencies', Icon: Link2, data: summarize(fDependencies), arr: fDependencies, accent: '#1e3a5f', tint: 'bg-slate-50' },
  ];

  const totalAll = cards.reduce((s, c) => s + c.data.total, 0);
  const openAll = cards.reduce((s, c) => s + c.data.open, 0);
  const closedAll = cards.reduce((s, c) => s + c.data.closed, 0);
  const hasFilters = !!(filterPortfolios.length || filterPrograms.length || filterProjects.length);
  const clearAll = () => setScope({ portfolios: [], programs: [], projects: [] });

  const nameById = (list, id) => list.find(x => x.id === id)?.name;
  const scopeParts = [];
  if (filterPortfolios.length) scopeParts.push(filterPortfolios.map(id => nameById(portfolios, id)).filter(Boolean).join(', '));
  if (filterPrograms.length) scopeParts.push(filterPrograms.map(id => nameById(programs, id)).filter(Boolean).join(', '));
  if (filterProjects.length) scopeParts.push(filterProjects.map(id => nameById(projects, id)).filter(Boolean).join(', '));
  const scopeLabel = scopeParts.length ? scopeParts.join(' · ') : 'all portfolios, programs, projects';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Filter bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Portfolio:</span>
          <MultiSelectFilter options={portfolios.map(p => ({ value: p.id, label: p.name }))} selected={filterPortfolios} onChange={(v) => setScope({ portfolios: v, programs: [], projects: [] })} allLabel="All Portfolios" className="h-8 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Program:</span>
          <MultiSelectFilter options={programOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterPrograms} onChange={(v) => setScope({ programs: v, projects: [] })} allLabel="All Programs" className="h-8 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Project:</span>
          <MultiSelectFilter options={projectOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterProjects} onChange={(v) => setScope({ projects: v })} allLabel="All Projects" className="h-8 w-44" />
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 ml-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#002046]" />
          <h2 className="text-sm font-semibold text-slate-700">
            Overview: <span className="text-slate-500 font-normal">{scopeLabel}</span>
          </h2>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard iconLeft icon={ListChecks} value={totalAll} label="Total RAID Items" sub="Across all portfolios, programs, and projects" />
          <StatCard iconLeft icon={FolderOpen} value={openAll} label="Open" sub="Items requiring attention" />
          <StatCard iconLeft icon={CircleCheck} value={closedAll} label="Closed" sub="Resolved items" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(c => {
            const { total, closed, escalated } = c.data;
            const open = total - closed - escalated;
            const circ = 2 * Math.PI * 38;
            const segs = [
              { key: 'open', label: 'Open', count: open, color: '#94a3b8' },
              { key: 'closed', label: 'Closed', count: closed, color: '#22c55e' },
              { key: 'escalated', label: 'Escalated', count: escalated, color: '#dc2626' },
            ];
            let cum = 0;
            return (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 shrink-0">
                    <svg width="96" height="96" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="38" fill="none" stroke="#e2e8f0" strokeWidth="9" />
                      {total > 0 && segs.map(s => {
                        const len = (s.count / total) * circ;
                        const offset = -cum;
                        cum += len;
                        return (
                          <circle key={s.key} cx="48" cy="48" r="38" fill="none" stroke={s.color} strokeWidth="9"
                            strokeDasharray={`${len} ${circ}`} strokeDashoffset={offset}
                            transform="rotate(-90 48 48)">
                            <title>{`${s.label}: ${s.count}`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-slate-800 leading-none">{total}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">total</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.tint)}>
                        <c.Icon className="w-4 h-4" style={{ color: c.accent }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{c.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: '#94a3b8' }} />Open</span>
                        <span className="font-semibold text-slate-700">{open}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />Closed</span>
                        <span className="font-semibold text-green-600">{closed}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: '#dc2626' }} />Escalated</span>
                        <span className="font-semibold text-red-600">{escalated}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Priority distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Priority Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {cards.map(c => {
              const total = c.arr.length;
              return (
                <div key={c.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">{c.label}</span>
                    <span className="text-xs text-slate-400">{total} items</span>
                  </div>
                  {PRIORITIES.map(p => {
                    const n = pCount(c.arr, p.key);
                    const pct = total ? (n / total) * 100 : 0;
                    return (
                      <div key={p.key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                            {p.label}
                          </span>
                          <span className="font-semibold text-slate-700">{n}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {totalAll === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-sm text-slate-400">No RAID items match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}