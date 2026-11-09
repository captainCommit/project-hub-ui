import React, { useState } from 'react';
import { useScrollGutter } from '@/hooks/useScrollGutter';
import { cn } from '@/lib/utils';
import { Folder, Calendar, Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { parseISO, isValid, format } from 'date-fns';
import DashboardCard, { TEXT, MUTED, BORDER, BLUE, ORANGE } from '@/components/home/DashboardCard';

const clamp2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

const STATUS_TONE = {
  atRisk: { background: '#FFF3E0', color: '#c87b14', label: 'At risk' },
  done: { background: '#EAF0F7', color: '#6882A7', label: 'Completed' },
  ok: { background: '#E8F5E9', color: '#00875A', label: 'On track' },
};

const barColorFor = (pct) => (pct <= 30 ? '#c87b14' : pct <= 60 ? BLUE : '#00B66A');

/** Pick any project you can see that isn't already in the list. */
function AddProject({ available, onAdd }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = available.filter(p => (p.name || '').toLowerCase().includes(query)).slice(0, 50);
  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button type="button" className="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0 whitespace-nowrap" style={{ color: ORANGE }}>
          <Plus className="w-3.5 h-3.5" /> Add project
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="h-8 text-xs" autoFocus />
        <div className="mt-1 max-h-60 overflow-y-auto">
          {shown.length === 0 && <p className="text-xs py-3 text-center" style={{ color: MUTED }}>No more projects to add.</p>}
          {shown.map(p => (
            <button key={p.id} type="button" onClick={() => { onAdd(p.id); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50" style={{ color: TEXT }}>
              <Folder className="w-3 h-3 flex-shrink-0" style={{ color: BLUE }} /><span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// allProjects: everything the person can see, offered by Add project. Projects they added can be removed again.
export default function MyProjects({ projects, onOpen, allProjects = [], onAdd = undefined, onRemove = undefined }) {
  const [scrollRef, scrolls] = useScrollGutter(projects);
  const listed = new Set(projects.map(p => p.id));
  const action = onAdd ? <AddProject available={allProjects.filter(p => !listed.has(p.id))} onAdd={onAdd} /> : undefined;
  return (
    <DashboardCard title="My Projects" heightClass="lg:h-full min-h-0" action={action}>
      {projects.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: MUTED }}>No projects here yet. Use Add project to follow one.</p>
      ) : (
        <div ref={scrollRef} className={cn('flex-1 min-h-0 overflow-y-auto mt-3', scrolls && 'pr-3')}>
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
                    className="group border-b last:border-b-0 align-top cursor-pointer hover:bg-slate-50 transition-colors"
                    style={{ borderColor: BORDER }}
                    onClick={() => onOpen(p.id)}
                  >
                    <td className="py-2.5 px-2">
                      <span className="flex items-start gap-1.5 min-w-0">
                        <Folder className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
                        <span className="font-semibold flex-1 min-w-0" style={{ ...clamp2, color: TEXT }}>{p.name}</span>
                        {p.pinned && onRemove && (
                          <button type="button" title="Remove from My Projects" aria-label={`Remove ${p.name} from My Projects`}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); onRemove(p.id); }}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
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