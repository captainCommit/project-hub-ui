// Records a task can be linked to from the sheet's Related Record column, and how each kind is labelled.
// Tasks store links as [{ type, id }]; the labels come from the project's RAID / governance lists.

export const RELATED_RECORD_TYPES = {
  RISK: { label: 'Risks', tone: 'red', listKey: 'risks', raid: true },
  ISSUE: { label: 'Issues', tone: 'orange', listKey: 'issues', raid: true },
  ASSUMPTION: { label: 'Assumptions', tone: 'grey', listKey: 'assumptions', raid: true },
  DEPENDENCY: { label: 'Dependencies', tone: 'purple', listKey: 'dependencies', raid: true },
  DECISION: { label: 'Decisions', tone: 'blue', listKey: 'decisions', raid: false },
  CHANGE_REQUEST: { label: 'Changes', tone: 'green', listKey: 'changeRequests', raid: false },
};

export const RELATED_RECORD_ORDER = ['RISK', 'ISSUE', 'ASSUMPTION', 'DEPENDENCY', 'DECISION', 'CHANGE_REQUEST'];

const recordKey = (type, id) => `${type}:${id}`;

/**
 * Index of every linkable record: `${type}:${id}` -> { type, id, number, title, priority, status }.
 * lists: { risks, issues, assumptions, dependencies, decisions, changeRequests } (mapped records; any may be missing).
 */
export function buildRelatedRecordIndex(lists = {}) {
  const index = new Map();
  RELATED_RECORD_ORDER.forEach(type => {
    (lists[RELATED_RECORD_TYPES[type].listKey] || []).forEach(item => {
      if (!item?.id) return;
      index.set(recordKey(type, item.id), {
        type,
        id: item.id,
        number: item.reference_number || item.id.slice(0, 8),
        title: item.title || item.decision || item.description || '',
        priority: item.priority || '',
        status: item.status || '',
        owner: item.assigned_to || '',
        target_date: item.target_date || '',
        project_id: item.project_id || '',
      });
    });
  });
  return index;
}

/** A task's links resolved against the index; links to deleted records are left out. */
export const resolveRelatedRecords = (task, index) => (task?.related_records || [])
  .map(link => index.get(recordKey(link.type, link.id)))
  .filter(Boolean);

/** How many critical-priority RAID items the task is linked to (used by the Gantt critical path). */
export const criticalRaidCount = (task, index) => resolveRelatedRecords(task, index)
  .filter(r => RELATED_RECORD_TYPES[r.type].raid && r.priority === 'critical').length;
