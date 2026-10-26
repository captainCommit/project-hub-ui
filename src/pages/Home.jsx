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
import ProjectDialog from '@/components/projects/ProjectDialog';
import { AddDialog as RiskIssueDialog } from '@/components/projects/RiskIssueSheet';
import { AddDecisionDialog } from '@/pages/DecisionLog';
import { Button } from '@/components/ui/button';
import { toastError } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useAccountHierarchy, useAccountResources, invalidateHierarchy } from '@/hooks/useAccountLookups';
import { homeApi } from '@/api/home';
import { tasksApi } from '@/api/tasks';
import { programsApi } from '@/api/programs';
import { raidApi, mapRiskInputToPayload, mapIssueInputToPayload, mapDecisionInputToPayload } from '@/api/raid';
import { getRaidStatuses } from '@/lib/raidStatuses';
import { dependenciesApi } from '@/api/projectLogs';
import { notificationsApi } from '@/api/notifications';
import Tour from '@/components/tour/Tour';
import { HOME_TOUR } from './Home.tour';

const BADGE = {
  overdue: { tone: 'urgent', badge: 'Overdue' },
  week: { tone: 'warn', badge: 'Due soon' },
  upcoming: { tone: 'muted', badge: 'Upcoming' },
};

// Where each kind of record opens; tasks open on their project sheet.
const RECORD_PAGES = {
  RISK: '/RiskLog?tab=risks',
  ISSUE: '/RiskLog?tab=issues',
  ASSUMPTION: '/RiskLog?tab=assumptions',
  DEPENDENCY: '/RiskLog?tab=dependencies',
  DECISION: '/ChangeRegisterHub?tab=decisions',
  CHANGE_REQUEST: '/ChangeRegisterHub?tab=changes',
  REQUIREMENT: '/Requirements',
  TEST_CASE: '/Testing',
};

// The app's other notifications also land in the Home bell. Mentions and assignments are left out
// because the bell already lists those from the Home data.
const FEED_SKIP_TYPES = ['MENTION', 'TASK_ASSIGNED'];
const FEED_KIND = {
  SUPPORT_REPLY: 'support',
  ESCALATION: 'escalation',
  RISK_CREATED: 'risk',
  DUE_SOON: 'due',
  STATUS_CHANGED: 'status',
  DECISION_APPROVED: 'approval',
  COMMENT_ADDED: 'comment',
};
const FEED_POLL_MS = 60_000;

export default function Home() {
  const { user, selectedAccountId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { projects, programs, portfolios } = useAccountHierarchy();
  const resources = useAccountResources();
  const [projectOpen, setProjectOpen] = useState(false);
  // 'risk' or 'issue' while that dialog is open.
  const [raidDialog, setRaidDialog] = useState(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [priorityTab, setPriorityTab] = useState('all');
  const userId = /** @type {any} */ (user)?.id;

  const homeKey = ['my-home', selectedAccountId, userId];
  const homeQuery = useQuery({
    queryKey: homeKey,
    queryFn: () => homeApi.get(selectedAccountId),
    enabled: Boolean(selectedAccountId && userId),
  });

  const feedQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: FEED_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const refreshHome = () => queryClient.invalidateQueries({ queryKey: ['my-home'] });

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

  const createIssue = useMutation({
    mutationFn: (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating an issue.');
      return raidApi.createIssue(data.project_id, mapIssueInputToPayload(data));
    },
    onSuccess: () => {
      refreshHome();
      queryClient.invalidateQueries({ queryKey: ['account-issues'] });
    },
    onError: (error) => toastError(error.message),
  });

  const createDecision = useMutation({
    mutationFn: (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating a decision.');
      return raidApi.createDecision(data.project_id, mapDecisionInputToPayload(data));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-decisions'] }),
    onError: (error) => toastError(error.message),
  });

  const completeItem = useMutation({
    mutationFn: (item) => {
      const status_id = item.completeStatusId;
      if (item.kind === 'Task') return tasksApi.update(item.id, { status_id, percent_complete: 100 });
      if (item.kind === 'Risk') return raidApi.updateRisk(item.id, { status_id });
      if (item.kind === 'Issue') return raidApi.updateIssue(item.id, { status_id });
      if (item.kind === 'Assumption') return raidApi.updateAssumption(item.id, { status_id });
      return dependenciesApi.update(item.id, { status_id });
    },
    onSuccess: (_result, item) => {
      refreshHome();
      const keys = { Task: 'account-tasks', Risk: 'account-risks', Issue: 'account-issues', Assumption: 'assumptions', Dependency: 'dependencies' };
      queryClient.invalidateQueries({ queryKey: [keys[item.kind]] });
    },
    onError: (error) => toastError(error.message),
  });

  const data = homeQuery.data;
  const priorities = useMemo(() => (data?.priorities || [])
    .filter(i => priorityTab === 'all' || i.bucket === priorityTab)
    .map(i => ({
      ...i,
      ...BADGE[i.bucket],
      dateLabel: isValid(parseISO(i.date)) ? format(parseISO(i.date), 'MMM d, yyyy') : '',
    })),
  [data, priorityTab]);

  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  // The first name from the person's profile; the sign-in name is the fallback for profiles without one.
  const profile = /** @type {any} */ (user);
  const firstName = String(profile?.first_name || profile?.full_name || '').trim().split(/\s+/)[0];
  const greeting = firstName ? `Good ${part}, ${firstName}` : `Good ${part}`;

  const openProject = (projectId) => navigate(projectId ? `/projects/${projectId}/sheet` : '/Projects?view=all_projects');
  const openRecord = (entityType, id, projectId) => {
    if (entityType === 'TASK') navigate(`/projects/${projectId}/sheet?task=${id}`);
    else navigate(RECORD_PAGES[entityType] || (projectId ? `/projects/${projectId}/sheet` : '/Projects?view=all_projects'));
  };
  const openPriority = (item) => openRecord(item.kind.toUpperCase(), item.id, item.projectId);
  // Approvals, assignments and mentions from the Home data, plus everything else in the notification feed.
  const bellItems = useMemo(() => {
    const feed = (feedQuery.data?.results || [])
      .filter(n => !FEED_SKIP_TYPES.includes(n.notification_type))
      .map(n => ({
        id: `feed-${n.id}`,
        feedId: n.id,
        kind: FEED_KIND[n.notification_type] || 'update',
        title: n.title,
        subtitle: n.message || '',
        entityType: n.entity_type,
        entityId: n.entity_id,
        projectId: null,
        ts: n.created_at,
        unread: !n.is_read,
      }));
    return [...(data?.notifications || []), ...feed].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [data, feedQuery.data]);

  const markFeedRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const openNotification = (item) => {
    if (item.feedId === undefined) { openRecord(item.entityType, item.entityId, item.projectId); return; }
    if (item.unread) markFeedRead.mutate(item.feedId);
    // Feed items carry only the record, so they open the screen that lists that kind of record.
    if (item.entityType === 'SUPPORT_TICKET') navigate(`/LearnSupport?ticket=${item.entityId}`);
    else if (RECORD_PAGES[item.entityType]) navigate(RECORD_PAGES[item.entityType]);
  };

  const markAllRead = useMutation({
    mutationFn: () => Promise.all([homeApi.markNotificationsRead(selectedAccountId), notificationsApi.markAllRead()]),
    onSuccess: ([result]) => {
      queryClient.setQueryData(homeKey, (old) => (old ? { ...old, notificationsReadAt: result.notifications_read_at } : old));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toastError(error.message),
  });

  // Takes the bell items away straight away. "Clear read" removes every read feed notification, listed or not.
  const removeNotifications = useMutation({
    mutationFn: ({ items, clearRead = false }) => {
      const homeIds = items.filter(item => item.feedId === undefined).map(item => item.id);
      const feedRequests = clearRead
        ? [notificationsApi.removeRead()]
        : items.filter(item => item.feedId !== undefined).map(item => notificationsApi.remove(item.feedId));
      return Promise.all([
        ...(homeIds.length ? [homeApi.dismissNotifications(selectedAccountId, homeIds)] : []),
        ...feedRequests,
      ]);
    },
    onMutate: ({ items }) => {
      const homeIds = new Set(items.map(item => item.id));
      const feedIds = new Set(items.map(item => item.feedId).filter(Boolean));
      queryClient.setQueryData(homeKey, (old) => (old ? { ...old, notifications: old.notifications.filter(n => !homeIds.has(n.id)) } : old));
      queryClient.setQueryData(['notifications'], (old) => (old ? { ...old, results: old.results.filter(n => !feedIds.has(n.id)) } : old));
    },
    onError: (error) => toastError(error.message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: homeKey });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleCard = (key) => {
    if (key === 'projects') { navigate('/Projects?view=all_projects'); return; }
    setPriorityTab(key === 'tasks' ? 'all' : key);
  };

  const handleCreate = (kind) => {
    if (kind === 'project') setProjectOpen(true);
    else if (kind === 'risk' || kind === 'issue') setRaidDialog(kind);
    else if (kind === 'decision') setDecisionOpen(true);
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
            <Tour tour={HOME_TOUR} />
            <HomeHeader
              greeting={greeting}
              subtitle="Your workspace at a glance"
              notifications={bellItems}
              notificationsReadAt={data?.notificationsReadAt || null}
              onOpenNotification={openNotification}
              onMarkAllRead={() => markAllRead.mutate()}
              markingRead={markAllRead.isPending}
              onRemoveNotification={(item) => removeNotifications.mutate({ items: [item] })}
              onClearRead={(items) => removeNotifications.mutate({ items, clearRead: true })}
              clearingRead={removeNotifications.isPending}
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
                  <MyProjects projects={data?.myProjects || []} onOpen={openProject} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[68fr_32fr] gap-4 items-stretch flex-shrink-0 mt-auto">
                  <HomeFavorites />
                  <RecentActivity items={data?.activity || []} onOpen={openProject} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ProjectDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        project={null}
        onSave={(form) => createProject.mutate(form)}
        type="project"
        programs={programs}
        portfolios={portfolios}
      />
      <RiskIssueDialog
        key={raidDialog || 'closed'}
        open={Boolean(raidDialog)}
        onOpenChange={(open) => { if (!open) setRaidDialog(null); }}
        type={raidDialog || 'risk'}
        projects={projects}
        programs={programs}
        resources={resources}
        existingCount={0}
        onAdd={(form) => (raidDialog === 'issue' ? createIssue : createRisk).mutate(form)}
      />
      <AddDecisionDialog
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        projects={projects}
        programs={programs}
        resources={resources}
        statusOptions={getRaidStatuses('decision')}
        onCreate={(form) => createDecision.mutate(form)}
      />
    </div>
  );
}
