import { apiClient } from './client';

// The signed-in person's home page (GET /accounts/{id}/me/home), mapped to the shapes the home cards use.

type ProjectRef = { id: string; name: string };
type StatusSummary = { id: string; label: string; value: string; color: string | null };

export type HomeApiPriority = {
  id: string;
  kind: 'TASK' | 'RISK' | 'ISSUE' | 'ASSUMPTION' | 'DEPENDENCY';
  title: string;
  project: ProjectRef;
  due_date: string;
  bucket: 'OVERDUE' | 'WEEK' | 'UPCOMING';
  complete_status_id: string | null;
};

export type HomeApiProject = {
  id: string;
  name: string;
  status: StatusSummary | null;
  is_completed: boolean;
  at_risk: boolean;
  percent_complete: number;
  next_milestone: { id: string; name: string; finish_date: string } | null;
  target_end_date: string | null;
};

export type HomeApiActivity = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  entity_name: string | null;
  actor_name: string | null;
  project: ProjectRef | null;
  created_at: string;
};

export type HomeApiNotification = {
  id: string;
  kind: 'APPROVAL' | 'ASSIGNMENT' | 'MENTION';
  title: string;
  subtitle: string;
  entity_type: string;
  entity_id: string;
  project: ProjectRef | null;
  created_at: string;
};

export type HomeApiRead = {
  priorities: HomeApiPriority[];
  counts: { all: number; overdue: number; week: number; upcoming: number };
  active_project_count: number;
  my_projects: HomeApiProject[];
  recent_activity: HomeApiActivity[];
  notifications: HomeApiNotification[];
  notifications_read_at: string | null;
};

export type HomeBucket = 'overdue' | 'week' | 'upcoming';

export type HomePriority = {
  id: string;
  kind: 'Task' | 'Risk' | 'Issue' | 'Assumption' | 'Dependency';
  title: string;
  projectId: string;
  projectName: string;
  date: string;
  bucket: HomeBucket;
  completeStatusId: string | null;
};

export type HomeProject = {
  id: string;
  name: string;
  pct: number;
  atRisk: boolean;
  completed: boolean;
  nextMilestone: string;
  dueDate: string;
};

export type HomeActivity = {
  id: string;
  kind: string;
  label: string;
  projectId: string | null;
  projectName: string;
  ts: string;
};

// Something waiting on the person, shown in the Home page bell.
export type HomeNotification = {
  id: string;
  kind: 'approval' | 'assignment' | 'mention';
  title: string;
  subtitle: string;
  entityType: string;
  entityId: string;
  projectId: string | null;
  ts: string;
};

export type HomeData = {
  priorities: HomePriority[];
  counts: { all: number; overdue: number; week: number; upcoming: number };
  activeProjectCount: number;
  myProjects: HomeProject[];
  activity: HomeActivity[];
  notifications: HomeNotification[];
  notificationsReadAt: string | null;
};

const KIND_LABEL = { TASK: 'Task', RISK: 'Risk', ISSUE: 'Issue', ASSUMPTION: 'Assumption', DEPENDENCY: 'Dependency' } as const;

const ACTION_VERB: Record<string, string> = {
  CREATE: 'added',
  CREATED: 'added',
  UPDATE: 'updated',
  UPDATED: 'updated',
  DELETE: 'deleted',
  DELETED: 'deleted',
  COMMENT: 'commented on',
  COMMENTED: 'commented on',
};

const titleCase = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const mapHomeActivity = (entry: HomeApiActivity): HomeActivity => {
  const verb = ACTION_VERB[entry.action.toUpperCase()] || titleCase(entry.action);
  const thing = titleCase(entry.entity_type);
  const name = entry.entity_name ? ` “${entry.entity_name}”` : '';
  return {
    id: entry.id,
    kind: entry.entity_type.toLowerCase(),
    label: `${thing}${name} ${verb}`,
    projectId: entry.project?.id ?? null,
    projectName: [entry.project?.name, entry.actor_name].filter(Boolean).join(' · '),
    ts: entry.created_at,
  };
};

export const mapHomeFromApi = (data: HomeApiRead): HomeData => ({
  priorities: (data.priorities || []).map((item) => ({
    id: item.id,
    kind: KIND_LABEL[item.kind],
    title: item.title,
    projectId: item.project.id,
    projectName: item.project.name,
    date: item.due_date,
    bucket: item.bucket.toLowerCase() as HomeBucket,
    completeStatusId: item.complete_status_id,
  })),
  counts: data.counts,
  activeProjectCount: data.active_project_count,
  myProjects: (data.my_projects || []).map((project) => ({
    id: project.id,
    name: project.name,
    pct: project.percent_complete,
    atRisk: project.at_risk,
    completed: project.is_completed,
    nextMilestone: project.next_milestone?.name || '',
    dueDate: project.target_end_date || '',
  })),
  activity: (data.recent_activity || []).map(mapHomeActivity),
  notifications: (data.notifications || []).map((item) => ({
    id: item.id,
    kind: item.kind.toLowerCase() as HomeNotification['kind'],
    title: item.title,
    subtitle: item.subtitle,
    entityType: item.entity_type,
    entityId: item.entity_id,
    projectId: item.project?.id ?? null,
    ts: item.created_at,
  })),
  notificationsReadAt: data.notifications_read_at ?? null,
});

export const homeApi = {
  get: async (accountId: string): Promise<HomeData> =>
    mapHomeFromApi(await apiClient.get(`/api/v1/accounts/${accountId}/me/home`) as HomeApiRead),
  markNotificationsRead: (accountId: string) =>
    apiClient.post(`/api/v1/accounts/${accountId}/me/home/notifications/read`) as Promise<{ notifications_read_at: string }>,
  // Approvals, assignments and mentions are built from live data, so the server remembers which ones were removed.
  dismissNotifications: (accountId: string, ids: string[]) =>
    apiClient.post(`/api/v1/accounts/${accountId}/me/home/notifications/dismiss`, { ids }) as Promise<{ removed: number }>,
};
