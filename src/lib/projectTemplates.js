import { tasksApi } from '@/api/tasks';
import { templatesApi } from '@/api/collaboration';

// Project templates keep their starter schedule in content.tasks: [{ name, level, duration_days }] in sheet order
// (level 0 = top row, 1 = under the row above it, ...). Creating a project from a template copies those rows.

const DEFAULT_KEY = 'default_project_template';

/** The template new projects start from ('' = the standard template). Remembered per browser. */
export const getDefaultTemplateId = () => {
  try { return localStorage.getItem(DEFAULT_KEY) || ''; } catch { return ''; }
};
export const setDefaultTemplateId = (id) => {
  try {
    if (id) localStorage.setItem(DEFAULT_KEY, id); else localStorage.removeItem(DEFAULT_KEY);
  } catch {
    // Storage blocked: the default just isn't remembered.
  }
};

/** A project's task tree (API shape) as template rows. */
export function templateTasksFromTree(tree) {
  const rows = [];
  const walk = (nodes, level) => [...(nodes || [])]
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .forEach(node => {
      rows.push({ name: node.name, level, duration_days: node.duration_days == null ? null : Number(node.duration_days) });
      walk(node.children, level + 1);
    });
  walk(Array.isArray(tree) ? tree : tree?.items, 0);
  return rows;
}

/** Copies a template's starter tasks into a project, keeping the outline. Returns how many were created. */
export async function applyTemplateToProject(projectId, templateId, accountId) {
  if (!templateId) return 0;
  const template = (await templatesApi.list(accountId)).find(t => t.id === templateId);
  const rows = Array.isArray(template?.tasks) ? template.tasks : [];
  const parents = [];
  let created = 0;
  for (const [index, row] of rows.entries()) {
    if (!row?.name) continue;
    const level = Math.max(0, Math.min(Number(row.level) || 0, parents.length));
    const task = await tasksApi.create(projectId, {
      name: String(row.name).slice(0, 255),
      sort_order: index + 1,
      ...(level > 0 && parents[level - 1] ? { parent_task_id: parents[level - 1] } : {}),
      ...(row.duration_days ? { duration_days: row.duration_days } : {}),
    });
    parents[level] = task?.id;
    parents.length = level + 1;
    created += 1;
  }
  return created;
}
