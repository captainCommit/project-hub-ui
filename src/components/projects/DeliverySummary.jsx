import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sprintsApi } from '@/api/sprints';
import { useAuth } from '@/lib/AuthContext';
import { useGlobalScope } from '@/lib/globalScope';
import { cn } from '@/lib/utils';
import { Zap, ChevronRight, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatDate, parseDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { FilterSelect, NAVY, PageFilterLabel } from '@/components/projects/DirectoryKit';

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  planning:  { label: 'Planning',  color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-400' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400' },
};

const DEFAULT_DELIVERY_OVERVIEW = {
  total_sprints: 0,
  active_sprints: 0,
  story_count: 0,
  completed_count: 0,
  programs: [],
  projects: [],
  sprints: [],
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

function SprintRow({ sprint, onOpenSprint }) {
  const total = toNumber(sprint.story_count) ?? 0;
  const done  = toNumber(sprint.completed_count) ?? 0;
  const totalPts = toNumber(sprint.story_points) ?? 0;
  const donePts  = toNumber(sprint.completed_story_points) ?? 0;
  const pct = toNumber(sprint.progress) ?? (total > 0 ? Math.round(done / total * 100) : 0);
  const cfg = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.planning;
  const statusLabel = sprint.status_label || cfg.label;
  const daysLeft = sprint.end_date ? Math.max(0, differenceInDays(parseDate(sprint.end_date), new Date())) : null;

  return (
    <tr className={cn('border-b border-slate-50 hover:bg-slate-50', onOpenSprint && 'cursor-pointer')} onClick={() => onOpenSprint?.(sprint)}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
          <span className="font-medium text-slate-700 text-sm">{sprint.name}</span>
        </div>
        {sprint.goal && <p className="text-xs text-slate-400 italic pl-4 mt-0.5">"{sprint.goal}"</p>}
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>{statusLabel}</span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {sprint.start_date && <span>{formatDate(sprint.start_date)} → {sprint.end_date ? formatDate(sprint.end_date) : '…'}</span>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{done}/{total} stories · {donePts}/{totalPts} pts</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 bg-slate-100 rounded-full w-20 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500">{pct}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {daysLeft !== null && sprint.status === 'active' && (
          <span className={cn('font-medium', daysLeft <= 2 ? 'text-red-500' : 'text-slate-500')}>{daysLeft}d left</span>
        )}
      </td>
    </tr>
  );
}

export default function DeliverySummary({ portfolios = [], onNavigateToSprints, onOpenSprint }) {
  const { selectedAccountId } = useAuth();
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [filterPortfolioId, setFilterPortfolioId] = useState('');
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');

  // The page filters narrow inside the global scope; where one isn't set, the scope's choice applies.
  const { ids: scopeIds } = useGlobalScope();
  const deliveryFilters = useMemo(() => {
    /** @type {Record<string, unknown>} */
    const query = {};
    const portfolioId = filterPortfolioId || scopeIds.portfolioId;
    const programId = filterProgramId || scopeIds.programId;
    const projectId = filterProjectId || scopeIds.projectId;
    if (portfolioId) query.portfolio_id = portfolioId;
    if (programId) query.program_id = programId;
    if (projectId) query.project_id = projectId;
    return query;
  }, [filterPortfolioId, filterProgramId, filterProjectId, scopeIds]);

  const {
    data: delivery = DEFAULT_DELIVERY_OVERVIEW,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-delivery-overview', selectedAccountId || null, deliveryFilters],
    queryFn: () => sprintsApi.getDeliveryOverview(selectedAccountId, deliveryFilters),
    enabled: Boolean(selectedAccountId),
  });

  const sprints = delivery.sprints || [];
  const projects = delivery.projects || [];
  const programs = delivery.programs || [];

  const toggleProgram = id => setExpandedPrograms(p => ({ ...p, [id]: !p[id] }));
  const toggleProject = id => setExpandedProjects(p => ({ ...p, [id]: !p[id] }));
  // The overview comes back already scoped to the chosen portfolio, program and project.
  const projectsForFilter = filterProgramId
    ? projects.filter(p => p.program_id === filterProgramId)
    : projects;

  const totalSprints = delivery.total_sprints;
  const activeSprints = delivery.active_sprints;
  const totalStories = delivery.story_count;
  const doneStories = delivery.completed_count;

  // Group: programs → projects → sprints
  const visiblePrograms = filterProgramId
    ? programs.filter(p => p.id === filterProgramId)
    : programs;
  const programsWithData = visiblePrograms.map((/** @type {Record<string, any>} */ program) => {
    const progProjects = projects.filter(p => p.program_id === program.id)
      .filter(p => !filterProjectId || p.id === filterProjectId);
    return { ...program, projects: progProjects };
  }).filter(p => p.projects.some(proj => sprints.some(s => s.project_id === proj.id)));

  // Standalone projects (no program)
  const standaloneProjects = projects
    .filter(p => !p.program_id && sprints.some(s => s.project_id === p.id))
    .filter(p => !filterProjectId || p.id === filterProjectId)
    .filter(() => !filterProgramId);

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: '#F7F9FC' }}>
      <div className="px-6 pt-5 space-y-4">
        {/* Totals */}
        <div className="rounded-xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4" style={{ backgroundColor: NAVY }}>
          {[
            { label: 'Total Sprints',  value: totalSprints },
            { label: 'Active Sprints', value: activeSprints },
            { label: 'Stories',        value: totalStories },
            { label: 'Done',           value: doneStories },
          ].map(({ label, value }, i) => (
            <div key={label} className={cn('px-4', i > 0 && 'md:border-l md:border-white/15')}>
              <p className="text-2xl font-bold text-white">{value ?? 0}</p>
              <p className="text-sm text-white/70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div data-tour="page-filters" className="flex flex-wrap items-center gap-2">
          <PageFilterLabel className="mr-1" />
          <FilterSelect value={filterPortfolioId} onChange={v => { setFilterPortfolioId(v); setFilterProgramId(''); setFilterProjectId(''); }}
            allLabel="All Portfolios" options={portfolios.map(p => ({ value: p.id, label: p.name }))} />
          <FilterSelect value={filterProgramId} onChange={v => { setFilterProgramId(v); setFilterProjectId(''); }}
            allLabel="All Programs" options={programs.map(p => ({ value: p.id, label: p.name }))} />
          <FilterSelect value={filterProjectId} onChange={setFilterProjectId}
            allLabel="All Projects" options={projectsForFilter.map(p => ({ value: p.id, label: p.name }))} />
          {(filterPortfolioId || filterProgramId || filterProjectId) && (
            <button onClick={() => { setFilterPortfolioId(''); setFilterProgramId(''); setFilterProjectId(''); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">
        {!selectedAccountId && (
          <div className="text-center py-20 text-slate-400">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select an account to view delivery overview.</p>
          </div>
        )}

        {selectedAccountId && isLoading && (
          <div className="text-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 mx-auto mb-3 opacity-50 animate-spin" />
            <p className="text-sm">Loading delivery overview...</p>
          </div>
        )}

        {selectedAccountId && isError && (
          <div className="text-center py-20 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-sm mb-3">{error?.message || 'Unable to load delivery overview.'}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {selectedAccountId && !isLoading && !isError && programsWithData.length === 0 && standaloneProjects.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No delivery overview data available.</p>
            <button onClick={onNavigateToSprints} className="mt-2 text-xs text-indigo-600 hover:underline flex items-center gap-1 mx-auto">
              Go to Sprints <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* By Program */}
        {selectedAccountId && !isLoading && !isError && programsWithData.map(program => {
          const isOpen = expandedPrograms[program.id] === true;
          return (
            <div key={program.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button className={cn('w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors', isOpen && 'border-b border-slate-100')}
                onClick={() => toggleProgram(program.id)}>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: program.color || '#64748B' }} />
                <span className="font-semibold text-sm flex-1 text-left" style={{ color: NAVY }}>{program.name}</span>
                <span className="text-sm text-slate-500">{program.projects.length} project{program.projects.length !== 1 ? 's' : ''}</span>
              </button>
              {isOpen && (
                <div className="divide-y divide-slate-50">
                  {program.projects.map(project => {
                    const projSprints = sprints.filter(s => s.project_id === project.id);
                    if (!projSprints.length) return null;
                    const isProjOpen = expandedProjects[project.id] !== false;
                    return (
                      <div key={project.id}>
                        <button className="w-full flex items-center gap-3 px-8 py-2.5 hover:bg-slate-50 transition-colors"
                          onClick={() => toggleProject(project.id)}>
                          {isProjOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-300" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
                          <span className="text-sm font-medium text-slate-700 flex-1 text-left">{project.name}</span>
                          <span className="text-xs text-slate-400">{projSprints.length} sprint{projSprints.length !== 1 ? 's' : ''}</span>
                        </button>
                        {isProjOpen && (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-t border-b border-slate-100">
                              <tr>
                                <th className="text-left px-12 py-2 text-xs font-semibold text-slate-400">Sprint</th>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Status</th>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Dates</th>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Stories</th>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Progress</th>
                                <th className="px-4 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {projSprints.map(sprint => <SprintRow key={sprint.id} sprint={sprint} onOpenSprint={onOpenSprint} />)}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone projects */}
        {selectedAccountId && !isLoading && !isError && standaloneProjects.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Standalone Projects</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {standaloneProjects.map(project => {
                const projSprints = sprints.filter(s => s.project_id === project.id);
                const isProjOpen = expandedProjects[project.id] !== false;
                return (
                  <div key={project.id}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                      onClick={() => toggleProject(project.id)}>
                      {isProjOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-300" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
                      <span className="text-sm font-medium text-slate-700 flex-1 text-left">{project.name}</span>
                      <span className="text-xs text-slate-400">{projSprints.length} sprint{projSprints.length !== 1 ? 's' : ''}</span>
                    </button>
                    {isProjOpen && (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-t border-b border-slate-100">
                          <tr>
                            <th className="text-left px-10 py-2 text-xs font-semibold text-slate-400">Sprint</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Status</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Dates</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Stories</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Progress</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {projSprints.map(sprint => <SprintRow key={sprint.id} sprint={sprint} onOpenSprint={onOpenSprint} />)}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}