import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Settings, Download, Plus, LayoutGrid, AlertTriangle, AlertCircle, Flag, Layers, ListChecks, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportGenerator from '@/components/projects/ReportGenerator';
import { PageBody, NAVY, MUTED, isOpenRaid } from './DirectoryKit';
import {
  DashboardHeader, StatTile, SectionCard, PerformanceTable, AttentionList, attentionItems, TimelineCard, BudgetCard, ResourceCard,
  HealthBadge, ProgressBar, healthFor, useProjectRollups,
} from './HierarchyDashboard';

const average = (list) => (list.length ? Math.round(list.reduce((s, n) => s + n, 0) / list.length) : 0);

// A program's dashboard: its projects' health, progress and next milestones, the critical/high RAID items that
// need attention, the project timeline, and budget and resourcing across the program.
export default function ProgramDetailView({ program, projects, portfolios = [], risks = [], issues = [], onEditItem, onNewProject, onRenameItem }) {
  const navigate = useNavigate();
  const programProjects = projects.filter(p => p.program_id === program.id);
  const projectIds = programProjects.map(p => p.id);
  const portfolio = portfolios.find(p => p.id === program.portfolio_id);
  const { byProject } = useProjectRollups(programProjects, risks, issues);
  const projectById = Object.fromEntries(programProjects.map(p => [p.id, p]));

  const progress = average(programProjects.map(p => byProject.get(p.id)?.pct || 0));
  const inProgram = (r) => r.program_id === program.id || projectIds.includes(r.project_id);
  const openRisks = risks.filter(r => inProgram(r) && isOpenRaid(r));
  const openIssues = issues.filter(i => inProgram(i) && isOpenRaid(i));
  const attention = attentionItems({ risks, issues }, {
    projectIds,
    programIds: [program.id],
    whereFor: (r) => projectById[r.project_id]?.name || program.name,
  });
  const status = healthFor({
    critHighRisks: attention.filter(a => a.kind === 'Risk').length,
    critHighIssues: attention.filter(a => a.kind === 'Issue').length,
    started: progress > 0 || programProjects.length > 0,
  });
  const upcomingMilestones = programProjects.flatMap(p => (byProject.get(p.id)?.milestones || []).filter(m => !m.done && m.date >= new Date()));
  const totalBudget = (Number(program.budget) || 0) + programProjects.reduce((s, p) => s + (Number(p.budget) || 0), 0);

  const rows = useMemo(() => programProjects.map(p => {
    const rollup = byProject.get(p.id);
    return {
      id: p.id,
      name: p.name,
      onOpen: () => navigate(`/projects/${p.id}/sheet`),
      rag: rollup?.rag,
      pct: rollup?.pct || 0,
      manager: p.project_manager || p.owner,
      milestone: rollup?.nextMilestone,
    };
  }), [programProjects, byProject]);

  const timelineRows = programProjects.map(p => {
    const milestones = byProject.get(p.id)?.milestones || [];
    const upcoming = milestones.filter(m => !m.done && m.date >= new Date());
    const pick = upcoming.length ? upcoming : milestones;
    return { id: p.id, name: p.name, start: p.start_date, end: p.end_date, milestone: pick[pick.length - 1] || null };
  });

  const exportToCSV = () => {
    const out = [['Program', 'Project', 'Status', 'Progress %', 'Start Date', 'End Date', 'Project Manager', 'Next Milestone']];
    rows.forEach(r => {
      const p = projectById[r.id];
      out.push([program.name, r.name, r.rag?.label || '', r.pct, p.start_date || '', p.end_date || '', r.manager || '', r.milestone ? `${r.milestone.name} (${format(r.milestone.date, 'yyyy-MM-dd')})` : '']);
    });
    const csv = out.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${program.name.replace(/\s+/g, '_')}_report.csv` });
    a.click();
  };

  return (
    <PageBody className="space-y-5">
      <DashboardHeader
        crumbs={[
          { label: 'Portfolios', to: '/Projects?view=all_portfolios' },
          ...(portfolio ? [{ label: portfolio.name, to: `/portfolios/${portfolio.id}` }] : []),
          { label: program.name },
        ]}
        title={program.name}
        onRename={onRenameItem ? (name) => onRenameItem(program.id, name, 'program') : undefined}
        starType="program" starId={program.id} color={program.color}
        status={status} progress={progress}
        ownerLabel="Program Manager" owner={program.owner}
        actions={(
          <>
            {onNewProject && (
              <Button variant="outline" size="sm" className="h-9 bg-white" onClick={() => onNewProject(program.id)}><Plus className="w-4 h-4 mr-1.5" /> New Project</Button>
            )}
            <Button variant="outline" size="sm" className="h-9 bg-white" onClick={exportToCSV}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
            <ReportGenerator scope="program" program={program} />
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 bg-white" title="Program settings" onClick={() => onEditItem?.(program, 'program')}>
              <Settings className="w-4 h-4" style={{ color: NAVY }} />
            </Button>
          </>
        )}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatTile icon={LayoutGrid} tone="blue" value={programProjects.length} label={programProjects.length === 1 ? 'Project' : 'Projects'} />
        <StatTile ring={progress} value={`${progress}%`} label="Program Completion" />
        <StatTile icon={AlertTriangle} tone="red" value={openRisks.length} label={openRisks.length === 1 ? 'Open Risk' : 'Open Risks'} />
        <StatTile icon={AlertCircle} tone="amber" value={openIssues.length} label={openIssues.length === 1 ? 'Open Issue' : 'Open Issues'} />
        <StatTile icon={Flag} tone="blue" value={upcomingMilestones.length} label="Upcoming Milestones" />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-5">
        <SectionCard icon={Layers} title="Program Performance" className="xl:col-span-3">
          <PerformanceTable
            empty="No projects in this program yet."
            rows={rows}
            columns={[
              { key: 'name', label: 'Project' },
              { key: 'status', label: 'Status', render: r => (r.rag ? <HealthBadge rag={r.rag} /> : null) },
              { key: 'progress', label: 'Progress', render: r => <ProgressBar pct={r.pct} width="w-[90px]" /> },
              { key: 'manager', label: 'Project Manager', render: r => <span className="text-slate-600">{r.manager || '—'}</span> },
              {
                key: 'milestone', label: 'Next Milestone', render: r => r.milestone ? (
                  <span className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
                    <span><span className="block text-sm" style={{ color: NAVY }}>{r.milestone.name}</span><span className="text-xs" style={{ color: MUTED }}>{format(r.milestone.date, 'MMM yyyy')}</span></span>
                  </span>
                ) : <span className="text-xs" style={{ color: MUTED }}>None scheduled</span>,
              },
            ]}
          />
        </SectionCard>
        <SectionCard icon={ListChecks} title="Requires Attention" badge={attention.length} className="xl:col-span-2">
          <AttentionList items={attention} />
        </SectionCard>
      </div>

      <TimelineCard title="Program Timeline" rowLabel="Project" rows={timelineRows} />

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <BudgetCard totalBudget={totalBudget} projectIds={projectIds} />
        <ResourceCard title="Resource Utilization" projectIds={projectIds} projects={programProjects} />
      </div>
    </PageBody>
  );
}
