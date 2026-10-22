import React, { useMemo, useState } from 'react';
import { Folder, Plus, FileText, AlertTriangle, ShieldAlert, CircleCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useFavorites } from '@/lib/favorites';
import { exportRecords } from '@/lib/exportUtils';
import { RAG } from './HealthIndicator';
import {
  PageHeader, PageBody, PrimaryButton, ExportButton, StatGrid, StatCard, FilterBar, SearchInput, FilterSelect, optionsFrom,
  DataTable, TitleCell, HealthPill, WorkStatusPill, CompletionBar, CountCell, DetailsChevron,
  WORK_STATUS_OPTIONS, workStatusInfo, isCompleteStatus, isOpenRaid, isHighOrCritical, riskIssueLine, SOFT, PersonCell,
} from './DirectoryKit';

const NOT_STARTED = new Set(['planning', 'not_started']);

function getRag(critHighRisks, critHighIssues, project, progress) {
  if (critHighIssues > 0 || critHighRisks > 3) return RAG.red;
  if (critHighRisks > 0) return RAG.amber;
  if ((!project.status || NOT_STARTED.has(project.status)) && progress === 0) return RAG.grey;
  return RAG.green;
}

const HEALTH_INFO = `${RAG.green.label}: ${RAG.green.description}. ${RAG.amber.label}: ${RAG.amber.description}. ${RAG.red.label}: ${RAG.red.description}. ${RAG.grey.label}: not started and no tasks done.`;
const HEALTH_OPTIONS = [RAG.green, RAG.amber, RAG.red, RAG.grey].map(r => ({ value: r.key, label: r.label }));
const SCOPE_OPTIONS = [{ value: 'mine', label: 'My Projects' }, { value: 'favorites', label: 'Favorites' }];

/** The current person's name as owners are recorded (first and last name, else the profile's full name). */
const personName = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.full_name || '';

export default function ProjectsSummary({ projects = [], programs = [], portfolios = [], tasks = [], risks = [], issues = [], onSelectProject, onNewProject }) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('');
  const { user } = useAuth();
  const { isFav } = useFavorites();
  const [health, setHealth] = useState('');
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');

  const rows = useMemo(() => projects.map(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const done = projectTasks.filter(t => t.status === 'done' || Number(t.progress) >= 100).length;
    const progress = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0;
    const openRisks = risks.filter(r => r.project_id === project.id && isOpenRaid(r));
    const openIssues = issues.filter(i => i.project_id === project.id && isOpenRaid(i));
    const critHighRisks = openRisks.filter(isHighOrCritical).length;
    const critHighIssues = openIssues.filter(isHighOrCritical).length;
    const program = programs.find(p => p.id === project.program_id);
    return {
      project, program, progress, critHighRisks, critHighIssues,
      done, total: projectTasks.length,
      manager: project.project_manager || project.owner || '',
      openRisks: openRisks.length, openIssues: openIssues.length,
      rag: getRag(critHighRisks, critHighIssues, project, progress),
    };
  }), [projects, programs, tasks, risks, issues]);

  const filtered = rows.filter(r => {
    if (search && !r.project.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (scope === 'mine' && r.manager !== personName(user)) return false;
    if (scope === 'favorites' && !isFav('project', r.project.id)) return false;
    if (health && r.rag.key !== health) return false;
    if (status && workStatusInfo(r.project.status).label !== status) return false;
    if (owner && r.manager !== owner) return false;
    return true;
  });

  const offTrack = rows.filter(r => r.rag.key === 'red').length;
  const completed = rows.filter(r => isCompleteStatus(r.project.status)).length;
  const critHighRisks = rows.reduce((s, r) => s + r.critHighRisks, 0);
  const critHighIssues = rows.reduce((s, r) => s + r.critHighIssues, 0);

  const handleExport = () => exportRecords(filtered, [
    { label: 'Project', value: r => r.project.name },
    { label: 'Program', value: r => r.program?.name || '' },
    { label: 'Health', value: r => r.rag.label },
    { label: 'Status', value: r => workStatusInfo(r.project.status).label },
    { label: 'Completion %', value: r => r.progress },
    { label: 'Tasks Done', value: r => r.done },
    { label: 'Tasks', value: r => r.total },
    { label: 'Open Risks', value: r => r.openRisks },
    { label: 'Open Issues', value: r => r.openIssues },
    { label: 'Project Manager', value: r => r.manager },
    { label: 'Due Date', value: r => r.project.end_date || '' },
  ], `projects_${new Date().toISOString().slice(0, 10)}.csv`);

  const columns = [
    {
      key: 'name', label: 'Project', sortValue: r => r.project.name,
      render: r => (
        <TitleCell title={r.project.name} sub={r.program ? `Program: ${r.program.name}` : null} />
      ),
    },
    { key: 'health', label: 'Health', info: HEALTH_INFO, render: r => <HealthPill rag={r.rag} /> },
    { key: 'status', label: 'Status', sortValue: r => workStatusInfo(r.project.status).label, render: r => <WorkStatusPill status={r.project.status} /> },
    { key: 'completion', label: 'Completion', sortValue: r => r.progress, render: r => <CompletionBar pct={r.progress} /> },
    { key: 'tasks', label: 'Tasks', sortValue: r => r.total, render: r => <span className="text-sm" style={{ color: SOFT }}>{r.done}/{r.total}</span> },
    { key: 'risks', label: 'Open Risks', sortValue: r => r.openRisks, className: 'text-center', headerClassName: 'text-center', render: r => <CountCell value={r.openRisks} /> },
    { key: 'issues', label: 'Open Issues', sortValue: r => r.openIssues, className: 'text-center', headerClassName: 'text-center', render: r => <CountCell value={r.openIssues} /> },
    { key: 'owner', label: 'Project Owner(s)', sortValue: r => r.manager, render: r => <PersonCell name={r.manager} /> },
    { key: 'open', label: '', className: 'w-8', render: () => <DetailsChevron /> },
  ];

  return (
    <PageBody>
      <PageHeader
        icon={Folder}
        title="Project Directory"
        subtitle="Browse and navigate all projects across programs and portfolios."
        actions={onNewProject && <PrimaryButton icon={Plus} onClick={onNewProject}>New Project</PrimaryButton>}
      />

      <StatGrid className="lg:grid-cols-4">
        <StatCard value={projects.length} label="Projects" sub="Across all programs" icon={FileText} />
        <StatCard value={offTrack} label="Off Track" sub="Projects needing attention" icon={AlertTriangle} />
        <StatCard value={critHighRisks + critHighIssues} label="High/Critical RAID" sub={riskIssueLine(critHighRisks, critHighIssues)} icon={ShieldAlert} />
        <StatCard value={completed} label="Completed" sub="Projects completed" icon={CircleCheck} />
      </StatGrid>

      <FilterBar right={<ExportButton onClick={handleExport} disabled={filtered.length === 0} />}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        <FilterSelect value={scope} onChange={setScope} allLabel="All Projects" options={SCOPE_OPTIONS} />
        <FilterSelect value={health} onChange={setHealth} allLabel="Health" options={HEALTH_OPTIONS} />
        <FilterSelect value={status} onChange={setStatus} allLabel="Status" options={WORK_STATUS_OPTIONS} />
        <FilterSelect value={owner} onChange={setOwner} allLabel="Project Owner" options={optionsFrom(rows.map(r => r.manager))} />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={r => r.project.id}
        onRowClick={r => onSelectProject(r.project)}
        noun="projects"
        empty={projects.length ? 'No projects match your filters.' : 'No projects yet.'}
      />
    </PageBody>
  );
}
