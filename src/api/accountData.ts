import { apiClient } from './client';
import { optionKey } from './lookups';

// Account-wide collections (tasks, sprints, time off) mapped to the shapes the
// Base44-era rollup screens (financials, utilization, calendars) compute from.

type ApiRecord = Record<string, any>;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const dateOnly = (value: unknown) => (typeof value === 'string' && value ? value.split('T')[0] : null);

// Task status option keys -> Base44 task statuses used by rollups ("done" means complete).
const TASK_STATUS: Record<string, string> = {
  not_started: 'todo',
  in_progress: 'in_progress',
  blocked: 'blocked',
  complete: 'done',
};

export const mapAccountTaskToUi = (task: ApiRecord) => {
  const assignments: ApiRecord[] = Array.isArray(task.assignments) ? task.assignments : [];
  const allocations: ApiRecord[] = Array.isArray(task.allocations) ? task.allocations : [];
  const resources = assignments.map((a) => a.resource_name).filter(Boolean);
  const statusKey = optionKey(task.status);

  return {
    id: task.id,
    title: task.name,
    name: task.name,
    project_id: task.project_id,
    sprint_id: task.sprint_id || null,
    parent_task_id: task.parent_task_id || null,
    status: (statusKey && TASK_STATUS[statusKey]) || statusKey || 'todo',
    status_id: task.status_id || null,
    sort_order: task.sort_order == null ? 0 : toNumber(task.sort_order),
    task_type: optionKey(task.task_type),
    priority: optionKey(task.priority),
    start_date: dateOnly(task.start_date),
    due_date: dateOnly(task.finish_date),
    duration: task.duration_days == null ? null : toNumber(task.duration_days),
    progress: toNumber(task.percent_complete),
    story_points: task.story_points ?? null,
    assignee: resources[0] || '',
    resources,
    resource_hours: assignments
      .filter((a) => a.resource_name && a.hours != null)
      .map((a) => ({ resource: a.resource_name, hours: toNumber(a.hours) })),
    resources_planned: allocations.map((a) => a.resource_name),
    resource_hours_planned: allocations.map((a) => ({ resource: a.resource_name, hours: toNumber(a.allocated_hours) })),
  };
};

/** Sprint-scoped tasks double as user stories (the API has no separate story entity). */
export const mapTaskToUserStory = (task: ReturnType<typeof mapAccountTaskToUi>) => ({
  id: task.id,
  title: task.title,
  project_id: task.project_id,
  sprint_id: task.sprint_id,
  story_points: task.story_points ?? 0,
  status: task.status,
  priority: task.priority,
  assignee: task.assignee,
  estimated_hours: task.resource_hours_planned.reduce((sum, entry) => sum + entry.hours, 0),
  actual_hours: task.resource_hours.reduce((sum, entry) => sum + entry.hours, 0),
  start_date: task.start_date,
  due_date: task.due_date,
});

export const mapAccountSprintToUi = (sprint: ApiRecord) => ({
  id: sprint.id,
  sprint_id: sprint.name,
  name: sprint.name,
  project_id: sprint.project_id,
  goal: sprint.goal || '',
  start_date: dateOnly(sprint.start_date),
  end_date: dateOnly(sprint.end_date),
  status: optionKey(sprint.status) || 'planned',
});

/** Account time off in the Base44 ResourceVacation shape. */
export const mapTimeOffToVacation = (entry: ApiRecord) => ({
  id: entry.id,
  resource_id: entry.resource_id,
  resource_name: entry.resource_name || '',
  start_date: dateOnly(entry.start_date),
  end_date: dateOnly(entry.end_date),
  notes: entry.reason || '',
});

const asArray = (response: unknown): ApiRecord[] => (Array.isArray(response) ? response : []);

export const accountDataApi = {
  listTasks: async (accountId: string, query?: Record<string, unknown>) =>
    asArray(await apiClient.get(`/api/v1/accounts/${accountId}/tasks`, query)).map(mapAccountTaskToUi),
  listSprints: async (accountId: string) =>
    asArray(await apiClient.get(`/api/v1/accounts/${accountId}/sprints`)).map(mapAccountSprintToUi),
  listVacations: async (accountId: string) =>
    asArray(await apiClient.get(`/api/v1/accounts/${accountId}/time-off`)).map(mapTimeOffToVacation),
};

const resourceIdForName = (resources: ApiRecord[], name: unknown) => {
  const wanted = String(name || '').trim().toLowerCase();
  const match = resources.find((resource) => String(resource.full_name || resource.name || '').trim().toLowerCase() === wanted);
  if (!match) throw new Error(`"${String(name || '').trim()}" is not a resource. Add them under Resources first.`);
  return String(match.id);
};

const toTimeOffPayload = (data: ApiRecord) => ({
  start_date: data.start_date,
  end_date: data.end_date,
  reason: data.notes || null,
});

/** ResourceVacation CRUD on top of per-resource time off. `resources` resolves names to ids. */
export const vacationsApi = {
  create: async (resources: ApiRecord[], data: ApiRecord) => {
    const resourceId = resourceIdForName(resources, data.resource_name);
    return mapTimeOffToVacation(await apiClient.post(`/api/v1/resources/${resourceId}/time-off`, toTimeOffPayload(data)) as ApiRecord);
  },
  update: async (resources: ApiRecord[], id: string, data: ApiRecord, previous?: ApiRecord) => {
    const resourceId = resourceIdForName(resources, data.resource_name);
    if (previous?.resource_id && previous.resource_id !== resourceId) {
      // Time off cannot move between resources; recreate it under the new one.
      const created = await vacationsApi.create(resources, data);
      await apiClient.delete(`/api/v1/resource-time-off/${id}`);
      return created;
    }
    return mapTimeOffToVacation(await apiClient.patch(`/api/v1/resource-time-off/${id}`, toTimeOffPayload(data)) as ApiRecord);
  },
  delete: (id: string) => apiClient.delete(`/api/v1/resource-time-off/${id}`),
};
