import { apiClient } from './client';

type LookupSummary = {
  id?: string | null;
  label?: string | null;
  value?: string | null;
  color?: string | null;
};

type TaskAssignmentRead = {
  id?: string;
  account_id?: string;
  task_id?: string;
  user_id?: string | null;
  resource_name?: string | null;
  created_at?: string;
};

export type TaskSheetResourceAssignment = {
  id: string;
  assignment_id?: string;
  task_id?: string;
  resource_id?: string;
  user_id?: string | null;
  resource_name: string;
  name: string;
  full_name: string;
  role?: string | null;
  team?: string | null;
  is_active?: boolean;
  active?: boolean;
  raw?: unknown;
};

type TaskPredecessorRead = {
  id?: string;
  predecessor_task_id?: string | null;
  dependency_type?: string | null;
  lag_days?: number | string | null;
};

export type ProjectHubTaskRead = {
  id?: string;
  project_id?: string;
  parent_task_id?: string | null;
  sort_order?: number | string | null;
  name?: string | null;
  description?: string | null;
  task_type_id?: string | null;
  task_type?: LookupSummary | string | null;
  start_date?: string | null;
  finish_date?: string | null;
  duration_days?: number | string | null;
  status_id?: string | null;
  status?: LookupSummary | string | null;
  percent_complete?: number | string | null;
  priority_id?: string | null;
  priority?: LookupSummary | string | null;
  predecessors?: TaskPredecessorRead[] | string[] | null;
  assignments?: TaskAssignmentRead[] | null;
  children?: ProjectHubTaskRead[];
  [key: string]: unknown;
};

export type TaskSheetRow = {
  id: string;
  project_id?: string;
  parent_task_id?: string | null;
  sort_order?: number | string | null;
  order?: number;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  task_type_id?: string | null;
  task_type?: string;
  task_type_summary?: LookupSummary | string | null;
  start_date?: string | null;
  finish_date?: string | null;
  due_date?: string | null;
  duration_days?: number | string | null;
  duration?: number;
  status_id?: string | null;
  status?: string;
  status_summary?: LookupSummary | string | null;
  percent_complete?: number | string | null;
  progress?: number;
  priority_id?: string | null;
  priority?: string;
  priority_summary?: LookupSummary | string | null;
  predecessors?: string[];
  predecessor_links?: TaskPredecessorRead[] | string[];
  assignments?: TaskAssignmentRead[];
  resources?: string[];
  indent_level?: number;
  children?: string[];
  [key: string]: unknown;
};

export type ProjectTaskCreatePayload = {
  name: string;
};

export type ProjectTaskTitleUpdatePayload = {
  name: string;
};

export type ProjectTaskDurationUpdatePayload = {
  duration_days: number;
};

export type ProjectTaskDateUpdatePayload = {
  start_date?: string;
  finish_date?: string;
};

export type ProjectTaskProgressUpdatePayload = {
  percent_complete: number;
};

export type ProjectTaskStatusUpdatePayload = {
  status_id: string;
};

export type ProjectTaskPriorityUpdatePayload = {
  priority_id: string;
};

export type ProjectTaskTypeUpdatePayload = {
  task_type_id: string;
};

export type ProjectTaskPredecessorCreatePayload = {
  predecessor_task_id: string;
};

export type ProjectTaskAssignmentCreatePayload = {
  user_id?: string | null;
  resource_name?: string | null;
};

export type TaskStatusOptionValue = {
  value: string;
  label: string;
  code?: string;
  name?: string;
  color?: string;
  isActive: boolean;
  raw: unknown;
};

export type TaskStatusOptionsMapping = {
  found: boolean;
  optionSet: Record<string, unknown> | null;
  allOptions: TaskStatusOptionValue[];
  activeOptions: TaskStatusOptionValue[];
};

export type TaskTypeOptionValue = {
  value: string;
  label: string;
  code?: string;
  name?: string;
  color?: string;
  isActive: boolean;
  raw: unknown;
};

export type TaskTypeOptionsMapping = {
  found: boolean;
  optionSet: Record<string, unknown> | null;
  allOptions: TaskTypeOptionValue[];
  activeOptions: TaskTypeOptionValue[];
};

export type TaskPriorityOptionValue = {
  value: string;
  label: string;
  code?: string;
  name?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  raw: unknown;
};

export type TaskPriorityOptionsMapping = {
  found: boolean;
  optionSet: Record<string, unknown> | null;
  allOptions: TaskPriorityOptionValue[];
  activeOptions: TaskPriorityOptionValue[];
};

export type KanbanBoardColumn = {
  id: string;
  title: string;
  color?: string;
};

export type KanbanBoardCard = {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
  progress?: number;
  priority?: string;
  [key: string]: unknown;
};

export type KanbanBoardData = {
  columns: KanbanBoardColumn[];
  tasks: KanbanBoardCard[];
};

export type TaskBoardPositionPayload = {
  status_id: string;
  sort_order: number;
  sprint_id?: string | null;
};

export type ProjectTaskReorderItem = {
  id: string;
  parent_task_id?: string | null;
  sort_order: number;
};

export type ProjectTaskReorderPayload = {
  tasks: ProjectTaskReorderItem[];
};

export type GanttTask = {
  id: string;
  title: string;
  start_date: string;
  due_date: string;
  end_date: string;
  finish_date: string;
  duration?: number;
  progress?: number;
  parent_task_id?: string | null;
  predecessors?: string[];
  predecessor_links?: TaskPredecessorRead[];
  task_type?: string;
  status?: string;
  [key: string]: unknown;
};

export type DueTaskRow = {
  id?: string;
  title?: string | null;
  name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  program_id?: string | null;
  program_name?: string | null;
  assigned_to?: string | null;
  assignee_name?: string | null;
  resource_name?: string | null;
  status?: string | null;
  status_id?: string | null;
  start_date?: string | null;
  finish_date?: string | null;
  due_date?: string | null;
  due_state?: string | null;
  days_overdue?: number | string | null;
  days_until_due?: number | string | null;
  percent_complete?: number | string | null;
  [key: string]: unknown;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const summaryValue = (value: ProjectHubTaskRead['status'] | ProjectHubTaskRead['task_type'] | ProjectHubTaskRead['priority']): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.value || undefined;
};

const mapAssignmentsToResources = (assignments: TaskAssignmentRead[] | null | undefined): string[] | undefined => {
  if (!Array.isArray(assignments)) return undefined;
  const names = assignments.map((assignment) => assignment?.resource_name).filter((name): name is string => Boolean(name));
  return names.length > 0 ? names : undefined;
};

const mapPredecessorsToIds = (predecessors: ProjectHubTaskRead['predecessors']): string[] | undefined => {
  if (!Array.isArray(predecessors)) return undefined;
  const ids = predecessors
    .map((predecessor) => (typeof predecessor === 'string' ? predecessor : predecessor?.predecessor_task_id))
    .filter((id): id is string => Boolean(id));
  return ids.length > 0 ? ids : undefined;
};

export const mapTaskPredecessorsToLinks = (predecessors: ProjectHubTaskRead['predecessors']): TaskPredecessorRead[] | undefined => {
  if (!Array.isArray(predecessors)) return undefined;

  const links: TaskPredecessorRead[] = [];

  predecessors.forEach((predecessor) => {
    if (typeof predecessor === 'string') return;
    if (!predecessor?.predecessor_task_id) return;

    links.push({
      id: predecessor?.id,
      predecessor_task_id: predecessor?.predecessor_task_id ?? null,
      dependency_type: predecessor?.dependency_type ?? null,
      lag_days: predecessor?.lag_days ?? null,
    });
  });

  return links.length > 0 ? links : undefined;
};

const copyIfPresent = (target: TaskSheetRow, source: ProjectHubTaskRead, key: string) => {
  if (source[key] !== undefined && source[key] !== null) {
    target[key] = source[key];
  }
};

export const mapTaskSheetInputToCreatePayload = (input: unknown): ProjectTaskCreatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawName = data.name ?? data.title;
  const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'Untitled Task';

  return { name };
};

export const mapTaskSheetInputToTitleUpdatePayload = (input: unknown): ProjectTaskTitleUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawName = data.name ?? data.title;
  const name = typeof rawName === 'string' ? rawName.trim() : '';

  return { name };
};

export const mapTaskSheetInputToDurationUpdatePayload = (input: unknown): ProjectTaskDurationUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawDuration = data.duration_days ?? data.duration;
  const durationText = typeof rawDuration === 'string' ? rawDuration.trim() : rawDuration;
  const duration = Number(durationText);

  if (durationText === '' || !Number.isFinite(duration) || duration < 0) {
    throw new Error('Duration must be a valid non-negative number.');
  }

  return { duration_days: duration };
};

const isValidApiDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
};

export const mapTaskGanttDateUpdatePayload = (input: unknown): ProjectTaskDateUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const payload: ProjectTaskDateUpdatePayload = {};

  if (data.start_date !== undefined) {
    if (!isValidApiDate(data.start_date)) throw new Error('Start date must be a valid YYYY-MM-DD date.');
    payload.start_date = data.start_date;
  }

  if (data.finish_date !== undefined) {
    if (!isValidApiDate(data.finish_date)) throw new Error('Finish date must be a valid YYYY-MM-DD date.');
    payload.finish_date = data.finish_date;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('At least one task date must be changed.');
  }

  if (payload.start_date && payload.finish_date && new Date(`${payload.start_date}T00:00:00`) > new Date(`${payload.finish_date}T00:00:00`)) {
    throw new Error('Start date must not be after finish date.');
  }

  return payload;
};

export const mapTaskSheetInputToProgressUpdatePayload = (input: unknown): ProjectTaskProgressUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawProgress = data.percent_complete ?? data.progress;
  const progressText = typeof rawProgress === 'string' ? rawProgress.trim() : rawProgress;
  const progress = Number(progressText);

  if (progressText === '' || !Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new Error('Enter a progress value from 0 to 100.');
  }

  return { percent_complete: progress };
};

export const mapTaskSheetInputToStatusUpdatePayload = (input: unknown): ProjectTaskStatusUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawStatusId = data.status_id;
  const statusId = typeof rawStatusId === 'string' ? rawStatusId.trim() : '';

  if (!statusId) {
    throw new Error('Select a valid task status.');
  }

  return { status_id: statusId };
};

export const mapTaskSheetInputToPriorityUpdatePayload = (input: unknown): ProjectTaskPriorityUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawPriorityId = data.priority_id;
  const priorityId = typeof rawPriorityId === 'string' ? rawPriorityId.trim() : '';

  if (!priorityId) {
    throw new Error('Select a valid task priority.');
  }

  return { priority_id: priorityId };
};

export const mapTaskSheetInputToTaskTypeUpdatePayload = (input: unknown): ProjectTaskTypeUpdatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawTaskTypeId = data.task_type_id;
  const taskTypeId = typeof rawTaskTypeId === 'string' ? rawTaskTypeId.trim() : '';

  if (!taskTypeId) {
    throw new Error('Select a valid task type.');
  }

  return { task_type_id: taskTypeId };
};

export const mapTaskSheetInputToPredecessorCreatePayload = (input: unknown): ProjectTaskPredecessorCreatePayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const rawPredecessorTaskId = data.predecessor_task_id;
  const predecessorTaskId = typeof rawPredecessorTaskId === 'string' ? rawPredecessorTaskId.trim() : '';

  if (!predecessorTaskId) {
    throw new Error('Select a valid predecessor task.');
  }

  return { predecessor_task_id: predecessorTaskId };
};

export const mapTaskBoardPositionToPayload = (input: unknown): TaskBoardPositionPayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const statusId = data.status_id ?? data.status;
  const sortOrder = toNumber(data.sort_order) ?? 0;
  const payload: TaskBoardPositionPayload = {
    status_id: String(statusId || ''),
    sort_order: sortOrder,
  };

  if (typeof data.sprint_id === 'string' || data.sprint_id === null) {
    payload.sprint_id = data.sprint_id;
  }

  return payload;
};

export const mapProjectTaskReorderToPayload = (input: unknown): ProjectTaskReorderPayload => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const parentTaskId = typeof data.parent_task_id === 'string' && data.parent_task_id.trim()
    ? data.parent_task_id.trim()
    : null;
  const orderedTaskIds = Array.isArray(data.ordered_task_ids) ? data.ordered_task_ids : [];
  const tasks = orderedTaskIds
    .map((taskId, index) => ({ taskId, index }))
    .filter(({ taskId }) => typeof taskId === 'string' && taskId.trim())
    .map(({ taskId, index }) => ({
      id: String(taskId).trim(),
      parent_task_id: parentTaskId,
      sort_order: index,
    }));

  if (tasks.length === 0) {
    throw new Error('At least one task is required to reorder project tasks.');
  }

  return { tasks };
};

export const mapTaskReadToTaskSheetRow = (task: ProjectHubTaskRead, depth = 0): TaskSheetRow | null => {
  if (!task?.id || !task.name) return null;

  const order = toNumber(task.sort_order);
  const duration = toNumber(task.duration_days);
  const progress = toNumber(task.percent_complete);
  const predecessorIds = mapPredecessorsToIds(task.predecessors);
  const assignmentResources = mapAssignmentsToResources(task.assignments);
  const childIds = Array.isArray(task.children)
    ? task.children.map((child) => child?.id).filter((id): id is string => Boolean(id))
    : undefined;

  const row: TaskSheetRow = {
    id: task.id,
    project_id: task.project_id,
    parent_task_id: task.parent_task_id ?? null,
    sort_order: task.sort_order,
    name: task.name,
    title: task.name,
    description: task.description,
    task_type_id: task.task_type_id ?? null,
    task_type: summaryValue(task.task_type),
    task_type_summary: task.task_type,
    start_date: task.start_date,
    finish_date: task.finish_date,
    due_date: task.finish_date,
    duration_days: task.duration_days,
    status_id: task.status_id ?? null,
    status: summaryValue(task.status),
    status_summary: task.status,
    percent_complete: task.percent_complete,
    priority_id: task.priority_id ?? null,
    priority: summaryValue(task.priority),
    priority_summary: task.priority,
    predecessor_links: Array.isArray(task.predecessors) ? task.predecessors : undefined,
    assignments: Array.isArray(task.assignments) ? task.assignments : undefined,
    indent_level: depth,
  };

  if (order !== undefined) row.order = order;
  if (duration !== undefined) row.duration = duration;
  if (progress !== undefined) row.progress = progress;
  if (predecessorIds) row.predecessors = predecessorIds;
  if (assignmentResources) row.resources = assignmentResources;
  if (childIds && childIds.length > 0) row.children = childIds;

  ['risk_ids', 'issue_ids', 'raid_ids', 'related_risks', 'related_issues'].forEach((key) => copyIfPresent(row, task, key));

  return row;
};

const sortRows = (rows: TaskSheetRow[]): TaskSheetRow[] =>
  [...rows].sort((a, b) => (a.order ?? toNumber(a.sort_order) ?? 0) - (b.order ?? toNumber(b.sort_order) ?? 0));

const computeFlatDepths = (rows: TaskSheetRow[]): TaskSheetRow[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const depthCache = new Map<string, number>();

  const getDepth = (row: TaskSheetRow, seen = new Set<string>()): number => {
    if (depthCache.has(row.id)) return depthCache.get(row.id) || 0;
    if (!row.parent_task_id || seen.has(row.id)) return 0;
    const parent = byId.get(row.parent_task_id);
    if (!parent) return 0;
    seen.add(row.id);
    const depth = getDepth(parent, seen) + 1;
    depthCache.set(row.id, depth);
    return depth;
  };

  return rows.map((row) => ({ ...row, indent_level: getDepth(row) }));
};

export const mapTaskTreeToSheetRows = (taskTree: unknown): TaskSheetRow[] => {
  if (!Array.isArray(taskTree)) return [];

  const rows: TaskSheetRow[] = [];
  const visit = (task: ProjectHubTaskRead, depth: number) => {
    const row = mapTaskReadToTaskSheetRow(task, depth);
    if (row) rows.push(row);
    if (Array.isArray(task.children)) {
      sortRows(task.children.map((child) => mapTaskReadToTaskSheetRow(child, depth + 1)).filter((child): child is TaskSheetRow => Boolean(child)))
        .forEach((childRow) => {
          const childTask = task.children?.find((child) => child.id === childRow.id);
          if (childTask) visit(childTask, depth + 1);
        });
    }
  };

  sortRows(taskTree.map((task) => mapTaskReadToTaskSheetRow(task, 0)).filter((row): row is TaskSheetRow => Boolean(row)))
    .forEach((row) => {
      const task = (taskTree as ProjectHubTaskRead[]).find((item) => item.id === row.id);
      if (task) visit(task, 0);
    });

  return rows;
};

export const mapTaskListToSheetRows = (tasksResponse: unknown): TaskSheetRow[] => {
  const tasks = Array.isArray(tasksResponse)
    ? tasksResponse
    : typeof tasksResponse === 'object' && tasksResponse && Array.isArray((tasksResponse as { items?: unknown }).items)
      ? (tasksResponse as { items: unknown[] }).items
      : [];

  const rows = tasks
    .map((task) => mapTaskReadToTaskSheetRow(task as ProjectHubTaskRead, 0))
    .filter((row): row is TaskSheetRow => Boolean(row));

  return computeFlatDepths(sortRows(rows));
};

const BOARD_COLUMN_COLORS = ['bg-slate-100', 'bg-blue-50', 'bg-purple-50', 'bg-green-50', 'bg-amber-50'];

const TASK_STATUS_OPTION_SET_KEYS = new Set(['taskstatus', 'taskstatuses', 'taskstate', 'taskstates']);
const TASK_TYPE_OPTION_SET_KEYS = new Set(['tasktype', 'tasktypes', 'workitemtype', 'workitemtypes']);
const TASK_PRIORITY_OPTION_SET_KEYS = new Set(['priority', 'priorities', 'taskpriority', 'taskpriorities']);

const STATUS_COLOR_CLASSES: Record<string, string> = {
  notstarted: 'bg-slate-200 text-slate-700',
  todo: 'bg-slate-200 text-slate-700',
  open: 'bg-slate-200 text-slate-700',
  inprogress: 'bg-blue-100 text-blue-700',
  progress: 'bg-blue-100 text-blue-700',
  active: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  onhold: 'bg-yellow-100 text-yellow-700',
  hold: 'bg-yellow-100 text-yellow-700',
};

const titleize = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

const getArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const normalizeResourceName = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';

const getResourceDisplayName = (resource: Record<string, unknown>): string | undefined =>
  getString(resource, ['name', 'full_name', 'resource_name', 'display_name', 'email']);

const getResourceId = (resource: Record<string, unknown>): string | undefined =>
  getString(resource, ['id', 'resource_id']);

const getResourceUserId = (resource: Record<string, unknown>): string | undefined =>
  getString(resource, ['user_id']);

const normalizeOptionText = (value: unknown): string =>
  typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

const getString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const getTaskAssignmentArray = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  const data = getObject(response);
  if (Array.isArray(data.assignments)) return data.assignments;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

export const mapTaskAssignmentToTaskSheetResource = (
  assignmentInput: unknown,
  accountResources: unknown[] = []
): TaskSheetResourceAssignment | null => {
  const assignment = getObject(assignmentInput) as TaskAssignmentRead & Record<string, unknown>;
  const assignmentId = typeof assignment.id === 'string' ? assignment.id : undefined;
  const assignmentUserId = typeof assignment.user_id === 'string' ? assignment.user_id : undefined;
  const assignmentName = typeof assignment.resource_name === 'string' ? assignment.resource_name.trim() : '';

  if (!assignmentId && !assignmentUserId && !assignmentName) return null;

  const matchedResource = accountResources
    .map(getObject)
    .find((resource) => {
      const resourceUserId = getResourceUserId(resource);
      if (assignmentUserId && resourceUserId === assignmentUserId) return true;
      return Boolean(assignmentName) && normalizeResourceName(getResourceDisplayName(resource)) === normalizeResourceName(assignmentName);
    });

  const resourceName = assignmentName || (matchedResource ? getResourceDisplayName(matchedResource) : undefined);
  if (!resourceName) return null;

  const resourceId = matchedResource ? getResourceId(matchedResource) : undefined;
  const userId = assignmentUserId || (matchedResource ? getResourceUserId(matchedResource) : undefined) || null;
  const role = matchedResource ? getString(matchedResource, ['role', 'title']) : undefined;
  const team = matchedResource ? getString(matchedResource, ['team', 'department']) : undefined;
  const activeValue = matchedResource?.is_active ?? matchedResource?.active;

  return {
    id: assignmentId || resourceId || userId || resourceName,
    assignment_id: assignmentId,
    task_id: typeof assignment.task_id === 'string' ? assignment.task_id : undefined,
    resource_id: resourceId,
    user_id: userId,
    resource_name: resourceName,
    name: resourceName,
    full_name: resourceName,
    role,
    team,
    ...(typeof activeValue === 'boolean' ? { is_active: activeValue, active: activeValue } : {}),
    raw: assignmentInput,
  };
};

export const mapTaskAssignmentsToTaskSheetResources = (
  assignmentsResponse: unknown,
  accountResources: unknown[] = []
): TaskSheetResourceAssignment[] => getTaskAssignmentArray(assignmentsResponse)
  .map((assignment) => mapTaskAssignmentToTaskSheetResource(assignment, accountResources))
  .filter((assignment): assignment is TaskSheetResourceAssignment => Boolean(assignment));

export const mapTaskResourceToAssignmentCreatePayload = (input: unknown): ProjectTaskAssignmentCreatePayload => {
  const resource = getObject(input);
  const resourceId = getResourceId(resource);
  const resourceName = getResourceDisplayName(resource);
  const userId = getResourceUserId(resource);

  if (!resourceId) {
    throw new Error('Select a valid resource before assigning it to a task.');
  }
  if (!resourceName && !userId) {
    throw new Error('Select a resource with a name or linked user before assigning it to a task.');
  }

  return {
    user_id: userId || null,
    resource_name: resourceName || null,
  };
};

const getTaskStatusOptionSets = (accountOptions: unknown): Record<string, unknown>[] => {
  const response = getObject(accountOptions);
  const containers = [response, getObject(response.data), getObject(response.options)].filter((container) => Object.keys(container).length > 0);
  const sets: Record<string, unknown>[] = [];

  containers.forEach((container) => {
    ['option_sets', 'optionSets', 'sets', 'option_set_definitions', 'optionSetDefinitions'].forEach((key) => {
      const value = container[key];
      if (Array.isArray(value)) {
        value.forEach((item) => sets.push(getObject(item)));
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(getObject(value)).forEach(([entryKey, entryValue]) => {
          sets.push({ key: entryKey, ...getObject(entryValue) });
        });
      }
    });

    Object.entries(container).forEach(([entryKey, entryValue]) => {
      if (Array.isArray(entryValue)) {
        sets.push({ key: entryKey, values: entryValue });
        return;
      }

      const entryObject = getObject(entryValue);
      if (Object.keys(entryObject).length > 0 && ['values', 'options', 'option_values', 'optionValues', 'items'].some((key) => Array.isArray(entryObject[key]))) {
        sets.push({ key: entryKey, ...entryObject });
      }
    });
  });

  return sets;
};

const isTaskStatusOptionSet = (optionSet: Record<string, unknown>): boolean => {
  const normalizedCandidates = ['key', 'code', 'name', 'label'].map((key) => normalizeOptionText(optionSet[key]));
  return normalizedCandidates.some((candidate) => TASK_STATUS_OPTION_SET_KEYS.has(candidate));
};

const getOptionValues = (optionSet: Record<string, unknown>): unknown[] => {
  for (const key of ['values', 'options', 'option_values', 'optionValues', 'items']) {
    if (Array.isArray(optionSet[key])) return optionSet[key] as unknown[];
  }
  return [];
};

const isInactiveOptionValue = (optionValue: Record<string, unknown>): boolean =>
  optionValue.active === false ||
  optionValue.is_active === false ||
  optionValue.enabled === false ||
  optionValue.disabled === true ||
  optionValue.archived === true ||
  optionValue.deleted === true;

const getStatusColorClass = (optionValue: Record<string, unknown>, label: string): string | undefined => {
  const color = getString(optionValue, ['color_class', 'colorClass', 'className', 'color']);
  if (color && (color.includes('bg-') || color.includes('text-'))) return color;

  const normalized = normalizeOptionText(getString(optionValue, ['code', 'value', 'name', 'label']) || label);
  return STATUS_COLOR_CLASSES[normalized];
};

const mapTaskStatusOptionValue = (optionValueInput: unknown): TaskStatusOptionValue | null => {
  const optionValue = getObject(optionValueInput);
  const value = getString(optionValue, ['id', 'value_id', 'valueId', 'option_value_id', 'optionValueId', 'uuid']);
  if (!value) return null;

  const label = getString(optionValue, ['label', 'name', 'display_name', 'displayName', 'text', 'title', 'value', 'code']) || value;
  const code = getString(optionValue, ['code', 'key', 'slug']);
  const name = getString(optionValue, ['name']);
  const color = getStatusColorClass(optionValue, label);

  return {
    value,
    label,
    code,
    name,
    color,
    isActive: !isInactiveOptionValue(optionValue),
    raw: optionValueInput,
  };
};

export const mapAccountOptionsToTaskStatusOptions = (accountOptions: unknown): TaskStatusOptionsMapping => {
  const optionSet = getTaskStatusOptionSets(accountOptions).find(isTaskStatusOptionSet) || null;
  const allOptions = optionSet
    ? getOptionValues(optionSet).map(mapTaskStatusOptionValue).filter((option): option is TaskStatusOptionValue => Boolean(option))
    : [];

  return {
    found: Boolean(optionSet),
    optionSet,
    allOptions,
    activeOptions: allOptions.filter((option) => option.isActive),
  };
};

const isTaskTypeOptionSet = (optionSet: Record<string, unknown>): boolean => {
  const normalizedCandidates = ['key', 'code', 'name', 'label'].map((key) => normalizeOptionText(optionSet[key]));
  return normalizedCandidates.some((candidate) => TASK_TYPE_OPTION_SET_KEYS.has(candidate));
};

const mapTaskTypeOptionValue = (optionValueInput: unknown): TaskTypeOptionValue | null => {
  const optionValue = getObject(optionValueInput);
  const value = getString(optionValue, ['id', 'value_id', 'valueId', 'option_value_id', 'optionValueId', 'uuid']);
  if (!value) return null;

  const label = getString(optionValue, ['label', 'name', 'display_name', 'displayName', 'text', 'title', 'value', 'code']) || value;
  const code = getString(optionValue, ['code', 'key', 'slug']);
  const name = getString(optionValue, ['name']);
  const color = getString(optionValue, ['color_class', 'colorClass', 'className', 'color']);

  return {
    value,
    label,
    code,
    name,
    color,
    isActive: !isInactiveOptionValue(optionValue),
    raw: optionValueInput,
  };
};

export const mapAccountOptionsToTaskTypeOptions = (accountOptions: unknown): TaskTypeOptionsMapping => {
  const optionSet = getTaskStatusOptionSets(accountOptions).find(isTaskTypeOptionSet) || null;
  const allOptions = optionSet
    ? getOptionValues(optionSet).map(mapTaskTypeOptionValue).filter((option): option is TaskTypeOptionValue => Boolean(option))
    : [];

  return {
    found: Boolean(optionSet),
    optionSet,
    allOptions,
    activeOptions: allOptions.filter((option) => option.isActive),
  };
};

const PRIORITY_COLOR_CLASSES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

const isTaskPriorityOptionSet = (optionSet: Record<string, unknown>): boolean => {
  const normalizedCandidates = ['key', 'code', 'name', 'label'].map((key) => normalizeOptionText(optionSet[key]));
  return normalizedCandidates.some((candidate) => TASK_PRIORITY_OPTION_SET_KEYS.has(candidate));
};

const getPriorityColorClass = (optionValue: Record<string, unknown>, label: string): string | undefined => {
  const color = getString(optionValue, ['color_class', 'colorClass', 'className', 'color']);
  if (color && (color.includes('bg-') || color.includes('text-'))) return color;

  const normalized = normalizeOptionText(getString(optionValue, ['code', 'value', 'name', 'label']) || label);
  return PRIORITY_COLOR_CLASSES[normalized];
};

const mapTaskPriorityOptionValue = (optionValueInput: unknown): TaskPriorityOptionValue | null => {
  const optionValue = getObject(optionValueInput);
  const value = getString(optionValue, ['id', 'value_id', 'valueId', 'option_value_id', 'optionValueId', 'uuid']);
  if (!value) return null;

  const label = getString(optionValue, ['label', 'name', 'display_name', 'displayName', 'text', 'title', 'value', 'code']) || value;
  const code = getString(optionValue, ['code', 'key', 'slug']);
  const name = getString(optionValue, ['name']);
  const color = getPriorityColorClass(optionValue, label);
  const icon = getString(optionValue, ['icon', 'icon_name', 'iconName']);

  return {
    value,
    label,
    code,
    name,
    color,
    icon,
    isActive: !isInactiveOptionValue(optionValue),
    raw: optionValueInput,
  };
};

export const mapAccountOptionsToTaskPriorityOptions = (accountOptions: unknown): TaskPriorityOptionsMapping => {
  const optionSet = getTaskStatusOptionSets(accountOptions).find(isTaskPriorityOptionSet) || null;
  const allOptions = optionSet
    ? getOptionValues(optionSet).map(mapTaskPriorityOptionValue).filter((option): option is TaskPriorityOptionValue => Boolean(option))
    : [];

  return {
    found: Boolean(optionSet),
    optionSet,
    allOptions,
    activeOptions: allOptions.filter((option) => option.isActive),
  };
};

export const normalizeTaskPriorityText = (value: unknown): string => normalizeOptionText(value);

export const getTaskPriorityLabel = (taskInput: unknown): string => {
  const task = getObject(taskInput);
  const priority = task.priority;
  if (typeof priority === 'string' && priority.trim()) return priority.trim();

  const summary = task.priority_summary ?? priority;
  if (typeof summary === 'string' && summary.trim()) return summary.trim();

  const summaryObject = getObject(summary);
  return getString(summaryObject, ['label', 'name', 'value', 'code']) || '';
};

export const getTaskPriorityOptionCandidates = (optionInput: unknown): string[] => {
  const option = getObject(optionInput);
  const raw = getObject(option.raw);

  return [option.key, option.code, option.name, option.label, raw.key, raw.code, raw.name, raw.label]
    .map(normalizeTaskPriorityText)
    .filter(Boolean);
};

export const resolveTaskPriorityOption = (
  taskInput: unknown,
  priorityOptions: TaskPriorityOptionValue[] = [],
  priorityDrafts: Record<string, string | null | undefined> = {}
): TaskPriorityOptionValue | null => {
  const task = getObject(taskInput);
  const taskId = typeof task.id === 'string' ? task.id : '';
  const draftId = taskId ? priorityDrafts[taskId] : undefined;
  if (draftId) return priorityOptions.find((option) => option.value === draftId) || null;

  const priorityId = typeof task.priority_id === 'string' ? task.priority_id : '';
  if (priorityId) return priorityOptions.find((option) => option.value === priorityId) || null;

  const normalizedLabel = normalizeTaskPriorityText(getTaskPriorityLabel(task));
  if (!normalizedLabel) return null;

  const matches = priorityOptions.filter((option) => getTaskPriorityOptionCandidates(option).includes(normalizedLabel));
  return matches.length === 1 ? matches[0] : null;
};

const isValidDateString = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false;
  return !Number.isNaN(new Date(value).getTime());
};

const getTaskArray = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  const data = getObject(response);
  if (Array.isArray(data.tasks)) return data.tasks;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const copyDueFieldIfPresent = (target: DueTaskRow, source: Record<string, unknown>, sourceKey: string, targetKey = sourceKey) => {
  if (source[sourceKey] !== undefined && source[sourceKey] !== null) {
    target[targetKey] = source[sourceKey];
  }
};

export const mapDueTask = (taskInput: unknown): DueTaskRow | null => {
  const task = getObject(taskInput);
  const id = task.id;
  if (typeof id !== 'string' || !id) return null;

  const row: DueTaskRow = { id };
  const taskTitle = task.title ?? task.name;
  const assigneeName = task.assignee_name ?? task.resource_name ?? task.assignee;

  if (typeof taskTitle === 'string') {
    row.title = taskTitle;
    row.name = taskTitle;
  }

  copyDueFieldIfPresent(row, task, 'project_id');
  copyDueFieldIfPresent(row, task, 'project_name');
  copyDueFieldIfPresent(row, task, 'program_id');
  copyDueFieldIfPresent(row, task, 'program_name');
  copyDueFieldIfPresent(row, task, 'assigned_to');
  if (typeof assigneeName === 'string') {
    row.assignee_name = assigneeName;
    row.resource_name = assigneeName;
  }
  copyDueFieldIfPresent(row, task, 'status');
  copyDueFieldIfPresent(row, task, 'status_id');
  copyDueFieldIfPresent(row, task, 'start_date');
  copyDueFieldIfPresent(row, task, 'finish_date');
  copyDueFieldIfPresent(row, task, 'finish_date', 'due_date');
  copyDueFieldIfPresent(row, task, 'due_state');
  copyDueFieldIfPresent(row, task, 'days_overdue');
  copyDueFieldIfPresent(row, task, 'days_until_due');
  copyDueFieldIfPresent(row, task, 'percent_complete');

  return row;
};

export const mapDueTasks = (response: unknown): DueTaskRow[] => getTaskArray(response)
  .map(mapDueTask)
  .filter((task): task is DueTaskRow => Boolean(task));

const getTaskListFromColumn = (column: Record<string, unknown>): unknown[] =>
  getArray(column.tasks).length > 0
    ? getArray(column.tasks)
    : getArray(column.cards).length > 0
      ? getArray(column.cards)
      : getArray(column.items);

const getBoardColumns = (boardResponse: unknown): unknown[] => {
  if (Array.isArray(boardResponse)) return boardResponse;

  const board = getObject(boardResponse);
  if (Array.isArray(board.columns)) return board.columns;
  if (Array.isArray(board.statuses)) return board.statuses;

  const entries = Object.entries(board).filter(([, value]) => Array.isArray(value));
  if (entries.length > 0) {
    return entries.map(([key, value]) => ({ id: key, title: titleize(key), tasks: value }));
  }

  return [];
};

const mapTaskToKanbanCard = (taskInput: unknown, status: string): KanbanBoardCard | null => {
  const task = getObject(taskInput) as ProjectHubTaskRead;
  if (!task.id) return null;

  const progress = toNumber(task.percent_complete ?? task.progress);

  return {
    ...task,
    id: task.id,
    title: typeof task.name === 'string' && task.name.trim() ? task.name : String(task.title || 'Untitled Task'),
    status,
    due_date: task.finish_date ?? (typeof task.due_date === 'string' ? task.due_date : null),
    progress: progress ?? 0,
    priority: summaryValue(task.priority) || (typeof task.priority === 'string' ? task.priority : undefined) || 'medium',
  };
};

export const mapProjectBoardToKanban = (boardResponse: unknown): KanbanBoardData => {
  const columns = getBoardColumns(boardResponse);
  const mappedColumns: KanbanBoardColumn[] = [];
  const tasks: KanbanBoardCard[] = [];

  columns.forEach((columnInput, index) => {
    const column = getObject(columnInput);
    const id = String(column.id ?? column.status ?? column.key ?? column.value ?? `column-${index}`);
    const title = String(column.title ?? column.name ?? column.label ?? titleize(id));
    const color = typeof column.color === 'string' && column.color.startsWith('bg-')
      ? column.color
      : BOARD_COLUMN_COLORS[index % BOARD_COLUMN_COLORS.length];

    mappedColumns.push({ id, title, color });
    getTaskListFromColumn(column).forEach((taskInput) => {
      const task = mapTaskToKanbanCard(taskInput, id);
      if (task) tasks.push(task);
    });
  });

  return { columns: mappedColumns, tasks };
};

export const mapProjectGanttToGanttTasks = (ganttResponse: unknown): GanttTask[] => {
  return getTaskArray(ganttResponse)
    .map((taskInput) => getObject(taskInput) as ProjectHubTaskRead)
    .filter((task) => Boolean(task.id) && isValidDateString(task.start_date) && isValidDateString(task.finish_date))
    .map((task) => {
      const duration = toNumber(task.duration_days);
      const progress = toNumber(task.percent_complete);
      const predecessors = mapPredecessorsToIds(task.predecessors);
      const predecessorLinks = mapTaskPredecessorsToLinks(task.predecessors);
      const { predecessors: _rawPredecessors, ...taskFields } = task;

      const ganttTask: GanttTask = {
        ...taskFields,
        id: task.id as string,
        title: typeof task.name === 'string' && task.name.trim() ? task.name : 'Untitled Task',
        start_date: task.start_date as string,
        finish_date: task.finish_date as string,
        due_date: task.finish_date as string,
        end_date: task.finish_date as string,
        parent_task_id: task.parent_task_id ?? null,
        task_type: summaryValue(task.task_type) || 'activity',
        status: summaryValue(task.status),
      };

      if (duration !== undefined) ganttTask.duration = duration;
      if (progress !== undefined) ganttTask.progress = progress;
      if (predecessors) ganttTask.predecessors = predecessors;
      if (predecessorLinks) ganttTask.predecessor_links = predecessorLinks;

      return ganttTask;
    });
};

/**
 * Task dialog / detail panel values (Base44 shape: title, due_date, progress, ...)
 * -> TaskUpdate. Only fields present on the input are sent.
 */
export const mapTaskFormToPayload = (input: unknown): Record<string, unknown> => {
  const data = typeof input === 'object' && input ? input as Record<string, unknown> : {};
  const payload: Record<string, unknown> = {};
  const name = data.name ?? data.title;
  if (typeof name === 'string' && name.trim()) payload.name = name.trim();
  if (data.description !== undefined) payload.description = data.description || null;
  if (data.start_date !== undefined) payload.start_date = data.start_date || null;
  const finish = data.finish_date ?? data.due_date;
  if (finish !== undefined) payload.finish_date = finish || null;
  const progress = data.percent_complete ?? data.progress;
  if (progress !== undefined && progress !== '' && Number.isFinite(Number(progress))) payload.percent_complete = Number(progress);
  const duration = data.duration_days ?? data.duration;
  if (duration !== undefined && duration !== '' && Number.isFinite(Number(duration))) payload.duration_days = Number(duration);
  ['status_id', 'priority_id', 'task_type_id', 'sprint_id', 'parent_task_id'].forEach((key) => {
    if (typeof data[key] === 'string' && data[key]) payload[key] = data[key];
  });
  return payload;
};

export const tasksApi = {
  list: (projectId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/projects/${projectId}/tasks`, query),
  create: (projectId: string, data: unknown) => apiClient.post(`/api/v1/projects/${projectId}/tasks`, data),
  getTree: (projectId: string) => apiClient.get(`/api/v1/projects/${projectId}/tasks/tree`),
  getBoard: (projectId: string) => apiClient.get(`/api/v1/projects/${projectId}/board`),
  getGantt: (projectId: string) => apiClient.get(`/api/v1/projects/${projectId}/gantt`),
  bulkUpdate: (projectId: string, data: unknown) => apiClient.patch(`/api/v1/projects/${projectId}/tasks/bulk`, data),
  bulkDelete: (projectId: string, data: unknown) => apiClient.delete(`/api/v1/projects/${projectId}/tasks/bulk`, data),
  reorder: (projectId: string, data: unknown) => apiClient.post(`/api/v1/projects/${projectId}/tasks/reorder`, mapProjectTaskReorderToPayload(data)),
  get: (taskId: string) => apiClient.get(`/api/v1/tasks/${taskId}`),
  update: (taskId: string, data: unknown) => apiClient.patch(`/api/v1/tasks/${taskId}`, data),
  updatePriority: (taskId: string, data: unknown) => apiClient.patch(`/api/v1/tasks/${taskId}`, mapTaskSheetInputToPriorityUpdatePayload(data)),
  updateTaskType: (taskId: string, data: unknown) => apiClient.patch(`/api/v1/tasks/${taskId}`, mapTaskSheetInputToTaskTypeUpdatePayload(data)),
  updateSchedule: (taskId: string, data: unknown) => apiClient.patch(`/api/v1/tasks/${taskId}`, mapTaskGanttDateUpdatePayload(data)),
  updateBoardPosition: (taskId: string, data: unknown) => apiClient.patch(`/api/v1/tasks/${taskId}/board-position`, data),
  move: (taskId: string, data: unknown) => apiClient.post(`/api/v1/tasks/${taskId}/move`, data),
  indent: (taskId: string) => apiClient.post(`/api/v1/tasks/${taskId}/indent`),
  outdent: (taskId: string) => apiClient.post(`/api/v1/tasks/${taskId}/outdent`),
  addPredecessor: (taskId: string, data: unknown) => apiClient.post(`/api/v1/tasks/${taskId}/predecessors`, mapTaskSheetInputToPredecessorCreatePayload(data)),
  deletePredecessor: (taskId: string, predecessorId: string) => apiClient.delete(`/api/v1/tasks/${taskId}/predecessors/${predecessorId}`),
  listAssignments: async (taskId: string, accountResources: unknown[] = []) => mapTaskAssignmentsToTaskSheetResources(await apiClient.get(`/api/v1/tasks/${taskId}/assignments`), accountResources),
  createAssignment: async (taskId: string, data: unknown, accountResources: unknown[] = []) => mapTaskAssignmentToTaskSheetResource(await apiClient.post(`/api/v1/tasks/${taskId}/assignments`, mapTaskResourceToAssignmentCreatePayload(data)), accountResources),
  deleteAssignment: (taskId: string, assignmentId: string) => apiClient.delete(`/api/v1/tasks/${taskId}/assignments/${assignmentId}`),
  delete: (taskId: string) => apiClient.delete(`/api/v1/tasks/${taskId}`),
  listDue: (accountId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/accounts/${accountId}/tasks/due`, query),
  listDueTasks: async (accountId: string, query?: Record<string, unknown>) => mapDueTasks(await apiClient.get(`/api/v1/accounts/${accountId}/tasks/due`, query)),
  getSprintBoard: (sprintId: string) => apiClient.get(`/api/v1/sprints/${sprintId}/board`),
  getAccountOptions: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/options`),
};