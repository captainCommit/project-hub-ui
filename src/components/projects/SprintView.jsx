import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatStoryId, sprintsApi } from '@/api/sprints';
import { accountDataApi } from '@/api/accountData';
import { tasksApi } from '@/api/tasks';
import { mapIssueListFromApi, mapRiskListFromApi, raidApi } from '@/api/raid';
import { raidEntityAdapters } from '@/api/raidEntities';
import { buildRelatedRecordIndex, resolveRelatedRecords, RELATED_RECORD_ORDER, RELATED_RECORD_TYPES } from '@/lib/relatedRecords';
import { useAccountRequirements } from '@/hooks/useAccountLookups';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Plus, Zap, Loader2, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Flag, GripVertical, Link2, MoreHorizontal, MoreVertical, FilePlus2, Filter, List, Check, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toastError } from '@/components/ui/use-toast';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
import { exportRecords } from '@/lib/exportUtils';
import StarButton from '@/components/projects/StarButton';
import { FilterSelect, NAVY, Pill, PriorityPill, PrimaryButton, SearchInput } from '@/components/projects/DirectoryKit';

// --- Weekday utils ---
function getNonWorkingDays() {
  try { return JSON.parse(localStorage.getItem('app_nonworking_days') || '[0,6]'); } catch { return [0, 6]; }
}
function isNonWorking(d) { return getNonWorkingDays().includes(d.getDay()); }

function addWorkdays(dateStr, days) {
  let date = parseDate(dateStr);
  let added = 0;
  while (added < days) {
    date = addDays(date, 1);
    if (!isNonWorking(date)) added++;
  }
  return format(date, 'yyyy-MM-dd');
}

function workdaysBetween(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  let count = 0;
  let cur = parseDate(startStr);
  const end = parseDate(endStr);
  while (cur <= end) {
    if (!isNonWorking(cur)) count++;
    cur = addDays(cur, 1);
  }
  return count;
}

function nextWorkday(dateStr) {
  let d = addDays(parseDate(dateStr), 1);
  while (isNonWorking(d)) d = addDays(d, 1);
  return format(d, 'yyyy-MM-dd');
}

// --- Sprint settings dialog ---
function SprintSettingsDialog({ open, onOpenChange, sprint, previousSprint, projectId, projects, resources = [], statusOptions = [], onSave, onDelete }) {
  const defaultStart = previousSprint?.end_date ? nextWorkday(previousSprint.end_date) : format(new Date(), 'yyyy-MM-dd');
  const init = sprint || { name: '', goal: '', start_date: defaultStart, duration_weeks: 2, capacity: '', status: 'planning', project_id: projectId || '', resource_id: '' };
  const [form, setForm] = useState(init);

  useEffect(() => {
    if (open) {
      setForm(sprint ? { ...sprint, capacity: sprint.capacity ?? '' } : { name: '', goal: '', start_date: defaultStart, duration_weeks: 2, capacity: '', status: 'planning', project_id: projectId || '' });
    }
  }, [open, sprint?.id]);

  const computedEnd = form.start_date && form.duration_weeks
    ? addWorkdays(form.start_date, form.duration_weeks * 5) : '';
  const workdays = form.start_date && computedEnd ? workdaysBetween(form.start_date, computedEnd) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{sprint ? 'Edit Sprint' : 'New Sprint'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <label className="text-xs text-slate-500 font-medium">Sprint Name</label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Sprint 1" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Assign to Project</label>
            <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Sprint Goal</label>
            <Textarea value={form.goal || ''} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))} rows={2} className="mt-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium">Start Date</label>
              <Input type="date" value={form.start_date || ''} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="mt-1" />
              {previousSprint?.end_date && !sprint && (
                <p className="text-[10px] text-slate-400 mt-1">Defaults to day after Sprint {previousSprint.name?.replace(/\D/g, '')}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Duration (weeks)</label>
              <Input type="number" min={1} max={8} value={form.duration_weeks} onChange={e => setForm(p => ({ ...p, duration_weeks: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Capacity (story points)</label>
              <Input type="number" min={0} value={form.capacity ?? ''} placeholder="e.g. 40"
                onChange={e => setForm(p => ({ ...p, capacity: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))} className="mt-1" />
            </div>
          </div>
          {computedEnd && (
            <p className="text-xs text-slate-400">
              End date: <span className="font-medium text-slate-600">{computedEnd}</span>
              <span className="ml-2 text-slate-400">({workdays} working days)</span>
            </p>
          )}
          <div>
            <label className="text-xs text-slate-500 font-medium">Status</label>
            <Select value={form.status} onValueChange={v => {
              const selectedStatus = statusOptions.find(option => option.value === v);
              setForm(p => ({ ...p, status: v, status_id: selectedStatus?.id || undefined }));
            }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Not Started</SelectItem>
                <SelectItem value="active">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {resources.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 font-medium">Assigned Technical Resource</label>
              <Select value={form.resource_id || 'none'} onValueChange={v => setForm(p => ({ ...p, resource_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select resource..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.full_name}{r.role ? ` (${r.role})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.resource_id && form.resource_id !== 'none' && (
                <p className="text-[10px] text-slate-400 mt-1">{resources.find(r => r.id === form.resource_id)?.department || ''}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between pt-2">
          {sprint && onDelete ? (
            <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={() => { onDelete(sprint.id); onOpenChange(false); }}>Delete</Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { if (form.name) { onSave({ ...form, end_date: computedEnd }); onOpenChange(false); } }} className="bg-[#c87b14] hover:bg-[#a86610]">
              {sprint ? 'Save' : 'Create Sprint'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Sprint board ---
const SPRINT_PRIORITY_TONES = { critical: 'red', high: 'coral', medium: 'sand', low: 'mint' };
const raidLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const SPRINT_STATUS = {
  active: { label: 'Active', tone: 'blue' },
  planning: { label: 'Planned', tone: 'grey' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};
const sprintStatus = (sprint) => SPRINT_STATUS[sprint?.status] || { label: sprint?.status_label || 'Planned', tone: 'grey' };
const isDoneValue = (value) => ['complete', 'completed', 'done', 'closed'].includes(String(value || '').toLowerCase());
const TASK_STATUS_TONES = { todo: 'grey', not_started: 'grey', in_progress: 'blue', in_review: 'purple', blocked: 'orange', complete: 'green', done: 'green' };
const sprintNumber = (sprint) => parseInt(sprint.name?.replace(/\D/g, '') || '0', 10);
const bySprintOrder = (a, b) => (a.start_date && b.start_date ? a.start_date.localeCompare(b.start_date) : sprintNumber(a) - sprintNumber(b));
const shortDate = (value) => (value ? format(parseDate(value), 'MM/dd/yyyy') : '—');

/** "8 days left" for the running sprint, otherwise its length. */
function sprintTiming(sprint) {
  if (!sprint.start_date || !sprint.end_date) return '';
  const end = parseDate(sprint.end_date);
  if (sprint.status === 'active') {
    const left = Math.max(0, differenceInCalendarDays(end, new Date()));
    return `${left} day${left === 1 ? '' : 's'} left`;
  }
  const length = differenceInCalendarDays(end, parseDate(sprint.start_date)) + 1;
  return `${length} days`;
}

function SprintStep({ sprint, index, selected, onSelect }) {
  const status = sprintStatus(sprint);
  return (
    <button type="button" onClick={() => onSelect(sprint)}
      className={cn('flex items-start gap-3 px-3 py-2 rounded-lg text-left flex-shrink-0 min-w-[210px] transition-colors', selected ? 'bg-slate-50' : 'hover:bg-slate-50')}>
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={selected ? { backgroundColor: '#2C80F4', color: '#fff' } : { backgroundColor: '#E6EBF2', color: NAVY }}>
        {sprintNumber(sprint) || index + 1}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold" style={{ color: NAVY }}>{sprint.name}</span>
          <Pill tone={status.tone} className="!px-1.5 !py-0 text-[10px]">{status.label}</Pill>
        </span>
        <span className="block text-xs text-slate-500 mt-0.5">{shortDate(sprint.start_date)} – {shortDate(sprint.end_date)}</span>
        <span className="block text-xs text-slate-500">{sprintTiming(sprint)}</span>
      </span>
    </button>
  );
}

/** One table of stories (the sprint's or the backlog's). Rows drag between the two. */
const STORY_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'requirement', label: 'Requirement ID' },
  { key: 'title', label: 'Title' },
  { key: 'priority', label: 'Priority' },
  { key: 'points', label: 'Story Points' },
  { key: 'status', label: 'Status' },
  { key: 'raid', label: 'RAID' },
  { key: 'assignee', label: 'Assignee' },
];
const ALL_STORY_COLUMNS = STORY_COLUMNS.map(c => c.key);

function StoryTable({ stories, statusFor, actionsFor, renderRaid, renderRequirement, onDragStart, onDragEnd, draggable, empty, columns = ALL_STORY_COLUMNS }) {
  const show = (key) => columns.includes(key);
  const shownColumns = STORY_COLUMNS.filter(c => show(c.key));
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm" style={{ minWidth: 1020 }}>
        <thead>
          <tr style={{ backgroundColor: NAVY }}>
            {[{ key: 'grip', label: '' }, { key: 'rank', label: '#' }, ...shownColumns, { key: 'actions', label: 'Actions' }].map(c => (
              <th key={c.key} className={cn('px-3 py-2.5 text-xs font-semibold text-white text-left whitespace-nowrap',
                c.key === 'grip' && 'w-8', c.key === 'rank' && 'w-10', c.key === 'id' && 'w-24', c.key === 'actions' && 'w-16 text-center')}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stories.length === 0 && (
            <tr><td colSpan={shownColumns.length + 3} className="px-4 py-8 text-center text-sm text-slate-400">{empty}</td></tr>
          )}
          {stories.map((story, i) => {
            const status = statusFor(story);
            return (
              <tr key={story.id}
                draggable={draggable}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', story.id); onDragStart(story); }}
                onDragEnd={onDragEnd}
                className={cn('border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50', draggable && 'cursor-grab active:cursor-grabbing')}>
                <td className="px-3 py-2.5 text-slate-400"><GripVertical className="w-4 h-4" /></td>
                <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                {show('id') && <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: NAVY }}>{formatStoryId(story.story_number) || '—'}</td>}
                {show('requirement') && <td className="px-3 py-2.5 whitespace-nowrap">{renderRequirement(story)}</td>}
                {show('title') && <td className="px-3 py-2.5" style={{ color: NAVY }}>{story.title || story.name}</td>}
                {show('priority') && <td className="px-3 py-2.5">{story.priority ? <Pill tone={SPRINT_PRIORITY_TONES[story.priority] || 'grey'} className="rounded-md">{raidLabel(story.priority)}</Pill> : <span className="text-slate-400">—</span>}</td>}
                {show('points') && <td className="px-3 py-2.5" style={{ color: NAVY }}>{story.story_points ?? '—'}</td>}
                {show('status') && <td className="px-3 py-2.5"><Pill tone={status.tone}>{status.label}</Pill></td>}
                {show('raid') && <td className="px-3 py-2.5">{renderRaid(story)}</td>}
                {show('assignee') && <td className="px-3 py-2.5" style={{ color: NAVY }}>{story.assignee || '—'}</td>}
                <td className="px-3 py-2.5 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="p-1 rounded hover:bg-slate-100" aria-label="Story actions"><MoreHorizontal className="w-4 h-4 text-slate-500" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">{actionsFor(story)}</DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const RAID_LOOK = {
  RISK: { label: 'Risk', icon: AlertTriangle, color: '#DC2626', card: 'border-red-200 bg-red-50/50' },
  ISSUE: { label: 'Issue', icon: AlertCircle, color: '#c87b14', card: 'border-orange-200 bg-orange-50/50' },
  ASSUMPTION: { label: 'Assumption', icon: Flag, color: '#002046', card: 'border-slate-200 bg-slate-50' },
  DEPENDENCY: { label: 'Dependency', icon: Link2, color: '#2C80F4', card: 'border-blue-200 bg-blue-50/50' },
};
const RAID_LINK_TYPES = RELATED_RECORD_ORDER.filter(type => RELATED_RECORD_TYPES[type].raid);
const statusWords = (value) => { const text = String(value || '—').replace(/_/g, ' '); return text.charAt(0).toUpperCase() + text.slice(1); };

/** The RAID column: the story's linked items, or a + when it has none. Either opens the panel. */
function RaidCell({ records, onOpen }) {
  const open = (e) => { e.stopPropagation(); onOpen(); };
  if (records.length === 0) {
    return (
      <button type="button" onClick={open} title="Link a RAID item" aria-label="Link a RAID item" className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500">
        <Plus className="w-3.5 h-3.5" />
      </button>
    );
  }
  return (
    <button type="button" onClick={open} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-left hover:opacity-80" aria-label="View linked RAID items">
      {records.map(r => {
        const look = RAID_LOOK[r.type];
        const Icon = look.icon;
        return (
          <span key={`${r.type}-${r.id}`} title={r.title} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium" style={{ color: NAVY }}>
            <Icon className="w-3.5 h-3.5" style={{ color: look.color }} />{r.number}
          </span>
        );
      })}
    </button>
  );
}

/** Which requirement a story delivers, shown by its number and chosen from the project's requirements. */
function RequirementCell({ story, requirements, onChange }) {
  const current = requirements.find(r => r.id === story.requirement_id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="hover:underline" style={{ color: NAVY }} title={current ? current.title : 'Link a requirement'}>
          {current ? current.requirement_id : <span className="text-slate-400">—</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-72 overflow-y-auto">
        {requirements.length === 0 && <DropdownMenuItem disabled>No requirements in this project</DropdownMenuItem>}
        {requirements.map(r => (
          <DropdownMenuItem key={r.id} onClick={() => onChange(story, r.id)}>
            <span className="font-mono text-xs mr-2 flex-shrink-0">{r.requirement_id}</span><span className="truncate">{r.title}</span>
          </DropdownMenuItem>
        ))}
        {current && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onChange(story, null)}>Clear requirement</DropdownMenuItem></>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Right-hand panel: the RAID items linked to one story. Create goes to the RAID page; Link Existing stays here. */
function LinkedRaidPanel({ story, records, candidates, busy, onClose, onLink, onUnlink, onCreate }) {
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => { setLinking(false); setSearch(''); }, [story?.id]);
  const high = records.filter(r => r.priority === 'high' || r.priority === 'critical').length;
  const query = search.trim().toLowerCase();
  const shownCandidates = candidates.filter(c => `${c.number} ${c.title}`.toLowerCase().includes(query)).slice(0, 50);
  return (
    <Sheet open={Boolean(story)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[440px] sm:max-w-[440px] flex flex-col gap-0 p-0">
        <div className="px-5 pt-5 pb-3 border-b border-slate-200">
          <SheetTitle className="text-xl font-bold pr-6" style={{ color: NAVY }}>Linked RAID Items</SheetTitle>
          <SheetDescription className="text-sm truncate">{story ? `${formatStoryId(story.story_number)} · ${story.title || story.name}` : ''}</SheetDescription>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: NAVY }}>{records.length} linked item{records.length === 1 ? '' : 's'}</p>
            {high > 0 && <Pill tone="red">{high} High Priority</Pill>}
          </div>
          {records.length === 0 && !linking && <p className="text-sm text-slate-400 py-8 text-center">No RAID items are linked to this story yet.</p>}
          {records.map(r => {
            const look = RAID_LOOK[r.type];
            const Icon = look.icon;
            return (
              <div key={`${r.type}-${r.id}`} className={cn('rounded-xl border p-3.5 space-y-2', look.card)}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: look.color }} />
                  <p className="text-sm font-bold flex-1 min-w-0 truncate" style={{ color: NAVY }}>{r.number} · {look.label}</p>
                  {r.priority && <PriorityPill priority={r.priority} />}
                  <button type="button" disabled={busy} onClick={() => onUnlink(r)} title="Unlink from this story" aria-label={`Unlink ${r.number}`} className="text-slate-400 hover:text-red-500 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm" style={{ color: NAVY }}>{r.title}</p>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">Status: <Pill tone="blue" className="!py-0">{statusWords(r.status)}</Pill></span>
                  <span>Owner: <span style={{ color: NAVY }}>{r.owner || '—'}</span></span>
                </div>
                <p className="text-xs text-slate-500">Target: <span style={{ color: NAVY }}>{r.target_date ? shortDate(r.target_date) : '—'}</span></p>
              </div>
            );
          })}
          {linking && (
            <div className="rounded-xl border border-slate-200 p-2">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search this project's RAID items..." className="h-8 text-xs" autoFocus />
              <div className="mt-1 max-h-56 overflow-y-auto">
                {shownCandidates.length === 0 && <p className="text-xs py-3 text-center text-slate-400">Nothing left to link.</p>}
                {shownCandidates.map(c => {
                  const look = RAID_LOOK[c.type];
                  const Icon = look.icon;
                  return (
                    <button key={`${c.type}-${c.id}`} type="button" disabled={busy} onClick={() => onLink(c)} className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50 disabled:opacity-50">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: look.color }} />
                      <span className="font-mono flex-shrink-0" style={{ color: NAVY }}>{c.number}</span>
                      <span className="truncate text-slate-500">{c.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 p-4">
          <Button variant="outline" className="flex-1 border-[#c87b14]" style={{ color: NAVY }} onClick={() => setLinking(v => !v)}><Link2 className="w-4 h-4 mr-1.5" /> Link Existing</Button>
          <PrimaryButton icon={Plus} className="flex-1 justify-center" onClick={onCreate}>Create RAID</PrimaryButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const UNASSIGNED = '__unassigned';
const EMPTY_BACKLOG_FILTERS = { id: '', title: '', points: '', assignee: '' };

/** The backlog's Filters button: ID, title, story points and assignee. */
function BacklogFilters({ filters, onChange, stories }) {
  const active = Object.values(filters).filter(Boolean).length;
  const set = (patch) => onChange({ ...filters, ...patch });
  const points = [...new Set(stories.map(s => s.story_points).filter(p => p !== null && p !== undefined))].sort((a, b) => a - b);
  const assignees = [...new Set(stories.map(s => s.assignee).filter(Boolean))].sort();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 rounded-lg border-slate-200 text-[15px]" style={{ color: NAVY }}>
          <Filter className="w-4 h-4 mr-2" /> Filters{active > 0 && <span className="ml-1.5 rounded-full px-1.5 text-xs text-white" style={{ backgroundColor: NAVY }}>{active}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">ID</label>
          <Input value={filters.id} onChange={e => set({ id: e.target.value })} placeholder="e.g. US-104" className="h-8 mt-1 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Title</label>
          <Input value={filters.title} onChange={e => set({ title: e.target.value })} placeholder="Contains..." className="h-8 mt-1 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Story Points</label>
            <Select value={filters.points || 'all'} onValueChange={v => set({ points: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {points.map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Assignee</label>
            <Select value={filters.assignee || 'all'} onValueChange={v => set({ assignee: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" disabled={active === 0} onClick={() => onChange(EMPTY_BACKLOG_FILTERS)}>Clear filters</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The list button: which backlog columns to show (Title always stays). */
function ColumnPicker({ columns, onChange }) {
  const toggle = (key) => onChange(columns.includes(key) ? columns.filter(k => k !== key) : ALL_STORY_COLUMNS.filter(k => k === key || columns.includes(k)));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-slate-200" title="Columns" aria-label="Choose columns">
          <List className="w-4 h-4" style={{ color: NAVY }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-slate-500">Columns</p>
        {STORY_COLUMNS.map(c => (
          <button key={c.key} type="button" disabled={c.key === 'title'} onClick={() => toggle(c.key)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-slate-50 disabled:opacity-60" style={{ color: NAVY }}>
            <span className={cn('w-4 h-4 rounded border flex items-center justify-center', columns.includes(c.key) ? 'border-[#002046] bg-[#002046]' : 'border-slate-300')}>
              {columns.includes(c.key) && <Check className="w-3 h-3 text-white" />}
            </span>
            {c.label}
          </button>
        ))}
        <button type="button" onClick={() => onChange(ALL_STORY_COLUMNS)} className="w-full px-2 py-1.5 text-xs text-left text-slate-500 hover:underline">Show all</button>
      </PopoverContent>
    </Popover>
  );
}

// --- Main SprintView: pick a project, step through its sprints, and drag stories between a sprint and the backlog ---
// actionsSlot: where the page header wants the New Sprint button.
export default function SprintView({ projects, programs = [], portfolios = [], resources = [], initialProjectId = undefined, focusSprintId = undefined, actionsSlot = null }) {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [portfolioId, setPortfolioId] = useState('');
  const [programId, setProgramId] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [selectedSprintId, setSelectedSprintId] = useState(focusSprintId || '');
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogPriority, setBacklogPriority] = useState('');
  // The Filters button narrows the backlog by its columns; the list button picks which columns show.
  const [backlogFilters, setBacklogFilters] = useState(EMPTY_BACKLOG_FILTERS);
  const [backlogColumns, setBacklogColumns] = useState(ALL_STORY_COLUMNS);
  const [dragging, setDragging] = useState(/** @type {{ story: any, from: 'sprint' | 'backlog' } | null} */ (null));
  const [dropTarget, setDropTarget] = useState('');
  const [moveError, setMoveError] = useState('');
  const [raidStoryId, setRaidStoryId] = useState('');
  const navigate = useNavigate();
  const stepsRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => { if (initialProjectId) setProjectId(initialProjectId); }, [initialProjectId]);
  useEffect(() => { if (focusSprintId) setSelectedSprintId(focusSprintId); }, [focusSprintId]);

  const filteredPrograms = portfolioId ? programs.filter(p => p.portfolio_id === portfolioId) : programs;
  const filteredProjects = programId
    ? projects.filter(p => p.program_id === programId)
    : portfolioId
      ? projects.filter(p => p.portfolio_id === portfolioId || filteredPrograms.some(pg => pg.id === p.program_id))
      : projects;
  const validProjectId = projectId && projects.some(project => project.id === projectId) ? projectId : '';

  const {
    data: sprintList = [],
    isLoading: loadingSprints,
    isError: isSprintsError,
    error: sprintsError,
    refetch: retrySprints,
  } = useQuery({
    queryKey: ['project-sprints', validProjectId],
    queryFn: () => sprintsApi.list(validProjectId),
    enabled: Boolean(validProjectId),
  });
  const sprints = useMemo(() => [...sprintList].sort(bySprintOrder), [sprintList]);
  const activeSprint = sprints.find(s => s.id === selectedSprintId) || sprints.find(s => s.status === 'active') || sprints[0] || null;
  const activeSprintId = activeSprint?.id || '';

  const { data: sprintBoard, isLoading: loadingBoard, isError: isBoardError, refetch: retryBoard } = useQuery({
    queryKey: ['sprint-board', activeSprintId],
    queryFn: () => sprintsApi.getBoard(activeSprintId),
    enabled: Boolean(activeSprintId),
  });
  const tasksKey = ['project-tasks-flat', selectedAccountId, validProjectId];
  const { data: projectTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: tasksKey,
    queryFn: () => accountDataApi.listTasks(selectedAccountId, { project_id: validProjectId }),
    enabled: Boolean(selectedAccountId && validProjectId),
  });

  const raidEnabled = Boolean(selectedAccountId && validProjectId);
  const { data: risks = [] } = useQuery({ queryKey: ['account-risks', selectedAccountId], queryFn: async () => mapRiskListFromApi(await raidApi.listAccountRisks(selectedAccountId)), enabled: raidEnabled });
  const { data: issues = [] } = useQuery({ queryKey: ['account-issues', selectedAccountId], queryFn: async () => mapIssueListFromApi(await raidApi.listAccountIssues(selectedAccountId)), enabled: raidEnabled });
  const { data: assumptions = [] } = useQuery({ queryKey: ['assumptions', selectedAccountId], queryFn: () => raidEntityAdapters.Assumption.list(selectedAccountId), enabled: raidEnabled });
  const { data: dependencies = [] } = useQuery({ queryKey: ['dependencies', selectedAccountId], queryFn: () => raidEntityAdapters.Dependency.list(selectedAccountId), enabled: raidEnabled });
  const raidIndex = useMemo(() => buildRelatedRecordIndex({ risks, issues, assumptions, dependencies }), [risks, issues, assumptions, dependencies]);
  const raidRecordsFor = (story) => resolveRelatedRecords(story, raidIndex).filter(r => RELATED_RECORD_TYPES[r.type].raid);
  const { requirements: allRequirements } = useAccountRequirements();
  const projectRequirements = useMemo(() => allRequirements.filter(r => r.project_id === validProjectId), [allRequirements, validProjectId]);

  // The board's columns are the task statuses; their tasks are the sprint's stories.
  const columns = sprintBoard?.columns || [];
  const sprintStories = columns.flatMap(column => (column.tasks || []).map(task => ({
    ...task,
    status_id: task.status_id ?? column.status_id ?? null,
    status_label: column.label || column.title,
    status_value: column.value,
  })));
  const storyPoints = sprintStories.reduce((sum, s) => sum + (Number(s.story_points) || 0), 0);
  const donePoints = sprintStories.filter(s => isDoneValue(s.status_value)).reduce((sum, s) => sum + (Number(s.story_points) || 0), 0);
  const doneStories = sprintStories.filter(s => isDoneValue(s.status_value)).length;
  const progressPct = storyPoints > 0
    ? Math.round(donePoints / storyPoints * 100)
    : (sprintStories.length ? Math.round(doneStories / sprintStories.length * 100) : 0);

  // The backlog: the project's unfinished work items that aren't in a sprint (summary rows left out).
  const parentIds = new Set(projectTasks.map(t => t.parent_task_id).filter(Boolean));
  const backlog = projectTasks.filter(t => !t.sprint_id && !parentIds.has(t.id) && t.status !== 'done');
  const shownBacklog = backlog.filter(t => {
    const id = formatStoryId(t.story_number).toLowerCase();
    if (backlogSearch && !(t.title || '').toLowerCase().includes(backlogSearch.toLowerCase()) && !id.includes(backlogSearch.toLowerCase())) return false;
    if (backlogPriority && t.priority !== backlogPriority) return false;
    if (backlogFilters.id && !id.includes(backlogFilters.id.trim().toLowerCase())) return false;
    if (backlogFilters.title && !(t.title || '').toLowerCase().includes(backlogFilters.title.trim().toLowerCase())) return false;
    if (backlogFilters.points && String(t.story_points ?? '') !== backlogFilters.points) return false;
    if (backlogFilters.assignee === UNASSIGNED ? Boolean(t.assignee) : backlogFilters.assignee && t.assignee !== backlogFilters.assignee) return false;
    return true;
  });

  const invalidateSprintData = (projectIdToRefresh, sprintId) => {
    if (projectIdToRefresh) {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectIdToRefresh] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks-flat'] });
      queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectIdToRefresh] });
      queryClient.invalidateQueries({ queryKey: ['project-board', projectIdToRefresh] });
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectIdToRefresh] });
    }
    if (sprintId) {
      queryClient.invalidateQueries({ queryKey: ['sprint-board', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-detail', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-metrics', sprintId] });
    }
    if (selectedAccountId) {
      queryClient.invalidateQueries({ queryKey: ['account-delivery-overview', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-tasks', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-programs-projects', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-sidebar', selectedAccountId] });
    }
  };

  const createSprint = useMutation({
    mutationFn: ({ projectId: target, data }) => sprintsApi.create(target, data),
    onSuccess: (created, variables) => {
      const target = created?.project_id || variables.projectId;
      invalidateSprintData(target, created?.id);
      setProjectId(target);
      if (created?.id) setSelectedSprintId(created.id);
    },
    onError: (error) => toastError(error.message),
  });
  const updateSprint = useMutation({
    mutationFn: ({ id, data }) => sprintsApi.update(id, data),
    onSuccess: (updated) => invalidateSprintData(updated?.project_id || validProjectId, updated?.id),
    onError: (error) => toastError(error.message),
  });

  const moveStory = useMutation({
    mutationFn: ({ story, sprintId }) => sprintsApi.moveTaskToSprint(story.id, {
      statusId: story.status_id ?? null,
      sortOrder: Number(story.sort_order) || 0,
      sprintId,
    }),
    onMutate: () => setMoveError(''),
    onSuccess: (_moved, { sprintId }) => invalidateSprintData(validProjectId, sprintId || activeSprintId),
    onError: () => setMoveError('We couldn’t move that story. Please try again.'),
  });
  const setStoryStatus = useMutation({
    mutationFn: ({ story, statusId }) => sprintsApi.updateTaskBoardPosition(story.id, {
      status_id: statusId,
      sort_order: Number(story.sort_order) || 0,
      sprint_id: activeSprintId,
    }),
    onMutate: () => setMoveError(''),
    onSuccess: () => invalidateSprintData(validProjectId, activeSprintId),
    onError: () => setMoveError('We couldn’t change that story’s status. Please try again.'),
  });

  const saveRelatedRecords = useMutation({
    mutationFn: ({ story, records }) => tasksApi.updateRelatedRecords(story.id, records),
    onSuccess: () => invalidateSprintData(validProjectId, activeSprintId),
    onError: (error) => toastError(error.message),
  });
  const saveRequirement = useMutation({
    mutationFn: ({ story, requirementId }) => tasksApi.updateRequirement(story.id, requirementId),
    onSuccess: () => invalidateSprintData(validProjectId, activeSprintId),
    onError: (error) => toastError(error.message),
  });
  const renderRaid = (story) => <RaidCell records={raidRecordsFor(story)} onOpen={() => setRaidStoryId(story.id)} />;
  const renderRequirement = (story) => (
    <RequirementCell story={story} requirements={projectRequirements} onChange={(s, requirementId) => saveRequirement.mutate({ story: s, requirementId })} />
  );
  // Looked up each render so the panel shows new links as soon as the board refreshes.
  const raidStory = raidStoryId ? [...sprintStories, ...backlog].find(s => s.id === raidStoryId) || null : null;
  const linkRaid = (record) => saveRelatedRecords.mutate({ story: raidStory, records: [...(raidStory.related_records || []), { type: record.type, id: record.id }] });
  const unlinkRaid = (record) => saveRelatedRecords.mutate({ story: raidStory, records: (raidStory.related_records || []).filter(l => !(l.type === record.type && l.id === record.id)) });
  const raidCandidates = raidStory
    ? [...raidIndex.values()].filter(r => RAID_LINK_TYPES.includes(r.type) && r.project_id === validProjectId && !raidRecordsFor(raidStory).some(l => l.type === r.type && l.id === r.id))
    : [];

  const statusOptions = Array.from(
    new Map(
      sprints
        .map(sprint => sprint.status_summary || (sprint.status_id && sprint.status ? { id: sprint.status_id, value: sprint.status, label: sprint.status_label || sprint.status } : null))
        .filter(Boolean)
        .map(status => [status.value, status])
    ).values()
  );

  const handleSaveSprint = (data) => {
    const target = data.project_id || validProjectId;
    if (!target || !projects.some(project => project.id === target)) return;
    if (editingSprint) updateSprint.mutate({ id: editingSprint.id, data });
    else createSprint.mutate({ projectId: target, data: { ...data, project_id: target } });
    setEditingSprint(null);
  };

  const handleExportSprint = () => {
    if (!activeSprint) return;
    exportRecords(sprintStories, [
      { label: 'ID', value: (s) => formatStoryId(s.story_number) },
      { label: 'Requirement ID', value: (s) => projectRequirements.find(r => r.id === s.requirement_id)?.requirement_id || '' },
      { label: 'Title', key: 'title' },
      { label: 'Priority', key: 'priority' },
      { label: 'Story Points', key: 'story_points' },
      { label: 'Status', key: 'status_label' },
      { label: 'RAID', value: (s) => raidRecordsFor(s).map(r => r.number).join('; ') },
      { label: 'Assignee', key: 'assignee' },
    ], `${activeSprint.name.replace(/\s+/g, '_')}_stories.csv`);
  };

  const openNewSprint = () => { setEditingSprint(null); setSprintDialogOpen(true); };

  // Drag a backlog row onto the sprint to plan it, or a sprint row onto the backlog to take it out.
  const dropZoneProps = (target) => ({
    onDragOver: (e) => {
      if (!dragging || dragging.from === target || (target === 'sprint' && !activeSprintId)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(target);
    },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(''); },
    onDrop: (e) => {
      e.preventDefault();
      setDropTarget('');
      if (!dragging || dragging.from === target) return;
      moveStory.mutate({ story: dragging.story, sprintId: target === 'sprint' ? activeSprintId : null });
      setDragging(null);
    },
  });
  const endDrag = () => { setDragging(null); setDropTarget(''); };
  const scrollSteps = (dir) => stepsRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });

  const newSprintButton = (
    <PrimaryButton icon={Plus} onClick={openNewSprint} disabled={!validProjectId}>New Sprint</PrimaryButton>
  );

  return (
    <>
      {actionsSlot ? createPortal(newSprintButton, actionsSlot) : null}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="px-6 py-5 space-y-4">
          {/* Portfolio / program / project */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={portfolioId} onChange={v => { setPortfolioId(v); setProgramId(''); setProjectId(''); setSelectedSprintId(''); }}
              allLabel="All Portfolios" options={portfolios.map(p => ({ value: p.id, label: p.name }))} />
            <FilterSelect value={programId} onChange={v => { setProgramId(v); setProjectId(''); setSelectedSprintId(''); }}
              allLabel="All Programs" options={filteredPrograms.map(p => ({ value: p.id, label: p.name }))} />
            <FilterSelect value={projectId} onChange={v => { setProjectId(v); setSelectedSprintId(''); }}
              allLabel="Select a project" options={filteredProjects.map(p => ({ value: p.id, label: p.name }))} className="min-w-[200px]" />
            {!actionsSlot && <div className="ml-auto">{newSprintButton}</div>}
          </div>

          {!validProjectId && (
            <div className="text-center py-24 text-slate-400">
              <Zap className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium text-slate-500 mb-1">Select a project</p>
              <p className="text-sm text-slate-400">Choose a project above to plan its sprints and backlog.</p>
            </div>
          )}

          {validProjectId && loadingSprints && (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          )}

          {validProjectId && isSprintsError && (
            <div className="text-center py-20 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-sm mb-3">{sprintsError?.message || 'Unable to load sprints for this project.'}</p>
              <Button size="sm" variant="outline" onClick={() => retrySprints()}>Retry</Button>
            </div>
          )}

          {validProjectId && !loadingSprints && !isSprintsError && (
            <>
              {/* Sprint timeline */}
              {sprints.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-1">
                  <button type="button" onClick={() => scrollSteps(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex-shrink-0" aria-label="Earlier sprints">
                    <ChevronLeft className="w-4 h-4" style={{ color: NAVY }} />
                  </button>
                  <div ref={stepsRef} className="flex-1 flex items-center gap-1 overflow-x-auto scroll-smooth">
                    {sprints.map((sprint, i) => (
                      <SprintStep key={sprint.id} sprint={sprint} index={i} selected={sprint.id === activeSprintId}
                        onSelect={(s) => setSelectedSprintId(s.id)} />
                    ))}
                  </div>
                  <button type="button" onClick={() => scrollSteps(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex-shrink-0" aria-label="Later sprints">
                    <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-400">
                  <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm mb-3">No sprints yet for this project.</p>
                  <PrimaryButton icon={Plus} onClick={openNewSprint}>Create First Sprint</PrimaryButton>
                </div>
              )}

              {moveError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> <span>{moveError}</span>
                </div>
              )}

              {/* The selected sprint */}
              {activeSprint && (
                <div {...dropZoneProps('sprint')}
                  className={cn('bg-white rounded-xl border p-4 space-y-3 transition-colors', dropTarget === 'sprint' ? 'border-blue-400' : 'border-slate-200')}>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold" style={{ color: NAVY }}>{activeSprint.name}</h2>
                        <Pill tone={sprintStatus(activeSprint).tone}>{sprintStatus(activeSprint).label}</Pill>
                        <StarButton type="sprint" id={activeSprint.id} name={activeSprint.name} iconClassName="w-4 h-4" />
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {shortDate(activeSprint.start_date)} – {shortDate(activeSprint.end_date)}
                        {sprintTiming(activeSprint) && <span> · {sprintTiming(activeSprint)}</span>}
                      </p>
                      {activeSprint.goal && <p className="text-xs italic text-slate-400 mt-0.5">“{activeSprint.goal}”</p>}
                    </div>
                    <div className="flex items-center gap-6 ml-auto">
                      {[
                        { value: sprintStories.length, label: 'Stories' },
                        { value: storyPoints, label: 'Story Points' },
                        { value: activeSprint.capacity ?? '—', label: 'Capacity' },
                      ].map(m => (
                        <div key={m.label} className="text-center">
                          <p className="text-xl font-bold" style={{ color: NAVY }}>{m.value}</p>
                          <p className="text-xs text-slate-500">{m.label}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 w-48">
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: '#0BAA7A' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: NAVY }}>{progressPct}%</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="p-1.5 rounded hover:bg-slate-100" aria-label="Sprint actions"><MoreVertical className="w-4 h-4 text-slate-500" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingSprint(activeSprint); setSprintDialogOpen(true); }}>Edit sprint</DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportSprint} disabled={sprintStories.length === 0}>Export stories (CSV)</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {loadingBoard ? (
                    <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading stories...</div>
                  ) : isBoardError ? (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm mb-3">Unable to load this sprint’s stories.</p>
                      <Button size="sm" variant="outline" onClick={() => retryBoard()}>Retry</Button>
                    </div>
                  ) : (
                    <StoryTable
                      stories={sprintStories}
                      renderRaid={renderRaid}
                      renderRequirement={renderRequirement}
                      draggable={!moveStory.isPending}
                      onDragStart={(story) => setDragging({ story, from: 'sprint' })}
                      onDragEnd={endDrag}
                      statusFor={(s) => ({ label: s.status_label || 'No status', tone: TASK_STATUS_TONES[s.status_value?.toLowerCase()] || 'grey' })}
                      empty="No stories in this sprint yet."
                      actionsFor={(story) => (
                        <>
                          {columns.filter(c => c.status_id && c.status_id !== story.status_id).map(c => (
                            <DropdownMenuItem key={c.status_id} onClick={() => setStoryStatus.mutate({ story, statusId: c.status_id })}>
                              Mark as {c.label || c.title}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => moveStory.mutate({ story, sprintId: null })}>Move to backlog</DropdownMenuItem>
                        </>
                      )}
                    />
                  )}

                  <div className="rounded-lg border-2 border-dashed py-5 text-center transition-colors"
                    style={{ borderColor: dropTarget === 'sprint' ? '#2C80F4' : '#7DB2FE', backgroundColor: dropTarget === 'sprint' ? '#EAF3FF' : '#F5F9FF' }}>
                    <FilePlus2 className="w-5 h-5 mx-auto mb-1" style={{ color: '#2C80F4' }} />
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>Drag and drop user stories here</p>
                    <p className="text-xs text-slate-500">From the Product Backlog below</p>
                  </div>
                </div>
              )}

              {/* Product backlog */}
              <div {...dropZoneProps('backlog')}
                className={cn('bg-white rounded-xl border p-4 space-y-3 transition-colors', dropTarget === 'backlog' ? 'border-blue-400' : 'border-slate-200')}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold" style={{ color: NAVY }}>Product Backlog</h2>
                  <Pill tone="grey">{backlog.length} {backlog.length === 1 ? 'story' : 'stories'}</Pill>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <SearchInput value={backlogSearch} onChange={setBacklogSearch} placeholder="Search stories..." className="min-w-[220px]" />
                    <BacklogFilters filters={backlogFilters} onChange={setBacklogFilters} stories={backlog} />
                    <FilterSelect value={backlogPriority} onChange={setBacklogPriority} allLabel="Priority" options={PRIORITY_OPTIONS} />
                    <ColumnPicker columns={backlogColumns} onChange={setBacklogColumns} />
                  </div>
                </div>
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading backlog...</div>
                ) : (
                  <StoryTable
                    stories={shownBacklog}
                    renderRaid={renderRaid}
                    renderRequirement={renderRequirement}
                    columns={backlogColumns}
                    draggable={Boolean(activeSprintId) && !moveStory.isPending}
                    onDragStart={(story) => setDragging({ story, from: 'backlog' })}
                    onDragEnd={endDrag}
                    statusFor={() => ({ label: 'Backlog', tone: 'grey' })}
                    empty={backlog.length ? 'No stories match your search or filters.' : 'The backlog is empty. Work items without a sprint show up here.'}
                    actionsFor={(story) => (
                      <DropdownMenuItem disabled={!activeSprintId} onClick={() => moveStory.mutate({ story, sprintId: activeSprintId })}>
                        {activeSprint ? `Add to ${activeSprint.name}` : 'Create a sprint first'}
                      </DropdownMenuItem>
                    )}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <LinkedRaidPanel
        story={raidStory}
        records={raidStory ? raidRecordsFor(raidStory) : []}
        candidates={raidCandidates}
        busy={saveRelatedRecords.isPending}
        onClose={() => setRaidStoryId('')}
        onLink={linkRaid}
        onUnlink={unlinkRaid}
        onCreate={() => navigate('/RiskLog')}
      />

      <SprintSettingsDialog
        open={sprintDialogOpen}
        onOpenChange={setSprintDialogOpen}
        sprint={editingSprint}
        previousSprint={!editingSprint && sprints.length > 0 ? sprints[sprints.length - 1] : null}
        projectId={validProjectId}
        projects={filteredProjects}
        resources={resources}
        statusOptions={statusOptions}
        onSave={handleSaveSprint}
      />
    </>
  );
}
