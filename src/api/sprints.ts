import { apiClient } from './client';

type ApiRecord = Record<string, any>;

const hasOwn = (value: ApiRecord, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const firstDefined = (...values: any[]) => values.find((value) => value !== undefined && value !== null);

const normalizeStatusKey = (status: unknown): string | undefined => {
  const raw = typeof status === 'string'
    ? status
    : status && typeof status === 'object'
      ? firstDefined((status as ApiRecord).value, (status as ApiRecord).label)
      : undefined;

  if (raw === undefined || raw === null || raw === '') return undefined;

  const normalized = String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (['active', 'in_progress', 'inprogress'].includes(normalized)) return 'active';
  if (['planning', 'planned', 'not_started', 'notstarted'].includes(normalized)) return 'planning';
  if (['completed', 'complete', 'done', 'closed'].includes(normalized)) return 'completed';
  return normalized;
};

const computeProgress = (completed: unknown, total: unknown) => {
  const completedCount = Number(completed) || 0;
  const totalCount = Number(total) || 0;
  return totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
};

const normalizeCollection = (value: any, keys: string[] = []): ApiRecord[] => {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const normalizeRoot = (response: any): ApiRecord => {
  if (response?.data && !Array.isArray(response.data)) return response.data;
  if (response && typeof response === 'object' && !Array.isArray(response)) return response;
  return {};
};

export const mapSprint = (sprint: ApiRecord = {}) => {
  const mapped: ApiRecord = {};
  const name = firstDefined(sprint.name, sprint.title, sprint.sprint_name);
  const startDate = firstDefined(sprint.start_date, sprint.start);
  const endDate = firstDefined(sprint.end_date, sprint.finish_date, sprint.end);
  const statusKey = normalizeStatusKey(sprint.status);

  if (hasOwn(sprint, 'id')) mapped.id = sprint.id;
  if (hasOwn(sprint, 'project_id')) mapped.project_id = sprint.project_id;
  if (name !== undefined) mapped.name = name;
  if (hasOwn(sprint, 'goal')) mapped.goal = sprint.goal;
  if (statusKey !== undefined) mapped.status = statusKey;
  if (sprint.status && typeof sprint.status === 'object') {
    mapped.status_summary = sprint.status;
    if (hasOwn(sprint.status, 'id')) mapped.status_id = sprint.status.id;
    if (hasOwn(sprint.status, 'label')) mapped.status_label = sprint.status.label;
    if (hasOwn(sprint.status, 'value')) mapped.status_value = sprint.status.value;
    if (hasOwn(sprint.status, 'color')) mapped.status_color = sprint.status.color;
  }
  if (hasOwn(sprint, 'status_id')) mapped.status_id = sprint.status_id;
  if (startDate !== undefined) mapped.start_date = startDate;
  if (endDate !== undefined) mapped.end_date = endDate;
  if (hasOwn(sprint, 'capacity')) mapped.capacity = sprint.capacity;
  if (hasOwn(sprint, 'story_count')) mapped.story_count = sprint.story_count;
  if (hasOwn(sprint, 'completed_count')) mapped.completed_count = sprint.completed_count;
  if (hasOwn(sprint, 'story_points')) mapped.story_points = sprint.story_points;
  if (hasOwn(sprint, 'completed_story_points')) mapped.completed_story_points = sprint.completed_story_points;
  if (hasOwn(sprint, 'progress')) mapped.progress = sprint.progress;
  if (hasOwn(sprint, 'remaining_days')) mapped.remaining_days = sprint.remaining_days;
  if (hasOwn(sprint, 'created_at')) mapped.created_at = sprint.created_at;
  if (hasOwn(sprint, 'updated_at')) mapped.updated_at = sprint.updated_at;

  return mapped;
};

export const mapSprintListResponse = (response: any) =>
  normalizeCollection(response, ['sprints', 'items', 'data']).map(mapSprint);

export const mapSprintResponse = (response: any) => mapSprint(normalizeRoot(response));

export const mapSprintMetricsResponse = (response: any) => {
  const metrics = normalizeRoot(response);
  const mapped: ApiRecord = {};

  if (hasOwn(metrics, 'sprint')) mapped.sprint = mapSprint(metrics.sprint);
  if (hasOwn(metrics, 'total_tasks')) mapped.total_tasks = metrics.total_tasks;
  if (hasOwn(metrics, 'story_count')) mapped.story_count = metrics.story_count;
  if (hasOwn(metrics, 'completed_count')) mapped.completed_count = metrics.completed_count;
  if (hasOwn(metrics, 'total_story_points')) mapped.total_story_points = metrics.total_story_points;
  if (hasOwn(metrics, 'story_points')) mapped.story_points = metrics.story_points;
  if (hasOwn(metrics, 'completed_story_points')) mapped.completed_story_points = metrics.completed_story_points;
  if (hasOwn(metrics, 'remaining_story_points')) mapped.remaining_story_points = metrics.remaining_story_points;
  if (hasOwn(metrics, 'completion_percent')) mapped.completion_percent = metrics.completion_percent;
  if (hasOwn(metrics, 'progress')) mapped.progress = metrics.progress;
  if (hasOwn(metrics, 'days_remaining')) mapped.days_remaining = metrics.days_remaining;
  if (hasOwn(metrics, 'remaining_days')) mapped.remaining_days = metrics.remaining_days;
  if (hasOwn(metrics, 'story_point_legend')) mapped.story_point_legend = metrics.story_point_legend;

  return mapped;
};

const mapSprintBoardTask = (task: ApiRecord = {}) => {
  const mapped: ApiRecord = {};
  const title = firstDefined(task.title, task.name);
  const priorityKey = normalizeStatusKey(task.priority);
  const taskTypeKey = normalizeStatusKey(task.task_type);
  const statusKey = normalizeStatusKey(task.status);
  const firstAssignment = Array.isArray(task.assignments) ? task.assignments[0] : undefined;
  const assignee = firstDefined(task.assignee, task.assigned_to_name, firstAssignment?.resource_name, firstAssignment?.name);

  if (hasOwn(task, 'id')) mapped.id = task.id;
  if (hasOwn(task, 'project_id')) mapped.project_id = task.project_id;
  if (hasOwn(task, 'sprint_id')) mapped.sprint_id = task.sprint_id;
  if (hasOwn(task, 'status_id')) mapped.status_id = task.status_id;
  if (statusKey !== undefined) mapped.status = statusKey;
  if (task.status && typeof task.status === 'object') mapped.status_summary = task.status;
  if (hasOwn(task, 'task_type_id')) mapped.task_type_id = task.task_type_id;
  if (taskTypeKey !== undefined) mapped.type = taskTypeKey;
  if (task.task_type && typeof task.task_type === 'object') mapped.task_type_summary = task.task_type;
  if (hasOwn(task, 'priority_id')) mapped.priority_id = task.priority_id;
  if (priorityKey !== undefined) mapped.priority = priorityKey;
  if (task.priority && typeof task.priority === 'object') mapped.priority_summary = task.priority;
  if (title !== undefined) {
    mapped.title = title;
    mapped.name = title;
  }
  if (hasOwn(task, 'story_points')) mapped.story_points = task.story_points;
  if (hasOwn(task, 'story_number')) mapped.story_number = task.story_number;
  if (hasOwn(task, 'percent_complete')) mapped.percent_complete = task.percent_complete;
  if (hasOwn(task, 'finish_date')) mapped.finish_date = task.finish_date;
  if (hasOwn(task, 'due_date')) mapped.due_date = task.due_date;
  if (hasOwn(task, 'sort_order')) mapped.sort_order = task.sort_order;
  if (assignee !== undefined) mapped.assignee = assignee;
  if (hasOwn(task, 'resource')) mapped.resource = task.resource;
  if (hasOwn(task, 'resources')) mapped.resources = task.resources;
  if (hasOwn(task, 'assignments')) mapped.assignments = task.assignments;

  return mapped;
};

export const mapSprintBoardResponse = (response: any) => {
  const board = normalizeRoot(response);
  const mapped: ApiRecord = {};

  if (hasOwn(board, 'project_id')) mapped.project_id = board.project_id;
  if (hasOwn(board, 'sprint_id')) mapped.sprint_id = board.sprint_id;
  mapped.columns = normalizeCollection(board, ['columns']).map((column) => {
    const mappedColumn: ApiRecord = {};
    const title = firstDefined(column.title, column.label);

    if (hasOwn(column, 'id')) mappedColumn.id = column.id;
    if (hasOwn(column, 'status_id')) mappedColumn.status_id = column.status_id;
    if (title !== undefined) {
      mappedColumn.title = title;
      mappedColumn.label = title;
    }
    if (hasOwn(column, 'value')) mappedColumn.value = column.value;
    if (hasOwn(column, 'color')) mappedColumn.color = column.color;
    if (hasOwn(column, 'sort_order')) mappedColumn.sort_order = column.sort_order;
    if (hasOwn(column, 'is_uncategorized')) mappedColumn.is_uncategorized = column.is_uncategorized;
    mappedColumn.tasks = normalizeCollection(column, ['tasks']).map(mapSprintBoardTask);

    return mappedColumn;
  });

  return mapped;
};

/** A task's story id as people see it: US-100, US-101, ... */
export const formatStoryId = (storyNumber: unknown) => (storyNumber === null || storyNumber === undefined || storyNumber === '' ? '' : `US-${storyNumber}`);

const addIfPresent = (target: ApiRecord, source: ApiRecord, key: string) => {
  if (hasOwn(source, key) && source[key] !== undefined && source[key] !== '') target[key] = source[key];
};

export const mapSprintPayload = (data: ApiRecord = {}) => {
  const payload: ApiRecord = {};

  addIfPresent(payload, data, 'name');
  addIfPresent(payload, data, 'goal');
  addIfPresent(payload, data, 'start_date');
  addIfPresent(payload, data, 'end_date');
  if (hasOwn(data, 'status_id') && data.status_id) payload.status_id = data.status_id;
  // Empty clears the capacity.
  if (hasOwn(data, 'capacity')) payload.capacity = data.capacity === '' || data.capacity == null ? null : Number(data.capacity);

  return payload;
};

export const mapSprintBoardPositionPayload = (data: ApiRecord = {}) => {
  const payload: ApiRecord = {};

  if (hasOwn(data, 'status_id') && data.status_id) payload.status_id = data.status_id;
  if (hasOwn(data, 'sort_order') && data.sort_order !== undefined && data.sort_order !== null) payload.sort_order = data.sort_order;
  if (hasOwn(data, 'sprint_id') && data.sprint_id) payload.sprint_id = data.sprint_id;

  return payload;
};

const mapDeliverySprint = (sprint: ApiRecord, project?: ApiRecord) => {
  const mapped: ApiRecord = {};
  const name = firstDefined(sprint.name, sprint.title, sprint.sprint_name);
  const startDate = firstDefined(sprint.start_date, sprint.start);
  const endDate = firstDefined(sprint.end_date, sprint.finish_date, sprint.end);
  const storyCount = firstDefined(sprint.story_count, sprint.total_stories, sprint.stories_count);
  const completedCount = firstDefined(sprint.completed_count, sprint.done_stories, sprint.done_count, sprint.completed_stories);
  const storyPoints = firstDefined(sprint.story_points, sprint.total_story_points);
  const completedStoryPoints = firstDefined(sprint.completed_story_points, sprint.done_story_points);
  const progress = firstDefined(sprint.progress, sprint.percent_complete, computeProgress(completedCount, storyCount));
  const statusKey = normalizeStatusKey(sprint.status);

  if (hasOwn(sprint, 'id')) mapped.id = sprint.id;
  if (hasOwn(sprint, 'sprint_id')) mapped.sprint_id = sprint.sprint_id;
  if (name !== undefined) mapped.name = name;
  if (hasOwn(sprint, 'goal')) mapped.goal = sprint.goal;
  if (statusKey !== undefined) mapped.status = statusKey;
  if (sprint.status && typeof sprint.status === 'object') {
    mapped.status_summary = sprint.status;
    if (hasOwn(sprint.status, 'label')) mapped.status_label = sprint.status.label;
    if (hasOwn(sprint.status, 'value')) mapped.status_value = sprint.status.value;
    if (hasOwn(sprint.status, 'color')) mapped.status_color = sprint.status.color;
  }
  if (hasOwn(sprint, 'status_id')) mapped.status_id = sprint.status_id;
  if (startDate !== undefined) mapped.start_date = startDate;
  if (endDate !== undefined) mapped.end_date = endDate;
  if (progress !== undefined) mapped.progress = progress;
  if (storyCount !== undefined) mapped.story_count = storyCount;
  if (completedCount !== undefined) mapped.completed_count = completedCount;
  if (storyPoints !== undefined) mapped.story_points = storyPoints;
  if (completedStoryPoints !== undefined) mapped.completed_story_points = completedStoryPoints;
  if (hasOwn(sprint, 'project_id')) mapped.project_id = sprint.project_id;
  else if (project?.id) mapped.project_id = project.id;
  if (hasOwn(sprint, 'project_name')) mapped.project_name = sprint.project_name;
  else if (project?.name) mapped.project_name = project.name;
  if (project?.program_id) mapped.program_id = project.program_id;

  return mapped;
};

const mapDeliveryProject = (project: ApiRecord, program?: ApiRecord) => {
  const mapped: ApiRecord = {};
  const name = firstDefined(project.name, project.project_name);
  const sprints = normalizeCollection(project, ['sprints', 'sprint_summaries']).map((sprint) => mapDeliverySprint(sprint, project));

  if (hasOwn(project, 'id')) mapped.id = project.id;
  if (name !== undefined) mapped.name = name;
  if (hasOwn(project, 'color')) mapped.color = project.color;
  if (hasOwn(project, 'total_sprints')) mapped.total_sprints = project.total_sprints;
  if (hasOwn(project, 'active_sprints')) mapped.active_sprints = project.active_sprints;
  if (hasOwn(project, 'story_count')) mapped.story_count = project.story_count;
  else if (hasOwn(project, 'total_stories')) mapped.story_count = project.total_stories;
  if (hasOwn(project, 'completed_count')) mapped.completed_count = project.completed_count;
  else if (hasOwn(project, 'done_stories')) mapped.completed_count = project.done_stories;
  if (hasOwn(project, 'program_id')) mapped.program_id = project.program_id;
  else if (program?.id) mapped.program_id = program.id;
  if (hasOwn(project, 'portfolio_id')) mapped.portfolio_id = project.portfolio_id;
  if (sprints.length > 0) mapped.sprints = sprints;

  return mapped;
};

const mapDeliveryProgram = (program: ApiRecord) => {
  const mapped: ApiRecord = {};
  const name = firstDefined(program.name, program.program_name);
  const projects = normalizeCollection(program, ['projects']).map((project) => mapDeliveryProject(project, program));

  if (hasOwn(program, 'id')) mapped.id = program.id;
  if (name !== undefined) mapped.name = name;
  if (hasOwn(program, 'color')) mapped.color = program.color;
  if (hasOwn(program, 'total_sprints')) mapped.total_sprints = program.total_sprints;
  if (hasOwn(program, 'active_sprints')) mapped.active_sprints = program.active_sprints;
  if (hasOwn(program, 'story_count')) mapped.story_count = program.story_count;
  else if (hasOwn(program, 'total_stories')) mapped.story_count = program.total_stories;
  if (hasOwn(program, 'completed_count')) mapped.completed_count = program.completed_count;
  else if (hasOwn(program, 'done_stories')) mapped.completed_count = program.done_stories;
  if (hasOwn(program, 'portfolio_id')) mapped.portfolio_id = program.portfolio_id;
  if (projects.length > 0) mapped.projects = projects;

  return mapped;
};

export const mapDeliveryOverview = (response: any) => {
  const root = normalizeRoot(response);
  const programs = normalizeCollection(root, ['programs']).map(mapDeliveryProgram);
  const nestedProjects = programs.flatMap((program) => program.projects || []);
  const topLevelProjects = normalizeCollection(root, ['projects']).map((project) => mapDeliveryProject(project));
  const projectsById = new Map<string, ApiRecord>();

  [...nestedProjects, ...topLevelProjects].forEach((project) => {
    const key = String(project.id || project.name || projectsById.size);
    projectsById.set(key, { ...projectsById.get(key), ...project });
  });

  const projects = Array.from(projectsById.values());
  const nestedSprints = projects.flatMap((project) => project.sprints || []);
  const topLevelSprints = normalizeCollection(root, ['sprints', 'sprint_summaries']).map((sprint) => mapDeliverySprint(sprint));
  const sprints = [...nestedSprints, ...topLevelSprints];
  const storyCount = firstDefined(root.story_count, root.total_stories);
  const completedCount = firstDefined(root.completed_count, root.done_stories, root.done_count, root.completed_stories);

  return {
    total_sprints: firstDefined(root.total_sprints, sprints.length),
    active_sprints: firstDefined(root.active_sprints, sprints.filter((sprint) => sprint.status === 'active').length),
    story_count: firstDefined(storyCount, sprints.reduce((sum, sprint) => sum + (Number(sprint.story_count) || 0), 0)),
    completed_count: firstDefined(completedCount, sprints.reduce((sum, sprint) => sum + (Number(sprint.completed_count) || 0), 0)),
    programs,
    projects,
    sprints,
  };
};

export const sprintsApi = {
  list: async (projectId: string) => mapSprintListResponse(await apiClient.get(`/api/v1/projects/${projectId}/sprints`)),
  create: async (projectId: string, data: ApiRecord) =>
    mapSprintResponse(await apiClient.post(`/api/v1/projects/${projectId}/sprints`, mapSprintPayload(data))),
  get: async (sprintId: string) => mapSprintResponse(await apiClient.get(`/api/v1/sprints/${sprintId}`)),
  getMetrics: async (sprintId: string) => mapSprintMetricsResponse(await apiClient.get(`/api/v1/sprints/${sprintId}/metrics`)),
  getBoard: async (sprintId: string) => mapSprintBoardResponse(await apiClient.get(`/api/v1/sprints/${sprintId}/board`)),
  updateTaskBoardPosition: async (taskId: string, data: ApiRecord) =>
    mapSprintBoardTask(normalizeRoot(await apiClient.patch(`/api/v1/tasks/${taskId}/board-position`, mapSprintBoardPositionPayload(data)))),
  update: async (sprintId: string, data: ApiRecord) =>
    mapSprintResponse(await apiClient.patch(`/api/v1/sprints/${sprintId}`, mapSprintPayload(data))),
  /** Put a task in a sprint, or back in the backlog with sprintId null. Its status is sent unchanged (null would clear it). */
  moveTaskToSprint: async (taskId: string, { statusId, sortOrder, sprintId }: { statusId: string | null; sortOrder: number; sprintId: string | null }) =>
    mapSprintBoardTask(normalizeRoot(await apiClient.patch(`/api/v1/tasks/${taskId}/board-position`, {
      status_id: statusId ?? null,
      sort_order: sortOrder ?? 0,
      sprint_id: sprintId ?? null,
    }))),
  getDeliveryOverview: async (accountId: string, query?: Record<string, unknown>) => mapDeliveryOverview(await apiClient.get(`/api/v1/accounts/${accountId}/delivery/overview`, query)),
};