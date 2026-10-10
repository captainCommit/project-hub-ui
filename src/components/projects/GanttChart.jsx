// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { format, differenceInDays, addDays, startOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWeekend, isSameDay, isSameMonth, getWeekOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Zap, Diamond, Circle, Package, Layers, Flag, Filter } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ExportMenu from './ExportMenu';

const taskTypeIcons = { milestone: Diamond, activity: Circle, deliverable: Package, work_package: Layers, phase: Flag };
const taskTypeColors = { milestone: 'text-purple-600', activity: 'text-blue-600', deliverable: 'text-green-600', work_package: 'text-orange-600', phase: 'text-cyan-600' };
const ALL_TASK_TYPES = ['phase', 'activity', 'milestone', 'deliverable', 'work_package'];
const TASK_TYPE_LABELS = { phase: 'Phase', activity: 'Activity', milestone: 'Milestone', deliverable: 'Deliverable', work_package: 'Work Package' };

const COL_WIDTH = { day: 38, week: 64, month: 90 };
const TASK_NAME_COL_W = 288; // px, frozen column width
const API_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseApiDate = (value) => {
  if (typeof value !== 'string' || !API_DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, 'yyyy-MM-dd') === value ? date : null;
};

const formatApiDate = (date) => format(date, 'yyyy-MM-dd');

export default function GanttChart({
  tasks,
  project,
  onTaskClick,
  onTaskUpdate,
  expandedTasks,
  onToggleExpand,
  enableScheduleEditing = false,
  pendingTaskIds = {},
  onTaskScheduleChange,
  enableDependencyEditing = false,
  dependencyPendingTaskIds = {},
  onAddDependency,
  onRemoveDependency,
}) {
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [viewScale, setViewScale] = useState('day');
  const [visibleTypes, setVisibleTypes] = useState(new Set(ALL_TASK_TYPES));
  const [tooltip, setTooltip] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const todayRef = useRef(null);
  const scrollRef = useRef(null);
  const today = useMemo(() => new Date(), []);

  // Build columns — start far enough back to show all tasks
  const { startDate, columns } = useMemo(() => {
    const earliestTaskDate = tasks.reduce((min, t) => {
      if (t.start_date) { const d = new Date(t.start_date); return d < min ? d : min; }
      return min;
    }, today);
    const start = startOfWeek(addDays(earliestTaskDate, -14));
    const projectEnd = project?.end_date ? new Date(project.end_date) : addDays(today, 90);
    const latestTaskDate = tasks.reduce((max, t) => {
      if (t.due_date) { const d = new Date(t.due_date); return d > max ? d : max; }
      return max;
    }, projectEnd);
    const end = addDays(latestTaskDate, 30);

    let cols = [];
    if (viewScale === 'day') {
      cols = eachDayOfInterval({ start, end }).map(d => ({ date: d, key: d.toISOString() }));
    } else if (viewScale === 'week') {
      cols = eachWeekOfInterval({ start, end }).map(d => ({ date: d, key: d.toISOString() }));
    } else {
      cols = eachMonthOfInterval({ start, end }).map(d => ({ date: d, key: d.toISOString() }));
    }
    return { startDate: start, columns: cols };
  }, [project, viewScale, today, tasks]);

  // Scroll so today is visible (centered-ish) on mount/scale change
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const offset = todayRef.current.offsetLeft - 160;
      scrollRef.current.scrollLeft = Math.max(0, offset);
    }
  }, [columns]);

  const criticalPath = useMemo(() => {
    if (!showCriticalPath || tasks.length === 0) return new Set();
    const getDur = t => (t.start_date && t.due_date) ? differenceInDays(new Date(t.due_date), new Date(t.start_date)) + 1 : (t.duration || 1);
    const max = Math.max(...tasks.map(getDur));
    return new Set(tasks.filter(t => getDur(t) === max).map(t => t.id));
  }, [tasks, showCriticalPath]);

  const getColIndex = (date) => {
    if (viewScale === 'day') return differenceInDays(date, startDate);
    if (viewScale === 'week') {
      const ws = startOfWeek(date);
      return columns.findIndex(c => isSameDay(c.date, ws));
    }
    return columns.findIndex(c => isSameMonth(c.date, date));
  };

  const getTaskPosition = (task) => {
    if (!task.start_date && !task.due_date) return null;
    const taskStart = new Date(task.start_date || task.due_date);
    const taskEnd = new Date(task.due_date || task.start_date);
    const left = Math.max(0, getColIndex(taskStart));
    const endCol = getColIndex(taskEnd);
    return { left, width: Math.max(1, endCol - left + 1) };
  };

  const todayColIndex = useMemo(() => getColIndex(today), [columns, viewScale]);
  const cw = COL_WIDTH[viewScale];
  const daysPerColumn = viewScale === 'week' ? 7 : viewScale === 'month' ? 30 : 1;

  const getPreviewTask = (task) => dragPreview?.taskId === task.id
    ? {
      ...task,
      start_date: dragPreview.start_date,
      finish_date: dragPreview.finish_date,
      due_date: dragPreview.finish_date,
      end_date: dragPreview.finish_date,
    }
    : task;

  const isTaskScheduleEditable = (task) => {
    if (!enableScheduleEditing || typeof onTaskScheduleChange !== 'function') return false;
    if (pendingTaskIds?.[task.id]) return false;
    return Boolean(parseApiDate(task.start_date) && parseApiDate(task.finish_date || task.due_date));
  };

  const getNextScheduleDates = (task, mode, deltaColumns) => {
    const start = parseApiDate(task.start_date);
    const finish = parseApiDate(task.finish_date || task.due_date);
    if (!start || !finish) return null;

    const deltaDays = deltaColumns * daysPerColumn;
    const spanDays = differenceInDays(finish, start);
    let nextStart = start;
    let nextFinish = finish;

    if (mode === 'move') {
      nextStart = addDays(start, deltaDays);
      nextFinish = addDays(nextStart, spanDays);
    } else if (mode === 'resize-start') {
      nextStart = addDays(start, deltaDays);
    } else if (mode === 'resize-finish') {
      nextFinish = addDays(finish, deltaDays);
    }

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextFinish.getTime())) return null;
    if (nextStart > nextFinish) return null;

    return {
      start_date: formatApiDate(nextStart),
      finish_date: formatApiDate(nextFinish),
    };
  };

  const handleSchedulePointerDown = (event, task, mode) => {
    if (!isTaskScheduleEditable(task)) return;

    event.preventDefault();
    event.stopPropagation();
    setTooltip(null);

    const startClientX = event.clientX;
    let latestDates = {
      start_date: task.start_date,
      finish_date: task.finish_date || task.due_date,
    };
    let latestDeltaColumns = 0;

    const handleMouseMove = (moveEvent) => {
      const nextDeltaColumns = Math.round((moveEvent.clientX - startClientX) / cw);
      if (nextDeltaColumns === latestDeltaColumns) return;
      latestDeltaColumns = nextDeltaColumns;

      const nextDates = getNextScheduleDates(task, mode, nextDeltaColumns);
      if (!nextDates) return;

      latestDates = nextDates;
      setDragPreview({ taskId: task.id, ...nextDates });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setDragPreview(null);

      if (
        latestDates.start_date === task.start_date &&
        latestDates.finish_date === (task.finish_date || task.due_date)
      ) {
        return;
      }

      onTaskScheduleChange(task.id, latestDates);
    };

    setDragPreview({ taskId: task.id, ...latestDates });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Group header: for day/week → month+year; for month → year
  const topGroups = useMemo(() => {
    const groups = [];
    columns.forEach((col, i) => {
      const key = viewScale === 'month' ? format(col.date, 'yyyy') : format(col.date, 'MMM yyyy');
      if (!groups.length || groups[groups.length - 1].label !== key) {
        groups.push({ label: key, count: 1 });
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [columns, viewScale]);

  // Column sub-label
  const colLabel = (col, i) => {
    if (viewScale === 'day') return format(col.date, 'd');
    if (viewScale === 'week') {
      const wom = getWeekOfMonth(col.date, { weekStartsOn: 0 });
      if (wom === 1) return `${format(col.date, 'MMM')} W1`;
      return `W${wom}`;
    }
    // month scale: show "MMM W1" for first col of each month
    return `${format(col.date, 'MMM')} W1`;
  };

  const filteredTasks = useMemo(() => tasks.filter(t => visibleTypes.has(t.task_type || 'activity')), [tasks, visibleTypes]);
  const toggleType = (type) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) { if (next.size > 1) next.delete(type); } else next.add(type);
      return next;
    });
  };

  const parentTasks = filteredTasks.filter(t => !t.parent_task_id);
  const getChildTasks = (parentId) => filteredTasks.filter(t => t.parent_task_id === parentId);

  const visibleRows = useMemo(() => {
    const rows = [];
    const visit = (task, level = 0) => {
      rows.push({ task, level });
      const children = filteredTasks.filter(t => t.parent_task_id === task.id);
      if (children.length > 0 && expandedTasks?.includes(task.id)) {
        children.forEach(child => visit(child, level + 1));
      }
    };

    filteredTasks.filter(t => !t.parent_task_id).forEach(task => visit(task, 0));
    return rows;
  }, [expandedTasks, filteredTasks]);

  const taskById = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const descendantIdsByTaskId = useMemo(() => {
    const childrenByParentId = new Map();
    tasks.forEach(task => {
      if (!task.parent_task_id) return;
      const children = childrenByParentId.get(task.parent_task_id) || [];
      children.push(task.id);
      childrenByParentId.set(task.parent_task_id, children);
    });

    const collectDescendants = (taskId, seen = new Set()) => {
      const descendants = new Set();
      (childrenByParentId.get(taskId) || []).forEach(childId => {
        if (seen.has(childId)) return;
        seen.add(childId);
        descendants.add(childId);
        collectDescendants(childId, seen).forEach(descendantId => descendants.add(descendantId));
      });
      return descendants;
    };

    return new Map(tasks.map(task => [task.id, collectDescendants(task.id)]));
  }, [tasks]);

  const predecessorIdsForTask = (task) => Array.isArray(task.predecessors) ? task.predecessors : [];
  const predecessorLinksForTask = (task) => Array.isArray(task.predecessor_links) ? task.predecessor_links : [];

  const wouldCreateCircularDependency = (successorTaskId, candidatePredecessorTaskId) => {
    const visit = (taskId, seen = new Set()) => {
      if (taskId === successorTaskId) return true;
      if (seen.has(taskId)) return false;
      seen.add(taskId);

      const task = taskById.get(taskId);
      return predecessorIdsForTask(task).some(predecessorTaskId => visit(predecessorTaskId, seen));
    };

    return visit(candidatePredecessorTaskId);
  };

  const getDependencyCandidates = (task) => {
    const existingPredecessors = new Set(predecessorIdsForTask(task));
    const descendants = descendantIdsByTaskId.get(task.id) || new Set();

    return tasks.filter(candidate => (
      candidate.id !== task.id &&
      !existingPredecessors.has(candidate.id) &&
      !descendants.has(candidate.id) &&
      !wouldCreateCircularDependency(task.id, candidate.id)
    ));
  };

  const dependencyLines = useMemo(() => {
    const rowIndexByTaskId = new Map(visibleRows.map((row, index) => [row.task.id, index]));

    return visibleRows.flatMap(({ task }, successorIndex) => predecessorIdsForTask(task)
      .map(predecessorTaskId => {
        const predecessor = taskById.get(predecessorTaskId);
        const predecessorIndex = rowIndexByTaskId.get(predecessorTaskId);
        if (!predecessor || predecessorIndex === undefined) return null;

        const predecessorPosition = getTaskPosition(getPreviewTask(predecessor));
        const successorPosition = getTaskPosition(getPreviewTask(task));
        if (!predecessorPosition || !successorPosition) return null;

        const fromX = predecessorPosition.left * cw + Math.max(predecessorPosition.width * cw - 6, 8) + 2;
        const toX = successorPosition.left * cw + 2;
        const fromY = predecessorIndex * 38 + 18;
        const toY = successorIndex * 38 + 18;
        const midX = Math.max(fromX + 12, Math.min(toX - 12, fromX + Math.abs(toX - fromX) / 2));

        return {
          id: `${predecessorTaskId}:${task.id}`,
          path: `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`,
        };
      })
      .filter(Boolean));
  }, [cw, taskById, visibleRows, dragPreview]);

  const renderTask = (task, level = 0) => {
    const previewTask = getPreviewTask(task);
    const position = getTaskPosition(previewTask);
    const children = getChildTasks(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks?.includes(task.id);
    const isCritical = criticalPath.has(task.id);
    const totalRowWidth = TASK_NAME_COL_W + columns.length * cw;
    const isScheduleEditable = isTaskScheduleEditable(task);
    const isPending = Boolean(pendingTaskIds?.[task.id]);
    const isDependencyEditable = enableDependencyEditing && typeof onAddDependency === 'function' && typeof onRemoveDependency === 'function';
    const isDependencyPending = Boolean(dependencyPendingTaskIds?.[task.id]);
    const dependencyCandidates = isDependencyEditable && !isDependencyPending ? getDependencyCandidates(task) : [];
    const predecessorLinks = predecessorLinksForTask(task);

    return (
      <React.Fragment key={task.id}>
        <div className="group relative hover:bg-slate-50/70 transition-colors border-b border-slate-100" style={{ height: 38, width: totalRowWidth }}>
          {/* Frozen Task Name column */}
          <div
            className="absolute top-0 left-0 flex items-center gap-1.5 px-2 border-r border-slate-200 bg-white group-hover:bg-slate-50/70 z-10"
            style={{ width: TASK_NAME_COL_W, height: 38, paddingLeft: `${8 + level * 14}px`, position: 'sticky', left: 0 }}
          >
            {hasChildren ? (
              <button onClick={() => onToggleExpand(task.id)} className="p-0.5 hover:bg-slate-100 rounded flex-shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            ) : <div className="w-4 flex-shrink-0" />}
            {(() => { const TI = taskTypeIcons[task.task_type] || Circle; return <TI className={cn("w-3.5 h-3.5 flex-shrink-0", taskTypeColors[task.task_type] || 'text-blue-600')} />; })()}
            <span className={cn("text-xs truncate select-none", isCritical && showCriticalPath && "font-semibold text-red-600")}>
              {task.title}
            </span>
            {isCritical && showCriticalPath && <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />}
            {isDependencyEditable && (
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {predecessorLinks.map(link => {
                  const predecessorTask = taskById.get(link.predecessor_task_id);
                  return (
                    <button
                      key={link.id || link.predecessor_task_id}
                      type="button"
                      disabled={isDependencyPending || !link.id}
                      title={link.id ? `Remove predecessor: ${predecessorTask?.title || link.predecessor_task_id}` : 'This dependency cannot be removed until it is refreshed from the server.'}
                      className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (link.id) onRemoveDependency(task.id, link.id);
                      }}
                    >
                      × {predecessorTask?.title || 'Pred'}
                    </button>
                  );
                })}
                <select
                  value=""
                  disabled={isDependencyPending || dependencyCandidates.length === 0}
                  title={dependencyCandidates.length === 0 ? 'No valid predecessor candidates' : 'Add predecessor'}
                  className="max-w-[94px] rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-500 disabled:opacity-50"
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const predecessorTaskId = e.target.value;
                    e.target.value = '';
                    if (predecessorTaskId) onAddDependency(task.id, predecessorTaskId);
                  }}
                >
                  <option value="">+ Pred</option>
                  {dependencyCandidates.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Timeline bars */}
          <div className="absolute top-0 flex-shrink-0" style={{ left: TASK_NAME_COL_W, width: columns.length * cw, height: 38 }}>
            {/* Column backgrounds */}
            <div className="absolute inset-0 flex pointer-events-none">
              {columns.map((col, i) => (
                <div key={i} style={{ width: cw }}
                  className={cn("flex-shrink-0 border-r border-slate-100 h-full",
                    viewScale === 'day' && isWeekend(col.date) && "bg-slate-50/80",
                    i === todayColIndex && "bg-indigo-50"
                  )}
                />
              ))}
            </div>
            {/* Today line */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-10 pointer-events-none"
              style={{ left: `${todayColIndex * cw + cw / 2}px` }} />
            {/* Task bar */}
            {position && (
              <div
                className={cn("absolute rounded",
                  isScheduleEditable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                  isPending && "opacity-70 cursor-wait",
                  isCritical && showCriticalPath ? "bg-red-500 ring-1 ring-red-300" : task.status === 'done' ? 'bg-green-500' : 'bg-indigo-500'
                )}
                style={{ top: 5, height: 26, left: `${position.left * cw + 2}px`, width: `${Math.max(position.width * cw - 6, 8)}px`, zIndex: 10 }}
                onMouseDown={(e) => handleSchedulePointerDown(e, task, 'move')}
                onMouseEnter={(e) => { if (previewTask.due_date) setTooltip({ text: `End: ${format(new Date(previewTask.due_date), 'MMM d, yyyy')}`, x: e.clientX, y: e.clientY }); }}
                onMouseLeave={() => setTooltip(null)}
              >
                {isScheduleEditable && (
                  <button
                    type="button"
                    aria-label={`Resize ${task.title} start date`}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l bg-black/10 hover:bg-white/30 focus:outline-none focus:ring-1 focus:ring-white/80"
                    onMouseDown={(e) => handleSchedulePointerDown(e, task, 'resize-start')}
                  />
                )}
                <div className="px-1.5 py-0.5 text-[11px] text-white truncate font-medium select-none leading-tight">{task.title}</div>
                {task.progress > 0 && (
                  <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b" style={{ width: `${task.progress}%` }} />
                )}
                {isScheduleEditable && (
                  <button
                    type="button"
                    aria-label={`Resize ${task.title} finish date`}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r bg-black/10 hover:bg-white/30 focus:outline-none focus:ring-1 focus:ring-white/80"
                    onMouseDown={(e) => handleSchedulePointerDown(e, task, 'resize-finish')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  };

  const allTypesSelected = visibleTypes.size === ALL_TASK_TYPES.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Slim toolbar: filter popover + critical path + export */}
      <div className="flex items-center justify-between mb-2 px-1 gap-3">
        <div className="flex items-center gap-3">
          {/* Task type filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                allTypesSelected ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300" : "border-indigo-300 bg-indigo-50 text-indigo-700"
              )}>
                <Filter className="w-3.5 h-3.5" />
                Task Types
                {!allTypesSelected && <span className="bg-indigo-500 text-white rounded-full px-1.5 py-0 text-[10px] ml-0.5">{visibleTypes.size}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <p className="text-[10px] font-semibold text-slate-400 uppercase px-1 mb-1.5">Show task types</p>
              {ALL_TASK_TYPES.map(type => {
                const TI = taskTypeIcons[type];
                return (
                  <button key={type} onClick={() => toggleType(type)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 transition-colors">
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                      visibleTypes.has(type) ? "bg-indigo-500 border-indigo-500" : "border-slate-300 bg-white")}>
                      {visibleTypes.has(type) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <TI className={cn("w-3.5 h-3.5 flex-shrink-0", taskTypeColors[type])} />
                    <span className="text-xs text-slate-700">{TASK_TYPE_LABELS[type]}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Critical path */}
          <div className="flex items-center gap-2">
            <Switch id="critical-path" checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
            <Label htmlFor="critical-path" className="text-xs font-medium text-slate-600 cursor-pointer whitespace-nowrap">Critical Path</Label>
          </div>
          {showCriticalPath && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 bg-red-500 rounded" />
              <span>{criticalPath.size} task{criticalPath.size !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <ExportMenu tasks={tasks} project={project} viewType="gantt" />
      </div>

      {/* Scrollable gantt area — Task Name col is sticky inside, timeline scrolls */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Sticky headers wrapper — outer div scrolls horizontally, header is sticky top */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
            {/* Top group row (Month+Year or Year) — includes view scale selector in frozen col */}
            <div className="flex border-b border-slate-100">
              {/* Frozen header cell with scale toggle */}
              <div className="flex-shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 flex items-center justify-between px-3"
                style={{ width: TASK_NAME_COL_W, minWidth: TASK_NAME_COL_W, height: 30 }}>
                <span className="text-xs font-semibold text-slate-500">Task Name</span>
                <div className="flex items-center gap-0.5 bg-slate-200 rounded p-0.5">
                  {['day','week','month'].map(s => (
                    <button key={s} onClick={() => setViewScale(s)}
                      className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors capitalize",
                        viewScale === s ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Group labels */}
              <div className="flex flex-shrink-0" style={{ width: columns.length * cw }}>
                {topGroups.map((mg, i) => (
                  <div key={i}
                    style={{ width: mg.count * cw, minWidth: mg.count * cw, height: 30 }}
                    className="flex-shrink-0 px-2 flex items-center text-[11px] font-semibold text-slate-600 border-r border-slate-200 truncate">
                    {mg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Column sub-labels row */}
            <div className="flex">
              <div className="flex-shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200" style={{ width: TASK_NAME_COL_W, minWidth: TASK_NAME_COL_W, height: 26 }} />
              <div className="flex flex-shrink-0" style={{ width: columns.length * cw }}>
                {columns.map((col, i) => (
                  <div key={i} ref={i === todayColIndex ? todayRef : null}
                    style={{ width: cw, minWidth: cw, height: 26 }}
                    className={cn("flex-shrink-0 flex items-center justify-center border-r border-slate-100 text-[10px]",
                      viewScale === 'day' && isWeekend(col.date) && "bg-slate-100",
                      i === todayColIndex ? "bg-indigo-100 font-bold text-indigo-700" : "text-slate-400"
                    )}>
                    {colLabel(col, i)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task rows */}
          <div className="relative" style={{ minWidth: TASK_NAME_COL_W + columns.length * cw }}>
            {dependencyLines.length > 0 && (
              <svg
                className="absolute pointer-events-none"
                style={{ left: TASK_NAME_COL_W, top: 0, width: columns.length * cw, height: visibleRows.length * 38, zIndex: 6 }}
              >
                {dependencyLines.map(line => (
                  <path
                    key={line.id}
                    d={line.path}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.25"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            )}
            {parentTasks.length > 0 ? (
              visibleRows.map(({ task, level }) => renderTask(task, level))
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">No tasks to display.</div>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}