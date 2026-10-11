import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sprintsApi } from '@/api/sprints';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Zap, ChevronRight, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatDate, parseDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

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

function SprintRow({ sprint }) {
  const total = toNumber(sprint.story_count) ?? 0;
  const done  = toNumber(sprint.completed_count) ?? 0;
  const totalPts = toNumber(sprint.story_points) ?? 0;
  const donePts  = toNumber(sprint.completed_story_points) ?? 0;
  const pct = toNumber(sprint.progress) ?? (total > 0 ? Math.round(done / total * 100) : 0);
  const cfg = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.planning;
  const statusLabel = sprint.status_label || cfg.label;
  const daysLeft = sprint.end_date ? Math.max(0, differenceInDays(parseDate(sprint.end_date), new Date())) : null;

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50">
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

export default function DeliverySummary({ portfolios = [], onNavigateToSprints }) {
  const { selectedAccountId } = useAuth();
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [filterPortfolioId, setFilterPortfolioId] = useState('');
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');

  const deliveryFilters = useMemo(() => {
    /** @type {Record<string, unknown>} */
    const query = {};
    if (filterProgramId) query.program_id = filterProgramId;
    if (filterProjectId) query.project_id = filterProjectId;
    return query;
  }, [filterProgramId, filterProjectId]);

  const {
    data: delivery = DEFAULT_DELIVERY_OVERVIEW,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-delivery-overview', selectedAccountId || null, filterPortfolioId || null, filterProgramId || null, filterProjectId || null],
    queryFn: () => sprintsApi.getDeliveryOverview(selectedAccountId, deliveryFilters),
    enabled: Boolean(selectedAccountId),
  });

  const sprints = delivery.sprints || [];
  const projects = delivery.projects || [];
  const programs = delivery.programs || [];

  const toggleProgram = id => setExpandedPrograms(p => ({ ...p, [id]: !p[id] }));
  const toggleProject = id => setExpandedProjects(p => ({ ...p, [id]: !p[id] }));
  const supportsPortfolioFilter = portfolios.length > 0 && [...programs, ...projects].some(item => item?.portfolio_id);

  // Filter programs/projects by portfolio
  const portfolioFilteredPrograms = filterPortfolioId
    ? programs.filter(p => p.portfolio_id === filterPortfolioId)
    : programs;
  const portfolioFilteredProjects = filterPortfolioId
    ? projects.filter(p => p.portfolio_id === filterPortfolioId || portfolioFilteredPrograms.some(pr => pr.id === p.program_id))
    : projects;

  const projectsForFilter = filterProgramId
    ? portfolioFilteredProjects.filter(p => p.program_id === filterProgramId)
    : portfolioFilteredProjects;

  const topLevelProjectIds = new Set(projectsForFilter.map(p => p.id));
  const visibleSprints = filterPortfolioId ? sprints.filter(s => topLevelProjectIds.has(s.project_id)) : sprints;

  const totalSprints = filterPortfolioId ? visibleSprints.length : delivery.total_sprints;
  const activeSprints = filterPortfolioId ? visibleSprints.filter(s => s.status === 'active').length : delivery.active_sprints;
  const totalStories = filterPortfolioId ? visibleSprints.reduce((sum, sprint) => sum + (Number(sprint.story_count) || 0), 0) : delivery.story_count;
  const doneStories = filterPortfolioId ? visibleSprints.reduce((sum, sprint) => sum + (Number(sprint.completed_count) || 0), 0) : delivery.completed_count;

  // Group: programs → projects → sprints
  const visiblePrograms = filterProgramId
    ? portfolioFilteredPrograms.filter(p => p.id === filterProgramId)
    : portfolioFilteredPrograms;
  const programsWithData = visiblePrograms.map((/** @type {Record<string, any>} */ program) => {
    const progProjects = portfolioFilteredProjects.filter(p => p.program_id === program.id)
      .filter(p => !filterProjectId || p.id === filterProjectId);
    return { ...program, projects: progProjects };
  }).filter(p => p.projects.some(proj => sprints.some(s => s.project_id === proj.id)));

  // Standalone projects (no program)
  const standaloneProjects = portfolioFilteredProjects
    .filter(p => !p.program_id && sprints.some(s => s.project_id === p.id))
    .filter(p => !filterProjectId || p.id === filterProjectId)
    .filter(() => !filterProgramId);

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Header */}
      <div style={{ background: '#002046' }} className="px-6 py-4 text-white">
        <div className="flex gap-6">
          {[
            { label: 'Total Sprints',  value: totalSprints },
            { label: 'Active Sprints', value: activeSprints },
            { label: 'Stories',        value: totalStories },
            { label: 'Done',           value: doneStories },
          ].map(({ label, value }, i, arr) => (
            <React.Fragment key={label}>
              <div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
              </div>
              {i < arr.length - 1 && <div className="w-px bg-white/10 self-stretch" />}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-3">
        {supportsPortfolioFilter && (
          <select value={filterPortfolioId} onChange={e => { setFilterPortfolioId(e.target.value); setFilterProgramId(''); setFilterProjectId(''); }}
            className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
            <option value="">All Portfolios</option>
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select value={filterProgramId} onChange={e => { setFilterProgramId(e.target.value); setFilterProjectId(''); }}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
          <option value="">All Programs</option>
          {portfolioFilteredPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
          <option value="">All Projects</option>
          {projectsForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filterPortfolioId || filterProgramId || filterProjectId) && (
          <button onClick={() => { setFilterPortfolioId(''); setFilterProgramId(''); setFilterProjectId(''); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
        )}
      </div>

      <div className="p-5 space-y-4">
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
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
                onClick={() => toggleProgram(program.id)}>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: program.color || '#8b5cf6' }} />
                <span className="font-semibold text-slate-800 text-sm flex-1 text-left">{program.name}</span>
                <span className="text-xs text-slate-400">{program.projects.length} project{program.projects.length !== 1 ? 's' : ''}</span>
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
                              {projSprints.map(sprint => <SprintRow key={sprint.id} sprint={sprint} />)}
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
                          {projSprints.map(sprint => <SprintRow key={sprint.id} sprint={sprint} />)}
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