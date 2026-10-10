import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, Percent, AlertTriangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmtMoney = (n) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtPct = (n) => `${Math.round((n || 0))}%`;

export default function Financials({ embedded = false }) {
  const [filterPortfolio, setFilterPortfolio] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks_all'], queryFn: () => base44.entities.Task.list() });
  const { data: resources = [] } = useQuery({ queryKey: ['project_resources'], queryFn: () => base44.entities.ProjectResource.list('full_name') });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });

  const resByName = useMemo(() => {
    const m = {};
    resources.forEach(r => { m[r.full_name] = r; });
    return m;
  }, [resources]);

  const scopePrograms = programs.filter(p => filterPortfolio === 'all' || p.portfolio_id === filterPortfolio);
  const scopeProjects = projects.filter(p => {
    if (filterProgram !== 'all') return p.program_id === filterProgram;
    if (filterPortfolio !== 'all') return p.portfolio_id === filterPortfolio;
    return true;
  });
  const scopedProjectIds = useMemo(() => {
    if (filterProject !== 'all') return new Set([filterProject]);
    if (filterProgram !== 'all') return new Set(projects.filter(p => p.program_id === filterProgram).map(p => p.id));
    if (filterPortfolio !== 'all') return new Set(projects.filter(p => p.portfolio_id === filterPortfolio).map(p => p.id));
    return null;
  }, [projects, filterProject, filterProgram, filterPortfolio]);

  // Build per-project, per-resource financial rows
  const projectGroups = useMemo(() => {
    const groups = [];
    const tasksInScope = scopedProjectIds ? tasks.filter(t => t.project_id && scopedProjectIds.has(t.project_id)) : tasks;
    const byProject = {};
    tasksInScope.forEach(t => {
      if (!t.project_id) return;
      if (!byProject[t.project_id]) byProject[t.project_id] = {};
      const rg = byProject[t.project_id];
      // planned hours
      (t.resource_hours_planned || []).forEach(h => {
        if (!h || !h.resource) return;
        if (!rg[h.resource]) rg[h.resource] = { plannedHours: 0, actualHours: 0 };
        rg[h.resource].plannedHours += Number(h.hours) || 0;
      });
      // also count planned resources without explicit hours (assume 0)
      (t.resources_planned || []).forEach(name => {
        if (!name) return;
        if (!rg[name]) rg[name] = { plannedHours: 0, actualHours: 0 };
      });
      // actual hours
      (t.resource_hours || []).forEach(h => {
        if (!h || !h.resource) return;
        if (!rg[h.resource]) rg[h.resource] = { plannedHours: 0, actualHours: 0 };
        rg[h.resource].actualHours += Number(h.hours) || 0;
      });
      (t.resources || []).forEach(name => {
        if (!name) return;
        if (!rg[name]) rg[name] = { plannedHours: 0, actualHours: 0 };
      });
    });

    Object.entries(byProject).forEach(([pid, rgMap]) => {
      const proj = projects.find(p => p.id === pid);
      if (!proj) return;
      const projectBudget = Number(proj.budget) || 0;
      const rows = Object.entries(rgMap).map(([name, v]) => {
        const res = resByName[name];
        const rate = Number(res?.rate) || 0;
        const role = res?.role || '—';
        const plannedCost = v.plannedHours * rate;
        const actualCost = v.actualHours * rate;
        return {
          name, role, rate,
          plannedHours: v.plannedHours,
          actualHours: v.actualHours,
          budget: plannedCost,           // Budget = planned hours × rate
          actualCost,
          remaining: plannedCost - actualCost,
          utilization: plannedCost > 0 ? (actualCost / plannedCost) * 100 : 0,
        };
      }).filter(r => r.plannedHours > 0 || r.actualHours > 0);
      if (rows.length === 0) return;
      const plannedCost = rows.reduce((s, r) => s + r.budget, 0);
      const actualCost = rows.reduce((s, r) => s + r.actualCost, 0);
      const effectiveBudget = projectBudget > 0 ? projectBudget : plannedCost;
      const remaining = effectiveBudget - actualCost;
      const utilization = effectiveBudget > 0 ? (actualCost / effectiveBudget) * 100 : 0;
      const costVariance = effectiveBudget - plannedCost;
      groups.push({
        project: proj, projectBudget, effectiveBudget, plannedCost, actualCost, remaining, utilization, costVariance, rows,
      });
    });
    // sort projects by name
    groups.sort((a, b) => a.project.name.localeCompare(b.project.name));
    return groups;
  }, [tasks, projects, resByName, scopedProjectIds]);

  // Tiles (scope totals)
  const totals = useMemo(() => {
    let budget = 0, planned = 0, actual = 0;
    projectGroups.forEach(g => {
      budget += g.effectiveBudget;
      planned += g.plannedCost;
      actual += g.actualCost;
    });
    const remaining = budget - actual;
    const utilization = budget > 0 ? (actual / budget) * 100 : 0;
    const costVariance = budget - planned;
    return { budget, planned, actual, remaining, utilization, costVariance };
  }, [projectGroups]);

  const exportCSV = () => {
    const rows = [['Project', 'Resource', 'Role', 'Hourly Rate', 'Planned Hours', 'Budget', 'Actual Hours', 'Actual Cost', 'Remaining Budget', 'Budget Utilization', 'Cost Variance']];
    projectGroups.forEach(g => {
      g.rows.forEach(r => {
        rows.push([
          g.project.name, r.name, r.role, r.rate || '', r.plannedHours, r.budget.toFixed(0), r.actualHours, r.actualCost.toFixed(0), r.remaining.toFixed(0), `${r.utilization.toFixed(0)}%`, (g.costVariance).toFixed(0),
        ]);
      });
      rows.push([g.project.name + ' — TOTAL', '', '', '', '', g.plannedCost.toFixed(0), '', g.actualCost.toFixed(0), g.remaining.toFixed(0), `${g.utilization.toFixed(0)}%`, g.costVariance.toFixed(0)]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'financials.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const utilColor = (pct) => pct > 100 ? 'text-red-600' : pct < 80 ? 'text-yellow-600' : 'text-emerald-600';
  const varianceColor = (v) => v < 0 ? 'text-red-600' : 'text-emerald-600';

  const tiles = [
    { label: 'Total Budget', value: fmtMoney(totals.budget), icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-100', formula: 'Total Budget = Sum(project allocated budget)' },
    { label: 'Planned Cost', value: fmtMoney(totals.planned), icon: PiggyBank, color: 'text-violet-600', bg: 'bg-violet-100', formula: 'Planned Cost = Sum(planned hours × hourly rate)' },
    { label: 'Actual Cost', value: fmtMoney(totals.actual), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-100', formula: 'Actual Cost = Sum(actual hours × hourly rate)' },
    { label: 'Remaining Budget', value: fmtMoney(totals.remaining), icon: totals.remaining >= 0 ? TrendingUp : TrendingDown, color: totals.remaining >= 0 ? 'text-emerald-600' : 'text-red-600', bg: totals.remaining >= 0 ? 'bg-emerald-100' : 'bg-red-100', formula: 'Remaining Budget = Total Budget − Actual Cost' },
    { label: 'Budget Utilization', value: fmtPct(totals.utilization), icon: Percent, color: utilColor(totals.utilization), bg: 'bg-amber-100', formula: 'Budget Utilization = (Actual Cost ÷ Total Budget) × 100' },
    { label: 'Cost Variance', value: fmtMoney(totals.costVariance), icon: AlertTriangle, color: varianceColor(totals.costVariance), bg: totals.costVariance < 0 ? 'bg-red-100' : 'bg-emerald-100', formula: 'Cost Variance = Total Budget − Planned Cost' },
  ];

  return (
    <div className={`flex bg-slate-50 ${embedded ? 'flex-1 overflow-hidden' : 'h-screen'}`} style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {!embedded && (
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {!embedded && (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Financials</h1>
            <p className="text-xs text-slate-400">Budget vs. actual cost across project tasks</p>
          </div>
        </div>
        )}

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {tiles.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 cursor-help group relative" title={t.formula}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', t.bg)}><Icon className={cn('w-4 h-4', t.color)} /></div>
                    <span className="text-xs font-medium text-slate-500">{t.label}</span>
                  </div>
                  <p className={cn('text-xl font-bold ml-10', t.color)}>{t.value}</p>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-20">
                    {t.formula}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Portfolio:</span>
                <Select value={filterPortfolio} onValueChange={(v) => { setFilterPortfolio(v); setFilterProgram('all'); setFilterProject('all'); }}>
                  <SelectTrigger className="h-8 w-44 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Portfolios</SelectItem>
                    {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Program:</span>
                <Select value={filterProgram} onValueChange={(v) => { setFilterProgram(v); setFilterProject('all'); }}>
                  <SelectTrigger className="h-8 w-44 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {scopePrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Project:</span>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="h-8 w-48 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {scopeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={exportCSV} className="h-8 ml-auto"><Download className="w-3.5 h-3.5 mr-1.5" /> Export</Button>
            </div>
          </div>

          {/* Tables per project */}
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400">
              <Wallet className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No financial data for the selected scope.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {projectGroups.map((g, gi) => (
                <div key={gi} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Project header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-800">{g.project.name}</h3>
                      <span className="text-xs text-slate-400">Allocated Budget: {g.projectBudget > 0 ? fmtMoney(g.projectBudget) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Remaining: <span className={cn('font-semibold', g.remaining >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtMoney(g.remaining)}</span></span>
                      <span className="text-slate-500">Utilization: <span className={cn('font-semibold', utilColor(g.utilization))}>{fmtPct(g.utilization)}</span></span>
                      <span className="text-slate-500">Cost Variance: <span className={cn('font-semibold', varianceColor(g.costVariance))}>{fmtMoney(g.costVariance)}</span></span>
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/60 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Resource</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Role</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Hourly Rate</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Planned Hours</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Budget</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Actual Hours</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Actual Cost</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Remaining Budget</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Budget Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r, ri) => (
                        <tr key={ri} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                          <td className="px-4 py-2 text-slate-500">{r.role}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{r.rate ? `${fmtMoney(r.rate)}/hr` : '—'}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{r.plannedHours.toFixed(1)}</td>
                          <td className="px-4 py-2 text-right text-slate-700 font-medium">{fmtMoney(r.budget)}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{r.actualHours.toFixed(1)}</td>
                          <td className="px-4 py-2 text-right text-slate-700 font-medium">{fmtMoney(r.actualCost)}</td>
                          <td className={cn('px-4 py-2 text-right font-medium', r.remaining >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtMoney(r.remaining)}</td>
                          <td className={cn('px-4 py-2 text-right font-semibold', utilColor(r.utilization))}>{fmtPct(r.utilization)}</td>
                        </tr>
                      ))}
                      {/* Subtotal row */}
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Project Total</td>
                        <td className="px-4 py-2 text-right text-sm font-bold text-slate-800">{fmtMoney(g.plannedCost)}</td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-right text-sm font-bold text-slate-800">{fmtMoney(g.actualCost)}</td>
                        <td className={cn('px-4 py-2 text-right text-sm font-bold', g.remaining >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtMoney(g.remaining)}</td>
                        <td className={cn('px-4 py-2 text-right text-sm font-bold', utilColor(g.utilization))}>{fmtPct(g.utilization)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}