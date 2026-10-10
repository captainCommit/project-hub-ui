import { apiClient } from './client';

type ApiResource = Record<string, any>;

const hasOwn = (value: ApiResource, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const firstDefined = (...values: any[]) => values.find((value) => value !== undefined && value !== null);

const normalizeResourceCollection = (response: any): ApiResource[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.resources)) return response.resources;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const numberOrUndefined = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// API Resource -> Base44 ProjectResource shape (full_name, weekly_capacity, rate, ...).
export const mapResource = (resource: ApiResource | null | undefined) => {
  if (!resource) return null;

  const fullName = firstDefined(resource.name, resource.full_name);
  const capacity = numberOrUndefined(firstDefined(resource.weekly_capacity_hours, resource.weekly_capacity, resource.capacity));
  const isActive = firstDefined(resource.is_active, resource.active);

  return {
    id: resource.id,
    account_id: resource.account_id,
    user_id: resource.user_id ?? null,
    full_name: fullName,
    name: fullName,
    role: resource.role ?? '',
    department: resource.department ?? '',
    rate: numberOrUndefined(firstDefined(resource.hourly_rate, resource.rate)) ?? null,
    weekly_capacity: capacity ?? null,
    capacity: capacity ?? null,
    non_project_hours: numberOrUndefined(resource.non_project_hours) ?? 0,
    active: isActive !== false,
    is_active: isActive !== false,
    created_at: resource.created_at,
    updated_at: resource.updated_at,
  };
};

export const mapResources = (response: any) => normalizeResourceCollection(response).map(mapResource).filter(Boolean);

// Base44 ProjectResource form values -> API ResourceCreate/ResourceUpdate.
export const toResourcePayload = (data: ApiResource) => {
  const payload: ApiResource = {};
  const fullName = firstDefined(data.full_name, data.name);
  const capacity = numberOrUndefined(firstDefined(data.weekly_capacity, data.capacity));
  const rate = firstDefined(data.rate, data.hourly_rate);

  if (fullName !== undefined) payload.name = String(fullName).trim();
  if (hasOwn(data, 'role')) payload.role = data.role || null;
  if (hasOwn(data, 'department')) payload.department = data.department || null;
  if (capacity !== undefined && capacity > 0) payload.weekly_capacity_hours = capacity;
  if (rate !== undefined) payload.hourly_rate = numberOrUndefined(rate) ?? null;
  if (hasOwn(data, 'non_project_hours')) {
    const nonProject = numberOrUndefined(data.non_project_hours);
    if (nonProject !== undefined) payload.non_project_hours = nonProject;
  }
  if (hasOwn(data, 'active')) payload.is_active = Boolean(data.active);
  if (hasOwn(data, 'user_id')) payload.user_id = data.user_id || null;

  return payload;
};

// Base44 ResourceVacation form values -> API ResourceTimeOffCreate/Update.
export const toResourceTimeOffPayload = (data: ApiResource) => {
  const payload: ApiResource = {};

  if (hasOwn(data, 'start_date')) payload.start_date = data.start_date;
  if (hasOwn(data, 'end_date')) payload.end_date = data.end_date;
  if (hasOwn(data, 'notes') || hasOwn(data, 'reason')) payload.reason = firstDefined(data.reason, data.notes) || null;
  const hoursPerDay = numberOrUndefined(firstDefined(data.hours_per_day, data.hours));
  if (hoursPerDay !== undefined && hoursPerDay > 0) payload.hours_per_day = hoursPerDay;

  return payload;
};

const normalizeCollection = (value: any, keys: string[] = []): ApiResource[] => {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const mapCalendarAllocation = (allocation: ApiResource, resource?: ApiResource) => {
  const mapped: ApiResource = {};
  const resourceName = firstDefined(allocation.resource_name, allocation.resource?.full_name, allocation.resource?.name, resource?.full_name, resource?.name);
  const projectName = firstDefined(allocation.project_name, allocation.project?.name);
  const startDate = firstDefined(allocation.start_date, allocation.allocation_start_date, allocation.start, allocation.start_at);
  const endDate = firstDefined(allocation.end_date, allocation.allocation_end_date, allocation.end, allocation.end_at);
  const percentage = firstDefined(allocation.percentage, allocation.allocation_percentage, allocation.utilization, allocation.percent_allocated);
  const hours = firstDefined(allocation.hours, allocation.allocation_hours, allocation.weekly_hours, allocation.capacity_hours);

  if (hasOwn(allocation, 'id')) mapped.id = allocation.id;
  if (hasOwn(allocation, 'allocation_id')) mapped.id = allocation.allocation_id;
  if (hasOwn(allocation, 'resource_id')) mapped.resource_id = allocation.resource_id;
  else if (hasOwn(resource || {}, 'id')) mapped.resource_id = resource?.id;
  if (resourceName !== undefined) mapped.resource_name = resourceName;
  if (hasOwn(allocation, 'project_id')) mapped.project_id = allocation.project_id;
  if (projectName !== undefined) mapped.project_name = projectName;
  if (startDate !== undefined) mapped.start_date = startDate;
  if (endDate !== undefined) mapped.end_date = endDate;
  if (percentage !== undefined) mapped.percentage = percentage;
  if (hours !== undefined) mapped.hours = hours;

  return mapped;
};

const mapCalendarTimeOff = (timeOff: ApiResource, resource?: ApiResource) => {
  const mapped: ApiResource = {};
  const resourceName = firstDefined(timeOff.resource_name, timeOff.resource?.full_name, timeOff.resource?.name, resource?.full_name, resource?.name);
  const startDate = firstDefined(timeOff.start_date, timeOff.time_off_start_date, timeOff.start, timeOff.start_at);
  const endDate = firstDefined(timeOff.end_date, timeOff.time_off_end_date, timeOff.end, timeOff.end_at);

  if (hasOwn(timeOff, 'id')) mapped.id = timeOff.id;
  if (hasOwn(timeOff, 'time_off_id')) mapped.id = timeOff.time_off_id;
  if (hasOwn(timeOff, 'resource_id')) mapped.resource_id = timeOff.resource_id;
  else if (hasOwn(resource || {}, 'id')) mapped.resource_id = resource?.id;
  if (resourceName !== undefined) mapped.resource_name = resourceName;
  if (startDate !== undefined) mapped.start_date = startDate;
  if (endDate !== undefined) mapped.end_date = endDate;
  if (hasOwn(timeOff, 'time_off_type_id')) mapped.time_off_type_id = timeOff.time_off_type_id;
  if (hasOwn(timeOff, 'type')) mapped.type = timeOff.type;
  if (hasOwn(timeOff, 'notes') || hasOwn(timeOff, 'reason')) mapped.notes = firstDefined(timeOff.reason, timeOff.notes) ?? '';
  if (hasOwn(timeOff, 'hours') || hasOwn(timeOff, 'hours_per_day')) mapped.hours = firstDefined(timeOff.hours_per_day, timeOff.hours);
  if (hasOwn(timeOff, 'all_day')) mapped.all_day = timeOff.all_day;
  if (hasOwn(timeOff, 'status_id')) mapped.status_id = timeOff.status_id;

  return mapped;
};

export const mapResourceTimeOffList = (response: any) => normalizeCollection(response?.data && !Array.isArray(response.data) ? response.data : response, ['time_off', 'timeOff', 'resource_time_off', 'items']).map((entry) => mapCalendarTimeOff(entry));

export const mapResourceCalendar = (response: any) => {
  const root = response?.data && !Array.isArray(response.data) ? response.data : response;
  const rawResources = normalizeCollection(root, ['resources', 'items']);
  const topLevelAllocations = normalizeCollection(root, ['allocations', 'resource_allocations']);
  const topLevelTimeOff = normalizeCollection(root, ['time_off', 'timeOff', 'resource_time_off']);

  const resources = rawResources.map((resource) => {
    const name = firstDefined(resource.full_name, resource.name, resource.resource_name);
    const role = firstDefined(resource.role, resource.title);
    const capacity = firstDefined(resource.capacity, resource.weekly_capacity, resource.availability);
    const allocations = normalizeCollection(resource, ['allocations', 'resource_allocations']).map((allocation) => mapCalendarAllocation(allocation, resource));
    const timeOff = normalizeCollection(resource, ['time_off', 'timeOff', 'resource_time_off']).map((entry) => mapCalendarTimeOff(entry, resource));
    const mapped: ApiResource = { allocations, timeOff };

    if (hasOwn(resource, 'id')) mapped.id = resource.id;
    if (name !== undefined) mapped.name = name;
    if (role !== undefined) mapped.role = role;
    if (hasOwn(resource, 'team')) mapped.team = resource.team;
    if (capacity !== undefined) {
      mapped.availability = capacity;
      mapped.capacity = capacity;
    }

    return mapped;
  });

  const nestedAllocations = resources.flatMap((resource) => resource.allocations || []);
  const nestedTimeOff = resources.flatMap((resource) => resource.timeOff || []);
  const allocations = [...nestedAllocations, ...topLevelAllocations.map((allocation) => mapCalendarAllocation(allocation))];
  const timeOff = [...nestedTimeOff, ...topLevelTimeOff.map((entry) => mapCalendarTimeOff(entry))];
  const projects = normalizeCollection(root, ['projects']).map((project) => ({
    ...(hasOwn(project, 'id') ? { id: project.id } : {}),
    ...(firstDefined(project.name, project.project_name) !== undefined ? { name: firstDefined(project.name, project.project_name) } : {}),
  }));

  return { resources, allocations, timeOff, projects };
};

export const resourcesApi = {
  list: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/resources`),
  create: (accountId: string, data: unknown) => apiClient.post(`/api/v1/accounts/${accountId}/resources`, data),
  get: (resourceId: string) => apiClient.get(`/api/v1/resources/${resourceId}`),
  update: (resourceId: string, data: unknown) => apiClient.patch(`/api/v1/resources/${resourceId}`, data),
  delete: (resourceId: string) => apiClient.delete(`/api/v1/resources/${resourceId}`),
  listAccountResources: async (accountId: string) => mapResources(await apiClient.get(`/api/v1/accounts/${accountId}/resources`)),
  createResource: async (accountId: string, data: ApiResource) => mapResource(await apiClient.post(`/api/v1/accounts/${accountId}/resources`, toResourcePayload(data))),
  getResource: async (resourceId: string) => mapResource(await apiClient.get(`/api/v1/resources/${resourceId}`)),
  updateResource: async (resourceId: string, data: ApiResource) => mapResource(await apiClient.patch(`/api/v1/resources/${resourceId}`, toResourcePayload(data))),
  deleteResource: (resourceId: string) => apiClient.delete(`/api/v1/resources/${resourceId}`),
  listAllocations: (resourceId: string) => apiClient.get(`/api/v1/resources/${resourceId}/allocations`),
  listTimeOff: (resourceId: string) => apiClient.get(`/api/v1/resources/${resourceId}/time-off`),
  listResourceTimeOff: async (resourceId: string) => mapResourceTimeOffList(await apiClient.get(`/api/v1/resources/${resourceId}/time-off`)),
  createTimeOff: (resourceId: string, data: ApiResource) => apiClient.post(`/api/v1/resources/${resourceId}/time-off`, toResourceTimeOffPayload(data)),
  createResourceTimeOff: async (resourceId: string, data: ApiResource) => mapCalendarTimeOff(await apiClient.post(`/api/v1/resources/${resourceId}/time-off`, toResourceTimeOffPayload(data))),
  getCapacityForecast: (resourceId: string) => apiClient.get(`/api/v1/resources/${resourceId}/capacity-forecast`),
  getAccountCalendar: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/resource-calendar`),
  getAccountResourceCalendar: async (accountId: string) => mapResourceCalendar(await apiClient.get(`/api/v1/accounts/${accountId}/resource-calendar`)),
  getAccountCapacityForecast: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/capacity-forecast`),
  getAccountAnalysis: (accountId: string) => apiClient.get(`/api/v1/accounts/${accountId}/resource-analysis`),
  getTaskRecommendations: (taskId: string) => apiClient.get(`/api/v1/tasks/${taskId}/resource-recommendations`),
  createTaskAllocation: (taskId: string, data: unknown) => apiClient.post(`/api/v1/tasks/${taskId}/resource-allocations`, data),
  updateAllocation: (allocationId: string, data: unknown) => apiClient.patch(`/api/v1/resource-allocations/${allocationId}`, data),
  deleteAllocation: (allocationId: string) => apiClient.delete(`/api/v1/resource-allocations/${allocationId}`),
  updateTimeOff: (timeOffId: string, data: ApiResource) => apiClient.patch(`/api/v1/resource-time-off/${timeOffId}`, toResourceTimeOffPayload(data)),
  updateResourceTimeOff: async (timeOffId: string, data: ApiResource) => mapCalendarTimeOff(await apiClient.patch(`/api/v1/resource-time-off/${timeOffId}`, toResourceTimeOffPayload(data))),
  deleteTimeOff: (timeOffId: string) => apiClient.delete(`/api/v1/resource-time-off/${timeOffId}`),
  deleteResourceTimeOff: (timeOffId: string) => apiClient.delete(`/api/v1/resource-time-off/${timeOffId}`),
};