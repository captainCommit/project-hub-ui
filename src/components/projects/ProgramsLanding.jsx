import React, { useMemo, useState } from 'react';
import { FolderTree, LayoutGrid, Plus, Network, FileText, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useFavorites } from '@/lib/favorites';
import { exportRecords } from '@/lib/exportUtils';
import { RAG } from './HealthIndicator';
import {
  PageHeader, PageBody, PrimaryButton, ExportButton, StatGrid, StatCard, FilterBar, SearchInput, FilterSelect, optionsFrom,
  DataTable, TitleCell, HealthPill, WorkStatusPill, CompletionBar, CountCell, DetailsChevron,
  WORK_STATUS_OPTIONS, workStatusInfo, isCompleteStatus, isOpenRaid, isHighOrCritical, riskIssueLine, NAVY, SOFT,
} from './DirectoryKit';

function getRag(critHighRisks, critHighIssues, projCount) {
  if (critHighIssues > 0 || critHighRisks > 3) return RAG.red;
  if (critHighRisks > 0) return RAG.amber;
  if (projCount === 0) return RAG.grey;
  return RAG.green;
}

const HEALTH_INFO = `${RAG.green.label}: ${RAG.green.description}. ${RAG.amber.label}: ${RAG.amber.description}. ${RAG.red.label}: ${RAG.red.description}. ${RAG.grey.label}: no projects yet.`;
const HEALTH_OPTIONS = [RAG.green, RAG.amber, RAG.red, RAG.grey].map(r => ({ value: r.key, label: r.label }));
const SCOPE_OPTIONS = [{ value: 'mine', label: 'My Programs' }, { value: 'favorites', label: 'Favorites' }];

/** The current person's name as owners are recorded (first and last name, else the profile's full name). */
const personName = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.full_name || '';

export default function ProgramsLanding({ programs = [], projects = [], portfolios = [], risks = [], issues = [], onNewProgram, onSelectProgram }) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('');
  const { user } = useAuth();
  const { isFav } = useFavorites();
  const [health, setHealth] = useState('');
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');

  const rows = useMemo(() => programs.map(prog => {
    const progProjects = projects.filter(p => p.program_id === prog.id);
    const inProgram = (r) => r.program_id === prog.id || progProjects.some(pr => pr.id === r.project_id);
    const openRisks = risks.filter(r => inProgram(r) && isOpenRaid(r));
    const openIssues = issues.filter(i => inProgram(i) && isOpenRaid(i));
    const completed = progProjects.filter(p => isCompleteStatus(p.status)).length;
    const pct = progProjects.length > 0 ? Math.round(completed / progProjects.length * 100) : 0;
    const critHighRisks = openRisks.filter(isHighOrCritical).length;
    const critHighIssues = openIssues.filter(isHighOrCritical).length;
    return {
      prog, pct, critHighRisks, critHighIssues,
      projectCount: progProjects.length,
      openRisks: openRisks.length, openIssues: openIssues.length,
      portfolio: portfolios.find(pf => pf.id === prog.portfolio_id),
      rag: getRag(critHighRisks, critHighIssues, progProjects.length),
    };
  }), [programs, projects, portfolios, risks, issues]);

  const filtered = rows.filter(({ prog, rag }) => {
    if (search && !prog.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (scope === 'mine' && prog.owner !== personName(user)) return false;
    if (scope === 'favorites' && !isFav('program', prog.id)) return false;
    if (health && rag.key !== health) return false;
    if (status && workStatusInfo(prog.status).label !== status) return false;
    if (owner && prog.owner !== owner) return false;
    return true;
  });

  const offTrack = rows.filter(r => r.rag.key === 'red').length;
  const critHighRisks = rows.reduce((s, r) => s + r.critHighRisks, 0);
  const critHighIssues = rows.reduce((s, r) => s + r.critHighIssues, 0);

  const handleExport = () => exportRecords(filtered, [
    { label: 'Program', value: r => r.prog.name },
    { label: 'Portfolio', value: r => r.portfolio?.name || '' },
    { label: 'Health', value: r => r.rag.label },
    { label: 'Status', value: r => workStatusInfo(r.prog.status).label },
    { label: 'Completion %', value: r => r.pct },
    { label: 'Projects', value: r => r.projectCount },
    { label: 'Open Risks', value: r => r.openRisks },
    { label: 'Open Issues', value: r => r.openIssues },
    { label: 'Program Owner', value: r => r.prog.owner || '' },
  ], `programs_${new Date().toISOString().slice(0, 10)}.csv`);

  const columns = [
    {
      key: 'name', label: 'Program', sortValue: r => r.prog.name,
      render: r => (
        <TitleCell title={r.prog.name} sub={r.portfolio ? `Portfolio: ${r.portfolio.name}` : null} />
      ),
    },
    { key: 'health', label: 'Health', info: HEALTH_INFO, render: r => <HealthPill rag={r.rag} /> },
    { key: 'status', label: 'Status', sortValue: r => workStatusInfo(r.prog.status).label, render: r => <WorkStatusPill status={r.prog.status} /> },
    { key: 'completion', label: 'Completion', sortValue: r => r.pct, render: r => <CompletionBar pct={r.pct} /> },
    { key: 'projects', label: 'Projects', sortValue: r => r.projectCount, className: 'text-center', headerClassName: 'text-center', render: r => <span style={{ color: SOFT }}>{r.projectCount}</span> },
    { key: 'risks', label: 'Open Risks', sortValue: r => r.openRisks, className: 'text-center', headerClassName: 'text-center', render: r => <CountCell value={r.openRisks} /> },
    { key: 'issues', label: 'Open Issues', sortValue: r => r.openIssues, className: 'text-center', headerClassName: 'text-center', render: r => <CountCell value={r.openIssues} /> },
    { key: 'owner', label: 'Program Owner(s)', sortValue: r => r.prog.owner, render: r => <span className="text-sm" style={{ color: SOFT }}>{r.prog.owner || '—'}</span> },
    { key: 'open', label: '', className: 'w-8', render: () => <DetailsChevron /> },
  ];

  return (
    <PageBody>
      <PageHeader
        icon={LayoutGrid}
        title="Program Directory"
        subtitle="All programs across the organisation. Click a row to view the program detail."
        actions={<PrimaryButton icon={Plus} onClick={onNewProgram}>New Program</PrimaryButton>}
      />

      {programs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FolderTree className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium mb-1">No programs yet</p>
          <p className="text-xs mb-4">Create your first program to start grouping projects.</p>
          <Button onClick={onNewProgram} style={{ backgroundColor: NAVY }}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Program
          </Button>
        </div>
      ) : (
        <>
          <StatGrid className="lg:grid-cols-4">
            <StatCard value={programs.length} label="Programs" sub="Across all portfolios" icon={Network} />
            <StatCard value={projects.length} label="Projects" sub="Across all programs" icon={FileText} />
            <StatCard value={offTrack} label="Off Track" sub="Programs needing attention" icon={AlertTriangle} />
            <StatCard value={critHighRisks + critHighIssues} label="High/Critical RAID" sub={riskIssueLine(critHighRisks, critHighIssues)} icon={ShieldAlert} />
          </StatGrid>

          <FilterBar right={<ExportButton onClick={handleExport} disabled={filtered.length === 0} />}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search programs..." />
            <FilterSelect value={scope} onChange={setScope} allLabel="All Programs" options={SCOPE_OPTIONS} />
            <FilterSelect value={health} onChange={setHealth} allLabel="Health" options={HEALTH_OPTIONS} />
            <FilterSelect value={status} onChange={setStatus} allLabel="Status" options={WORK_STATUS_OPTIONS} />
            <FilterSelect value={owner} onChange={setOwner} allLabel="Program Owner" options={optionsFrom(programs.map(p => p.owner))} />
          </FilterBar>

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={r => r.prog.id}
            onRowClick={r => onSelectProgram(r.prog)}
            noun="programs"
            empty="No programs match your filters."
          />
        </>
      )}
    </PageBody>
  );
}
