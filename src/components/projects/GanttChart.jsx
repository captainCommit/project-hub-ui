// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { format, differenceInDays, addDays, startOfDay, startOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWeekend, isSameDay, isSameMonth, getWeekOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Zap, Diamond, Circle, Package, Layers, Flag, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ExportMenu from './ExportMenu';

const taskTypeIcons = { milestone: Diamond, activity: Circle, deliverable: Package, work_package: Layers, phase: Flag };
const taskTypeColors = { milestone: 'text-purple-600', activity: 'text-blue-600', deliverable: 'text-green-600', work_package: 'text-[#c87b14]', phase: 'text-cyan-600' };
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
  // task -> how many critical-priority RAID items it is linked to (Related Record on the sheet); shown on critical bars.
  getCriticalRaidCount = undefined,
}) {
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [viewScale, setViewScale] = useState('day');
  const [visibleTypes, setVisibleTypes] = useState(new Set(ALL_TASK_TYPES));
  const [tooltip, setTooltip] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const focusDateRef = useRef(null);
  const scrollRef = useRef(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  // Build columns — start far enough back to show all tasks
  const { startDate, columns, focusDate } = useMemo(() => {
    const taskDates = tasks.flatMap(task => [parseApiDate(task.start_date), parseApiDate(task.due_date)]).filter(Boolean);
    const earliestTaskDate = taskDates.reduce((min, date) => date < min ? date : min, taskDates[0] || today);
    const lastTaskDate = taskDates.reduce((max, date) => date > max ? date : max, taskDates[0] || today);
    const start = startOfWeek(addDays(earliestTaskDate, -14));
    const projectEnd = parseApiDate(project?.end_date) || addDays(today, 90);
    const latestTaskDate = lastTaskDate > projectEnd ? lastTaskDate : projectEnd;
    const end = addDays(latestTaskDate, 30);

    let cols = [];
    if (viewScale === 'day') {
      cols = eachDayOfInterval({ start, end }).map(d => ({ date: d, key: d.toISOString() }));
    } else if (viewScale === 'week') {
      cols = eachWeekOfInterval({ start, end }).map(d => ({ date: d, key: d.toISOString() }));
    } else {
      cols = eachMonthOfInterval({ start, end }).map(d => ({ date: d, key: d.toISOString() }));
    }
    return {
      startDate: start,
      columns: cols,
      focusDate: today < earliestTaskDate || today > lastTaskDate ? earliestTaskDate : today,
    };
  }, [project, viewScale, today, tasks]);

  // Keep the schedule visible when all tasks are in the past or future.
  useEffect(() => {
    if (focusDateRef.current && scrollRef.current) {
      const offset = focusDateRef.current.offsetLeft - TASK_NAME_COL_W - 160;
      scrollRef.current.scrollLeft = Math.max(0, offset);
    }
  }, [columns]);

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
    const taskStart = parseApiDate(task.start_date || task.due_date);
    const taskEnd = parseApiDate(task.due_date || task.start_date);
    if (!taskStart || !taskEnd) return null;
    const left = Math.max(0, getColIndex(taskStart));
    const endCol = getColIndex(taskEnd);
    return { left, width: Math.max(1, endCol - left + 1) };
  };

  const todayColIndex = useMemo(() => getColIndex(today), [columns, viewScale]);
  const focusColIndex = getColIndex(focusDate);
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

  // Critical path: work tasks with no slack. Walking back from the project's last finish date through the
  // predecessor links, a task is critical when the latest it could finish without moving that date is its
  // planned finish. A summary row is critical when any task under it is.
  const criticalPath = useMemo(() => {
    if (!showCriticalPath || tasks.length === 0) return new Set();
    const parentIdSet = new Set(tasks.map(t => t.parent_task_id).filter(Boolean));
    const work = tasks.filter(t => !parentIdSet.has(t.id) && parseApiDate(t.start_date) && parseApiDate(t.due_date));
    if (work.length === 0) return new Set();
    const workById = new Map(work.map(t => [t.id, t]));
    const successors = new Map();
    work.forEach(t => predecessorIdsForTask(t).forEach(predId => {
      if (!workById.has(predId)) return;
      if (!successors.has(predId)) successors.set(predId, []);
      successors.get(predId).push(t.id);
    }));
    const projectEnd = work.reduce((latest, t) => {
      const due = parseApiDate(t.due_date);
      return due > latest ? due : latest;
    }, parseApiDate(work[0].due_date));
    const lateFinish = new Map();
    const latestFinish = (id, visiting = new Set()) => {
      if (lateFinish.has(id)) return lateFinish.get(id);
      if (visiting.has(id)) return projectEnd;
      visiting.add(id);
      let latest = projectEnd;
      (successors.get(id) || []).forEach(succId => {
        const succ = workById.get(succId);
        const span = differenceInDays(parseApiDate(succ.due_date), parseApiDate(succ.start_date));
        const mustFinishBy = addDays(latestFinish(succId, visiting), -span - 1);
        if (mustFinishBy < latest) latest = mustFinishBy;
      });
      visiting.delete(id);
      lateFinish.set(id, latest);
      return latest;
    };
    const critical = new Set(work.filter(t => differenceInDays(latestFinish(t.id), parseApiDate(t.due_date)) <= 0).map(t => t.id));
    parentIdSet.forEach(parentId => {
      if ([...(descendantIdsByTaskId.get(parentId) || [])].some(id => critical.has(id))) critical.add(parentId);
    });
    return critical;
  }, [tasks, showCriticalPath, descendantIdsByTaskId]);

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
          critical: criticalPath.has(predecessorTaskId) && criticalPath.has(task.id),
        };
      })
      .filter(Boolean));
  }, [cw, taskById, visibleRows, dragPreview, criticalPath]);

  const renderTask = (task, level = 0) => {
    const previewTask = getPreviewTask(task);
    const position = getTaskPosition(previewTask);
    const children = getChildTasks(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks?.includes(task.id);
    const isCritical = criticalPath.has(task.id);
    const raidCount = isCritical && showCriticalPath && getCriticalRaidCount ? getCriticalRaidCount(task) : 0;
    const totalRowWidth = TASK_NAME_COL_W + columns.length * cw;
    const isScheduleEditable = isTaskScheduleEditable(task);
    const isPending = Boolean(pendingTaskIds?.[task.id]);

    return (
      <React.Fragment key={task.id}>
        <div className="group relative hover:bg-slate-50/70 transition-colors border-b border-slate-100" style={{ height: 38, width: totalRowWidth }}>
          {/* Frozen Task Name column: above the bars (z 10) so a bar that starts off screen slides under it, below the sticky header (z 20).
              Its hover colour is solid for the same reason. */}
          <div
            className="absolute top-0 left-0 flex items-center gap-1.5 px-2 border-r border-slate-200 bg-white group-hover:bg-slate-50 z-[15]"
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
                  showCriticalPath
                    ? (isCritical ? "bg-red-50 border-2 border-red-500" : "bg-blue-200")
                    : task.status === 'done' ? 'bg-green-500' : 'bg-[#002046]'
                )}
                style={{ top: 5, height: 26, left: `${position.left * cw + 2}px`, width: `${Math.max(position.width * cw - 6, 8)}px`, zIndex: 10 }}
                onMouseDown={(e) => handleSchedulePointerDown(e, task, 'move')}
                onMouseEnter={(e) => { if (previewTask.due_date) setTooltip({ text: `End: ${format(parseApiDate(previewTask.due_date), 'MMM d, yyyy')}`, x: e.clientX, y: e.clientY }); }}
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
                <div className={cn("px-1.5 py-0.5 text-[11px] truncate font-medium select-none leading-tight", showCriticalPath ? (isCritical ? 'text-red-700' : 'text-slate-700') : 'text-white')}>{task.title}</div>
                {raidCount > 0 && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow"
                    title={`${raidCount} critical RAID item${raidCount === 1 ? '' : 's'} linked to this task`}>
                    <AlertTriangle className="w-3 h-3" />{raidCount}
                  </span>
                )}
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
                allTypesSelected ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300" : "border-indigo-300 bg-indigo-50 text-[#002046]"
              )}>
                <Layers className="w-3.5 h-3.5" />
                Task Types
                <span className="text-slate-400 font-normal ml-1">{allTypesSelected ? 'All' : `${visibleTypes.size} selected`}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                      visibleTypes.has(type) ? "bg-[#002046] border-[#002046]" : "border-slate-300 bg-white")}>
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
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm bg-red-50 border-2 border-red-500" /> Critical path ({criticalPath.size})</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm bg-blue-200" /> Non-critical task</span>
              {getCriticalRaidCount && <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Critical RAID items linked</span>}
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
                  <div key={i} ref={i === focusColIndex ? focusDateRef : null}
                    style={{ width: cw, minWidth: cw, height: 26 }}
                    className={cn("flex-shrink-0 flex items-center justify-center border-r border-slate-100 text-[10px]",
                      viewScale === 'day' && isWeekend(col.date) && "bg-slate-100",
                      i === todayColIndex ? "bg-indigo-100 font-bold text-[#002046]" : "text-slate-400"
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
                    stroke={line.critical && showCriticalPath ? '#dc2626' : '#94a3b8'}
                    strokeWidth={line.critical && showCriticalPath ? 1.75 : 1.25}
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