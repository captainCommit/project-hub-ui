import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useAccountResources } from '@/hooks/useAccountLookups';

const fmt = (n) => (n || n === 0) ? `$${Math.round(n).toLocaleString()}` : '—';

export default function BudgetForecast({ totalBudget = 0, projectIds = [] }) {
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks_all'], queryFn: () => base44.entities.Task.list() });
  const resources = useAccountResources();

  const { plannedCost, actualCost } = useMemo(() => {
    const scope = new Set(projectIds);
    const rateByName = {};
    resources.forEach(r => { rateByName[r.full_name] = Number(r.rate) || 0; });
    let planned = 0, actual = 0;
    tasks.forEach(t => {
      if (!t.project_id || !scope.has(t.project_id)) return;
      (Array.isArray(t.resource_hours_planned) ? t.resource_hours_planned : []).forEach(h => {
        if (!h || !h.resource) return;
        planned += (Number(h.hours) || 0) * (rateByName[h.resource] || 0);
      });
      (Array.isArray(t.resource_hours) ? t.resource_hours : []).forEach(h => {
        if (!h || !h.resource) return;
        actual += (Number(h.hours) || 0) * (rateByName[h.resource] || 0);
      });
    });
    return { plannedCost: planned, actualCost: actual };
  }, [tasks, resources, projectIds]);

  const remaining = (totalBudget || 0) - actualCost;

  const rows = [
    { label: 'Total Budget', value: totalBudget || 0, cls: 'text-slate-800' },
    { label: 'Planned Cost', value: plannedCost, cls: 'text-violet-600' },
    { label: 'Actual Cost', value: actualCost, cls: 'text-blue-600' },
    { label: 'Remaining Budget', value: remaining, cls: remaining >= 0 ? 'text-emerald-600' : 'text-red-600' },
  ];

  return (
    <div className="p-5">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(r => (
            <tr key={r.label} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{r.label}</td>
              <td className={cn('px-4 py-3 text-right text-lg font-bold', r.cls)}>{fmt(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalBudget === 0 && <p className="text-xs text-slate-400 text-center mt-3">No budget allocated for this scope.</p>}
    </div>
  );
}