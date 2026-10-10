import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Scale, FileEdit, X, Layers } from 'lucide-react';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';

const DECISION_STATUSES = [
  { key: 'draft', label: 'Draft', color: '#94a3b8' },
  { key: 'open', label: 'Open', color: '#3b82f6' },
  { key: 'in_review', label: 'In Review', color: '#eab308' },
  { key: 'approved', label: 'Approved', color: '#22c55e' },
  { key: 'cancelled', label: 'Cancelled', color: '#dc2626' },
  { key: 'deferred', label: 'Deferred', color: '#c87b14' },
];

const CHANGE_STATUSES = [
  { key: 'draft', label: 'Draft', color: '#94a3b8' },
  { key: 'open', label: 'Open', color: '#3b82f6' },
  { key: 'in_review', label: 'In Review', color: '#eab308' },
  { key: 'approved', label: 'Approved', color: '#22c55e' },
  { key: 'cancelled', label: 'Cancelled', color: '#dc2626' },
  { key: 'deferred', label: 'Deferred', color: '#c87b14' },
  { key: 'implemented', label: 'Implemented', color: '#16a34a' },
];

const segCounts = (arr, statuses) => statuses.map(s => ({ ...s, count: arr.filter(r => (r.status || 'draft') === s.key).length }));

export default function ChangeOverview({ decisions = [], changeRequests = [], projects = [], programs = [], portfolios = [] }) {
  const [filterPortfolios, setFilterPortfolios] = useState([]);
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);

  const portfolioProgramIds = filterPortfolios.length ? programs.filter(p => filterPortfolios.includes(p.portfolio_id)).map(p => p.id) : null;
  const scopedProgramIds = portfolioProgramIds || programs.map(p => p.id);
  const programOptions = programs.filter(p => scopedProgramIds.includes(p.id));
  const activeProgramIds = filterPrograms.length ? filterPrograms.filter(id => scopedProgramIds.includes(id)) : scopedProgramIds;
  const projectOptions = projects.filter(p => activeProgramIds.includes(p.program_id));

  const inScope = (r) => {
    if (filterPortfolios.length && (!r.program_id || !portfolioProgramIds.includes(r.program_id))) return false;
    if (filterPrograms.length && !filterPrograms.includes(r.program_id)) return false;
    if (filterProjects.length && !filterProjects.includes(r.project_id)) return false;
    return true;
  };

  const fDecisions = decisions.filter(inScope);
  const fChanges = changeRequests.filter(inScope);
  const hasFilters = !!(filterPortfolios.length || filterPrograms.length || filterProjects.length);
  const clearAll = () => { setFilterPortfolios([]); setFilterPrograms([]); setFilterProjects([]); };

  const nameById = (list, id) => list.find(x => x.id === id)?.name;
  const scopeParts = [];
  if (filterPortfolios.length) scopeParts.push(filterPortfolios.map(id => nameById(portfolios, id)).filter(Boolean).join(', '));
  if (filterPrograms.length) scopeParts.push(filterPrograms.map(id => nameById(programs, id)).filter(Boolean).join(', '));
  if (filterProjects.length) scopeParts.push(filterProjects.map(id => nameById(projects, id)).filter(Boolean).join(', '));
  const scopeLabel = scopeParts.length ? scopeParts.join(' · ') : 'all portfolios, programs, projects';

  const cards = [
    { label: 'Decisions', Icon: Scale, arr: fDecisions, statuses: DECISION_STATUSES, accent: '#002046', tint: 'bg-slate-100' },
    { label: 'Change Requests', Icon: FileEdit, arr: fChanges, statuses: CHANGE_STATUSES, accent: '#7c3aed', tint: 'bg-violet-50' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Filter bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Portfolio:</span>
          <MultiSelectFilter options={portfolios.map(p => ({ value: p.id, label: p.name }))} selected={filterPortfolios} onChange={(v) => { setFilterPortfolios(v); setFilterPrograms([]); setFilterProjects([]); }} allLabel="All Portfolios" className="h-8 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Program:</span>
          <MultiSelectFilter options={programOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterPrograms} onChange={(v) => { setFilterPrograms(v); setFilterProjects([]); }} allLabel="All Programs" className="h-8 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Project:</span>
          <MultiSelectFilter options={projectOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterProjects} onChange={setFilterProjects} allLabel="All Projects" className="h-8 w-44" />
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 ml-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#002046]" />
          <h2 className="text-sm font-semibold text-slate-700">
            Overview: <span className="text-slate-500 font-normal">{scopeLabel}</span>
          </h2>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Decisions</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{fDecisions.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Change Requests</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{fChanges.length}</p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(c => {
            const total = c.arr.length;
            const segs = segCounts(c.arr, c.statuses);
            const circ = 2 * Math.PI * 38;
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
                      {segs.map(s => (
                        <div key={s.key} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                          <span className="font-semibold text-slate-700">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {fDecisions.length === 0 && fChanges.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-sm text-slate-400">No items match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}