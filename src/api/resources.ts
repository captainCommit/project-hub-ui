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

export const mapResource = (resource: ApiResource | null | undefined) => {
  if (!resource) return null;

  const mapped: ApiResource = {};
  const fullName = firstDefined(resource.full_name, resource.name);
  const capacity = firstDefined(resource.capacity, resource.weekly_capacity);
  const utilization = firstDefined(resource.utilization, resource.allocation);

  if (hasOwn(resource, 'id')) mapped.id = resource.id;
  if (hasOwn(resource, 'account_id')) mapped.account_id = resource.account_id;
  if (fullName !== undefined) mapped.full_name = fullName;
  if (hasOwn(resource, 'name')) mapped.name = resource.name;
  if (hasOwn(resource, 'email')) mapped.email = resource.email;
  if (hasOwn(resource, 'role')) mapped.role = resource.role;
  if (hasOwn(resource, 'team')) mapped.team = resource.team;
  if (hasOwn(resource, 'department')) mapped.department = resource.department;
  if (hasOwn(resource, 'title')) mapped.title = resource.title;
  if (hasOwn(resource, 'user_id')) mapped.user_id = resource.user_id;
  if (capacity !== undefined) {
    mapped.capacity = capacity;
    mapped.weekly_capacity = capacity;
  }
  if (utilization !== undefined) {
    mapped.utilization = utilization;
    mapped.allocation = utilization;
  }
  if (hasOwn(resource, 'active')) mapped.active = resource.active;
  if (hasOwn(resource, 'is_active')) {
    mapped.is_active = resource.is_active;
    mapped.active = resource.is_active;
  }
  if (hasOwn(resource, 'status')) mapped.status = resource.status;
  if (hasOwn(resource, 'created_at')) mapped.created_at = resource.created_at;
  if (hasOwn(resource, 'updated_at')) mapped.updated_at = resource.updated_at;

  return mapped;
};

export const mapResources = (response: any) => normalizeResourceCollection(response).map(mapResource).filter(Boolean);

export const toResourcePayload = (data: ApiResource) => {
  const payload: ApiResource = {};
  const fullName = firstDefined(data.full_name, data.name);
  const capacity = firstDefined(data.capacity, data.weekly_capacity);
  const utilization = firstDefined(data.utilization, data.allocation);

  if (fullName !== undefined) payload.full_name = fullName;
  if (hasOwn(data, 'email')) payload.email = data.email || null;
  if (hasOwn(data, 'role')) payload.role = data.role || null;
  if (hasOwn(data, 'team')) payload.team = data.team || null;
  if (hasOwn(data, 'department')) payload.department = data.department || null;
  if (hasOwn(data, 'title')) payload.title = data.title || null;
  if (capacity !== undefined && capacity !== '') payload.capacity = Number(capacity);
  if (utilization !== undefined && utilization !== '') payload.utilization = Number(utilization);
  if (hasOwn(data, 'active')) payload.active = data.active;
  if (hasOwn(data, 'status')) payload.status = data.status || null;

  return payload;
};

export const toResourceTimeOffPayload = (data: ApiResource) => {
  const payload: ApiResource = {};

  if (hasOwn(data, 'start_date')) payload.start_date = data.start_date;
  if (hasOwn(data, 'end_date')) payload.end_date = data.end_date;
  if (hasOwn(data, 'time_off_type_id') && data.time_off_type_id) payload.time_off_type_id = data.time_off_type_id;
  else if (hasOwn(data, 'type') && data.type) payload.type = data.type;
  if (hasOwn(data, 'notes')) payload.notes = data.notes || null;
  if (hasOwn(data, 'hours') && data.hours !== '') payload.hours = Number(data.hours);
  if (hasOwn(data, 'all_day')) payload.all_day = Boolean(data.all_day);
  if (hasOwn(data, 'status_id') && data.status_id) payload.status_id = data.status_id;

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
  if (hasOwn(timeOff, 'notes')) mapped.notes = timeOff.notes;
  if (hasOwn(timeOff, 'hours')) mapped.hours = timeOff.hours;
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