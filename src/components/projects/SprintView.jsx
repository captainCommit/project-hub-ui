import React, { useState, useEffect } from 'react';
import { sprintsApi } from '@/api/sprints';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Plus, Settings, Zap, Loader2, List, Eye, EyeOff, Download, Package, AlertCircle, BookOpen, Check, Bug, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addDays, format } from 'date-fns';
import { formatDate } from '@/lib/dateUtils';
import DeliverySummary from '@/components/projects/DeliverySummary';
import StarButton from '@/components/projects/StarButton';

// --- Weekday utils ---
function getNonWorkingDays() {
  try { return JSON.parse(localStorage.getItem('app_nonworking_days') || '[0,6]'); } catch { return [0, 6]; }
}
function isNonWorking(d) { return getNonWorkingDays().includes(d.getDay()); }

function addWorkdays(dateStr, days) {
  let date = new Date(dateStr);
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
  let cur = new Date(startStr);
  const end = new Date(endStr);
  while (cur <= end) {
    if (!isNonWorking(cur)) count++;
    cur = addDays(cur, 1);
  }
  return count;
}

function nextWorkday(dateStr) {
  let d = addDays(new Date(dateStr), 1);
  while (isNonWorking(d)) d = addDays(d, 1);
  return format(d, 'yyyy-MM-dd');
}

// --- Constants ---
const STATUS_COLS = [
  { key: 'todo',      label: 'To Do',      color: 'bg-slate-100 text-slate-600' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { key: 'in_review', label: 'In Review',  color: 'bg-amber-100 text-amber-700' },
  { key: 'done',      label: 'Done',       color: 'bg-emerald-100 text-emerald-700' },
];

const TYPE_ICON = {
  story: { Icon: BookOpen, color: 'text-indigo-500 bg-indigo-50' },
  task:  { Icon: Check,    color: 'text-blue-500 bg-blue-50' },
  bug:   { Icon: Bug,      color: 'text-red-500 bg-red-50' },
  epic:  { Icon: Zap,      color: 'text-purple-500 bg-purple-50' },
};

const PRIORITY_DOT = { low: 'bg-slate-300', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-red-600' };

// --- Sprint settings dialog ---
function SprintSettingsDialog({ open, onOpenChange, sprint, previousSprint, projectId, projects, resources = [], statusOptions = [], onSave, onDelete }) {
  const defaultStart = previousSprint?.end_date ? nextWorkday(previousSprint.end_date) : format(new Date(), 'yyyy-MM-dd');
  const init = sprint || { name: '', goal: '', start_date: defaultStart, duration_weeks: 2, status: 'planning', project_id: projectId || '', resource_id: '' };
  const [form, setForm] = useState(init);

  useEffect(() => {
    if (open) {
      setForm(sprint || { name: '', goal: '', start_date: defaultStart, duration_weeks: 2, status: 'planning', project_id: projectId || '' });
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

// --- Story dialog ---
function StoryDialog({ open, onOpenChange, story, sprintId, projectId, onSave, onDelete }) {
  const empty = { title: '', description: '', acceptance_criteria: '', type: 'story', story_points: 1, assignee: '', priority: 'medium', status: 'backlog', sprint_id: '', project_id: projectId || '', estimated_hours: 0, actual_hours: 0 };
  const [form, setForm] = useState(story || empty);
  useEffect(() => { if (open) setForm(story || { ...empty, project_id: projectId || '' }); }, [open, story?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{story ? 'Edit Story' : 'New Story / Task'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500 font-medium">Type</label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['story','task','bug','epic'].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><label className="text-xs text-slate-500 font-medium">Priority</label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <div><label className="text-xs text-slate-500 font-medium">Title *</label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="As a user, I want to..." className="mt-1" /></div>
          <div><label className="text-xs text-slate-500 font-medium">Description</label>
            <Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 text-sm" /></div>
          <div><label className="text-xs text-slate-500 font-medium">Acceptance Criteria</label>
            <Textarea value={form.acceptance_criteria || ''} onChange={e => setForm(p => ({ ...p, acceptance_criteria: e.target.value }))} placeholder="Given... When... Then..." rows={2} className="mt-1 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500 font-medium">Story Points</label>
              <Input type="number" min={0} value={form.story_points} onChange={e => setForm(p => ({ ...p, story_points: Number(e.target.value) }))} className="mt-1" /></div>
            <div><label className="text-xs text-slate-500 font-medium">Assignee</label>
              <Input value={form.assignee || ''} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500 font-medium">Estimated Hours</label>
              <Input type="number" min={0} value={form.estimated_hours ?? 0} onChange={e => setForm(p => ({ ...p, estimated_hours: Number(e.target.value) }))} className="mt-1" /></div>
            <div><label className="text-xs text-slate-500 font-medium">Actual Hours</label>
              <Input type="number" min={0} value={form.actual_hours ?? 0} onChange={e => setForm(p => ({ ...p, actual_hours: Number(e.target.value) }))} className="mt-1" /></div>
          </div>
        </div>
        <div className="flex justify-between pt-2">
          {story && onDelete ? <Button variant="outline" className="text-red-500" onClick={() => { onDelete(story.id); onOpenChange(false); }}>Delete</Button> : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { if (form.title) { onSave(form); onOpenChange(false); } }} className="bg-indigo-600 hover:bg-indigo-700">{story ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Backlog picker dialog ---
function BacklogPickerDialog({ open, onOpenChange, backlogStories, sprintId, onAssign }) {
  const [selected, setSelected] = useState([]);
  useEffect(() => { if (open) setSelected([]); }, [open]);
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Stories from Backlog</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
          {backlogStories.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Backlog is empty.</p>}
          {backlogStories.map(story => {
            const ti = TYPE_ICON[story.type] || TYPE_ICON.story;
            const TIcon = ti.Icon;
            return (
              <button key={story.id} onClick={() => toggle(story.id)} className={cn('w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors', selected.includes(story.id) && 'bg-indigo-50')}>
                <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', ti.color)}>
                  <TIcon className="w-3 h-3" />
                </div>
                <span className="flex-1 text-sm text-slate-700 truncate">{story.title}</span>
                <span className="text-xs text-slate-400">{story.story_points} pts</span>
                {selected.includes(story.id) && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-slate-500">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { onAssign(selected); onOpenChange(false); }} disabled={selected.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              Add to Sprint
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Story card for board ---
function StoryCard({ story, onClick, readOnly = false, draggable = false, onDragStart, onDragEnd }) {
  const ti = TYPE_ICON[story.type] || TYPE_ICON.story;
  const Icon = ti.Icon;
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={readOnly || !onClick ? undefined : () => onClick(story)}
      className={cn(
        'bg-white rounded-lg border border-slate-200 p-3 transition-all select-none',
        draggable ? 'cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-indigo-200' : readOnly ? 'cursor-default' : 'hover:shadow-sm hover:border-indigo-200 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5', ti.color)}><Icon className="w-3 h-3" /></span>
        <p className="text-xs text-slate-800 font-medium leading-snug flex-1">{story.title}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[story.priority] || 'bg-slate-300')} />
          {story.story_points > 0 && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{story.story_points}p</span>}
        </div>
        {story.assignee && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{story.assignee}</span>}
      </div>
    </div>
  );
}

// --- Main SprintView ---
export default function SprintView({ projects, programs = [], portfolios = [], resources = [], initialTab, hideTabs, initialProjectId, focusSprintId, onOpenSprint }) {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [mainTab, setMainTab] = useState(initialTab || 'overview');
  const [viewMode, setViewMode] = useState('list');
  const [activeSprintSummary, setActiveSprintSummary] = useState(null);
  const [requestedFocusSprintId, setRequestedFocusSprintId] = useState(focusSprintId || '');
  const DEFAULT_LEGEND = [
    { pts: 1,  label: '< 2 hrs' },
    { pts: 2,  label: '½ day' },
    { pts: 3,  label: '< 2 days' },
    { pts: 5,  label: '3-4 days' },
    { pts: 8,  label: '4-5 days' },
    { pts: 13, label: '> 5 days' },
  ];
  const [spLegend, setSpLegend] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sp_legend') || 'null');
      if (saved) return saved.map(item => ({ ...item, label: item.label.replace(/\s*⚠️.*?(splitting)?/gi, '').trim() }));
    } catch {}
    return DEFAULT_LEGEND;
  });
  const saveLegend = (updated) => { setSpLegend(updated); localStorage.setItem('sp_legend', JSON.stringify(updated)); };
  const [showLegend, setShowLegend] = useState(() => localStorage.getItem('sp_legend_visible') !== 'false');
  const toggleLegend = () => { const v = !showLegend; setShowLegend(v); localStorage.setItem('sp_legend_visible', String(v)); };
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const validProjectId = selectedProjectId && projects.some(project => project.id === selectedProjectId) ? selectedProjectId : '';
  const [draggedBoardTaskId, setDraggedBoardTaskId] = useState('');
  const [dragOverBoardColumnKey, setDragOverBoardColumnKey] = useState('');
  const [boardMoveError, setBoardMoveError] = useState('');

  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (focusSprintId) setRequestedFocusSprintId(focusSprintId);
  }, [focusSprintId]);

  const {
    data: allSprints = [],
    isLoading: loadingSprints,
    isError: isSprintsError,
    error: sprintsError,
    refetch: retrySprints,
  } = useQuery({
    queryKey: ['project-sprints', validProjectId],
    queryFn: () => sprintsApi.list(validProjectId),
    enabled: mainTab === 'sprints' && Boolean(validProjectId),
  });

  const activeSprintId = activeSprintSummary?.id || '';

  const {
    data: sprintDetail,
    isLoading: loadingSprintDetail,
    isError: isSprintDetailError,
    error: sprintDetailError,
    refetch: retrySprintDetail,
  } = useQuery({
    queryKey: ['sprint-detail', activeSprintId],
    queryFn: () => sprintsApi.get(activeSprintId),
    enabled: mainTab === 'sprints' && Boolean(activeSprintId),
  });

  const {
    data: sprintMetrics = {},
    isLoading: loadingSprintMetrics,
    isError: isSprintMetricsError,
    error: sprintMetricsError,
    refetch: retrySprintMetrics,
  } = useQuery({
    queryKey: ['sprint-metrics', activeSprintId],
    queryFn: () => sprintsApi.getMetrics(activeSprintId),
    enabled: mainTab === 'sprints' && Boolean(activeSprintId),
  });

  const {
    data: sprintBoard = { columns: [] },
    isLoading: loadingSprintBoard,
    isError: isSprintBoardError,
    error: sprintBoardError,
    refetch: retrySprintBoard,
  } = useQuery({
    queryKey: ['sprint-board', activeSprintId],
    queryFn: () => sprintsApi.getBoard(activeSprintId),
    enabled: mainTab === 'sprints' && viewMode === 'board' && Boolean(activeSprintId),
  });


  const invalidateSprintData = (projectId, sprintId) => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
    }
    if (sprintId) {
      queryClient.invalidateQueries({ queryKey: ['sprint-detail', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-metrics', sprintId] });
    }
    if (selectedAccountId) {
      queryClient.invalidateQueries({ queryKey: ['account-delivery-overview', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-programs-projects', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-sidebar', selectedAccountId] });
    }
  };

  const invalidateSprintBoardMoveData = (projectId, sprintId) => {
    if (sprintId) {
      queryClient.invalidateQueries({ queryKey: ['sprint-board', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-detail', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-metrics', sprintId] });
    }
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
    }
  };

  const getBoardColumnKey = (column, index) => String(column.id || column.status_id || column.value || index);

  const moveBoardTask = (board, taskId, targetColumnKey, targetStatusId, targetSortOrder, sprintId) => {
    let movedTask = null;
    const withoutMovedTask = (board?.columns || []).map((column, columnIndex) => {
      const columnKey = getBoardColumnKey(column, columnIndex);
      const tasks = (column.tasks || []).filter((task) => {
        if (task.id === taskId) {
          movedTask = { ...task, status_id: targetStatusId, sprint_id: sprintId, sort_order: targetSortOrder };
          return false;
        }
        return true;
      });

      return { ...column, tasks };
    });

    if (!movedTask) return board;

    return {
      ...board,
      columns: withoutMovedTask.map((column, columnIndex) => {
        const columnKey = getBoardColumnKey(column, columnIndex);
        if (columnKey !== targetColumnKey) return column;

        const tasks = [...(column.tasks || [])];
        const insertAt = Math.max(0, Math.min(targetSortOrder, tasks.length));
        tasks.splice(insertAt, 0, movedTask);

        return {
          ...column,
          tasks: tasks.map((task, taskIndex) => ({ ...task, sort_order: taskIndex })),
        };
      }),
    };
  };

  const createSprint = useMutation({
    mutationFn: ({ projectId, data }) => sprintsApi.create(projectId, data),
    onSuccess: (created, variables) => {
      const projectId = created?.project_id || variables.projectId;
      invalidateSprintData(projectId, created?.id);
      setSelectedProjectId(projectId);
      setActiveSprintSummary(created);
    },
  });
  const updateSprint = useMutation({
    mutationFn: ({ id, data }) => sprintsApi.update(id, data),
    onSuccess: (updated) => {
      invalidateSprintData(updated?.project_id || selectedProjectId, updated?.id);
      setActiveSprintSummary(prev => prev?.id === updated?.id ? { ...prev, ...updated } : prev);
    },
  });

  const moveBoardTaskMutation = useMutation({
    mutationFn: ({ taskId, status_id, sort_order, sprint_id }) =>
      sprintsApi.updateTaskBoardPosition(taskId, { status_id, sort_order, sprint_id }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['sprint-board', variables.sprint_id] });
      const previousBoard = queryClient.getQueryData(['sprint-board', variables.sprint_id]) || sprintBoard;
      queryClient.setQueryData(['sprint-board', variables.sprint_id], (currentBoard) =>
        moveBoardTask(currentBoard || previousBoard, variables.taskId, variables.targetColumnKey, variables.status_id, variables.sort_order, variables.sprint_id)
      );
      setBoardMoveError('');
      return { previousBoard };
    },
    onError: (_error, variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['sprint-board', variables.sprint_id], context.previousBoard);
      }
      setBoardMoveError('We couldn’t move that card. Your Sprint Board has been restored. Please try again.');
    },
    onSuccess: (_updatedTask, variables) => {
      setBoardMoveError('');
      invalidateSprintBoardMoveData(validProjectId, variables.sprint_id);
    },
    onSettled: () => {
      setDraggedBoardTaskId('');
      setDragOverBoardColumnKey('');
    },
  });

  // Filter programs by selected portfolio
  const filteredPrograms = selectedPortfolioId ? programs.filter(p => p.portfolio_id === selectedPortfolioId) : programs;
  // Filter projects by selected program (and portfolio)
  const filteredProjects = selectedProgramId
    ? projects.filter(p => p.program_id === selectedProgramId)
    : selectedPortfolioId
      ? projects.filter(p => filteredPrograms.some(pg => pg.id === p.program_id) || p.portfolio_id === selectedPortfolioId)
      : projects;

  const statusOptions = Array.from(
    new Map(
      [...allSprints, sprintDetail, activeSprintSummary]
        .filter(Boolean)
        .map(sprint => sprint.status_summary || (sprint.status_id && sprint.status ? { id: sprint.status_id, value: sprint.status, label: sprint.status_label || sprint.status } : null))
        .filter(Boolean)
        .map(status => [status.value, status])
    ).values()
  );

  // Sprints are loaded only after a concrete project is selected.
  const sprints = (validProjectId ? allSprints : [])
    .sort((a, b) => {
      const na = parseInt(a.name?.replace(/\D/g, '') || '0');
      const nb = parseInt(b.name?.replace(/\D/g, '') || '0');
      return na - nb;
    });

  useEffect(() => {
    if (!validProjectId) {
      setActiveSprintSummary(null);
      return;
    }
    if (loadingSprints || isSprintsError) return;
    if (sprints.length === 0) {
      setActiveSprintSummary(null);
      return;
    }
    if (requestedFocusSprintId) {
      const focused = sprints.find(s => s.id === requestedFocusSprintId);
      if (focused) {
        setActiveSprintSummary(focused);
        setRequestedFocusSprintId('');
      } else {
        setActiveSprintSummary(null);
      }
      return;
    }
    if (!activeSprintSummary || !sprints.find(s => s.id === activeSprintSummary.id)) {
      const active = sprints.find(s => s.status === 'active') || sprints[0];
      setActiveSprintSummary(active);
    }
  }, [sprints.length, validProjectId, requestedFocusSprintId, loadingSprints, isSprintsError, activeSprintSummary?.id]);

  const handleSaveSprint = (data) => {
    const projectId = data.project_id || validProjectId;
    if (!projectId || !projects.some(project => project.id === projectId)) return;
    if (editingSprint) {
      updateSprint.mutate({ id: editingSprint.id, data });
    } else {
      createSprint.mutate({ projectId, data: { ...data, project_id: projectId } });
    }
    setEditingSprint(null);
  };

  const handleExportSprintReport = () => {
    const projectName = filteredProjects.find(p => p.id === selectedProjectId)?.name || 'project';
    const rows = [['Sprint', 'Goal', 'Start Date', 'End Date', 'Status', 'Stories', 'Story Points']];
    sprints.forEach(s => {
      rows.push([s.name, s.goal || '—', s.start_date || '—', s.end_date || '—', s.status || '—', s.story_count ?? '—', s.story_points ?? '—']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${projectName.replace(/\s+/g, '_')}_sprints_report.csv` });
    a.click();
  };

  const activeSprint = activeSprintId ? { ...activeSprintSummary, ...(sprintDetail || {}) } : null;
  const previousSprint = sprints.length > 0 ? [...sprints].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0] : null;

  const storyCount = sprintMetrics.story_count ?? sprintMetrics.total_tasks ?? activeSprint?.story_count;
  const completedCount = sprintMetrics.completed_count ?? activeSprint?.completed_count;
  const totalPts = sprintMetrics.story_points ?? sprintMetrics.total_story_points ?? activeSprint?.story_points;
  const donePts = sprintMetrics.completed_story_points ?? activeSprint?.completed_story_points;
  const progressPct = sprintMetrics.progress ?? sprintMetrics.completion_percent ?? activeSprint?.progress;
  const daysLeft = sprintMetrics.remaining_days ?? sprintMetrics.days_remaining ?? activeSprint?.remaining_days ?? null;
  const hasDetailError = isSprintDetailError || isSprintMetricsError;
  const isLoadingActiveSprintData = Boolean(activeSprintId) && (loadingSprintDetail || loadingSprintMetrics);
  const boardColumns = sprintBoard?.columns || [];
  const boardTaskCount = boardColumns.reduce((sum, column) => sum + (column.tasks?.length || 0), 0);
  const canDragSprintBoardCards = mainTab === 'sprints' && viewMode === 'board' && Boolean(activeSprintId);
  const boardColumnColor = (column) => {
    const statusColor = STATUS_COLS.find(status => status.key === column.value)?.color;
    if (typeof column.color === 'string' && column.color.includes('bg-')) return column.color;
    return statusColor || 'bg-slate-100 text-slate-600';
  };
  const handleBoardCardDragStart = (event, taskId) => {
    if (!canDragSprintBoardCards) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
    setDraggedBoardTaskId(taskId);
  };
  const handleBoardColumnDrop = (event, column, columnIndex) => {
    event.preventDefault();
    if (!canDragSprintBoardCards || !activeSprintId) return;

    const taskId = event.dataTransfer.getData('text/plain') || draggedBoardTaskId;
    const targetStatusId = column.status_id;
    if (!taskId || !targetStatusId) {
      setBoardMoveError('This board column is missing a status. Please refresh and try again.');
      setDraggedBoardTaskId('');
      setDragOverBoardColumnKey('');
      return;
    }

    const existingTaskIds = (column.tasks || []).map(task => task.id);
    const currentIndexInTarget = existingTaskIds.indexOf(taskId);
    const sortOrder = currentIndexInTarget >= 0 ? currentIndexInTarget : existingTaskIds.length;

    moveBoardTaskMutation.mutate({
      taskId,
      status_id: targetStatusId,
      sort_order: sortOrder,
      sprint_id: activeSprintId,
      targetColumnKey: getBoardColumnKey(column, columnIndex),
    });
  };
  const handleBoardColumnDragOver = (event, column, columnIndex) => {
    if (!canDragSprintBoardCards || !draggedBoardTaskId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverBoardColumnKey(getBoardColumnKey(column, columnIndex));
  };
  const retrySprintData = () => {
    if (isSprintDetailError) retrySprintDetail();
    if (isSprintMetricsError) retrySprintMetrics();
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top-level tabs */}
        {!hideTabs && (
        <div className="flex items-center gap-1 border-b-2 border-slate-200 bg-white px-0">
          <button onClick={() => setMainTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', mainTab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Package className="w-4 h-4" /> Sprint Overview
          </button>
          <button onClick={() => setMainTab('sprints')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', mainTab === 'sprints' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Zap className="w-4 h-4" /> Sprints
          </button>
        </div>
        )}
        {mainTab === 'overview' ? (
          <DeliverySummary projects={projects} programs={programs} portfolios={portfolios} onNavigateToSprints={() => setMainTab('sprints')} onOpenSprint={onOpenSprint} />
        ) : (
        <>
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">Sprints</h1>
              {portfolios.length > 0 && (
                <Select value={selectedPortfolioId} onValueChange={v => { setSelectedPortfolioId(v); setSelectedProgramId(''); setSelectedProjectId(''); setActiveSprintSummary(null); }}>
                  <SelectTrigger className="h-7 text-xs w-36 border-slate-200"><SelectValue placeholder="All Portfolios" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Portfolios</SelectItem>
                    {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {filteredPrograms.length > 0 && (
                <Select value={selectedProgramId} onValueChange={v => { setSelectedProgramId(v); setSelectedProjectId(''); setActiveSprintSummary(null); }}>
                  <SelectTrigger className="h-7 text-xs w-36 border-slate-200"><SelectValue placeholder="All Programs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Programs</SelectItem>
                    {filteredPrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedProjectId} onValueChange={v => { setSelectedProjectId(v); setActiveSprintSummary(null); }}>
                <SelectTrigger className="h-7 text-xs w-44 border-slate-200"><SelectValue placeholder="[Select Project]" /></SelectTrigger>
                <SelectContent>
                  {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('board')} className={cn('p-2 transition-colors', viewMode === 'board' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-400 hover:bg-slate-50')} title="Sprint board view">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setViewMode('list')} className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-400 hover:bg-slate-50')} title="Sprint list view">
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!validProjectId || sprints.length === 0} onClick={handleExportSprintReport}>
                <Download className="w-3.5 h-3.5 mr-1" /> Report
              </Button>
              <Button size="sm" className="h-8 text-xs bg-[#c87b14] hover:bg-[#a86610]" disabled={!validProjectId} onClick={() => { setEditingSprint(null); setSprintDialogOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New Sprint
              </Button>
            </div>
          </div>

          {/* Sprint tabs */}
          {sprints.length > 0 && (
            <div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {sprints.map(sprint => (
                  <div key={sprint.id} className="flex items-center">
                    <button onClick={() => { setRequestedFocusSprintId(''); setActiveSprintSummary(sprint); }}
                      className={cn('px-3 py-1.5 text-xs font-medium rounded-l-md whitespace-nowrap transition-colors flex items-center gap-1.5',
                        activeSprint?.id === sprint.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100')}>
                      {sprint.name}
                    </button>
                    <StarButton type="sprint" id={sprint.id} name={sprint.name} className="rounded-r-md" />
                  </div>
                ))}
              </div>
              {activeSprint && (
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                  {activeSprint.sprint_id && <span className="font-mono text-slate-500">{activeSprint.sprint_id}</span>}
                  <span className="font-semibold text-slate-800">{activeSprint.name}</span>
                  {activeSprint.status && activeSprint.status !== 'planning' && (
                    <span className={cn('px-2 py-0.5 rounded-full font-medium', activeSprint.status === 'active' ? 'bg-emerald-100 text-emerald-700' : activeSprint.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700')}>{activeSprint.status}</span>
                  )}
                  {activeSprint.start_date && <span>{formatDate(activeSprint.start_date)} – {activeSprint.end_date ? formatDate(activeSprint.end_date) : '?'}</span>}
                  {daysLeft !== null && activeSprint.status === 'active' && <span className={cn('font-medium', daysLeft <= 2 ? 'text-red-600' : 'text-slate-600')}>{daysLeft}d remaining</span>}
                  {totalPts !== undefined && <span>{donePts ?? 0}/{totalPts} pts{progressPct !== undefined ? ` · ${progressPct}%` : ''}</span>}
                  {activeSprint.goal && <span className="italic text-slate-400">"{activeSprint.goal}"</span>}
                  {activeSprint.resource_id && (() => { const res = resources.find(r => r.id === activeSprint.resource_id); return res ? <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-medium">👤 {res.full_name}</span> : null; })()}
                  {progressPct !== undefined && <div className="h-1.5 bg-slate-100 rounded-full w-32 overflow-hidden inline-block"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} /></div>}
                  <button onClick={() => { setEditingSprint(activeSprint); setSprintDialogOpen(true); }} className="flex items-center gap-1 text-slate-400 hover:text-slate-600"><Settings className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Story Points Legend */}
        <div className="border-b border-slate-100 bg-white px-5 py-2">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Story Pts Legend</p>
            <button onClick={toggleLegend} className="text-slate-300 hover:text-slate-500 transition-colors">
              {showLegend ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
          {showLegend && (
          <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px] w-fit">
            <table className="border-collapse">
              <tbody>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {spLegend.map((item) => (
                    <td key={`pt-${item.pts}`} className="px-3 py-1 border-r border-slate-100 last:border-r-0 text-center">
                      <span className="font-bold" style={{ color: '#002046' }}>{item.pts}</span>
                      {(item.pts === 8 || item.pts === 13) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-0.5 text-amber-500 cursor-help text-xs leading-none">⚠️</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Consider splitting this story</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="bg-white">
                  {spLegend.map((item, i) => (
                    <td key={`lbl-${item.pts}`} className="px-3 py-1 border-r border-slate-100 last:border-r-0">
                      <input
                        className="text-slate-500 bg-transparent border-none outline-none w-24 text-center text-[10px]"
                        value={item.label}
                        onChange={e => { const updated = spLegend.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x); saveLegend(updated); }}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-5 space-y-5">
          {loadingSprints && <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>}

          {!loadingSprints && !validProjectId && (
            <div className="text-center py-24 text-slate-400">
              <Zap className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium text-slate-500 mb-1">{selectedProjectId ? 'Select a valid project' : 'Select a program and project'}</p>
              <p className="text-sm text-slate-400">Use the dropdowns above to view and manage sprints.</p>
            </div>
          )}

          {!loadingSprints && validProjectId && isSprintsError && (
            <div className="text-center py-20 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-sm mb-3">{sprintsError?.message || 'Unable to load sprints for this project.'}</p>
              <Button size="sm" variant="outline" onClick={() => retrySprints()}>Retry</Button>
            </div>
          )}

          {!loadingSprints && validProjectId && !isSprintsError && sprints.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-3">No sprints yet for this project.</p>
              <Button size="sm" className="bg-[#c87b14] hover:bg-[#a86610]" onClick={() => { setEditingSprint(null); setSprintDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Create First Sprint
              </Button>
            </div>
          )}

          {!loadingSprints && validProjectId && !isSprintsError && sprints.length > 0 && !activeSprintId && (
            <div className="text-center py-20 text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-400" />
              <p className="text-sm">{requestedFocusSprintId ? 'The requested sprint was not found for the selected project.' : viewMode === 'board' ? 'Select a sprint to view its board.' : 'Select a valid sprint to view details.'}</p>
            </div>
          )}

          {viewMode === 'list' && isLoadingActiveSprintData && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
              <span className="text-sm">Loading sprint details...</span>
            </div>
          )}

          {viewMode === 'list' && activeSprintId && hasDetailError && (
            <div className="text-center py-20 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-sm mb-3">{sprintDetailError?.message || sprintMetricsError?.message || 'Unable to load the selected sprint.'}</p>
              <Button size="sm" variant="outline" onClick={retrySprintData}>Retry</Button>
            </div>
          )}

          {activeSprint && viewMode === 'board' && (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs text-slate-400 border-slate-200 cursor-not-allowed" disabled title="Sprint Board is read-only">
                  <Plus className="w-3 h-3 mr-1" /> Add Story
                </Button>
              </div>

              {loadingSprintBoard && (
                <div className="flex items-center justify-center py-20 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
                  <span className="text-sm">Loading sprint board...</span>
                </div>
              )}

              {!loadingSprintBoard && isSprintBoardError && (
                <div className="text-center py-20 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                  <p className="text-sm mb-3">{sprintBoardError?.message || 'Unable to load the sprint board.'}</p>
                  <Button size="sm" variant="outline" onClick={() => retrySprintBoard()}>Retry</Button>
                </div>
              )}

              {!loadingSprintBoard && !isSprintBoardError && boardColumns.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                  <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No Sprint Board columns are available for this sprint.</p>
                </div>
              )}

              {!loadingSprintBoard && !isSprintBoardError && boardColumns.length > 0 && (
                <>
                  {boardMoveError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{boardMoveError}</span>
                    </div>
                  )}
                  {boardTaskCount === 0 && (
                    <div className="text-center py-4 text-slate-400">
                      <p className="text-sm">No tasks are currently on this Sprint Board.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {boardColumns.map((column, columnIndex) => {
                      const columnKey = getBoardColumnKey(column, columnIndex);
                      return (
                      <div key={column.id || column.status_id || column.value || columnIndex} className="flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', boardColumnColor(column))}>{column.label || column.title || 'Untitled'}</span>
                          <span className="text-xs text-slate-400">{column.tasks?.length || 0}</span>
                        </div>
                        <div
                          onDragOver={(event) => handleBoardColumnDragOver(event, column, columnIndex)}
                          onDragLeave={() => setDragOverBoardColumnKey('')}
                          onDrop={(event) => handleBoardColumnDrop(event, column, columnIndex)}
                          className={cn(
                            'flex flex-col gap-2 min-h-[120px] rounded-xl p-2 border transition-colors bg-slate-50/60 border-slate-100',
                            canDragSprintBoardCards && draggedBoardTaskId && dragOverBoardColumnKey === columnKey && 'bg-indigo-50/60 border-indigo-200'
                          )}
                        >
                          {(column.tasks || []).length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-6">No cards</p>
                          )}
                          {(column.tasks || []).map((story) => (
                            <StoryCard
                              key={story.id}
                              story={story}
                              readOnly
                              draggable={canDragSprintBoardCards && Boolean(story.id) && !moveBoardTaskMutation.isPending}
                              onDragStart={(event) => handleBoardCardDragStart(event, story.id)}
                              onDragEnd={() => {
                                setDraggedBoardTaskId('');
                                setDragOverBoardColumnKey('');
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );})}
                  </div>
                </>
              )}
            </>
          )}

          {activeSprint && viewMode === 'list' && !isLoadingActiveSprintData && !hasDetailError && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Sprint', 'Status', 'Dates', 'Stories', 'Story Points', 'Progress', 'Remaining'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{activeSprint.name}</p>
                      {activeSprint.goal && <p className="text-xs text-slate-400 italic mt-0.5">"{activeSprint.goal}"</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{activeSprint.status || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{activeSprint.start_date ? formatDate(activeSprint.start_date) : '—'} → {activeSprint.end_date ? formatDate(activeSprint.end_date) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{completedCount ?? '—'}/{storyCount ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{donePts ?? '—'}/{totalPts ?? '—'} pts</td>
                    <td className="px-4 py-3">
                      {progressPct !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 bg-slate-100 rounded-full w-24 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} /></div>
                          <span className="text-xs text-slate-500">{progressPct}%</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{daysLeft !== null && daysLeft !== undefined ? `${daysLeft}d` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}
      </div>

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