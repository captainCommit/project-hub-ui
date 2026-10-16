import React from 'react';
import { Folder, Calendar } from 'lucide-react';
import { parseISO, isValid, format } from 'date-fns';
import DashboardCard, { TEXT, MUTED, BORDER, BLUE } from '@/components/home/DashboardCard';

const clamp2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

const STATUS_TONE = {
  atRisk: { background: '#FFF3E0', color: '#F28C00', label: 'At risk' },
  done: { background: '#EAF0F7', color: '#6882A7', label: 'Completed' },
  ok: { background: '#E8F5E9', color: '#00875A', label: 'On track' },
};

const barColorFor = (pct) => (pct <= 30 ? '#FF8A00' : pct <= 60 ? BLUE : '#00B66A');

export default function MyProjects({ projects, onOpen }) {
  return (
    <DashboardCard title="My Projects" heightClass="lg:h-full min-h-0">
      {projects.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: MUTED }}>No projects assigned to you yet.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          <table className="w-full table-fixed text-[11px]">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                <th className="text-left align-middle font-normal py-2 px-2" style={{ color: MUTED }}>Project</th>
                <th className="text-left align-middle font-normal py-2 pr-2 w-[88px]" style={{ color: MUTED }}>
                  Progress
                </th>
                <th className="text-left align-middle font-normal py-2 pr-2 w-[70px]" style={{ color: MUTED }}>Status</th>
                <th className="text-left align-middle font-normal py-2 pr-2 w-[132px]" style={{ color: MUTED }}>Next milestone</th>
                <th className="text-left align-middle font-normal py-2 pr-2 w-[92px]" style={{ color: MUTED }}>Due date</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const tone = p.completed ? STATUS_TONE.done : p.atRisk ? STATUS_TONE.atRisk : STATUS_TONE.ok;
                const due = p.dueDate && isValid(parseISO(p.dueDate)) ? format(parseISO(p.dueDate), 'MMM d, yyyy') : '—';
                return (
                  <tr
                    key={p.id}
                    className="border-b last:border-b-0 align-top cursor-pointer hover:bg-slate-50 transition-colors"
                    style={{ borderColor: BORDER }}
                    onClick={() => onOpen(p.id)}
                  >
                    <td className="py-2.5 px-2">
                      <span className="flex items-start gap-1.5 min-w-0">
                        <Folder className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
                        <span className="font-semibold" style={{ ...clamp2, color: TEXT }}>{p.name}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-[56px] h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#EDF2F8' }}>
                          <span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: barColorFor(p.pct) }} />
                        </span>
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: MUTED }}>{p.pct}%</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={tone}>
                        {tone.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2">
                      {p.nextMilestone
                        ? <span style={clamp2}>{p.nextMilestone}</span>
                        : <span style={{ color: '#A8BAD2' }}>—</span>}
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-start gap-1 whitespace-nowrap" style={{ color: p.dueDate ? MUTED : '#A8BAD2' }}>
                        <Calendar className="w-3 h-3 flex-shrink-0 mt-0.5" />{due}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}