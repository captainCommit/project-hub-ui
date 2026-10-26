import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Crosshair, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { EMPTY_SCOPE, useGlobalScope } from '@/lib/globalScope';
import Tour from '@/components/tour/Tour';
import { SCOPE_TOUR } from './ScopeBar.tour';

// The module pages the global scope narrows. Home, a single portfolio/program/project, and the account and
// help pages are left alone, so the bar only shows where it changes what you see.
const SCOPED_PATHS = new Set([
  '/Projects', '/RiskLog', '/ChangeRegisterHub', '/DecisionLog', '/ChangeRegister',
  '/Requirements', '/Testing', '/SprintManagement', '/Financials',
  '/ResourceManagementHub', '/ProjectResources', '/ResourceTaskPulse', '/ResourceCalendarPage',
]);

const ALL = '__all__';

function ScopeSelect({ label, value, onChange, allLabel, options }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <Select value={value || ALL} onValueChange={v => onChange(v === ALL ? null : v)}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The "Viewing: Portfolio > Program > Project" bar above the module pages, with a Reset back to everything. */
export default function ScopeBar() {
  const { pathname } = useLocation();
  const { portfolios, programs, projects } = useAccountHierarchy();
  const { setScope, resetScope, active, parts, ids } = useGlobalScope();
  const [open, setOpen] = useState(false);
  if (!SCOPED_PATHS.has(pathname)) return null;

  // Each level narrows the next; picking a deeper level fills in the ones above it.
  const { portfolioId, programId, projectId } = ids;
  const programOptions = portfolioId ? programs.filter(p => p.portfolio_id === portfolioId) : programs;
  const projectOptions = projects.filter(p => (programId ? p.program_id === programId
    : !portfolioId || p.portfolio_id === portfolioId || programOptions.some(pg => pg.id === p.program_id)));

  const pickPortfolio = (id) => setScope({ ...EMPTY_SCOPE, portfolioId: id });
  const pickProgram = (id) => {
    const program = programs.find(p => p.id === id);
    setScope(id ? { ...EMPTY_SCOPE, portfolioId: program?.portfolio_id || null, programId: id } : { ...EMPTY_SCOPE, portfolioId });
  };
  const pickProject = (id) => {
    const project = projects.find(p => p.id === id);
    setScope(id
      ? { portfolioId: project?.portfolio_id || portfolioId, programId: project?.program_id || null, projectId: id }
      : { ...EMPTY_SCOPE, portfolioId, programId });
  };

  return (
    <div data-tour="scope-bar" className="flex items-center gap-3 px-4 h-11 bg-white border-b border-slate-200 text-sm flex-shrink-0">
      <Tour tour={SCOPE_TOUR} />
      <Crosshair className="w-4 h-4 text-[#002046] flex-shrink-0" />
      <span className="font-semibold text-slate-500">Viewing:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" title="Choose what every module shows"
            className="flex items-center gap-1.5 min-w-0 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 font-semibold text-[#002046]">
            {active ? parts.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <span className="truncate max-w-[220px]">{p.name}</span>
              </React.Fragment>
            )) : <span>All portfolios</span>}
            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3">
          <p className="text-xs text-slate-500">Every module shows only this part of the account until you reset it. Page filters narrow further inside it.</p>
          <ScopeSelect label="Portfolio" value={portfolioId} onChange={pickPortfolio} allLabel="All portfolios" options={portfolios} />
          <ScopeSelect label="Program" value={programId} onChange={pickProgram} allLabel="All programs" options={programOptions} />
          <ScopeSelect label="Project" value={projectId} onChange={pickProject} allLabel="All projects" options={projectOptions} />
        </PopoverContent>
      </Popover>
      {active && (
        <button type="button" onClick={resetScope} className="flex items-center gap-1 text-sm font-medium text-[#c87b14] hover:underline">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      )}
    </div>
  );
}
