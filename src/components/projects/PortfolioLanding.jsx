import React, { useMemo, useState } from 'react';
import { Building2, Plus, FolderOpen, Network, FileText, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportRecords } from '@/lib/exportUtils';
import { RAG } from './HealthIndicator';
import {
  PageHeader, PageBody, PrimaryButton, ExportButton, StatGrid, StatCard, FilterBar, SearchInput, FilterSelect, optionsFrom,
  DataTable, TitleCell, HealthPill, WorkStatusPill, CompletionBar, CountCell, DetailsChevron,
  WORK_STATUS_OPTIONS, workStatusInfo, isCompleteStatus, isOpenRaid, isHighOrCritical, riskIssueLine, NAVY,
} from './DirectoryKit';

function getRag(critHighRisks, critHighIssues, pct) {
  if (critHighIssues > 0 || critHighRisks > 3) return RAG.red;
  if (critHighRisks > 0) return RAG.amber;
  if (pct === 0) return RAG.grey;
  return RAG.green;
}

const HEALTH_INFO = `${RAG.green.label}: ${RAG.green.description}. ${RAG.amber.label}: ${RAG.amber.description}. ${RAG.red.label}: ${RAG.red.description}. ${RAG.grey.label}: no projects completed yet.`;
const HEALTH_OPTIONS = [RAG.green, RAG.amber, RAG.red, RAG.grey].map(r => ({ value: r.key, label: r.label }));

export default function PortfolioLanding({ portfolios = [], programs = [], projects = [], risks = [], issues = [], onNewPortfolio, onSelectPortfolio }) {
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState('');
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');

  const rows = useMemo(() => portfolios.map(port => {
    const portPrograms = programs.filter(p => p.portfolio_id === port.id);
    const portProjects = projects.filter(p => p.portfolio_id === port.id || portPrograms.some(pg => pg.id === p.program_id));
    const inPortfolio = (r) => portProjects.some(pr => pr.id === r.project_id) || portPrograms.some(pg => pg.id === r.program_id);
    const openRisks = risks.filter(r => inPortfolio(r) && isOpenRaid(r));
    const openIssues = issues.filter(i => inPortfolio(i) && isOpenRaid(i));
    const completed = portProjects.filter(p => isCompleteStatus(p.status)).length;
    const pct = portProjects.length > 0 ? Math.round(completed / portProjects.length * 100) : 0;
    const critHighRisks = openRisks.filter(isHighOrCritical).length;
    const critHighIssues = openIssues.filter(isHighOrCritical).length;
    return {
      port, pct, critHighRisks, critHighIssues,
      programCount: portPrograms.length, projectCount: portProjects.length,
      openRisks: openRisks.length, openIssues: openIssues.length,
      rag: getRag(critHighRisks, critHighIssues, pct),
    };
  }), [portfolios, programs, projects, risks, issues]);

  const filtered = rows.filter(({ port, rag }) => {
    if (search && !port.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (health && rag.key !== health) return false;
    if (status && workStatusInfo(port.status).label !== status) return false;
    if (owner && port.owner !== owner) return false;
    return true;
  });

  const offTrack = rows.filter(r => r.rag.key === 'red').length;
  const critHighRisks = rows.reduce((s, r) => s + r.critHighRisks, 0);
  const critHighIssues = rows.reduce((s, r) => s + r.critHighIssues, 0);

  const handleExport = () => exportRecords(filtered, [
    { label: 'Portfolio', value: r => r.port.name },
    { label: 'Health', value: r => r.rag.label },
    { label: 'Status', value: r => workStatusInfo(r.port.status).label },
    { label: 'Completion %', value: r => r.pct },
    { label: 'Programs', value: r => r.programCount },
    { label: 'Projects', value: r => r.projectCount },
    { label: 'Open Risks', value: r => r.openRisks },
    { label: 'Open Issues', value: r => r.openIssues },
    { label: 'Portfolio Owner', value: r => r.port.owner || '' },
  ], `portfolios_${new Date().toISOString().slice(0, 10)}.csv`);

  const columns = [
    {
      key: 'name', label: 'Portfolio', sortValue: r => r.port.name, className: 'whitespace-nowrap',
      render: r => <TitleCell title={r.port.name} />,
    },
    { key: 'health', label: 'Health', info: HEALTH_INFO, render: r => <HealthPill rag={r.rag} /> },
    { key: 'status', label: 'Status', sortValue: r => workStatusInfo(r.port.status).label, render: r => <WorkStatusPill status={r.port.status} /> },
    { key: 'completion', label: 'Completion', sortValue: r => r.pct, render: r => <CompletionBar pct={r.pct} /> },
    { key: 'programs', label: 'Programs', sortValue: r => r.programCount, className: 'text-center', headerClassName: 'text-center', render: r => <span style={{ color: NAVY }}>{r.programCount}</span> },
    { key: 'projects', label: 'Projects', sortValue: r => r.projectCount, className: 'text-center', headerClassName: 'text-center', render: r => <span style={{ color: NAVY }}>{r.projectCount}</span> },
    { key: 'risks', label: 'Open Risks', sortValue: r => r.openRisks, className: 'text-center', headerClassName: 'text-center', render: r => <CountCell value={r.openRisks} /> },
    { key: 'issues', label: 'Open Issues', sortValue: r => r.openIssues, className: 'text-center', headerClassName: 'text-center', render: r => <CountCell value={r.openIssues} /> },
    { key: 'owner', label: 'Portfolio Owner(s)', sortValue: r => r.port.owner, render: r => <span className="text-sm" style={{ color: NAVY }}>{r.port.owner || '—'}</span> },
    { key: 'open', label: '', className: 'w-8', render: () => <DetailsChevron /> },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Portfolio Directory"
        subtitle="Enterprise portfolio health and delivery performance."
        actions={<PrimaryButton icon={Plus} onClick={onNewPortfolio}>New Portfolio</PrimaryButton>}
      />

      {portfolios.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FolderOpen className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium mb-1">No portfolios yet</p>
          <p className="text-xs mb-4">Create your first portfolio to start organising programs and projects.</p>
          <Button onClick={onNewPortfolio} style={{ backgroundColor: NAVY }}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Portfolio
          </Button>
        </div>
      ) : (
        <>
          <StatGrid className="lg:grid-cols-5">
            <StatCard value={portfolios.length} label="Portfolios" sub="Across the organization" icon={Building2} />
            <StatCard value={programs.length} label="Programs" sub="Across all portfolios" icon={Network} />
            <StatCard value={projects.length} label="Projects" sub="Across all programs" icon={FileText} />
            <StatCard value={offTrack} label="Off Track" sub="Portfolios needing attention" icon={AlertTriangle} />
            <StatCard value={critHighRisks + critHighIssues} label="High/Critical RAID" sub={riskIssueLine(critHighRisks, critHighIssues)} icon={ShieldAlert} />
          </StatGrid>

          <FilterBar right={<ExportButton onClick={handleExport} disabled={filtered.length === 0} />}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search portfolios..." />
            <FilterSelect value={health} onChange={setHealth} allLabel="Health" options={HEALTH_OPTIONS} />
            <FilterSelect value={status} onChange={setStatus} allLabel="Status" options={WORK_STATUS_OPTIONS} />
            <FilterSelect value={owner} onChange={setOwner} allLabel="Portfolio Owner" options={optionsFrom(portfolios.map(p => p.owner))} />
          </FilterBar>

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={r => r.port.id}
            onRowClick={r => onSelectPortfolio(r.port)}
            noun="portfolios"
            empty="No portfolios match your filters."
          />
        </>
      )}
    </PageBody>
  );
}
