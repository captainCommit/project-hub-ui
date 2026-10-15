import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { Loader2 } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import HomeHeader from '@/components/home/HomeHeader';
import HomeStatCards from '@/components/home/HomeStatCards';
import MyPriorities from '@/components/home/MyPriorities';
import MyProjects from '@/components/home/MyProjects';
import HomeFavorites from '@/components/home/HomeFavorites';
import RecentActivity from '@/components/home/RecentActivity';
import NewTaskDialog from '@/components/home/NewTaskDialog';
import ProjectDialog from '@/components/projects/ProjectDialog';
import { AddDialog as RiskDialog } from '@/components/projects/RiskIssueSheet';
import { Button } from '@/components/ui/button';
import { toastError } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useAccountHierarchy, useAccountResources, invalidateHierarchy } from '@/hooks/useAccountLookups';
import { homeApi } from '@/api/home';
import { tasksApi, mapTaskFormToPayload, mapAccountOptionsToTaskStatusOptions } from '@/api/tasks';
import { programsApi } from '@/api/programs';
import { raidApi, mapRiskInputToPayload } from '@/api/raid';

const BADGE = {
  overdue: { tone: 'urgent', badge: 'Overdue' },
  week: { tone: 'warn', badge: 'Due soon' },
  upcoming: { tone: 'muted', badge: 'Upcoming' },
};

// Risks and issues open their log; tasks open on the project sheet.
const ITEM_PAGES = { Risk: '/RiskLog', Issue: '/IssueLog' };

export default function Home() {
  const { user, selectedAccountId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { projects, programs, portfolios } = useAccountHierarchy();
  const resources = useAccountResources();
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [priorityTab, setPriorityTab] = useState('all');
  const [search, setSearch] = useState('');
  const userId = /** @type {any} */ (user)?.id;

  const homeKey = ['my-home', selectedAccountId, userId];
  const homeQuery = useQuery({
    queryKey: homeKey,
    queryFn: () => homeApi.get(selectedAccountId),
    enabled: Boolean(selectedAccountId && userId),
  });

  // Same query as the project sheet, so it is usually cached.
  const optionsQuery = useQuery({
    queryKey: ['account-options', selectedAccountId],
    queryFn: () => tasksApi.getAccountOptions(selectedAccountId),
    enabled: Boolean(selectedAccountId) && taskOpen,
  });
  const statusOptions = useMemo(
    () => (optionsQuery.data ? mapAccountOptionsToTaskStatusOptions(optionsQuery.data).activeOptions : []),
    [optionsQuery.data],
  );
  const myResourceId = resources.find(r => r.user_id && r.user_id === userId)?.id || '';

  const refreshHome = () => queryClient.invalidateQueries({ queryKey: ['my-home'] });

  const createTask = useMutation({
    mutationFn: async (form) => {
      const task = /** @type {any} */ (await tasksApi.create(form.project_id, mapTaskFormToPayload(form)));
      const resource = resources.find(r => r.id === form.resource_id);
      if (resource && task?.id) await tasksApi.createAssignment(task.id, resource, resources);
      return task;
    },
    onSuccess: () => {
      refreshHome();
      queryClient.invalidateQueries({ queryKey: ['account-tasks'] });
    },
    onError: (error) => toastError(error.message),
  });

  const createProject = useMutation({
    mutationFn: (data) => {
      // Projects always live under a program in Project Hub.
      if (!data?.program_id) throw new Error('Choose a program for the new project.');
      return programsApi.createProject(data.program_id, data);
    },
    onSuccess: (newProject) => {
      invalidateHierarchy(queryClient);
      navigate(`/projects/${newProject.id}/sheet`);
    },
    onError: (error) => toastError(error.message),
  });

  const createRisk = useMutation({
    mutationFn: (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating a risk.');
      return raidApi.createRisk(data.project_id, mapRiskInputToPayload(data));
    },
    onSuccess: () => {
      refreshHome();
      queryClient.invalidateQueries({ queryKey: ['account-risks'] });
    },
    onError: (error) => toastError(error.message),
  });

  const completeItem = useMutation({
    mutationFn: (item) => {
      const status_id = item.completeStatusId;
      if (item.kind === 'Task') return tasksApi.update(item.id, { status_id, percent_complete: 100 });
      if (item.kind === 'Risk') return raidApi.updateRisk(item.id, { status_id });
      return raidApi.updateIssue(item.id, { status_id });
    },
    onSuccess: (_result, item) => {
      refreshHome();
      queryClient.invalidateQueries({ queryKey: [item.kind === 'Task' ? 'account-tasks' : item.kind === 'Risk' ? 'account-risks' : 'account-issues'] });
    },
    onError: (error) => toastError(error.message),
  });

  const data = homeQuery.data;
  const q = search.trim().toLowerCase();
  const matches = (text) => !q || (text || '').toLowerCase().includes(q);

  const priorities = useMemo(() => (data?.priorities || [])
    .filter(i => priorityTab === 'all' || i.bucket === priorityTab)
    .filter(i => matches(i.title) || matches(i.projectName))
    .map(i => ({
      ...i,
      ...BADGE[i.bucket],
      dateLabel: isValid(parseISO(i.date)) ? format(parseISO(i.date), 'MMM d, yyyy') : '',
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data, priorityTab, q]);
  const visibleProjects = (data?.myProjects || []).filter(p => matches(p.name));

  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const firstName = String(/** @type {any} */ (user)?.full_name || '').trim().split(/\s+/)[0];
  const greeting = firstName ? `Good ${part}, ${firstName}` : `Good ${part}`;

  const openProject = (projectId) => navigate(projectId ? `/projects/${projectId}/sheet` : '/Projects?view=all_projects');
  const openPriority = (item) => {
    if (item.kind === 'Task') navigate(`/projects/${item.projectId}/sheet?task=${item.id}`);
    else navigate(ITEM_PAGES[item.kind] || `/projects/${item.projectId}/sheet`);
  };

  const handleCard = (key) => {
    if (key === 'projects') { navigate('/Projects?view=all_projects'); return; }
    setPriorityTab(key === 'tasks' ? 'all' : key);
  };

  const handleCreate = (kind) => {
    if (kind === 'task') setTaskOpen(true);
    else if (kind === 'project') setProjectOpen(true);
    else if (kind === 'risk') setRiskOpen(true);
  };

  const stats = {
    tasks: data?.counts.all ?? 0,
    overdue: data?.counts.overdue ?? 0,
    week: data?.counts.week ?? 0,
    projects: data?.activeProjectCount ?? 0,
  };

  return (
    <div className="h-screen flex" style={{ background: '#F7FAFD', fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 max-w-[1400px] mx-auto flex flex-col gap-4 lg:h-full lg:min-h-0">
            <HomeHeader
              greeting={greeting}
              subtitle="Your workspace at a glance"
              search={search}
              onSearchChange={setSearch}
              onCreate={handleCreate}
            />
            {homeQuery.isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : homeQuery.isError ? (
              <div className="py-24 text-center">
                <p className="text-sm text-slate-600">We could not load your home page.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => homeQuery.refetch()}>Try again</Button>
              </div>
            ) : (
              <>
                <HomeStatCards cards={stats} onSelect={handleCard} />
                <div className="grid grid-cols-1 lg:grid-cols-[48fr_52fr] gap-4 items-stretch lg:flex-1 lg:min-h-[220px] min-h-0">
                  <MyPriorities
                    items={priorities}
                    counts={data?.counts || {}}
                    activeTab={priorityTab}
                    onTabChange={setPriorityTab}
                    onOpen={openPriority}
                    onComplete={(item) => completeItem.mutate(item)}
                  />
                  <MyProjects projects={visibleProjects} onOpen={openProject} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[68fr_32fr] gap-4 items-stretch flex-shrink-0 mt-auto">
                  <HomeFavorites query={search} />
                  <RecentActivity items={data?.activity || []} onOpen={openProject} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <NewTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        projects={projects}
        statusOptions={statusOptions}
        resources={resources}
        defaultResourceId={myResourceId}
        onSave={(form) => createTask.mutate(form)}
      />
      <ProjectDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        project={null}
        onSave={(form) => createProject.mutate(form)}
        type="project"
        programs={programs}
        portfolios={portfolios}
      />
      <RiskDialog
        open={riskOpen}
        onOpenChange={setRiskOpen}
        type="risk"
        projects={projects}
        programs={programs}
        resources={resources}
        existingCount={0}
        onAdd={(form) => createRisk.mutate(form)}
      />
    </div>
  );
}
