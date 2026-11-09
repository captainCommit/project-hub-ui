// The Reporting Center's numbers: everything is worked out from the account's lists for the chosen
// project, program or portfolio and reporting period. No React here, so it can be checked on its own.
import { addDays, addMonths, differenceInCalendarDays, format, isFriday, isValid, nextFriday, parseISO, subMonths } from 'date-fns';
import { buildRelatedRecordIndex, RELATED_RECORD_TYPES, resolveRelatedRecords } from './relatedRecords.js';

const iso = (date) => format(date, 'yyyy-MM-dd');
const dayOf = (value) => (typeof value === 'string' && value ? value.slice(0, 10) : '');
const between = (value, start, end) => Boolean(value) && value >= start && value <= end;

export const formatDay = (value) => {
  const date = value ? parseISO(dayOf(value)) : null;
  return date && isValid(date) ? format(date, 'd MMM yyyy') : '—';
};
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const words = (value) => { const text = String(value || '—').replace(/_/g, ' '); return text.charAt(0).toUpperCase() + text.slice(1); };

export const PERIOD_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

/** Reports close on a Friday by default: today if it is one, otherwise the coming Friday. */
export const defaultPeriodEnd = (today = new Date()) => iso(isFriday(today) ? today : nextFriday(today));

/** The period ending on endDate, with the periods either side of it. */
export function reportingPeriod(type, endDate) {
  const end = parseISO(endDate);
  const monthly = type === 'monthly';
  const days = type === 'biweekly' ? 14 : 7;
  const start = monthly ? addDays(subMonths(end, 1), 1) : addDays(end, -(days - 1));
  const previousEnd = addDays(start, -1);
  const previousStart = monthly ? addDays(subMonths(previousEnd, 1), 1) : addDays(previousEnd, -(days - 1));
  const nextStart = addDays(end, 1);
  const nextEnd = monthly ? addMonths(end, 1) : addDays(end, days);
  const typeLabel = PERIOD_TYPES.find(p => p.value === type)?.label || '';
  return {
    type,
    start: iso(start),
    end: iso(end),
    previousStart: iso(previousStart),
    previousEnd: iso(previousEnd),
    nextStart: iso(nextStart),
    nextEnd: iso(nextEnd),
    label: `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')} (${typeLabel})`,
    longLabel: `${format(start, 'EEE, d MMM yyyy')} – ${format(end, 'EEE, d MMM yyyy')}`,
  };
}

const isDone = (task) => task.status === 'done' || Number(task.progress) >= 100;
const isKeyDate = (task) => /milestone|deliverable/i.test(String(task.task_type || ''));

const SPRINT_DONE = new Set(['completed', 'complete', 'done', 'closed']);
const SPRINT_ACTIVE = new Set(['active', 'in_progress']);
const SPRINT_CANCELLED = new Set(['cancelled', 'canceled']);

const GOVERNANCE_CLOSED = new Set(['approved', 'cancelled', 'deferred', 'implemented', 'closed', 'rejected', 'declined']);
const GOVERNANCE_PENDING = new Set(['in_review', 'open', 'pending', 'submitted']);
// Listed even at zero, so a report always shows the whole lifecycle.
const DECISION_STATUSES = ['in_review', 'approved', 'cancelled', 'deferred'];
const CHANGE_STATUSES = ['in_review', 'approved', 'implemented', 'cancelled', 'deferred'];

function statusBreakdown(items, fixed) {
  const counts = {};
  items.forEach(item => { const key = item.status || 'draft'; counts[key] = (counts[key] || 0) + 1; });
  const keys = [...fixed, ...Object.keys(counts).filter(key => !fixed.includes(key)).sort()];
  return keys.map(key => ({ key, label: words(key), count: counts[key] || 0, pct: percent(counts[key] || 0, items.length) }));
}

const changeImplementationStatus = (change) => {
  if (change.status === 'implemented') return 'Complete';
  if (change.status !== 'approved') return '—';
  return change.completion_date ? 'Scheduled' : 'Not scheduled';
};

const RAID_TYPES = [
  { key: 'risks', type: 'Risk', title: 'Risks', number: 'risk_id' },
  { key: 'assumptions', type: 'Assumption', title: 'Assumptions', number: 'assumption_id' },
  { key: 'issues', type: 'Issue', title: 'Issues', number: 'issue_id' },
  { key: 'dependencies', type: 'Dependency', title: 'Dependencies', number: 'dependency_id' },
];

/** The projects a scope covers and the label for its "which one" column (none for a single project). */
function resolveScope({ scopeType, selectionId, hierarchy }) {
  const { portfolios = [], programs = [], projects = [] } = hierarchy;
  if (scopeType === 'program') {
    const program = programs.find(p => p.id === selectionId);
    if (!program) return null;
    return { label: program.name, managerLabel: 'Program Manager', manager: program.owner, groupLabel: 'Project', projects: projects.filter(p => p.program_id === program.id) };
  }
  if (scopeType === 'portfolio') {
    const portfolio = portfolios.find(p => p.id === selectionId);
    if (!portfolio) return null;
    const programIds = new Set(programs.filter(p => p.portfolio_id === portfolio.id).map(p => p.id));
    return { label: portfolio.name, managerLabel: 'Portfolio Owner', manager: portfolio.owner, groupLabel: 'Program', projects: projects.filter(p => p.portfolio_id === portfolio.id || programIds.has(p.program_id)) };
  }
  const project = projects.find(p => p.id === selectionId);
  if (!project) return null;
  return { label: project.name, managerLabel: 'Project Manager', manager: project.project_manager || project.owner, groupLabel: '', projects: [project] };
}

/**
 * Everything the tabs and exports show. Returns null until a selection exists.
 * rules: { isOpenRaid, healthFor } from the app, so the status matches the portfolio and program dashboards.
 */
export function buildReport({
  scopeType, selectionId, periodType, endDate, hierarchy, rules,
  tasks = [], sprints = [], requirements = [], testCases = [], decisions = [], changeRequests = [],
  risks = [], issues = [], assumptions = [], dependencies = [], today = new Date(),
}) {
  const scope = resolveScope({ scopeType, selectionId, hierarchy });
  if (!scope) return null;
  const period = reportingPeriod(periodType, endDate);
  const todayIso = iso(today);
  const projectIds = new Set(scope.projects.map(p => p.id));
  const inScope = (item) => projectIds.has(item.project_id);
  const programName = new Map((hierarchy.programs || []).map(p => [p.id, p.name]));
  const projectById = new Map(scope.projects.map(p => [p.id, p]));
  // Program scope names each row's project; portfolio scope names its program.
  const groupOf = (item) => {
    if (!scope.groupLabel) return '';
    const project = projectById.get(item.project_id);
    if (!project) return '—';
    return scope.groupLabel === 'Project' ? project.name : (programName.get(project.program_id) || 'No program');
  };

  const scopedTasks = tasks.filter(inScope);
  const parentIds = new Set(scopedTasks.map(t => t.parent_task_id).filter(Boolean));
  const work = scopedTasks.filter(t => !parentIds.has(t.id));
  const taskRow = (t) => ({ id: t.id, group: groupOf(t), title: t.title, owner: t.assignee || '—', status: words(t.status), date: t.due_date });
  const byDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''));

  const completed = work.filter(t => isDone(t) && between(t.due_date, period.start, period.end)).map(taskRow).sort(byDate);
  const upcoming = work.filter(t => !isDone(t) && between(t.due_date, period.nextStart, period.nextEnd)).map(taskRow).sort(byDate);

  const milestones = work.filter(isKeyDate).map(t => {
    const done = isDone(t);
    const late = !done && t.due_date && t.due_date < todayIso;
    return {
      id: t.id,
      group: groupOf(t),
      title: t.title,
      baseline: '',
      forecast: t.due_date,
      actual: done ? t.due_date : '',
      status: done ? 'Completed' : late ? 'At Risk' : 'On Track',
      date: t.due_date,
    };
  }).sort(byDate);

  // RAID
  const lists = { risks: risks.filter(inScope), assumptions: assumptions.filter(inScope), issues: issues.filter(inScope), dependencies: dependencies.filter(inScope) };
  const createdIn = (item, start, end) => between(dayOf(item.created_date), start, end);
  const raidRows = RAID_TYPES.flatMap(({ key, type, number }) => lists[key].filter(rules.isOpenRaid).map(item => ({
    id: item.id,
    group: groupOf(item),
    number: item[number] || '—',
    type,
    tab: key,
    title: item.title || item.description || 'Untitled',
    priority: item.priority || '',
    status: item.status || '',
    owner: item.assigned_to || '—',
    target: item.target_date || '',
    overdue: Boolean(item.target_date) && item.target_date < todayIso,
    isNew: createdIn(item, period.start, period.end),
  })));
  const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
  raidRows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (RANK[a.priority] ?? 4) - (RANK[b.priority] ?? 4) || String(a.target || '9').localeCompare(String(b.target || '9')));
  const raidTiles = RAID_TYPES.map(({ key, type, title }) => {
    const open = lists[key].filter(rules.isOpenRaid);
    const fresh = lists[key].filter(item => createdIn(item, period.start, period.end)).length;
    const before = lists[key].filter(item => createdIn(item, period.previousStart, period.previousEnd)).length;
    return { key, type, title, open: open.length, fresh, trend: fresh - before, byStatus: statusBreakdown(open, []) };
  });

  const highOpen = (list) => list.filter(rules.isOpenRaid).filter(r => r.priority === 'critical' || r.priority === 'high').length;
  const averageProgress = work.length ? Math.round(work.reduce((sum, t) => sum + (isDone(t) ? 100 : Number(t.progress) || 0), 0) / work.length) : 0;
  const overall = rules.healthFor({ critHighRisks: highOpen(lists.risks), critHighIssues: highOpen(lists.issues), started: averageProgress > 0 || work.length > 0 });

  // Governance
  const scopedDecisions = decisions.filter(inScope);
  const scopedChanges = changeRequests.filter(inScope);
  const parseLinks = (value) => { if (!value) return []; try { const list = JSON.parse(value); if (Array.isArray(list)) return list; } catch { /* a single code */ } return [value]; };
  const decisionRows = scopedDecisions.map(d => ({
    id: d.id, group: groupOf(d), number: d.decision_id, title: d.decision || d.title || 'Untitled', status: d.status, owner: d.proposed_by || '—',
    decisionDate: d.approved_date || '', linked: parseLinks(d.related_record).join(', '), isNew: createdIn(d, period.start, period.end), type: 'Decision', tab: 'decisions',
  }));
  const changeRows = scopedChanges.map(c => ({
    id: c.id, group: groupOf(c), number: c.cr_id, title: c.title || 'Untitled', status: c.status, owner: c.proposed_by || '—',
    implementation: changeImplementationStatus(c), linked: parseLinks(c.related_record).join(', '), target: c.completion_date || '', isNew: createdIn(c, period.start, period.end), type: 'Change', tab: 'changes',
  }));
  const openGovernance = [...decisionRows, ...changeRows].filter(row => !GOVERNANCE_CLOSED.has(row.status));
  const governanceCounts = (rows) => ({
    approved: rows.filter(r => r.status === 'approved').length,
    pending: rows.filter(r => GOVERNANCE_PENDING.has(r.status)).length,
  });

  // Delivery
  const scopedRequirements = requirements.filter(inScope);
  const validated = scopedRequirements.filter(r => r.status === 'validated').length;
  const scopedTests = testCases.filter(inScope);
  const passed = scopedTests.filter(t => t.pass_fail === 'pass').length;
  const failed = scopedTests.filter(t => t.pass_fail === 'fail').length;

  const scopedSprints = sprints.filter(inScope).sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')));
  const sprintState = (s) => { const key = String(s.status || '').toLowerCase(); return SPRINT_DONE.has(key) ? 'done' : SPRINT_ACTIVE.has(key) ? 'active' : SPRINT_CANCELLED.has(key) ? 'cancelled' : 'planned'; };
  const liveSprints = scopedSprints.filter(s => sprintState(s) !== 'cancelled');
  const doneSprints = liveSprints.filter(s => sprintState(s) === 'done');
  const stories = work.filter(t => t.sprint_id);
  const pointsOf = (list) => list.reduce((sum, t) => sum + (Number(t.story_points) || 0), 0);
  const doneStories = stories.filter(isDone);
  const current = liveSprints.find(s => sprintState(s) === 'active') || null;
  const storiesIn = (sprintId) => stories.filter(t => t.sprint_id === sprintId);
  let currentSprint = null;
  if (current) {
    const list = storiesIn(current.id);
    const done = list.filter(isDone);
    const inProgress = list.filter(t => !isDone(t) && t.status === 'in_progress').length;
    currentSprint = {
      name: current.name, group: groupOf(current), start: current.start_date, end: current.end_date,
      daysLeft: current.end_date ? Math.max(0, differenceInCalendarDays(parseISO(current.end_date), today)) : null,
      stories: list.length, done: done.length, inProgress, notStarted: list.length - done.length - inProgress,
      points: pointsOf(list), pointsDone: pointsOf(done), pct: percent(pointsOf(done) || done.length, pointsOf(list) || list.length),
    };
  }
  const planned = liveSprints.filter(s => sprintState(s) === 'planned');
  const upcomingSprints = planned.slice(0, 3).map(s => ({ id: s.id, group: groupOf(s), name: s.name, start: s.start_date, end: s.end_date, stories: storiesIn(s.id).length, points: pointsOf(storiesIn(s.id)) }));

  const raidIndex = buildRelatedRecordIndex({ ...lists, decisions: [], changeRequests: [] });
  const linkedRaid = stories.flatMap(story => resolveRelatedRecords(story, raidIndex)
    .filter(r => RELATED_RECORD_TYPES[r.type].raid)
    .map(r => ({ id: `${story.id}-${r.id}`, group: groupOf(story), type: words(r.type), number: r.number, title: r.title, story: story.story_number ? `US-${story.story_number}` : '—', status: r.status, priority: r.priority })));

  // Schedule
  const ends = scope.projects.map(p => p.end_date).filter(Boolean).sort();
  const plannedFinish = ends[ends.length - 1] || '';
  const finishes = work.map(t => t.due_date).filter(Boolean).sort();
  const forecastFinish = finishes[finishes.length - 1] || '';
  const varianceDays = plannedFinish && forecastFinish ? differenceInCalendarDays(parseISO(forecastFinish), parseISO(plannedFinish)) : null;

  // With several projects, each becomes a top-level row holding its own tasks.
  const taskIds = new Set(scopedTasks.map(t => t.id));
  const ganttTasks = scopeType === 'project' ? scopedTasks : [
    ...scope.projects.map(p => {
      const own = scopedTasks.filter(t => t.project_id === p.id);
      const starts = own.map(t => t.start_date).filter(Boolean).sort();
      const dues = own.map(t => t.due_date).filter(Boolean).sort();
      return { id: `project:${p.id}`, title: p.name, task_type: 'phase', parent_task_id: null, start_date: starts[0] || p.start_date || null, due_date: dues[dues.length - 1] || p.end_date || null, predecessors: [], progress: 0, project_id: p.id };
    }),
    ...scopedTasks.map(t => ({ ...t, parent_task_id: t.parent_task_id && taskIds.has(t.parent_task_id) ? t.parent_task_id : `project:${t.project_id}` })),
  ];

  return {
    scopeType,
    scope: { label: scope.label, managerLabel: scope.managerLabel, manager: scope.manager || '—', groupLabel: scope.groupLabel, projectCount: scope.projects.length },
    period,
    overall,
    status: { completed, upcoming, raid: raidRows, governance: openGovernance, milestones },
    gantt: { tasks: ganttTasks, plannedFinish, forecastFinish, varianceDays, progress: averageProgress, milestones: milestones.length },
    delivery: {
      requirements: { total: scopedRequirements.length, validated, inReview: scopedRequirements.filter(r => r.status === 'in_review').length, pct: percent(validated, scopedRequirements.length) },
      tests: { total: scopedTests.length, passed, failed, notExecuted: scopedTests.length - passed - failed, pct: percent(passed, scopedTests.length) },
      agile: {
        pct: percent(doneSprints.length, liveSprints.length), completed: doneSprints.length, current: current?.name || '—', upcoming: planned.length,
        storiesDone: doneStories.length, storiesTotal: stories.length, pointsDone: pointsOf(doneStories), pointsTotal: pointsOf(stories),
      },
      linkedRaid, currentSprint, upcomingSprints,
    },
    raid: { tiles: raidTiles, rows: raidRows },
    governance: {
      decisions: { rows: decisionRows, ...governanceCounts(decisionRows), byStatus: statusBreakdown(decisionRows, DECISION_STATUSES) },
      changes: { rows: changeRows, ...governanceCounts(changeRows), byStatus: statusBreakdown(changeRows, CHANGE_STATUSES) },
    },
  };
}

export const REPORT_PARTS = [
  { key: 'executive', label: 'Executive summary', help: 'Overall status and the headline numbers for the period.' },
  { key: 'completed', label: 'Tasks completed this period', help: 'Finished tasks due within the reporting period.' },
  { key: 'upcoming', label: 'Tasks coming up next period', help: 'Unfinished tasks due in the following period.' },
  { key: 'milestones', label: 'Milestone summary', help: 'Milestones and deliverables with their dates and status.' },
  { key: 'raid', label: 'RAID summary', help: 'Every open risk, assumption, issue and dependency.' },
  { key: 'governance', label: 'Governance summary', help: 'Every decision and change request, with their status.' },
  { key: 'delivery', label: 'Delivery summary', help: 'Requirements, test cases and sprint progress.' },
];

export function executiveSummary(report) {
  const { status, gantt, delivery } = report;
  const lines = [
    `${status.completed.length} task${status.completed.length === 1 ? '' : 's'} completed this period; ${status.upcoming.length} due next period.`,
    `Overall progress is ${gantt.progress}%.`,
    `${status.raid.length} open RAID item${status.raid.length === 1 ? '' : 's'} and ${status.governance.length} open governance item${status.governance.length === 1 ? '' : 's'}.`,
  ];
  if (gantt.varianceDays !== null) {
    lines.push(gantt.varianceDays === 0 ? 'The forecast finish matches the planned finish.' : `The forecast finish is ${Math.abs(gantt.varianceDays)} day${Math.abs(gantt.varianceDays) === 1 ? '' : 's'} ${gantt.varianceDays > 0 ? 'after' : 'before'} the planned finish.`);
  }
  if (delivery.currentSprint) lines.push(`${delivery.currentSprint.name} is ${delivery.currentSprint.pct}% complete.`);
  return lines;
}

/** The chosen parts as plain tables, for the PDF, PowerPoint and Excel files. */
export function reportSections(report, include) {
  const groupHeader = report.scope.groupLabel ? [report.scope.groupLabel] : [];
  const table = (key, title, headers, rows, cells) => ({
    key, title, headers: [...groupHeader, ...headers],
    rows: rows.map(row => [...(groupHeader.length ? [row.group] : []), ...cells(row)]),
  });
  const { status, governance, delivery } = report;
  const sections = [];
  const taskCells = (row) => [row.title, row.owner, formatDay(row.date)];
  if (include.completed) sections.push(table('completed', 'Tasks Completed This Period', ['Task', 'Owner', 'Completed'], status.completed, taskCells));
  if (include.upcoming) sections.push(table('upcoming', 'Tasks Coming Up Next Period', ['Task', 'Owner', 'Due'], status.upcoming, taskCells));
  if (include.milestones) sections.push(table('milestones', 'Milestone Summary', ['Milestone', 'Baseline Date', 'Forecast Date', 'Actual Date', 'Status'], status.milestones, (row) => [row.title, formatDay(row.baseline), formatDay(row.forecast), formatDay(row.actual), row.status]));
  if (include.raid) sections.push(table('raid', 'RAID Summary', ['ID', 'Type', 'Title', 'Priority', 'Status', 'Owner', 'Target Date'], status.raid, (row) => [row.number, row.type, row.title, words(row.priority), words(row.status), row.owner, formatDay(row.target)]));
  if (include.governance) {
    sections.push(table('decisions', 'Decisions', ['ID', 'Title', 'Status', 'Decision Date', 'Linked Change'], governance.decisions.rows, (row) => [row.number, row.title, words(row.status), formatDay(row.decisionDate), row.linked || '—']));
    sections.push(table('changes', 'Changes', ['ID', 'Title', 'Status', 'Impl. Status', 'Linked Decision', 'Target Date'], governance.changes.rows, (row) => [row.number, row.title, words(row.status), row.implementation, row.linked || '—', formatDay(row.target)]));
  }
  if (include.delivery) {
    const { requirements: r, tests: t, agile: a } = delivery;
    sections.push({
      key: 'delivery', title: 'Delivery Summary', headers: ['Measure', 'Value'],
      rows: [
        ['Requirements', `${r.total} total, ${r.validated} validated, ${r.inReview} in review (${r.pct}%)`],
        ['Test cases', `${t.total} total, ${t.passed} passed, ${t.failed} failed, ${t.notExecuted} not executed (${t.pct}%)`],
        ['Sprints', `${a.completed} completed, current: ${a.current}, ${a.upcoming} upcoming (${a.pct}%)`],
        ['User stories completed', `${a.storiesDone} / ${a.storiesTotal}`],
        ['Story points completed', `${a.pointsDone} / ${a.pointsTotal}`],
      ],
    });
  }
  return sections;
}

const cell = (value) => String(value ?? '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ');

/** The report as Markdown, which the existing PowerPoint export turns into slides. */
export function reportMarkdown(report, include, sections) {
  const out = [`# ${reportTitle(report)}`, '', `Overall status: ${report.overall.label} · ${report.period.label}`, ''];
  if (include.executive) { out.push('## Executive Summary', ...executiveSummary(report).map(line => `- ${line}`), ''); }
  sections.forEach(section => {
    out.push(`## ${section.title}`);
    if (section.rows.length === 0) { out.push('- Nothing to report for this period.', ''); return; }
    out.push(`| ${section.headers.map(cell).join(' | ')} |`, `| ${section.headers.map(() => '---').join(' | ')} |`);
    section.rows.forEach(row => out.push(`| ${row.map(cell).join(' | ')} |`));
    out.push('');
  });
  return out.join('\n');
}

export const reportTitle = (report) => `Status Report: ${report.scope.label}`;
