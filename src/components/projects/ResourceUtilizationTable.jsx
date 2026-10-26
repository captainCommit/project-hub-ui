import React, { useMemo, useState } from 'react';
import { parseISO, isValid } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccountHierarchy, useAccountResources, useAccountTasks } from '@/hooks/useAccountLookups';

const STATUS_CLS = {
  over: 'text-red-600',
  under: 'text-yellow-600',
  optimal: 'text-emerald-600',
};

function statusOf(pct) {
  if (pct == null) return '—';
  if (pct > 100) return 'over';
  if (pct === 100) return 'optimal';
  return 'under';
}

export default function ResourceUtilizationTable({ projectIds = [], scopeLabel = 'Scope' }) {
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const { tasks } = useAccountTasks();
  const resources = useAccountResources();
  const { projects } = useAccountHierarchy();

  const scopeSet = useMemo(() => new Set(projectIds), [projectIds]);

  const rows = useMemo(() => {
    const scopedTasks = tasks.filter(t => t.project_id && scopeSet.has(t.project_id));
    return resources.map(r => {
      const name = r.full_name;
      let weekly = 0;
      let involved = false;
      scopedTasks.forEach(t => {
        const isInvolved = t.assignee === name
          || (Array.isArray(t.resources) && t.resources.includes(name))
          || (Array.isArray(t.resources_planned) && t.resources_planned.includes(name));
        if (!isInvolved) return;
        involved = true;
        // Planned hours, else hours logged: the same rule as Resources > Capacity, so both show the same load.
        const sumFor = (list) => (Array.isArray(list) ? list : [])
          .filter(h => h && h.resource === name).reduce((s, h) => s + (Number(h.hours) || 0), 0);
        const hrs = sumFor(t.resource_hours_planned) || sumFor(t.resource_hours);
        const proj = projects.find(p => p.id === t.project_id);
        let weeks = 1;
        if (proj && proj.start_date && proj.end_date) {
          const s = parseISO(proj.start_date), e = parseISO(proj.end_date);
          if (isValid(s) && isValid(e)) {
            const days = Math.max(1, (e - s) / (1000 * 60 * 60 * 24));
            weeks = days / 7;
          }
        }
        weekly += hrs / weeks;
      });
      const capacity = Number(r.weekly_capacity) || 0;
      const pct = capacity > 0 ? Math.round((weekly / capacity) * 100) : null;
      return { name, role: r.role || '', capacity, weekly, pct, status: statusOf(pct), involved };
    }).filter(d => d.involved);
  }, [tasks, resources, projects, scopeSet]);

  const assigned = rows.length;
  const over = rows.filter(r => r.pct != null && r.pct > 100).length;
  const under = rows.filter(r => r.pct != null && r.pct < 100).length;
  const withPct = rows.filter(r => r.pct != null);
  const avgUtilization = withPct.length > 0 ? Math.round(withPct.reduce((s, r) => s + r.pct, 0) / withPct.length) : 0;
  const availableCapacity = Math.round(
    rows.filter(r => r.pct != null && r.pct < 100).reduce((s, r) => s + (r.capacity - r.weekly), 0) * 10
  ) / 10;

  return (
    <div className="p-4 space-y-4">
      {/* Aggregate summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryTile label="Resources Assigned" value={assigned} />
        <SummaryTile label="Over Allocated" value={over} valueCls="text-red-600" />
        <SummaryTile label="Under Allocated" value={under} valueCls="text-yellow-600" />
        <SummaryTile label="Average Utilization" value={`${avgUtilization}%`} />
        <SummaryTile label="Available Capacity" value={`${availableCapacity} hrs/wk`} valueCls="text-emerald-600" hint="from under-allocated resources" />
      </div>

      {/* Per-resource table */}
      {assigned === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No resources assigned to this {scopeLabel.toLowerCase()} yet.</p>
      ) : (
        <div>
        <button
          onClick={() => setTableCollapsed(c => !c)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 mb-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {tableCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {tableCollapsed ? 'Show resource details' : 'Hide resource details'}
        </button>
        {!tableCollapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs outlined-header">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Resource</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Capacity (hrs/wk)</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Allocated (hrs/wk)</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">% Allocation</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-b border-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700" title={r.role || undefined}>{r.name}</td>
                  <td className="px-4 py-2 text-slate-500">{r.capacity || '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{r.weekly.toFixed(1)}</td>
                  <td className="px-4 py-2">
                    <span className={cn('font-semibold', r.pct != null ? STATUS_CLS[r.status] : 'text-slate-400')}>
                      {r.pct != null ? `${r.pct}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {r.pct != null ? (
                      <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                        r.status === 'over' ? 'bg-red-100 text-red-700' : r.status === 'under' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700')}>
                        {r.status === 'over' ? 'Over allocated' : r.status === 'under' ? 'Under allocated' : 'Optimal'}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, valueCls, hint }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className={cn('text-xl font-bold text-slate-800', valueCls)}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}