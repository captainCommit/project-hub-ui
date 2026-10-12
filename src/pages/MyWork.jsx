import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Ban, Building2, CalendarClock, Clock, Folder, FolderTree, ListChecks, Loader2, Star } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useFavorites } from '@/lib/favorites';
import { useRecentProjects } from '@/lib/userPrefs';
import { formatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { tasksApi } from '@/api/tasks';
import { accountsApi } from '@/api/accounts';
import { dashboardApi } from '@/api/dashboard';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

// How far ahead "assigned to me" looks. The due-tasks endpoint only returns open tasks with a finish date.
const HORIZON_DAYS = 60;
const DUE_SOON_DAYS = 7;
const SIDE_LIST_LIMIT = 6;
const NAVY = '#002046';

const EMPTY_SIDEBAR_HIERARCHY = { portfolios: [], programs: [], projects: [] };

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysFromToday = (dateStr) => {
  const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - startOfToday().getTime()) / 86400000);
};
const isBlocked = (task) => String(task.status?.value || '').toUpperCase() === 'BLOCKED';

const dueLabel = (days) => {
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
};

const TABS = [
  { id: 'overdue', label: 'Overdue', empty: 'Nothing overdue. Nice work.' },
  { id: 'soon', label: `Due in ${DUE_SOON_DAYS} days`, empty: `Nothing due in the next ${DUE_SOON_DAYS} days.` },
  { id: 'blocked', label: 'Blocked', empty: 'None of your tasks are blocked.' },
  { id: 'all', label: 'All assigned', empty: `Nothing assigned to you is due in the next ${HORIZON_DAYS} days.` },
];

const HEALTH_DOT = { RED: 'bg-red-500', YELLOW: 'bg-amber-400', GREEN: 'bg-emerald-500', UNKNOWN: 'bg-slate-300' };

function StatTile({ icon: Icon, label, value, tone, active, onClick }) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors hover:border-slate-300',
        active ? 'border-[#002046] ring-1 ring-[#002046]' : 'border-slate-200')}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', tone)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-slate-800 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
      </div>
    </button>
  );
}

function SidePanel({ title, icon: Icon, children, action = null }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Icon className="w-4 h-4 text-[#d97706]" />
        <h2 className="text-sm font-semibold text-slate-800 flex-1">{title}</h2>
        {action}
      </header>
      <div className="py-1">{children}</div>
    </section>
  );
}

const SideEmpty = ({ children }) => <p className="px-4 py-3 text-xs text-slate-400">{children}</p>;

export default function MyWork() {
  const navigate = useNavigate();
  const { user, selectedAccountId } = useAuth();
  const { projects, programs, portfolios } = useAccountHierarchy();
  const { favorites } = useFavorites();
  const recentProjects = useRecentProjects();
  const [tab, setTab] = useState(/** @type {string | null} */ (null));
  const userId = /** @type {any} */ (user)?.id;

  const dueQuery = useQuery({
    queryKey: ['my-work-due-tasks', selectedAccountId, userId, HORIZON_DAYS],
    queryFn: () => tasksApi.listDue(selectedAccountId, { mode: 'BOTH', days: HORIZON_DAYS, assigned_to: userId }),
    enabled: Boolean(selectedAccountId && userId),
  });

  const dashboardQuery = useQuery({
    queryKey: ['account-dashboard', selectedAccountId],
    queryFn: () => dashboardApi.getAccountDashboard(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  // Same query as the sidebar, so it comes from cache.
  const { data: hierarchy = EMPTY_SIDEBAR_HIERARCHY } = useQuery({
    queryKey: ['account-sidebar', selectedAccountId],
    queryFn: () => accountsApi.getSidebar(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  const groups = useMemo(() => {
    const tasks = /** @type {any[]} */ ((/** @type {any} */ (dueQuery.data))?.tasks || [])
      .map(task => ({ ...task, days: daysFromToday(task.finish_date) }));
    return {
      overdue: tasks.filter(t => t.days < 0),
      soon: tasks.filter(t => t.days >= 0 && t.days <= DUE_SOON_DAYS),
      blocked: tasks.filter(isBlocked),
      all: tasks,
    };
  }, [dueQuery.data]);

  // Open on the most urgent list that has something in it.
  const activeTab = tab || ['overdue', 'soon', 'blocked'].find(id => groups[id].length > 0) || 'all';
  const activeTabMeta = TABS.find(t => t.id === activeTab);
  const visibleTasks = groups[activeTab];

  const byKey = useMemo(() => {
    const map = new Map();
    hierarchy.portfolios.forEach(item => map.set(`portfolio:${item.id}`, item));
    hierarchy.programs.forEach(item => map.set(`program:${item.id}`, item));
    hierarchy.projects.forEach(item => map.set(`project:${item.id}`, item));
    return map;
  }, [hierarchy]);
  const quickIcon = { portfolio: Building2, program: FolderTree, project: Folder };
  const favoriteItems = favorites
    .filter(f => byKey.has(`${f.type}:${f.id}`))
    .map(f => ({ ...byKey.get(`${f.type}:${f.id}`), type: f.type }))
    .slice(0, SIDE_LIST_LIMIT);
  const recentItems = recentProjects
    .filter(p => byKey.has(`project:${p.id}`))
    .map(p => ({ ...byKey.get(`project:${p.id}`), type: 'project', viewed_at: p.viewed_at }))
    .slice(0, SIDE_LIST_LIMIT);

  const atRisk = (dashboardQuery.data?.projects_at_risk || []).slice(0, SIDE_LIST_LIMIT);
  const firstName = String(/** @type {any} */ (user)?.full_name || '').split(' ')[0];

  const renderQuickLink = (item) => {
    const Icon = quickIcon[item.type] || Folder;
    return (
      <Link key={`${item.type}:${item.id}`} to={item.route} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#002046]">
        <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">My work</h1>
              <p className="text-sm text-slate-500 mt-1">
                {firstName ? `${firstName}, here's` : "Here's"} what's assigned to you and the projects you use most.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/Projects?view=all_projects"><Folder className="w-3.5 h-3.5 mr-1.5" /> All projects</Link>
              </Button>
              <Button size="sm" asChild style={{ background: NAVY }}>
                <Link to="/Projects?view=all_portfolios">Browse portfolios <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatTile icon={AlertTriangle} label="Overdue" value={groups.overdue.length} tone="bg-red-50 text-red-600"
              active={activeTab === 'overdue'} onClick={() => setTab('overdue')} />
            <StatTile icon={CalendarClock} label={`Due in ${DUE_SOON_DAYS} days`} value={groups.soon.length} tone="bg-amber-50 text-amber-600"
              active={activeTab === 'soon'} onClick={() => setTab('soon')} />
            <StatTile icon={Ban} label="Blocked" value={groups.blocked.length} tone="bg-orange-50 text-orange-600"
              active={activeTab === 'blocked'} onClick={() => setTab('blocked')} />
            <StatTile icon={ListChecks} label={`Assigned, next ${HORIZON_DAYS} days`} value={groups.all.length} tone="bg-slate-100 text-slate-600"
              active={activeTab === 'all'} onClick={() => setTab('all')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <header className="flex items-center gap-1 px-2 pt-2 border-b border-slate-100 overflow-x-auto">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn('px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
                      activeTab === t.id ? 'border-[#d97706] text-slate-900 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                    {t.label}
                    <span className="ml-1.5 text-xs text-slate-400 tabular-nums">{groups[t.id].length}</span>
                  </button>
                ))}
              </header>

              {dueQuery.isLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : dueQuery.isError ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-600">We could not load your tasks.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => dueQuery.refetch()}>Try again</Button>
                </div>
              ) : visibleTasks.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">{activeTabMeta?.empty}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleTasks.map(task => (
                    <li key={task.id}>
                      <button onClick={() => navigate(`/projects/${task.project.id}/sheet?task=${task.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.status?.color || '#cbd5e1' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{task.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {task.project.name}
                            {task.program?.name && <span className="text-slate-400"> · {task.program.name}</span>}
                            {task.status?.label && <span className="text-slate-400"> · {task.status.label}</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn('text-xs font-medium', task.days < 0 ? 'text-red-600' : task.days <= DUE_SOON_DAYS ? 'text-amber-600' : 'text-slate-500')}>
                            {dueLabel(task.days)}
                          </p>
                          <p className="text-[11px] text-slate-400">{formatDate(task.finish_date)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-6">
              <SidePanel title="Favorites" icon={Star} action={<Link to="/Favorites" className="text-xs text-slate-500 hover:text-[#002046]">View all</Link>}>
                {favoriteItems.length ? favoriteItems.map(renderQuickLink) : <SideEmpty>Star a portfolio, program or project to keep it here.</SideEmpty>}
              </SidePanel>

              <SidePanel title="Recent projects" icon={Clock}>
                {recentItems.length ? recentItems.map(renderQuickLink) : <SideEmpty>Projects you open will show up here.</SideEmpty>}
              </SidePanel>

              <SidePanel title="Projects at risk" icon={AlertTriangle}>
                {dashboardQuery.isLoading ? (
                  <SideEmpty>Loading…</SideEmpty>
                ) : dashboardQuery.isError ? (
                  <SideEmpty>Could not load project health.</SideEmpty>
                ) : atRisk.length === 0 ? (
                  <SideEmpty>No projects you can see are flagged at risk.</SideEmpty>
                ) : atRisk.map(project => (
                  <Link key={project.id} to={`/projects/${project.id}/sheet`} className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', HEALTH_DOT[project.health?.overall] || HEALTH_DOT.UNKNOWN)} />
                    <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{project.name}</span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {project.overdue_tasks > 0 ? `${project.overdue_tasks} overdue` : `${project.open_risks + project.open_issues} open RAID`}
                    </span>
                  </Link>
                ))}
              </SidePanel>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
