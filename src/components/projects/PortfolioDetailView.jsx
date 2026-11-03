import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Download, Layers, LayoutGrid, AlertTriangle, Coins, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportGenerator from '@/components/projects/ReportGenerator';
import { PageBody, NAVY } from './DirectoryKit';
import {
  DashboardHeader, StatTile, SectionCard, PerformanceTable, AttentionList, attentionItems, TimelineCard, BudgetCard, ResourceCard,
  HealthBadge, ProgressBar, healthFor, useProjectRollups,
} from './HierarchyDashboard';

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const average = (list) => (list.length ? Math.round(list.reduce((s, n) => s + n, 0) / list.length) : 0);

// A portfolio's dashboard: its programs' health and progress, the critical/high RAID items that need attention,
// the program timeline, and budget and resourcing across every project under it.
export default function PortfolioDetailView({
  portfolio, programs, projects, risks = [], issues = [],
  onEditItem, onRenameItem,
}) {
  const navigate = useNavigate();
  const portfolioPrograms = programs.filter(p => p.portfolio_id === portfolio.id);
  const programIds = portfolioPrograms.map(p => p.id);
  const portfolioProjects = projects.filter(p => p.portfolio_id === portfolio.id || programIds.includes(p.program_id));
  const projectIds = portfolioProjects.map(p => p.id);
  const { byProject } = useProjectRollups(portfolioProjects, risks, issues);

  const openProgram = (program) => navigate(`/programs/${program.id}`);
  const openProject = (project) => navigate(`/projects/${project.id}/sheet`);

  const programRows = useMemo(() => portfolioPrograms.map(program => {
    const programProjects = portfolioProjects.filter(p => p.program_id === program.id);
    const rollups = programProjects.map(p => byProject.get(p.id)).filter(Boolean);
    const inProgram = (r) => r.program_id === program.id || programProjects.some(p => p.id === r.project_id);
    const openHigh = (list) => list.filter(r => inProgram(r) && !['resolved', 'closed', 'mitigated', 'cancelled'].includes(r.status) && ['critical', 'high'].includes(r.priority)).length;
    const pct = average(rollups.map(r => r.pct));
    return {
      id: program.id,
      name: program.name,
      onOpen: () => openProgram(program),
      pct,
      rag: healthFor({ critHighRisks: openHigh(risks), critHighIssues: openHigh(issues), started: pct > 0 || programProjects.length > 0 }),
      count: programProjects.length,
      owner: program.owner,
      program,
      projects: programProjects,
      children: programProjects.map(p => ({
        id: p.id,
        name: p.name,
        onOpen: () => openProject(p),
        pct: byProject.get(p.id)?.pct || 0,
        rag: byProject.get(p.id)?.rag,
        count: null,
        owner: p.project_manager || p.owner,
      })),
    };
  }), [portfolioPrograms, portfolioProjects, byProject, risks, issues]);

  const overall = average(portfolioProjects.map(p => byProject.get(p.id)?.pct || 0));
  const programById = Object.fromEntries(portfolioPrograms.map(p => [p.id, p]));
  const projectById = Object.fromEntries(portfolioProjects.map(p => [p.id, p]));
  const attention = attentionItems({ risks, issues }, {
    projectIds,
    programIds,
    whereFor: (r) => programById[r.program_id]?.name || programById[projectById[r.project_id]?.program_id]?.name || projectById[r.project_id]?.name || 'Portfolio',
  });
  const status = healthFor({
    critHighRisks: attention.filter(a => a.kind === 'Risk').length,
    critHighIssues: attention.filter(a => a.kind === 'Issue').length,
    started: overall > 0 || portfolioProjects.length > 0,
  });
  const totalBudget = portfolioPrograms.reduce((s, p) => s + (Number(p.budget) || 0), 0) + portfolioProjects.reduce((s, p) => s + (Number(p.budget) || 0), 0)
    + (Number(portfolio.budget) || 0);

  const timelineRows = portfolioPrograms.map(program => {
    const programProjects = portfolioProjects.filter(p => p.program_id === program.id);
    const starts = [program.start_date, ...programProjects.map(p => p.start_date)].filter(Boolean).sort();
    const ends = [program.end_date, ...programProjects.map(p => p.end_date)].filter(Boolean).sort();
    const milestones = programProjects.flatMap(p => byProject.get(p.id)?.milestones || []);
    const upcoming = milestones.filter(m => !m.done && m.date >= new Date());
    return {
      id: program.id,
      name: program.name,
      start: starts[0],
      end: ends[ends.length - 1],
      // The program's key milestone: the last one it is heading for.
      milestone: (upcoming.length ? upcoming : milestones)[(upcoming.length ? upcoming : milestones).length - 1] || null,
      children: programProjects.map(p => ({ id: p.id, name: p.name, start: p.start_date, end: p.end_date, milestone: byProject.get(p.id)?.nextMilestone })),
    };
  });

  const exportToCSV = () => {
    const rows = [['Portfolio', 'Program', 'Project', 'Status', 'Progress %', 'Start', 'End', 'Owner']];
    programRows.forEach(row => {
      if (!row.projects.length) rows.push([portfolio.name, row.name, '', row.rag.label, row.pct, row.program.start_date || '', row.program.end_date || '', row.owner || '']);
      row.projects.forEach(p => rows.push([portfolio.name, row.name, p.name, byProject.get(p.id)?.rag.label || '', byProject.get(p.id)?.pct || 0, p.start_date || '', p.end_date || '', p.project_manager || p.owner || '']));
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${portfolio.name.replace(/\s+/g, '_')}_report.csv` });
    a.click();
  };

  return (
    <PageBody className="space-y-5">
      <DashboardHeader
        crumbs={[{ label: 'Portfolios', to: '/Projects?view=all_portfolios' }, { label: portfolio.name }]}
        title={portfolio.name}
        onRename={onRenameItem ? (name) => onRenameItem(portfolio.id, name, 'portfolio') : undefined}
        starType="portfolio" starId={portfolio.id} color={portfolio.color}
        status={status} progress={overall}
        ownerLabel="Portfolio Owner" owner={portfolio.owner}
        actions={(
          <>
            <Button variant="outline" size="sm" className="h-9 bg-white" onClick={exportToCSV}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
            <ReportGenerator scope="portfolio" portfolio={portfolio} />
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 bg-white" title="Portfolio settings" onClick={() => onEditItem?.(portfolio, 'portfolio')}>
              <Settings className="w-4 h-4" style={{ color: NAVY }} />
            </Button>
          </>
        )}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatTile icon={Layers} tone="blue" value={portfolio.program_count ?? portfolioPrograms.length} label="Programs" />
        <StatTile icon={LayoutGrid} tone="blue" value={portfolio.project_count ?? portfolioProjects.length} label="Projects" />
        <StatTile ring={overall} value={`${overall}%`} label="Overall Completion" />
        <StatTile icon={AlertTriangle} tone="red" value={attention.length} label="Needs Attention" />
        <StatTile icon={Coins} tone="grey" value={money(totalBudget)} label="Total Budget" />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-5">
        <SectionCard icon={Layers} title="Portfolio Performance" className="xl:col-span-3"
          right={<span className="text-sm text-slate-500">{portfolioPrograms.length} program{portfolioPrograms.length === 1 ? '' : 's'}</span>}>
          <PerformanceTable
            empty="No programs in this portfolio yet."
            rows={programRows}
            columns={[
              { key: 'name', label: 'Program' },
              { key: 'status', label: 'Status', render: r => (r.rag ? <HealthBadge rag={r.rag} /> : null) },
              { key: 'progress', label: 'Progress', render: r => <ProgressBar pct={r.pct} width="w-[90px]" /> },
              { key: 'projects', label: 'Projects', render: r => <span className="text-slate-600">{r.count ?? ''}</span> },
              { key: 'owner', label: 'Program Manager', render: r => <span className="text-slate-600">{r.owner || '—'}</span> },
            ]}
          />
        </SectionCard>
        <SectionCard icon={ListChecks} title="Requires Attention" badge={attention.length} className="xl:col-span-2">
          <AttentionList items={attention} />
        </SectionCard>
      </div>

      <TimelineCard title="Portfolio Timeline" rowLabel="Program" rows={timelineRows} />

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <BudgetCard totalBudget={totalBudget} projectIds={projectIds} />
        <ResourceCard title="Resource Summary" projectIds={projectIds} projects={portfolioProjects} />
      </div>
    </PageBody>
  );
}
