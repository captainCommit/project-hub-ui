import React, { useMemo, useState } from 'react';
import { parseISO, isValid, startOfDay, differenceInCalendarDays, format } from 'date-fns';
import { AlertCircle, Clock, CheckCircle2, Send, MoreHorizontal, History, ListChecks, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { tasksApi } from '@/api/tasks';
import { toast, toastError } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { SearchInput, FilterSelect, DataTable, Pill, NAVY, MUTED, TONES } from './DirectoryKit';
import { PersonLine } from '@/components/resources/ResourceKit';
import AuditView from './AuditView';

const UPCOMING_DAYS = 7;
const DUE_WINDOWS = [
  { value: '7', label: 'Due: Next 7 days' },
  { value: '14', label: 'Due: Next 14 days' },
  { value: '30', label: 'Due: Next 30 days' },
  { value: 'all', label: 'Due: Any date' },
];
const TRACK = {
  overdue: { label: 'Overdue', tone: 'red', icon: AlertCircle },
  upcoming: { label: 'Upcoming', tone: 'amber', icon: Clock },
  on_track: { label: 'On track', tone: 'green', icon: CheckCircle2 },
  done: { label: 'Completed', tone: 'grey', icon: CheckCircle2 },
  no_date: { label: 'No due date', tone: 'grey', icon: Clock },
};
const TRACK_ORDER = ['overdue', 'upcoming', 'on_track', 'done', 'no_date'];

const toDate = (s) => { const d = s ? parseISO(s) : null; return d && isValid(d) ? d : null; };
const fmt = (s) => { const d = toDate(s); return d ? format(d, 'MMM d, yyyy') : '—'; };
const isDone = (t) => t.status === 'done' || Number(t.progress) >= 100;

function trackOf(task, today) {
  if (isDone(task)) return 'done';
  const due = toDate(task.due_date);
  if (!due) return 'no_date';
  const days = differenceInCalendarDays(due, today);
  if (days < 0) return 'overdue';
  if (days <= UPCOMING_DAYS) return 'upcoming';
  return 'on_track';
}

/**
 * The project schedule's Audit tab: which tasks are overdue or coming due, who has them, and a Nudge that
 * reminds the assignees. The project's change history is one click away.
 * tasks: the project's tasks (account task shape). sprints: for the sprint line under a task.
 * historyEntries: the audit timeline. onOpenTask(taskId): show the task on the sheet. canNudge: may send reminders.
 */
export default function ScheduleAuditView({ tasks = [], sprints = [], historyEntries = [], onOpenTask, canNudge = true }) {
  const [mode, setMode] = useState('tasks');
  const [scope, setScope] = useState('');
  const [assignee, setAssignee] = useState('');
  const [track, setTrack] = useState('');
  const [search, setSearch] = useState('');
  const [dueWindow, setDueWindow] = useState('14');
  const [nudging, setNudging] = useState(null);
  const today = startOfDay(new Date());

  const byId = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const parentIds = useMemo(() => new Set(tasks.map(t => t.parent_task_id).filter(Boolean)), [tasks]);

  const rows = useMemo(() => tasks.map(t => ({
    ...t,
    track: trackOf(t, today),
    sub: sprints.find(s => s.id === t.sprint_id)?.name || byId.get(t.parent_task_id)?.title || '',
    people: t.resources?.length ? t.resources : (t.assignee ? [t.assignee] : []),
  })), [tasks, sprints, byId]);

  const assigneeOptions = [...new Set(rows.flatMap(r => r.people))].sort().map(n => ({ value: n, label: n }));

  const filtered = rows.filter(r => {
    if (scope === 'open' && r.track === 'done') return false;
    if (scope === 'done' && r.track !== 'done') return false;
    if (scope === 'work' && parentIds.has(r.id)) return false;
    if (assignee && !r.people.includes(assignee)) return false;
    if (track && r.track !== track) return false;
    if (search && !(r.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (dueWindow !== 'all') {
      // The window is "what needs attention": anything overdue plus what falls due within the next N days.
      const due = toDate(r.due_date);
      if (!due || r.track === 'done') return false;
      if (differenceInCalendarDays(due, today) > Number(dueWindow)) return false;
    }
    return true;
  });

  const counts = TRACK_ORDER.reduce((acc, k) => ({ ...acc, [k]: rows.filter(r => r.track === k).length }), {});

  const nudge = async (row) => {
    setNudging(row.id);
    try {
      const result = await tasksApi.nudge(row.id);
      const skipped = result.skipped?.length ? ` Not reached: ${result.skipped.map(s => `${s.name} (${s.reason})`).join('; ')}` : '';
      toast({ title: `Nudged ${result.notified.join(', ')}`, description: skipped || 'They have been reminded about this task.' });
    } catch (error) {
      toastError(error.message);
    } finally {
      setNudging(null);
    }
  };

  const columns = [
    {
      key: 'task', label: 'Task', sortValue: r => r.title, render: r => (
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{r.title}</p>
          {r.sub && <p className="text-xs truncate" style={{ color: MUTED }}>{r.sub}</p>}
        </div>
      ),
    },
    {
      key: 'assignee', label: 'Assignee', sortValue: r => r.people[0] || '', render: r => r.people.length
        ? <div className="flex items-center gap-2"><PersonLine name={r.people[0]} size={30} />{r.people.length > 1 && <span className="text-xs" style={{ color: MUTED }}>+{r.people.length - 1}</span>}</div>
        : <span className="text-sm italic" style={{ color: MUTED }}>Unassigned</span>,
    },
    { key: 'start', label: 'Start Date', sortValue: r => r.start_date || '', render: r => <span className="text-sm text-slate-600">{fmt(r.start_date)}</span> },
    {
      key: 'due', label: 'Due Date', sortValue: r => r.due_date || '', render: r => {
        const tone = r.track === 'overdue' ? TONES.red : r.track === 'upcoming' ? TONES.amber : null;
        return (
          <span className={cn('text-sm px-2 py-1 rounded-md', tone && 'font-semibold')}
            style={tone ? { backgroundColor: tone.bg, color: tone.fg } : { color: '#475569' }}>{fmt(r.due_date)}</span>
        );
      },
    },
    {
      key: 'status', label: 'Status', sortValue: r => TRACK_ORDER.indexOf(r.track), render: r => {
        const info = TRACK[r.track];
        const Icon = info.icon;
        return <Pill tone={info.tone} icon={<Icon className="w-3.5 h-3.5" />} className="px-3 py-1">{info.label}</Pill>;
      },
    },
    {
      key: 'action', label: 'Action', render: r => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {canNudge && r.track !== 'done' && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white" disabled={!r.people.length || nudging === r.id}
              title={r.people.length ? 'Remind the assignees about this task' : 'Nobody is assigned yet'} onClick={() => nudge(r)}>
              {nudging === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Nudge
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="p-1.5 rounded hover:bg-slate-100" aria-label="More actions"><MoreHorizontal className="w-4 h-4" style={{ color: NAVY }} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenTask?.(r.id)}>Open in sheet</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-auto space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: '#EEF2F8' }}>
          {[{ key: 'tasks', label: 'Due dates', icon: ListChecks }, { key: 'history', label: 'Change history', icon: History }].map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setMode(key)}
              className={cn('px-3 py-1.5 flex items-center gap-1.5 text-sm rounded-md', mode === key ? 'bg-white shadow-sm font-semibold' : 'hover:bg-white/60')}
              style={{ color: mode === key ? NAVY : MUTED }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        {mode === 'tasks' && (
          <span className="text-xs ml-2" style={{ color: MUTED }}>
            {counts.overdue} overdue · {counts.upcoming} due in the next {UPCOMING_DAYS} days · {counts.on_track} on track
          </span>
        )}
      </div>

      {mode === 'history' ? (
        historyEntries.length ? <AuditView auditEntries={historyEntries} /> : <p className="text-sm text-slate-400 py-10 text-center">No changes recorded yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect value={scope} onChange={setScope} allLabel="All Tasks"
              options={[{ value: 'open', label: 'Open tasks' }, { value: 'done', label: 'Completed tasks' }, { value: 'work', label: 'Work items only (no summary rows)' }]} />
            <FilterSelect value={assignee} onChange={setAssignee} allLabel="All Assignees" options={assigneeOptions} />
            <FilterSelect value={track} onChange={setTrack} allLabel="All Statuses" options={TRACK_ORDER.map(k => ({ value: k, label: TRACK[k].label }))} />
            <div className="ml-auto flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." className="min-w-[240px]" />
              <FilterSelect value={dueWindow === 'all' ? '' : dueWindow} onChange={v => setDueWindow(v || 'all')} allLabel="Due: Any date"
                options={DUE_WINDOWS.filter(w => w.value !== 'all')} />
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            noun="tasks"
            onRowClick={r => onOpenTask?.(r.id)}
            initialSort={{ key: 'due', dir: 'asc' }}
            empty={tasks.length ? 'Nothing matches these filters. Try a wider due window.' : 'This project has no tasks yet.'}
          />
        </>
      )}
    </div>
  );
}
