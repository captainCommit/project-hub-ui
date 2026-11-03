import React from 'react';
import { parseISO, isValid } from 'date-fns';
import { FilterSelect, NAVY, TONES } from '@/components/projects/DirectoryKit';

// Shared by the Resources tabs (Overview, Capacity, Availability): how much of each person's week is booked,
// the health bands that come from it, the page's portfolio / program / project filters and the initials avatar.

/** Everyone a task involves: its assignee plus planned and actual resources. */
export const taskResourceNames = (t) => [
  ...(t.assignee ? [t.assignee] : []),
  ...(Array.isArray(t.resources) ? t.resources : []),
  ...(Array.isArray(t.resources_planned) ? t.resources_planned : []),
];

/** Planned allocation hours win; assignment hours are the fallback so a task is never counted twice. */
export const taskHoursFor = (t, name) => {
  const sumFor = (entries) => (Array.isArray(entries) ? entries : [])
    .filter(h => h && h.resource === name)
    .reduce((s, h) => s + (Number(h.hours) || 0), 0);
  return sumFor(t.resource_hours_planned) || sumFor(t.resource_hours);
};

/**
 * Per person: weekly hours on each project (task hours spread over the project's length), non-project hours,
 * and the weekly total. { [full_name]: { projects: [{ id, name, weekly }], weekly, nonProject } }
 */
export function computeResourceWeekly(resources, tasks, projects) {
  const map = {};
  resources.forEach(r => {
    const name = r.full_name;
    const byProject = {};
    tasks.forEach(t => {
      if (!t.project_id || !taskResourceNames(t).includes(name)) return;
      byProject[t.project_id] = (byProject[t.project_id] || 0) + taskHoursFor(t, name);
    });
    const projectsList = Object.entries(byProject).map(([pid, hours]) => {
      const proj = projects.find(p => p.id === pid);
      if (!proj) return null;
      let weeks = 1;
      if (proj.start_date && proj.end_date) {
        const start = parseISO(proj.start_date);
        const end = parseISO(proj.end_date);
        if (isValid(start) && isValid(end)) weeks = Math.max(1, (end - start) / (1000 * 60 * 60 * 24)) / 7;
      }
      return { id: pid, name: proj.name, weekly: hours / weeks };
    }).filter(Boolean);
    const nonProject = Number(r.non_project_hours) || 0;
    map[name] = { projects: projectsList, weekly: projectsList.reduce((s, p) => s + p.weekly, 0) + nonProject, nonProject };
  });
  return map;
}

/** Booked share of the week, or null when the person has no capacity recorded. */
export const allocationPct = (weekly, capacity) => {
  const c = Number(capacity) || 0;
  return c > 0 ? Math.round(((weekly || 0) / c) * 100) : null;
};

// Health bands. Optimal is 80–100% of capacity; nothing booked (or no capacity recorded) is unassigned.
export const HEALTH = {
  over: { key: 'over', label: 'Overallocated', legend: 'Overallocated (>100%)', tone: 'red', color: '#E5484D' },
  under: { key: 'under', label: 'Underallocated', legend: 'Underallocated (<80%)', tone: 'amber', color: '#E9A23B' },
  optimal: { key: 'optimal', label: 'Optimal', legend: 'Optimal (80–100%)', tone: 'green', color: '#1E9E62' },
  unassigned: { key: 'unassigned', label: 'Unassigned', legend: 'Unassigned / unknown', tone: 'grey', color: '#B8C2D1' },
};
export const HEALTH_ORDER = ['over', 'under', 'optimal', 'unassigned'];
export const HEALTH_OPTIONS = HEALTH_ORDER.map(k => ({ value: k, label: HEALTH[k].label }));

export const healthOf = (pct) => {
  if (pct === null || pct === undefined || pct <= 0) return HEALTH.unassigned;
  if (pct > 100) return HEALTH.over;
  if (pct >= 80) return HEALTH.optimal;
  return HEALTH.under;
};

export const EMPTY_RESOURCE_SCOPE = { portfolio: '', program: '', project: '' };

/** The project ids a page-filter scope covers inside the global scope, or null when it covers everything. */
export function scopedProjectIds(scope, inScopeProjects, globalActive) {
  if (scope.project) return new Set([scope.project]);
  if (scope.program) return new Set(inScopeProjects.filter(p => p.program_id === scope.program).map(p => p.id));
  if (scope.portfolio) return new Set(inScopeProjects.filter(p => p.portfolio_id === scope.portfolio).map(p => p.id));
  return globalActive ? new Set(inScopeProjects.map(p => p.id)) : null;
}

/** Names of the people with work in those projects (null means no narrowing). */
export function namesInProjects(tasks, projectIds) {
  if (!projectIds) return null;
  const names = new Set();
  tasks.forEach(t => {
    if (t.project_id && projectIds.has(t.project_id)) taskResourceNames(t).forEach(n => names.add(n));
  });
  return names;
}

/** Portfolio → program → project dropdowns; picking a level clears the ones under it. */
export function ResourceScopeSelects({ scope, onChange, portfolios, programs, projects, showPortfolio = true }) {
  const programOptions = programs.filter(p => !scope.portfolio || p.portfolio_id === scope.portfolio);
  const projectOptions = projects.filter(p => {
    if (scope.program) return p.program_id === scope.program;
    if (scope.portfolio) return p.portfolio_id === scope.portfolio;
    return true;
  });
  return (
    <>
      {showPortfolio && (
        <FilterSelect value={scope.portfolio} onChange={v => onChange({ portfolio: v, program: '', project: '' })} allLabel="All Portfolios"
          options={portfolios.map(p => ({ value: p.id, label: p.name }))} />
      )}
      <FilterSelect value={scope.program} onChange={v => onChange({ ...scope, program: v, project: '' })} allLabel="All Programs"
        options={programOptions.map(p => ({ value: p.id, label: p.name }))} />
      <FilterSelect value={scope.project} onChange={v => onChange({ ...scope, project: v })} allLabel="All Projects"
        options={projectOptions.map(p => ({ value: p.id, label: p.name }))} />
    </>
  );
}

const AVATAR_TONES = ['blue', 'green', 'purple', 'orange', 'grey', 'red'];

export const initialsOf = (name = '') => name.trim().split(/\s+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?';

/** A round initials badge with a colour that stays the same for the same name. */
export function Avatar({ name, size = 32 }) {
  const hash = [...(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  const tone = TONES[AVATAR_TONES[hash % AVATAR_TONES.length]];
  return (
    <span className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), backgroundColor: tone.bg, color: tone.fg }}>
      {initialsOf(name)}
    </span>
  );
}

/** Name in bold with a grey line under it (role, department...). */
export function PersonLine({ name, sub = undefined, size = 32 }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={name} size={size} />
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{name}</p>
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}
