import { apiClient } from './client';

export type ProjectActivityEntry = {
  id: string;
  action?: string;
  actor_name?: string;
  user_name?: string;
  timestamp?: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  entity_title?: string;
  message?: string;
  details?: string;
  before?: unknown;
  after?: unknown;
  // Readable field changes from the API (IDs already turned into names).
  changes?: ActivityChange[];
  [key: string]: unknown;
};

export type ActivityChange = { field: string; label: string; old: string | null; new: string | null };

export type ProjectAuditTimelineResult = {
  entries: ProjectActivityEntry[];
  source: 'audit' | 'activity';
};

const getObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

const getArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const getActivityArray = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  const data = getObject(response);
  const nestedData = getObject(data.data);
  const arrayKeys = ['items', 'entries', 'audit', 'activity', 'events', 'results', 'records', 'logs'];

  for (const key of arrayKeys) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }

  if (Array.isArray(data.data)) return data.data;

  for (const key of arrayKeys) {
    if (Array.isArray(nestedData[key])) return nestedData[key] as unknown[];
  }

  return [];
};

const firstIdentifier = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
};

const hasUsableEntryContent = (entry: ProjectActivityEntry): boolean =>
  Boolean(
    entry.action ||
    entry.actor_name ||
    entry.user_name ||
    entry.timestamp ||
    entry.entity_type ||
    entry.entity_id ||
    entry.entity_name ||
    entry.entity_title ||
    entry.message ||
    entry.details ||
    entry.before !== undefined ||
    entry.after !== undefined
  );

const mapActivityEntry = (entryInput: unknown): ProjectActivityEntry | null => {
  const entry = getObject(entryInput);
  const actor = getObject(entry.actor);
  const user = getObject(entry.user);
  const entity = getObject(entry.entity);
  const target = getObject(entry.target);
  const changes = getObject(entry.changes);

  const id = firstIdentifier(entry.id, entry.audit_id, entry.activity_id, entry.event_id, entry.log_id);
  const timestamp = firstString(entry.timestamp, entry.created_at, entry.occurred_at, entry.updated_at, entry.date);
  const action = firstString(entry.action, entry.event_type, entry.verb, entry.type);
  const message = firstString(entry.message, entry.summary);
  const details = firstString(entry.details, entry.description);

  if (!id) return null;

  const mapped: ProjectActivityEntry = {
    id,
  };

  if (timestamp) mapped.timestamp = timestamp;
  if (action) mapped.action = action;

  const actorName = firstString(entry.actor_name, entry.user_name, entry.created_by_name, entry.created_by, actor.name, actor.display_name, actor.full_name, user.name, user.display_name, user.full_name, user.email);
  if (actorName) {
    mapped.actor_name = actorName;
    mapped.user_name = actorName;
  }

  const entityType = firstString(entry.entity_type, entry.resource_type, entry.object_type, entity.type, target.type);
  if (entityType) mapped.entity_type = entityType;

  const entityId = firstString(entry.entity_id, entry.resource_id, entry.object_id, entity.id, target.id);
  if (entityId) mapped.entity_id = entityId;

  const entityName = firstString(entry.entity_name, entry.entity_title, entry.resource_name, entry.object_name, entity.name, entity.title, target.name, target.title);
  if (entityName) {
    mapped.entity_name = entityName;
    mapped.entity_title = entityName;
  }

  if (message) mapped.message = message;
  if (details) mapped.details = details;
  if (entry.before !== undefined) mapped.before = entry.before;
  if (entry.after !== undefined) mapped.after = entry.after;
  if (changes.before !== undefined) mapped.before = changes.before;
  if (changes.after !== undefined) mapped.after = changes.after;
  if (entry.old_values !== undefined) mapped.before = entry.old_values;
  if (entry.new_values !== undefined) mapped.after = entry.new_values;
  if (Array.isArray(entry.changes)) {
    mapped.changes = (entry.changes as unknown[])
      .map(getObject)
      .filter(change => typeof change.label === 'string')
      .map(change => ({
        field: String(change.field ?? ''),
        label: change.label as string,
        old: typeof change.old === 'string' ? change.old : null,
        new: typeof change.new === 'string' ? change.new : null,
      }));
  }

  if (!hasUsableEntryContent(mapped)) return null;

  return mapped;
};

export const mapProjectActivityToTimeline = (response: unknown): ProjectActivityEntry[] =>
  getActivityArray(response)
    .map(mapActivityEntry)
    .filter((entry): entry is ProjectActivityEntry => Boolean(entry));

export const mapProjectAuditOrActivityToTimeline = mapProjectActivityToTimeline;

const listProjectAudit = (projectId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/projects/${projectId}/audit`, query);

const listProjectActivity = (projectId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/projects/${projectId}/activity`, query);

const listProjectAuditTimeline = async (projectId: string, query?: Record<string, unknown>): Promise<ProjectAuditTimelineResult> => {
  const auditResponse = await listProjectAudit(projectId, query);
  const auditEntries = mapProjectAuditOrActivityToTimeline(auditResponse);

  if (auditEntries.length > 0) {
    return { entries: auditEntries, source: 'audit' };
  }

  const activityResponse = await listProjectActivity(projectId, query);
  return {
    entries: mapProjectAuditOrActivityToTimeline(activityResponse),
    source: 'activity',
  };
};

export const activityApi = {
  listEntityActivity: (entityType: string, entityId: string, query?: Record<string, unknown>) => apiClient.get(`/api/v1/entities/${entityType}/${entityId}/activity`, query),
  listProjectActivity,
  listProjectAudit,
  listProjectAuditTimeline,
};