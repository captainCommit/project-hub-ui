import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, format, min, max } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronDown, ChevronRight, Diamond, Circle, Package, Layers, Flag, MessageSquare, Paperclip, Copy, GripVertical, Edit2, User, ArrowLeft, Loader2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { tasksApi, getTaskPriorityLabel, normalizeTaskPriorityText, resolveTaskPriorityOption } from '@/api/tasks';
import FormattingToolbar from './FormattingToolbar';


const statusOptions = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-200 text-slate-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-700' }
];

const taskTypeOptions = [
  { value: 'milestone', label: 'Milestone', icon: Diamond, color: 'text-purple-600' },
  { value: 'activity', label: 'Activity', icon: Circle, color: 'text-blue-600' },
  { value: 'deliverable', label: 'Deliverable', icon: Package, color: 'text-green-600' },
  { value: 'work_package', label: 'Work Package', icon: Layers, color: 'text-orange-600' },
  { value: 'phase', label: 'Phase', icon: Flag, color: 'text-cyan-600' }
];

const normalizeTypeKey = (value) => typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

// Pair an API task type option with the local icon/color for the matching built-in type.
const getTaskTypeStyle = (option) => {
  const keys = [option?.code, option?.name, option?.label].map(normalizeTypeKey);
  return taskTypeOptions.find(t => keys.includes(normalizeTypeKey(t.value))) || taskTypeOptions[1];
};

const shortName = (name) => {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const getPriorityColorClass = (option, label) => {
  if (option?.color) return option.color;
  const normalized = normalizeTaskPriorityText(option?.code || option?.name || option?.label || label);
  if (normalized === 'critical' || normalized === 'urgent') return 'bg-red-100 text-red-700';
  if (normalized === 'high') return 'bg-orange-100 text-orange-700';
  if (normalized === 'medium') return 'bg-yellow-100 text-yellow-700';
  if (normalized === 'normal') return 'bg-blue-100 text-blue-700';
  if (normalized === 'low') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
};

const PriorityBadge = ({ option, label, className }) => {
  const displayLabel = option?.label || label || '—';
  const colorClass = getPriorityColorClass(option, displayLabel);
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs", colorClass, className)}>
      {option?.icon && !/^[a-z0-9_-]+$/i.test(option.icon) ? <span>{option.icon}</span> : <Flag className="w-3 h-3" />}
      <span>{displayLabel}</span>
    </span>
  );
};

const DEFAULT_COL_WIDTHS = {
  row: 40, attachments: 48, task_type: 64, title: 220, status: 96, priority: 112,
  duration: 56, start_date: 115, due_date: 115, predecessors: 56,
  resources: 128, resources_planned: 128, progress: 80, raid: 176
};

const columns = [
  { key: 'row',          label: '',          align: 'center' },
  { key: 'attachments',  label: '',          align: 'center' },
  { key: 'task_type',    label: 'Type',      align: 'center' },
  { key: 'title',        label: 'Task Name', align: 'left'   },
  { key: 'status',       label: 'Status',    align: 'center' },
  { key: 'priority',     label: 'Priority',  align: 'center' },
  { key: 'progress',     label: '% Complete', align: 'center' },
  { key: 'duration',     label: 'Dur.',      align: 'center' },
  { key: 'start_date',   label: 'Start',     align: 'center' },
  { key: 'due_date',     label: 'Finish',    align: 'center' },
  { key: 'predecessors', label: 'Pred.',     align: 'center' },
  { key: 'resources',    label: 'Resources (Actual)', align: 'left'   },
  { key: 'resources_planned', label: 'Resources (Planned)', align: 'left' },
  { key: 'raid',         label: 'Related Record', align: 'left'   }
];

export default function TaskSheet({ 
  tasks, 
  project,
  projects = [],
  programs = [],
  onAddTask, 
  onUpdateTask, 
  onDeleteTask,
  onReorderTasks,
  onUpdateTaskPriority,
  onUpdateTaskTitle,
  onUpdateTaskDuration,
  onUpdateTaskSchedule,
  onUpdateTaskProgress,
  onUpdateTaskStatus,
  taskStatusOptions = null,
  onUpdateTaskType,
  taskTypeOptions: apiTaskTypeOptions = null,
  onIndentTask,
  onOutdentTask,
  onAddPredecessor,
  onRemovePredecessor,
  priorityOptions = [],
  priorityOptionsState = null,
  priorityDrafts = {},
  priorityErrors = {},
  priorityPendingTaskIds = {},
  hierarchyPendingTaskIds = {},
  predecessorPendingTaskIds = {},
  deletingTaskIds = {},
  isReorderingTasks = false,
  viewMode = 'project',
  onUpdateProject,
  vacations = [],
  risks = [],
  issues = [],
  assumptions = [],
  decisions = [],
  resources = [],
  enableResourceAssignments = false,
  accountResources = [],
  accountResourcesState = null,
  selectedAccountId = null,
  projectId = null,
  onGoBack,
  readOnly = false,
  hideProjectHeader = false
}) {
  const queryClient = useQueryClient();
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const [selectedCell, setSelectedCell] = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);
  const [editingResources, setEditingResources] = useState(null);
  const [resourceInput, setResourceInput] = useState('');
  const [editingHours, setEditingHours] = useState(null);
  const [hoursInput, setHoursInput] = useState('');
  const [cellFormatting, setCellFormatting] = useState({});
  const [commentInput, setCommentInput] = useState('');
  const [copiedTask, setCopiedTask] = useState(null);
  const [bulkInsertDialogOpen, setBulkInsertDialogOpen] = useState(false);
  const [bulkInsertCount, setBulkInsertCount] = useState(5);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [raidOpen, setRaidOpen] = useState(null);
  const [pmQuery, setPmQuery] = useState(null);
  const [pmDropOpen, setPmDropOpen] = useState(false);
  const [resourcePicker, setResourcePicker] = useState(null);
  const [pendingResourceAssignmentTaskIds, setPendingResourceAssignmentTaskIds] = useState({});
  const [resourceAssignmentErrors, setResourceAssignmentErrors] = useState({});
  const pendingResourceAssignmentRequests = useRef(new Set());
  const isReadOnly = Boolean(readOnly);
  const isPriorityEditable = !isReadOnly || Boolean(onUpdateTaskPriority);
  const canDeleteTask = Boolean(onDeleteTask);
  const canReorderTasks = Boolean(onReorderTasks);
  const canUseHierarchyActions = Boolean(onIndentTask && onOutdentTask);
  const canEditPredecessors = Boolean(onAddPredecessor && onRemovePredecessor);
  const canEditResourceAssignments = Boolean(enableResourceAssignments && selectedAccountId && projectId);
  const canEditTitle = !isReadOnly || Boolean(onUpdateTaskTitle);
  const canEditDuration = !isReadOnly || Boolean(onUpdateTaskDuration);
  const canEditSchedule = !isReadOnly || Boolean(onUpdateTaskSchedule);
  const canEditProgress = !isReadOnly || Boolean(onUpdateTaskProgress);
  const canEditStatus = !isReadOnly || Boolean(onUpdateTaskStatus);
  const canEditResources = !isReadOnly || canEditResourceAssignments;
  const showPriorityColumn = Boolean(onUpdateTaskPriority || priorityOptionsState || priorityOptions.length > 0);
  const visibleColumns = showPriorityColumn ? columns : columns.filter(column => column.key !== 'priority');

  const assignmentTaskId = canEditResourceAssignments && editingResources ? editingResources : null;
  const taskAssignmentsQuery = useQuery({
    queryKey: ['task-assignments', assignmentTaskId],
    queryFn: () => tasksApi.listAssignments(assignmentTaskId, accountResources),
    enabled: Boolean(assignmentTaskId),
    retry: false,
  });

  const addTaskSafe = (data) => {
    if (isReadOnly || !onAddTask) return;
    onAddTask(data);
  };

  const updateTaskSafe = (id, data) => {
    if (isReadOnly || !onUpdateTask) return;
    onUpdateTask(id, data);
  };

  const deleteTaskSafe = async (id) => {
    if (!canDeleteTask || deletingTaskIds[id]) return;
    if (!window.confirm('Delete this task?')) return;
    try {
      await Promise.resolve(onDeleteTask(id));
      setSelectedCell(prev => prev && prev.startsWith(`${id}-`) ? null : prev);
      setSelectedTasks(prev => prev.filter(taskId => taskId !== id));
      setCopiedTask(prev => prev?.id === id ? null : prev);
    } catch (_error) {
      // Parent handler preserves the visible row and reports the backend-safe error.
    }
  };

  const updateTaskPrioritySafe = (id, priorityId) => {
    if (!onUpdateTaskPriority || priorityPendingTaskIds[id]) return;
    onUpdateTaskPriority(id, { priority_id: priorityId });
  };

  const updateProjectSafe = (id, data) => {
    if (isReadOnly || !onUpdateProject) return;
    onUpdateProject(id, data);
  };

  const handleColResize = (key, startX, startW) => {
    const onMove = (e) => {
      const newW = Math.max(40, startW + e.clientX - startX);
      setColWidths(prev => ({ ...prev, [key]: newW }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  // Calculate parent task dates
  const calculateParentDates = (parentTask, allTasks) => {
    const children = allTasks.filter(t => t.parent_task_id === parentTask.id);
    if (children.length === 0) return null;

    const datesOnly = children.filter(c => c.start_date && c.due_date);
    if (datesOnly.length === 0) return null;

    const earliestStart = min(datesOnly.map(c => new Date(c.start_date)));
    const latestEnd = max(datesOnly.map(c => new Date(c.due_date)));

    return {
      start_date: format(earliestStart, 'yyyy-MM-dd'),
      due_date: format(latestEnd, 'yyyy-MM-dd')
    };
  };

  useEffect(() => {
    if (isReadOnly) return;
    // Auto-update parent dates
    const parentTasks = tasks.filter(t => {
      const children = tasks.filter(c => c.parent_task_id === t.id);
      return children.length > 0;
    });

    parentTasks.forEach(parent => {
      const newDates = calculateParentDates(parent, tasks);
      if (newDates && (parent.start_date !== newDates.start_date || parent.due_date !== newDates.due_date)) {
        updateTaskSafe(parent.id, newDates);
      }
    });

    // For completed projects: mark all tasks as complete with 100% progress
    if (project?.status === 'completed') {
      tasks.forEach(task => {
        const updates = {};
        if (task.status !== 'complete') updates.status = 'complete';
        if (task.progress !== 100) updates.progress = 100;
        if (Object.keys(updates).length > 0) updateTaskSafe(task.id, updates);
      });
      return; // skip duration recalc for completed projects (already handled above)
    }

    // Recalculate duration from start+end dates using weekday counting
    tasks.forEach(task => {
      if (task.start_date && task.due_date && task.task_type !== 'milestone') {
        const computed = calculateDuration(task.start_date, task.due_date);
        if (task.duration !== computed) {
          updateTaskSafe(task.id, { duration: computed });
        }
      }
    });
  }, [project?.id, project?.status, isReadOnly]);
  
  const getRowNumber = (task, allTasks) => {
    const index = allTasks.findIndex(t => t.id === task.id);
    return index + 1;
  };

  const formatPredecessors = (task, allTasks) => {
    if (!task.predecessors || task.predecessors.length === 0) return '';
    return task.predecessors.map(predId => {
      const predTask = allTasks.find(t => t.id === predId);
      return predTask ? getRowNumber(predTask, allTasks) : '';
    }).filter(Boolean).join(', ');
  };

  const parsePredecessors = (value, allTasks) => {
    if (!value) return [];
    return value.split(',').map(v => {
      const rowNum = parseInt(v.trim());
      const task = allTasks[rowNum - 1];
      return task?.id;
    }).filter(Boolean);
  };

  const getPredecessorLinkObjects = (task) => {
    const links = Array.isArray(task?.predecessor_links) ? task.predecessor_links : [];
    return links.filter(link => link && typeof link === 'object');
  };

  const getPredecessorLinkId = (task, predecessorTaskId) => {
    const link = getPredecessorLinkObjects(task).find(item => item.predecessor_task_id === predecessorTaskId);
    return typeof link?.id === 'string' ? link.id : null;
  };

  const getTaskPredecessorIds = (task) => {
    if (!task) return [];
    if (Array.isArray(task.predecessors)) {
      return task.predecessors.filter(Boolean);
    }
    return getPredecessorLinkObjects(task)
      .map(link => link.predecessor_task_id)
      .filter(Boolean);
  };

  const isTaskDescendantOf = (candidateTaskId, ancestorTaskId) => {
    if (!candidateTaskId || !ancestorTaskId || candidateTaskId === ancestorTaskId) return false;
    const byId = new Map(displayTasks.map(item => [item.id, item]));
    let current = byId.get(candidateTaskId);
    const seen = new Set();

    while (current?.parent_task_id) {
      if (current.parent_task_id === ancestorTaskId) return true;
      if (seen.has(current.parent_task_id)) return false;
      seen.add(current.parent_task_id);
      current = byId.get(current.parent_task_id);
    }

    return false;
  };

  const wouldCreatePredecessorCycle = (taskId, candidatePredecessorId) => {
    if (!taskId || !candidatePredecessorId) return true;
    const byId = new Map(displayTasks.map(item => [item.id, item]));
    const visit = (currentTaskId, seen = new Set()) => {
      if (currentTaskId === taskId) return true;
      if (seen.has(currentTaskId)) return false;
      seen.add(currentTaskId);
      const currentTask = byId.get(currentTaskId);
      return getTaskPredecessorIds(currentTask).some(predecessorId => visit(predecessorId, seen));
    };

    return visit(candidatePredecessorId);
  };

  const getPredecessorCandidateTasks = (task) => {
    if (!task) return [];
    const existingPredecessorIds = new Set(getTaskPredecessorIds(task));
    return displayTasks
      .filter(candidate => candidate.project_id === task.project_id)
      .filter(candidate => candidate.id !== task.id)
      .filter(candidate => !existingPredecessorIds.has(candidate.id))
      .filter(candidate => !isTaskDescendantOf(candidate.id, task.id))
      .filter(candidate => !wouldCreatePredecessorCycle(task.id, candidate.id));
  };

  const addPredecessorSafe = (taskId, predecessorTaskId) => {
    if (!canEditPredecessors || predecessorPendingTaskIds[taskId]) return;
    Promise.resolve(onAddPredecessor(taskId, predecessorTaskId)).catch(() => {});
  };

  const removePredecessorSafe = (taskId, predecessorId) => {
    if (!canEditPredecessors || predecessorPendingTaskIds[taskId] || !predecessorId) return;
    Promise.resolve(onRemovePredecessor(taskId, predecessorId)).catch(() => {});
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 1;
    let count = 0;
    let cur = new Date(start);
    const endDate = new Date(end);
    while (cur <= endDate) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur = new Date(cur.getTime() + 86400000);
    }
    return Math.max(1, count);
  };

  const handleQuickAdd = (projectId) => {
    if (isReadOnly) return;
    addTaskSafe({ title: 'New Task', duration: 1, task_type: 'activity', indent_level: 0, project_id: projectId || project?.id, order: tasks.length });
  };

  const handleBulkInsert = () => {
    if (isReadOnly) return;
    const newTasks = Array.from({ length: bulkInsertCount }, (_, i) => ({
      title: `New Task ${i + 1}`,
      duration: 1,
      task_type: 'activity',
      indent_level: 0,
      project_id: project?.id,
      order: tasks.length + i
    }));
    newTasks.forEach(task => addTaskSafe(task));
    setBulkInsertDialogOpen(false);
  };

  const handleCopyTask = (task) => {
    setCopiedTask(task);
  };

  const handlePasteTask = () => {
    if (isReadOnly) return;
    if (!copiedTask) return;
    const { id, created_date, updated_date, created_by, ...taskData } = copiedTask;
    addTaskSafe({ ...taskData, title: `${taskData.title} (Copy)`, order: tasks.length });
  };

  const handleIndent = () => {
    if (!canUseHierarchyActions) return;
    getHierarchyActionTaskIds()
      .filter(canIndentHierarchyTask)
      .forEach(taskId => {
        Promise.resolve(onIndentTask(taskId)).catch(() => {});
      });
  };

  const handleOutdent = () => {
    if (!canUseHierarchyActions) return;
    getHierarchyActionTaskIds()
      .filter(canOutdentHierarchyTask)
      .forEach(taskId => {
        Promise.resolve(onOutdentTask(taskId)).catch(() => {});
      });
  };

  const handleToggleTaskSelection = (taskId) => {
    if (isReadOnly) return;
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleAddComment = (taskId, comment) => {
    if (isReadOnly) return;
    const task = tasks.find(t => t.id === taskId);
    const comments = task?.comments || [];
    updateTaskSafe(taskId, { 
      comments: [...comments, { text: comment, author: 'User', date: new Date().toISOString() }]
    });
    setCommentInput('');
  };

  const handleEditComment = (taskId, commentIndex, newText) => {
    if (isReadOnly) return;
    const task = tasks.find(t => t.id === taskId);
    const comments = [...(task?.comments || [])];
    comments[commentIndex] = { 
      ...comments[commentIndex], 
      text: newText, 
      editedDate: new Date().toISOString() 
    };
    updateTaskSafe(taskId, { comments });
    setEditingComment(null);
    setEditCommentText('');
  };

  const handleDeleteComment = (taskId, commentIndex) => {
    if (isReadOnly) return;
    const task = tasks.find(t => t.id === taskId);
    const comments = [...(task?.comments || [])];
    comments.splice(commentIndex, 1);
    updateTaskSafe(taskId, { comments });
  };

  const handleResourceAdd = (taskId, resource) => {
    if (isReadOnly) return;
    const task = tasks.find(t => t.id === taskId);
    const currentResources = task?.resources || [];
    if (resource && !currentResources.includes(resource)) {
      updateTaskSafe(taskId, { resources: [...currentResources, resource] });
    }
    setResourceInput('');
  };

  const getBackendSafeMessage = (error, fallback) => {
    const data = error?.response?.data ?? error?.data;
    const detail = data?.detail ?? data?.message ?? data?.error;

    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    if (Array.isArray(detail)) {
      const messages = detail
        .map(item => typeof item === 'string' ? item : item?.msg || item?.message)
        .filter(Boolean);
      if (messages.length > 0) return messages.join('\n');
    }
    if (detail && typeof detail === 'object') {
      const message = detail.message ?? detail.error ?? detail.reason;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }

    return fallback;
  };

  // API-backed cells save once on blur/Enter instead of on every keystroke; a failed save restores the old value.
  const getCommitOnBlurProps = (currentValue, onCommit) => {
    const initial = currentValue === null || currentValue === undefined ? '' : String(currentValue);
    return {
      defaultValue: initial,
      onBlur: (e) => {
        const input = e.target;
        const next = input.value.trim();
        if (next === initial) return;
        Promise.resolve()
          .then(() => onCommit(next))
          .catch(error => {
            input.value = initial;
            alert(getBackendSafeMessage(error, error?.message || 'We could not save this change. Please try again.'));
          });
      },
      onKeyDown: (e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.currentTarget.value = initial;
          e.currentTarget.blur();
        }
      },
    };
  };

  const normalizeAssignmentName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const getResourceName = (resource) => resource?.name || resource?.full_name || resource?.resource_name || '';

  const getResourceRoleTeam = (resource) => [resource?.role || resource?.title, resource?.team || resource?.department].filter(Boolean).join(' • ');

  const isActiveAccountResource = (resource) => {
    if (resource?.is_active === false || resource?.active === false) return false;
    if (typeof resource?.status === 'string' && resource.status.toLowerCase() === 'inactive') return false;
    return true;
  };

  const isSameAssignedResource = (assigned, resource) => {
    if (!assigned || !resource) return false;
    if (assigned.resource_id && resource.id && assigned.resource_id === resource.id) return true;
    if (assigned.user_id && resource.user_id && assigned.user_id === resource.user_id) return true;
    return normalizeAssignmentName(assigned.resource_name || assigned.name || assigned.full_name) === normalizeAssignmentName(getResourceName(resource));
  };

  const getCachedTaskAssignments = (taskId) => {
    if (!taskId) return undefined;
    if (assignmentTaskId === taskId && Array.isArray(taskAssignmentsQuery.data)) return taskAssignmentsQuery.data;
    return queryClient.getQueryData(['task-assignments', taskId]);
  };

  const getDisplayedAssignments = (task) => {
    const cachedAssignments = getCachedTaskAssignments(task.id);
    if (Array.isArray(cachedAssignments)) return cachedAssignments;
    return (task.resources || []).map((resource, index) => {
      if (resource && typeof resource === 'object') return resource;
      const resourceName = String(resource || '').trim();
      return {
        id: `${task.id || 'task'}:${resourceName || index}`,
        resource_name: resourceName,
        name: resourceName,
        full_name: resourceName,
      };
    }).filter(resource => getResourceName(resource));
  };

  const getResourceCandidates = (assignedResources) => accountResources
    .filter(isActiveAccountResource)
    .filter(resource => resource?.id)
    .filter(resource => !assignedResources.some(assigned => isSameAssignedResource(assigned, resource)));

  const invalidateAssignmentCaches = async (taskId) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['task-assignments', taskId] }),
      queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['account-due-tasks', selectedAccountId] }),
      queryClient.invalidateQueries({ queryKey: ['account-resource-calendar', selectedAccountId] }),
    ]);
  };

  const setResourceAssignmentPending = (taskId, pending) => {
    setPendingResourceAssignmentTaskIds(prev => {
      const next = { ...prev };
      if (pending) next[taskId] = true;
      else delete next[taskId];
      return next;
    });
  };

  const clearResourceAssignmentError = (taskId) => {
    setResourceAssignmentErrors(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const handleOpenAssignmentPicker = (taskId) => {
    if (!canEditResourceAssignments || pendingResourceAssignmentTaskIds[taskId]) return;
    clearResourceAssignmentError(taskId);
    setEditingResources(taskId);
  };

  const runResourceRequest = async (taskId, requestKey, request) => {
    if (!canEditResourceAssignments || !taskId) return;
    if (pendingResourceAssignmentRequests.current.has(requestKey) || pendingResourceAssignmentTaskIds[taskId]) return;

    pendingResourceAssignmentRequests.current.add(requestKey);
    setResourceAssignmentPending(taskId, true);
    clearResourceAssignmentError(taskId);

    try {
      await request();
      await invalidateAssignmentCaches(taskId);
    } catch (error) {
      const message = getBackendSafeMessage(error, error?.message || 'We could not update this task assignment. Please try again.');
      setResourceAssignmentErrors(prev => ({ ...prev, [taskId]: message }));
      alert(message);
    } finally {
      pendingResourceAssignmentRequests.current.delete(requestKey);
      setResourceAssignmentPending(taskId, false);
    }
  };

  const addResourceAssignmentSafe = (task, resource) => {
    const resourceId = resource?.id;
    if (!resourceId) return;
    if (getDisplayedAssignments(task).some(assigned => isSameAssignedResource(assigned, resource))) return;
    return runResourceRequest(task?.id, `${task?.id}:add:${resourceId}`, () => tasksApi.createAssignment(task.id, resource, accountResources));
  };

  const removeResourceAssignmentSafe = (task, assignment) => {
    const assignmentId = assignment?.assignment_id || assignment?.id;
    if (!assignmentId) return;
    return runResourceRequest(task?.id, `${task?.id}:delete:${assignmentId}`, () => tasksApi.deleteAssignment(task.id, assignmentId));
  };

  const parseHoursInput = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const hours = Number(text);
    if (!Number.isFinite(hours) || hours < 0) throw new Error('Enter hours as a non-negative number.');
    return hours;
  };

  const updateAssignmentHoursSafe = (task, entry, value) => runResourceRequest(
    task?.id,
    `${task?.id}:hours:${entry.id}`,
    () => tasksApi.updateAssignment(entry.id, { hours: parseHoursInput(value) })
  );

  const addResourceAllocationSafe = (task, resource) => {
    if (!resource?.id) return;
    return runResourceRequest(task?.id, `${task?.id}:allocate:${resource.id}`, () => tasksApi.createAllocation(task.id, {
      resource_id: resource.id,
      start_date: task.start_date || null,
      end_date: task.due_date || null,
    }));
  };

  const removeResourceAllocationSafe = (task, entry) => runResourceRequest(
    task?.id,
    `${task?.id}:deallocate:${entry.id}`,
    () => tasksApi.deleteAllocation(entry.id)
  );

  const updateAllocationHoursSafe = (task, entry, value) => runResourceRequest(
    task?.id,
    `${task?.id}:allocation-hours:${entry.id}`,
    () => tasksApi.updateAllocation(entry.id, { allocated_hours: parseHoursInput(value) })
  );

  const getAssignmentEntries = (task) => (task.assignments || [])
    .map(assignment => {
      const match = assignment?.user_id ? accountResources.find(resource => resource?.user_id === assignment.user_id) : null;
      const resourceName = assignment?.resource_name || getResourceName(match);
      if (!assignment?.id || !resourceName) return null;
      return { id: assignment.id, resource_name: resourceName, user_id: assignment.user_id || null, resource_id: match?.id, hours: assignment.hours };
    })
    .filter(Boolean);

  const getAllocationEntries = (task) => (task.allocations || [])
    .filter(allocation => allocation?.id && allocation.resource_name)
    .map(allocation => ({ id: allocation.id, resource_name: allocation.resource_name, resource_id: allocation.resource_id, hours: allocation.allocated_hours }));

  // Shared cell for API-backed Resources (Actual) assignments and Resources (Planned) allocations.
  const renderApiResourceCell = ({ task, kind, cellKey, cellClass, style, entries, chipClassName, hoursClassName, onAdd, onRemove, onSaveHours }) => {
    const isPending = Boolean(pendingResourceAssignmentTaskIds[task.id]);
    const candidates = getResourceCandidates(entries);
    const pickerKey = `${kind}|${task.id}`;
    const hasHours = (hours) => hours !== null && hours !== undefined && hours !== '';

    return (
      <td key={cellKey} className={cn(cellClass, "text-left")} onClick={() => setSelectedCell(cellKey)} style={style} title={resourceAssignmentErrors[task.id]}>
        <div className="flex flex-wrap items-center gap-1 px-1">
          {entries.map(entry => {
            const hoursKey = `${pickerKey}|${entry.id}`;
            return (
              <Popover key={entry.id} open={editingHours === hoursKey} onOpenChange={open => {
                if (open && !isPending) { setEditingHours(hoursKey); setHoursInput(hasHours(entry.hours) ? String(Number(entry.hours)) : ''); }
                else setEditingHours(null);
              }}>
                <PopoverTrigger asChild>
                  <button type="button" onClick={e => e.stopPropagation()} title="Click to set hours"
                    className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors", chipClassName)}>
                    {shortName(entry.resource_name)}
                    {hasHours(entry.hours) && <span className={cn("text-[10px] font-semibold", hoursClassName)}>·{Number(entry.hours)}h</span>}
                    <span
                      title="Remove"
                      onClick={(e) => { e.stopPropagation(); if (!isPending) onRemove(entry); }}
                      className="hover:text-red-500 leading-none"
                    >×</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2" onClick={e => e.stopPropagation()}>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700">{entry.resource_name}</p>
                    <p className="text-[10px] text-slate-400">{kind === 'planned' ? 'Planned hours for this task' : 'Hours allocated to this task'}</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      autoFocus
                      value={hoursInput}
                      onChange={e => setHoursInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { onSaveHours(entry, hoursInput); setEditingHours(null); }
                        if (e.key === 'Escape') setEditingHours(null);
                      }}
                      className="h-7 text-sm"
                      placeholder="e.g. 8"
                    />
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingHours(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => { onSaveHours(entry, hoursInput); setEditingHours(null); }}>Save</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
          <Popover open={resourcePicker === pickerKey} onOpenChange={open => setResourcePicker(open && !isPending ? pickerKey : null)}>
            <PopoverTrigger asChild>
              <button type="button" onClick={e => e.stopPropagation()} disabled={isPending} className="text-xs text-slate-400 hover:text-indigo-600 disabled:cursor-not-allowed">
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '+'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" onClick={e => e.stopPropagation()}>
              <div className="max-h-48 overflow-y-auto">
                {accountResourcesState?.isLoading ? (
                  <p className="text-xs text-slate-400 px-2 py-1.5">Loading resources…</p>
                ) : accountResourcesState?.isError ? (
                  renderPrioritySafeState('Resources could not load.', accountResourcesState.onRetry)
                ) : candidates.length === 0 ? (
                  <p className="text-xs text-slate-400 px-2 py-1.5">No more resources to add.</p>
                ) : candidates.map(resource => (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setResourcePicker(null); onAdd(resource); }}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50 rounded"
                  >
                    <span className="block text-slate-700">{getResourceName(resource)}</span>
                    {getResourceRoleTeam(resource) && <span className="block text-[10px] text-slate-400">{getResourceRoleTeam(resource)}</span>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    );
  };

  const handleResourceRemove = (taskId, resource) => {
    if (isReadOnly) return;
    const task = tasks.find(t => t.id === taskId);
    const currentResources = task?.resources || [];
    const updates = { resources: currentResources.filter(r => r !== resource) };
    // also remove the hours entry for this resource
    const rh = (task?.resource_hours || []).filter(h => h.resource !== resource);
    if (rh.length !== (task?.resource_hours || []).length) updates.resource_hours = rh;
    updateTaskSafe(taskId, updates);
  };

  const getResourceHours = (task, resource) => {
    const entry = (task.resource_hours || []).find(h => h.resource === resource);
    return entry ? entry.hours : '';
  };

  // Deterministic per-project pool of 3-4 resources, shared across that project's tasks.
  // Different projects overlap since subsets are picked from the same sorted directory.
  const getProjectResourcePool = (projectId) => {
    const names = resources.map(r => r.full_name).filter(Boolean).sort();
    if (names.length === 0) return [];
    let h = 0;
    const s = String(projectId || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const count = Math.min(names.length, 3 + (h % 2)); // 3 or 4
    const start = h % names.length;
    const picked = [];
    for (let i = 0; i < count; i++) picked.push(names[(start + i) % names.length]);
    return picked;
  };

  const handleResourceHoursChange = (taskId, resource, hours) => {
    if (isReadOnly) return;
    const task = tasks.find(t => t.id === taskId);
    const rh = [...(task?.resource_hours || [])];
    const idx = rh.findIndex(h => h.resource === resource);
    const val = hours === '' ? null : Number(hours);
    if (idx >= 0) {
      if (val === null) rh.splice(idx, 1);
      else rh[idx] = { resource, hours: val };
    } else if (val !== null) {
      rh.push({ resource, hours: val });
    }
    updateTaskSafe(taskId, { resource_hours: rh });
  };

  const toggleExpand = (taskId) => {
    setExpandedRows(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const getVisibleProjectRows = (sourceTasks) => {
    const rows = [];
    const sorted = [...sourceTasks].sort((a, b) => (a.order ?? a.sort_order ?? 0) - (b.order ?? b.sort_order ?? 0));
    const visit = (task) => {
      rows.push(task);
      if (!expandedRows.includes(task.id)) return;
      sorted
        .filter(child => child.parent_task_id === task.id)
        .forEach(visit);
    };

    sorted
      .filter(task => !task.parent_task_id)
      .forEach(visit);

    return rows;
  };

  const handleDragEnd = (result) => {
    if (isReorderingTasks) return;
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    if (canReorderTasks) {
      const visibleRows = getVisibleProjectRows(displayTasks);
      const draggedTask = displayTasks.find(task => task.id === result.draggableId);
      const destinationTask = visibleRows[result.destination.index];

      if (!draggedTask || !destinationTask) return;

      const draggedParentId = draggedTask.parent_task_id || null;
      const destinationParentId = destinationTask.parent_task_id || null;
      if (draggedParentId !== destinationParentId) {
        alert('Tasks can only be reordered within the same parent in this step.');
        return;
      }

      const siblingTasks = displayTasks
        .filter(task => (task.parent_task_id || null) === draggedParentId)
        .sort((a, b) => (a.order ?? a.sort_order ?? 0) - (b.order ?? b.sort_order ?? 0));
      const sourceSiblingIndex = siblingTasks.findIndex(task => task.id === draggedTask.id);
      const destinationSiblingIndex = siblingTasks.findIndex(task => task.id === destinationTask.id);

      if (sourceSiblingIndex < 0 || destinationSiblingIndex < 0) return;

      const reorderedSiblings = [...siblingTasks];
      const [movedTask] = reorderedSiblings.splice(sourceSiblingIndex, 1);
      reorderedSiblings.splice(destinationSiblingIndex, 0, movedTask);

      onReorderTasks({
        parent_task_id: draggedParentId,
        ordered_task_ids: reorderedSiblings.map(task => task.id),
      });
      return;
    }

    if (isReadOnly) return;
    
    const items = Array.from(tasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    items.forEach((task, index) => {
      if (task.order !== index) {
        updateTaskSafe(task.id, { order: index });
      }
    });
  };

  const handleTaskTypeChange = (taskId, newType) => {
    if (isReadOnly) return;
    const updates = { task_type: newType };
    if (newType === 'milestone') {
      updates.duration = 0;
    }
    updateTaskSafe(taskId, updates);
  };

  const renderPrioritySafeState = (message, onRetry) => (
    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 px-1">
      <span className="truncate">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onRetry(); }}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );

  const isResourceOnVacation = (task) => {
    if (!task.resources || task.resources.length === 0 || !task.start_date || !task.due_date) {
      return false;
    }

    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.due_date);

    return task.resources.some(resource => {
      return vacations.some(vacation => {
        if (vacation.resource_name !== resource) return false;
        const vacStart = new Date(vacation.start_date);
        const vacEnd = new Date(vacation.end_date);
        return (taskStart <= vacEnd && taskEnd >= vacStart);
      });
    });
  };

  const applyCellFormatting = (cellKey) => {
    const formatting = cellFormatting[cellKey] || cellFormatting;
    const styles = {};
    
    if (formatting.font) styles.fontFamily = formatting.font;
    if (formatting.fontSize) styles.fontSize = `${formatting.fontSize}px`;
    if (formatting.bold) styles.fontWeight = 'bold';
    if (formatting.italic) styles.fontStyle = 'italic';
    if (formatting.underline || formatting.strikethrough) {
      styles.textDecoration = [
        formatting.underline ? 'underline' : '',
        formatting.strikethrough ? 'line-through' : ''
      ].filter(Boolean).join(' ');
    }
    if (formatting.bgColor) styles.backgroundColor = formatting.bgColor;
    if (formatting.fontColor) styles.color = formatting.fontColor;
    if (formatting.textAlign) styles.textAlign = formatting.textAlign;
    
    return styles;
  };

  const handleFormatChange = (newFormatting) => {
    if (isReadOnly) return;
    if (selectedCell) {
      setCellFormatting(prev => ({ ...prev, [selectedCell]: newFormatting }));
    }
  };

  const handleEditTitle = () => {
    if (isReadOnly) return;
    setTitleInput(project?.name || '');
    setEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (isReadOnly) {
      setEditingTitle(false);
      return;
    }
    if (titleInput && onUpdateProject) {
      updateProjectSafe(project.id, { name: titleInput });
    }
    setEditingTitle(false);
  };

  // Get display tasks based on view mode
  const getDisplayData = () => {
    if (viewMode === 'project') {
      return { tasks: [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0)), groups: null };
    } else if (viewMode === 'program') {
      const programProjects = projects.filter(p => p.program_id === project?.id);
      return { 
        tasks: [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0)), 
        groups: programProjects.map(p => ({
          ...p,
          type: 'project',
          tasks: tasks.filter(t => t.project_id === p.id).sort((a, b) => (a.order || 0) - (b.order || 0))
        }))
      };
    } else {
      return {
        tasks: [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0)),
        groups: [
          ...programs.map(pr => ({
            ...pr,
            type: 'program',
            projects: projects.filter(p => p.program_id === pr.id)
          })),
          ...projects.filter(p => !p.program_id).map(p => ({
            ...p,
            type: 'project'
          }))
        ]
      };
    }
  };

  const { tasks: displayTasks, groups } = getDisplayData();

  const getSelectedCellTaskId = () => {
    if (!selectedCell) return null;
    return displayTasks.find(task => selectedCell.startsWith(`${task.id}-`))?.id || null;
  };

  const getHierarchyActionTaskIds = () => {
    const ids = selectedTasks.length > 0 ? selectedTasks : [getSelectedCellTaskId()].filter(Boolean);
    return ids.filter((id, index) => ids.indexOf(id) === index);
  };

  const isHierarchyTaskPending = (taskId) => Boolean(hierarchyPendingTaskIds[taskId]);

  const getSortedSiblings = (task) => displayTasks
    .filter(candidate => (candidate.parent_task_id || null) === (task.parent_task_id || null))
    .sort((a, b) => (a.order ?? a.sort_order ?? 0) - (b.order ?? b.sort_order ?? 0));

  const getIndentTargetTask = (task) => {
    if (!task) return null;
    const sortedSiblings = getSortedSiblings(task);
    const siblingIndex = sortedSiblings.findIndex(item => item.id === task.id);
    if (siblingIndex <= 0) return null;

    const previousEligibleTask = sortedSiblings[siblingIndex - 1];
    if (!previousEligibleTask?.id) return null;
    if (previousEligibleTask.id === task.id) return null;
    if (isHierarchyTaskPending(previousEligibleTask.id)) return null;
    if (isTaskDescendantOf(previousEligibleTask.id, task.id)) return null;

    return previousEligibleTask;
  };

  const canIndentHierarchyTask = (taskId) => {
    if (!canUseHierarchyActions || isHierarchyTaskPending(taskId)) return false;
    const task = displayTasks.find(item => item.id === taskId);
    return Boolean(getIndentTargetTask(task));
  };

  const canOutdentHierarchyTask = (taskId) => {
    if (!canUseHierarchyActions || isHierarchyTaskPending(taskId)) return false;
    const task = displayTasks.find(item => item.id === taskId);
    return Boolean(task?.parent_task_id);
  };

  const hierarchyActionTaskIds = getHierarchyActionTaskIds();
  const canIndentSelectedTasks = hierarchyActionTaskIds.length > 0 && hierarchyActionTaskIds.every(canIndentHierarchyTask);
  const canOutdentSelectedTasks = hierarchyActionTaskIds.length > 0 && hierarchyActionTaskIds.every(canOutdentHierarchyTask);

  const renderCell = (task, column, allTasks, projectColor) => {
    const cellKey = `${task.id}-${column.key}`;
    const isSelected = selectedCell === cellKey;
    const children = allTasks.filter(t => t.parent_task_id === task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedRows.includes(task.id);
    const indentLevel = task.indent_level || 0;
    const cellStyles = applyCellFormatting(cellKey);

    const cellStyle = { width: colWidths[column.key], minWidth: colWidths[column.key], maxWidth: colWidths[column.key], overflow: 'hidden' };
    const cellClass = cn(
      "border-r border-slate-200 px-1 h-8",
      isSelected && "ring-2 ring-inset ring-blue-500 bg-blue-50",
      column.align === 'center' && "text-center"
    );

    switch (column.key) {
      case 'checkbox':
        return (
          <td key={cellKey} className={cn(cellClass, "bg-slate-50")} style={{ ...cellStyle, ...cellStyles }}>
            <input
              type="checkbox"
              checked={selectedTasks.includes(task.id)}
              onChange={() => handleToggleTaskSelection(task.id)}
              className="w-3 h-3 cursor-pointer"
            />
          </td>
        );

      case 'row':
        const isDeletingTask = Boolean(deletingTaskIds[task.id]);
        return (
          <td key={cellKey} className={cn(cellClass, 'text-xs text-slate-400 font-mono bg-slate-50 select-none')} style={{ ...cellStyle, ...cellStyles }}>
            <div className="flex items-center justify-center">
              <span className="group-hover:hidden">{getRowNumber(task, allTasks)}</span>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button title="Copy (Ctrl+C)" onClick={e => { e.stopPropagation(); handleCopyTask(task); }} className="hover:text-indigo-600 p-0.5"><Copy className="w-3 h-3" /></button>
                {canDeleteTask && <button title={isDeletingTask ? 'Deleting task…' : 'Delete row'} disabled={isDeletingTask} onClick={e => { e.stopPropagation(); deleteTaskSafe(task.id); }} className={cn("p-0.5", isDeletingTask ? "text-slate-300 cursor-not-allowed" : "hover:text-red-500")}>
                  {isDeletingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>}
              </div>
            </div>
          </td>
        );

      case 'drag':
        return (
          <td key={cellKey} className={cn(cellClass, "bg-slate-50 cursor-grab")} style={{ ...cellStyle, ...cellStyles }}>
            <GripVertical className="w-3 h-3 text-slate-300 mx-auto" />
          </td>
        );
      
      case 'attachments':
        const comments = task.comments || [];
        const attachments = task.attachments || [];
        return (
          <td key={cellKey} className={cn(cellClass, "bg-slate-50")} style={{ ...cellStyle, ...cellStyles }}>
            <div className="flex items-center justify-center gap-0.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 relative">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    {comments.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 text-white text-[8px] rounded-full flex items-center justify-center">
                        {comments.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2">
                  <div className="space-y-2 max-h-60 overflow-y-auto mb-2">
                    {comments.map((c, i) => (
                      <div key={i} className="text-xs bg-slate-50 p-2 rounded group relative">
                        {editingComment === `${task.id}-${i}` ? (
                          <div>
                            <Input
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              disabled={isReadOnly}
                              className="h-7 text-xs mb-1"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs" disabled={isReadOnly} onClick={() => handleEditComment(task.id, i, editCommentText)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => {
                                setEditingComment(null);
                                setEditCommentText('');
                              }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p>{c.text}</p>
                            <p className="text-slate-400 mt-1">
                              {c.author} • {format(new Date(c.date), 'MMM d')}
                              {c.editedDate && ` • Edited ${format(new Date(c.editedDate), 'MMM d')}`}
                            </p>
                            {!isReadOnly && <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-5 w-5 p-0"
                                onClick={() => {
                                  setEditingComment(`${task.id}-${i}`);
                                  setEditCommentText(c.text);
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-5 w-5 p-0 text-red-500"
                                onClick={() => handleDeleteComment(task.id, i)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add comment..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      disabled={isReadOnly}
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && commentInput) {
                          handleAddComment(task.id, commentInput);
                        }
                      }}
                    />
                    <Button size="sm" className="h-7" disabled={isReadOnly} onClick={() => handleAddComment(task.id, commentInput)}>
                      Add
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 relative">
                    <Paperclip className="w-3 h-3 text-slate-400" />
                    {attachments.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-[8px] rounded-full flex items-center justify-center">
                        {attachments.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <p className="text-xs text-slate-500 mb-2">Attachments</p>
                  {attachments.length === 0 && (
                    <p className="text-xs text-slate-400">No attachments</p>
                  )}
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs" disabled={isReadOnly}>
                    <Plus className="w-3 h-3 mr-1" /> Add file
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </td>
        );

      case 'task_type': {
        // API-backed sheets use the account's task type options, keyed by task_type_id.
        const useApiTypes = Boolean(onUpdateTaskType && apiTaskTypeOptions?.length);
        const rowTypeOptions = useApiTypes
          ? apiTaskTypeOptions.map(option => ({ ...getTaskTypeStyle(option), value: option.value, label: option.label }))
          : taskTypeOptions;
        const typeValue = useApiTypes ? (task.task_type_id || undefined) : (task.task_type || 'activity');
        const typeOption = rowTypeOptions.find(t => t.value === typeValue)
          || (useApiTypes ? getTaskTypeStyle({ name: task.task_type }) : taskTypeOptions[1]);
        const TypeIcon = typeOption.icon;
        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <Select 
              value={typeValue} 
              onValueChange={(value) => {
                if (!useApiTypes) {
                  handleTaskTypeChange(task.id, value);
                  return;
                }
                if (value === task.task_type_id) return;
                Promise.resolve(onUpdateTaskType(task.id, { task_type_id: value }))
                  .catch(error => alert(getBackendSafeMessage(error, 'We could not save this task type. Please try again.')));
              }}
              disabled={!useApiTypes && isReadOnly}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs">
                <SelectValue>
                  <div className="flex items-center justify-center">
                    <TypeIcon className={cn("w-3.5 h-3.5", typeOption.color)} />
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rowTypeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-3 h-3", option.color)} />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </td>
        );
      }
      
      case 'title':
        const hasVacationConflict = isResourceOnVacation(task);
        const vacationResources = task.resources?.filter(resource => {
          return vacations.some(vacation => {
            if (vacation.resource_name !== resource) return false;
            const taskStart = new Date(task.start_date);
            const taskEnd = new Date(task.due_date);
            const vacStart = new Date(vacation.start_date);
            const vacEnd = new Date(vacation.end_date);
            return (taskStart <= vacEnd && taskEnd >= vacStart);
          });
        }) || [];
        
        return (
          <td 
            key={cellKey} 
            className={cn(cellClass, "text-left")}
            style={{ paddingLeft: `${4 + indentLevel * 16}px`, ...cellStyles }}
            onClick={() => setSelectedCell(cellKey)}
          >
            <div className="flex items-center gap-1">
              {hasVacationConflict && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <User className="w-3 h-3 text-orange-500 flex-shrink-0 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Resource unavailable: {vacationResources.join(', ')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {projectColor && (
                <div className="w-1 h-5 rounded-full mr-1" style={{ backgroundColor: projectColor }} />
              )}
              {(() => {
                const _s = [...allTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const _i = _s.findIndex(t => t.id === task.id);
                const _next = _i >= 0 ? _s[_i + 1] : null;
                const _hasIndentKids = !hasChildren && _next && (_next.indent_level || 0) > (task.indent_level || 0);
                const _isParent = hasChildren || _hasIndentKids;
                if (!_isParent) return indentLevel > 0 ? <div className="w-4" /> : null;
                const _isExp = hasChildren ? isExpanded : !expandedRows.includes(task.id);
                return (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }} className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0">
                    {_isExp ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                  </button>
                );
              })()}
              <Input
                key={onUpdateTaskTitle ? `title:${task.title || ''}` : undefined}
                {...(onUpdateTaskTitle ? {
                  ...getCommitOnBlurProps(task.title, (value) => {
                    if (!value) throw new Error('Task name cannot be empty.');
                    return onUpdateTaskTitle(task.id, { title: value });
                  }),
                } : {
                  value: task.title || '',
                  readOnly: !canEditTitle,
                  onChange: (e) => updateTaskSafe(task.id, { title: e.target.value }),
                })}
                className={cn(
                  "border-0 bg-transparent focus-visible:ring-0 h-7 px-1 text-sm",
                  (() => {
                    const _s = [...allTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    const _i = _s.findIndex(t => t.id === task.id);
                    const _n = _i >= 0 ? _s[_i + 1] : null;
                    return (hasChildren || (_n && (_n.indent_level || 0) > (task.indent_level || 0))) && 'font-bold';
                  })()
                )}
                placeholder="Task name"
                style={{ ...cellStyle, ...cellStyles }}
              />
            </div>
          </td>
        );
      
      case 'duration': {
        const durVal = task.task_type === 'milestone' ? 0 : (task.start_date && task.due_date ? calculateDuration(task.start_date, task.due_date) : (task.duration || 0));
        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <input
              type="number"
              min="0"
              key={onUpdateTaskDuration ? `duration:${durVal}` : undefined}
              {...(onUpdateTaskDuration
                ? getCommitOnBlurProps(durVal, (value) => onUpdateTaskDuration(task.id, { duration: value }))
                : { value: durVal, onChange: (e) => updateTaskSafe(task.id, { duration: parseInt(e.target.value) || 0 }) })}
              disabled={!canEditDuration || task.task_type === 'milestone'}
              className="w-full h-full bg-transparent border-0 outline-none text-sm text-center px-1 focus:ring-1 focus:ring-inset focus:ring-blue-400"
            />
          </td>
        );
      }
      
      case 'start_date':
        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <Input
              type="date"
              key={onUpdateTaskSchedule ? `start:${task.start_date || ''}` : undefined}
              {...(onUpdateTaskSchedule
                ? getCommitOnBlurProps(task.start_date, (value) => onUpdateTaskSchedule(task.id, { start_date: value }))
                : {
                  value: task.start_date || '',
                  readOnly: !canEditSchedule,
                  onChange: (e) => {
                    const newStart = e.target.value;
                    const updates = { start_date: newStart };
                    if (newStart && task.due_date) updates.duration = calculateDuration(newStart, task.due_date);
                    updateTaskSafe(task.id, updates);
                  },
                })}
              className="border-0 bg-transparent focus-visible:ring-0 h-7 text-xs w-full"
            />
          </td>
        );
      
      case 'due_date':
        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <Input
              type="date"
              key={onUpdateTaskSchedule ? `finish:${task.due_date || ''}` : undefined}
              {...(onUpdateTaskSchedule
                ? getCommitOnBlurProps(task.due_date, (value) => onUpdateTaskSchedule(task.id, { finish_date: value }))
                : {
                  value: task.due_date || '',
                  readOnly: !canEditSchedule,
                  onChange: (e) => {
                    const newEnd = e.target.value;
                    const updates = { due_date: newEnd };
                    if (task.start_date && newEnd) updates.duration = calculateDuration(task.start_date, newEnd);
                    updateTaskSafe(task.id, updates);
                  },
                })}
              className="border-0 bg-transparent focus-visible:ring-0 h-7 text-xs w-full"
            />
          </td>
        );
      
      case 'predecessors':
        if (canEditPredecessors) {
          const predecessorIds = getTaskPredecessorIds(task);
          const predecessorCandidates = getPredecessorCandidateTasks(task);
          const isPredecessorPending = Boolean(predecessorPendingTaskIds[task.id]);

          return (
            <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    value={formatPredecessors(task, allTasks)}
                    readOnly
                    disabled={isPredecessorPending}
                    className="border-0 bg-transparent focus-visible:ring-0 h-7 text-sm text-center w-full cursor-pointer disabled:cursor-not-allowed"
                    placeholder=""
                  />
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" onClick={e => e.stopPropagation()}>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Predecessors</p>
                      {predecessorIds.length === 0 ? (
                        <p className="text-xs text-slate-400 px-1 py-1">No predecessors linked.</p>
                      ) : (
                        <div className="space-y-1">
                          {predecessorIds.map(predecessorTaskId => {
                            const predecessorTask = allTasks.find(item => item.id === predecessorTaskId);
                            const predecessorLinkId = getPredecessorLinkId(task, predecessorTaskId);
                            return (
                              <div key={predecessorTaskId} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
                                <span className="truncate">
                                  {predecessorTask ? `${getRowNumber(predecessorTask, allTasks)}. ${predecessorTask.title || predecessorTask.name || 'Untitled Task'}` : 'Unknown task'}
                                </span>
                                <button
                                  type="button"
                                  disabled={isPredecessorPending || !predecessorLinkId}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removePredecessorSafe(task.id, predecessorLinkId);
                                  }}
                                  className={cn(
                                    "text-slate-400 hover:text-red-500 leading-none",
                                    (isPredecessorPending || !predecessorLinkId) && "cursor-not-allowed opacity-40 hover:text-slate-400"
                                  )}
                                  title={predecessorLinkId ? 'Remove predecessor' : 'This predecessor cannot be removed until it reloads with a link id.'}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Add predecessor</p>
                      <Select
                        disabled={isPredecessorPending || predecessorCandidates.length === 0}
                        onValueChange={(predecessorTaskId) => addPredecessorSafe(task.id, predecessorTaskId)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder={isPredecessorPending ? 'Updating…' : predecessorCandidates.length === 0 ? 'No valid tasks' : 'Select task'} />
                        </SelectTrigger>
                        <SelectContent>
                          {predecessorCandidates.map(candidate => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {getRowNumber(candidate, allTasks)}. {candidate.title || candidate.name || 'Untitled Task'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </td>
          );
        }

        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <Input
              value={formatPredecessors(task, allTasks)}
              readOnly={isReadOnly}
              onChange={(e) => updateTaskSafe(task.id, { predecessors: parsePredecessors(e.target.value, allTasks) })}
              className="border-0 bg-transparent focus-visible:ring-0 h-7 text-sm text-center w-full"
              placeholder=""
            />
          </td>
        );
      
      case 'status': {
        // API-backed sheets use the account's status options, keyed by status_id.
        const rowStatusOptions = onUpdateTaskStatus && taskStatusOptions ? taskStatusOptions : statusOptions;
        const statusValue = onUpdateTaskStatus && taskStatusOptions ? (task.status_id || undefined) : (task.status || 'not_started');
        const selectedStatus = rowStatusOptions.find(option => option.value === statusValue);
        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <Select 
              value={statusValue} 
              onValueChange={(value) => {
                if (!onUpdateTaskStatus) {
                  updateTaskSafe(task.id, { status: value });
                  return;
                }
                if (value === task.status_id) return;
                Promise.resolve(onUpdateTaskStatus(task.id, { status_id: value }))
                  .catch(error => alert(getBackendSafeMessage(error, 'We could not save this status. Please try again.')));
              }}
              disabled={!canEditStatus}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs">
                <SelectValue>
                  <span className={cn("px-1.5 py-0.5 rounded text-xs", selectedStatus?.color)}>
                    {selectedStatus?.label || task.status || 'Not Started'}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rowStatusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={cn("px-1.5 py-0.5 rounded text-xs", option.color)}>
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
        );
      }

      case 'priority': {
        const selectedPriorityOption = resolveTaskPriorityOption(task, priorityOptions, priorityDrafts);
        const existingPriorityLabel = getTaskPriorityLabel(task);
        const isPendingPriority = Boolean(priorityPendingTaskIds[task.id]);
        const priorityError = priorityErrors[task.id];
        const showUnresolvedLabelFallback = existingPriorityLabel && !task.priority_id && !selectedPriorityOption;

        let content = null;

        if (priorityOptionsState?.isLoading) {
          content = renderPrioritySafeState('Loading…');
        } else if (priorityOptionsState?.isError) {
          content = renderPrioritySafeState('Could not load', priorityOptionsState.onRetry);
        } else if (priorityOptionsState && !priorityOptionsState.hasOptionSet) {
          content = renderPrioritySafeState('No Priority set');
        } else if (priorityOptionsState && !priorityOptionsState.hasActiveOptions) {
          content = renderPrioritySafeState('No active values');
        } else if (showUnresolvedLabelFallback) {
          content = <PriorityBadge label={existingPriorityLabel} className="opacity-75" />;
        } else {
          content = (
            <Select
              value={selectedPriorityOption?.value}
              onValueChange={(value) => {
                if (!priorityOptions.some(option => option.value === value)) return;
                if (selectedPriorityOption?.value === value && task.priority_id === value) return;
                updateTaskPrioritySafe(task.id, value);
              }}
              disabled={!isPriorityEditable || isPendingPriority || !onUpdateTaskPriority}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs">
                <SelectValue placeholder="Priority">
                  <div className="flex items-center justify-center gap-1">
                    {isPendingPriority && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                    <PriorityBadge option={selectedPriorityOption} />
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <PriorityBadge option={option} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }} title={priorityError || (showUnresolvedLabelFallback ? 'Priority label could not be matched to an active option value.' : undefined)}>
            <div className="flex flex-col items-center justify-center gap-0.5">
              {content}
              {priorityError && <span className="text-[9px] text-red-500 leading-none truncate max-w-full">Save failed</span>}
            </div>
          </td>
        );
      }
      
      case 'resources':
        if (canEditResourceAssignments) {
          return renderApiResourceCell({
            task, kind: 'actual', cellKey, cellClass, style: { ...cellStyle, ...cellStyles },
            entries: getAssignmentEntries(task),
            chipClassName: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
            hoursClassName: 'text-indigo-500',
            onAdd: (resource) => addResourceAssignmentSafe(task, resource),
            onRemove: (entry) => removeResourceAssignmentSafe(task, entry),
            onSaveHours: (entry, value) => updateAssignmentHoursSafe(task, entry, value),
          });
        }
        const resources = task.resources || [];
        const isEditing = editingResources === task.id;
        return (
          <td key={cellKey} className={cn(cellClass, "text-left")} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <div className="flex flex-wrap items-center gap-1 px-1">
              {resources.map((resource, i) => {
                const hrs = getResourceHours(task, resource);
                return (
                  <Popover key={i} open={!isReadOnly && editingHours === `${task.id}|${resource}`} onOpenChange={v => { if (isReadOnly) return; if (v) { setEditingHours(`${task.id}|${resource}`); setHoursInput(hrs !== '' ? String(hrs) : ''); } else setEditingHours(null); }}>
                    <PopoverTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (isReadOnly) return; setEditingHours(`${task.id}|${resource}`); setHoursInput(hrs !== '' ? String(hrs) : ''); }}
                        title="Click to set hours allocated"
                        className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs transition-colors", !isReadOnly && "hover:bg-indigo-200")}
                      >
                        {shortName(resource)}
                        {hrs !== '' && <span className="text-[10px] font-semibold text-indigo-500">·{hrs}h</span>}
                        {!isReadOnly && <span
                          onClick={(e) => { e.stopPropagation(); handleResourceRemove(task.id, resource); }}
                          className="hover:text-red-500 leading-none"
                        >×</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-2" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-700">{resource}</p>
                        <p className="text-[10px] text-slate-400">Hours allocated to this task</p>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          autoFocus
                          value={hoursInput}
                          disabled={isReadOnly}
                          onChange={e => setHoursInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { handleResourceHoursChange(task.id, resource, hoursInput); setEditingHours(null); }
                            if (e.key === 'Escape') setEditingHours(null);
                          }}
                          className="h-7 text-sm"
                          placeholder="e.g. 8"
                        />
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingHours(null)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" disabled={isReadOnly} onClick={() => { handleResourceHoursChange(task.id, resource, hoursInput); setEditingHours(null); }}>Save</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
              {!isReadOnly && isEditing ? (
                (() => {
                  const assigned = resources;
                  const pool = getProjectResourcePool(task.project_id).filter(r => !assigned.includes(r));
                  return (
                    <Popover open onOpenChange={v => { if (!v) setEditingResources(null); }}>
                      <PopoverTrigger asChild>
                        <span className="text-xs text-indigo-600 px-1">+</span>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-1" onClick={e => e.stopPropagation()}>
                        <div className="max-h-48 overflow-y-auto">
                          {pool.length === 0 ? (
                            <p className="text-xs text-slate-400 px-2 py-1.5">All project resources assigned.</p>
                          ) : pool.map(name => (
                            <button
                              key={name}
                              onClick={(e) => { e.stopPropagation(); handleResourceAdd(task.id, name); }}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50 rounded flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              {name}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 px-2 pt-1 border-t mt-1">
                          {pool.length} of {getProjectResourcePool(task.project_id).length} shared project resources
                        </p>
                      </PopoverContent>
                    </Popover>
                  );
                })()
              ) : !isReadOnly ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingResources(task.id); }}
                  className="text-xs text-slate-400 hover:text-indigo-600"
                >
                  +
                </button>
              ) : null}
            </div>
          </td>
        );

      case 'resources_planned': {
        if (canEditResourceAssignments) {
          return renderApiResourceCell({
            task, kind: 'planned', cellKey, cellClass, style: { ...cellStyle, ...cellStyles },
            entries: getAllocationEntries(task),
            chipClassName: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
            hoursClassName: 'text-amber-500',
            onAdd: (resource) => addResourceAllocationSafe(task, resource),
            onRemove: (entry) => removeResourceAllocationSafe(task, entry),
            onSaveHours: (entry, value) => updateAllocationHoursSafe(task, entry, value),
          });
        }
        const planned = task.resources_planned || [];
        const getPlannedHours = (resource) => {
          const entry = (task.resource_hours_planned || []).find(h => h.resource === resource);
          return entry ? entry.hours : '';
        };
        return (
          <td key={cellKey} className={cn(cellClass, "text-left")} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <div className="flex flex-wrap items-center gap-1 px-1">
              {planned.length === 0 ? (
                <span className="text-xs text-slate-300 italic">—</span>
              ) : planned.map((resource, i) => {
                const hrs = getPlannedHours(resource);
                return (
                  <span key={i} className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs" title="Planned resource">
                    {shortName(resource)}
                    {hrs !== '' && <span className="text-[10px] font-semibold text-amber-500">·{hrs}h</span>}
                  </span>
                );
              })}
            </div>
          </td>
        );
      }
      
      case 'progress':
        return (
          <td key={cellKey} className={cellClass} onClick={() => setSelectedCell(cellKey)} style={{ ...cellStyle, ...cellStyles }}>
            <div className="flex items-center gap-1 px-1">
              <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                <div 
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{ width: `${task.progress || 0}%` }}
                />
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                key={onUpdateTaskProgress ? `progress:${task.progress || 0}` : undefined}
                {...(onUpdateTaskProgress
                  ? getCommitOnBlurProps(task.progress || 0, (value) => onUpdateTaskProgress(task.id, { progress: value }))
                  : {
                    value: task.progress || 0,
                    readOnly: !canEditProgress,
                    onChange: (e) => updateTaskSafe(task.id, { progress: parseInt(e.target.value) || 0 }),
                  })}
                className="border-0 bg-transparent focus-visible:ring-0 h-7 text-xs w-10 p-0 text-center"
              />
            </div>
          </td>
        );

      case 'raid': {
        const raidIds = (() => { const v = task.raid_ids; if (!v) return []; try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {} return v ? [v] : []; })();
        const raidColor = (id) => { const p = id?.split('-')[0]; if (p === 'RL') return 'bg-orange-100 text-orange-700'; if (p === 'IL') return 'bg-red-100 text-red-700'; if (p === 'AL') return 'bg-teal-100 text-teal-700'; if (p === 'DL') return 'bg-[#002046]/10 text-[#002046]'; return 'bg-slate-100 text-slate-600'; };
        const saveRaid = (ids) => updateTaskSafe(task.id, { raid_ids: ids.length ? JSON.stringify(ids) : '' });
        const pRisks = risks.filter(r => r.project_id === task.project_id && !raidIds.includes(r.risk_id));
        const pIssues = issues.filter(i => i.project_id === task.project_id && !raidIds.includes(i.issue_id));
        const pAssumptions = assumptions.filter(a => a.project_id === task.project_id && !raidIds.includes(a.assumption_id));
        const pDecisions = decisions.filter(d => d.project_id === task.project_id && !raidIds.includes(d.decision_id));
        return (
          <td key={cellKey} className={cn(cellClass, 'text-left')} style={{ ...cellStyle, ...cellStyles }}>
            <div className="flex flex-wrap items-center gap-0.5 px-1">
              {raidIds.map(id => (
                <span key={id} className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono', raidColor(id))}>
                  {id}{!isReadOnly && <button onClick={e => { e.stopPropagation(); saveRaid(raidIds.filter(x => x !== id)); }} className="hover:text-red-500 ml-0.5">×</button>}
                </span>
              ))}
              {!isReadOnly && <Popover open={raidOpen === task.id} onOpenChange={v => setRaidOpen(v ? task.id : null)}>
                <PopoverTrigger asChild>
                  <button onClick={e => e.stopPropagation()} className="text-xs text-slate-400 hover:text-[#002046] px-0.5">+</button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" onClick={e => e.stopPropagation()}>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {pRisks.length > 0 && <div><p className="text-[10px] font-bold text-orange-500 uppercase px-1 mb-0.5">Risks</p>{pRisks.slice(0,15).map(r => <button key={r.id} onClick={() => { saveRaid([...raidIds, r.risk_id]); setRaidOpen(null); }} className="w-full text-left px-2 py-1 text-xs hover:bg-orange-50 rounded"><span className="font-mono text-orange-600">{r.risk_id}</span> <span className="text-slate-500">{r.title?.slice(0,25)}</span></button>)}</div>}
                    {pIssues.length > 0 && <div><p className="text-[10px] font-bold text-red-500 uppercase px-1 mb-0.5">Issues</p>{pIssues.slice(0,15).map(i => <button key={i.id} onClick={() => { saveRaid([...raidIds, i.issue_id]); setRaidOpen(null); }} className="w-full text-left px-2 py-1 text-xs hover:bg-red-50 rounded"><span className="font-mono text-red-600">{i.issue_id}</span> <span className="text-slate-500">{i.title?.slice(0,25)}</span></button>)}</div>}
                    {pAssumptions.length > 0 && <div><p className="text-[10px] font-bold text-teal-500 uppercase px-1 mb-0.5">Assumptions</p>{pAssumptions.slice(0,15).map(a => <button key={a.id} onClick={() => { saveRaid([...raidIds, a.assumption_id]); setRaidOpen(null); }} className="w-full text-left px-2 py-1 text-xs hover:bg-teal-50 rounded"><span className="font-mono text-teal-600">{a.assumption_id}</span> <span className="text-slate-500">{a.description?.slice(0,25)}</span></button>)}</div>}
                    {pDecisions.length > 0 && <div><p className="text-[10px] font-bold text-[#002046] uppercase px-1 mb-0.5">Decisions</p>{pDecisions.slice(0,15).map(d => <button key={d.id} onClick={() => { saveRaid([...raidIds, d.decision_id]); setRaidOpen(null); }} className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 rounded"><span className="font-mono text-[#002046]">{d.decision_id}</span> <span className="text-slate-500">{d.decision?.slice(0,25)}</span></button>)}</div>}
                    {!pRisks.length && !pIssues.length && !pAssumptions.length && !pDecisions.length && <p className="text-xs text-slate-400 px-2 py-1">No project control items to link.</p>}
                    <div className="border-t border-slate-100 mt-1 pt-1.5">
                      <Input placeholder="Add any ID…" className="h-7 text-xs"
                        onKeyDown={e => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) { saveRaid([...raidIds, v]); setRaidOpen(null); e.target.value = ''; } } }} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>}
            </div>
          </td>
        );
      }

      default:
        return <td key={cellKey} className={cellClass} style={{ ...cellStyle, ...cellStyles }}></td>;
    }
  };

  const renderTaskRow = (task, allTasks, index, projectColor = null) => {
    const children = allTasks.filter(t => t.parent_task_id === task.id);
    const isExpanded = expandedRows.includes(task.id);
    const visibleProjectRows = viewMode === 'project' ? getVisibleProjectRows(displayTasks) : [];
    const visibleProjectIndex = visibleProjectRows.findIndex(row => row.id === task.id);
    const draggableIndex = visibleProjectIndex >= 0 ? visibleProjectIndex : index;

    return (
      <Draggable key={task.id} draggableId={task.id} index={draggableIndex} isDragDisabled={(isReadOnly && !canReorderTasks) || isReorderingTasks}>
        {(provided) => (
          <React.Fragment>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <tr 
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={cn(
                    "group border-b border-slate-200 cursor-pointer",
                    task.status === 'complete' ? 'bg-emerald-50/40 hover:bg-emerald-50/60' :
                    task.status === 'blocked' ? 'bg-red-50/40 hover:bg-red-50/60' :
                    task.status === 'on_hold' ? 'bg-amber-50/40 hover:bg-amber-50/60' :
                    task.status === 'in_progress' ? 'bg-blue-50/20 hover:bg-blue-50/40' :
                    'hover:bg-blue-50/30'
                  )}
                >
                  {visibleColumns.map(col => renderCell(task, col, allTasks, projectColor))}
                </tr>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleCopyTask(task)}>
                  <Copy className="w-3 h-3 mr-2" /> Copy Task
                </ContextMenuItem>
                {canDeleteTask && <ContextMenuItem disabled={Boolean(deletingTaskIds[task.id])} onClick={() => deleteTaskSafe(task.id)} className="text-red-600">
                  {deletingTaskIds[task.id] ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Trash2 className="w-3 h-3 mr-2" />} Delete Task
                </ContextMenuItem>}
              </ContextMenuContent>
            </ContextMenu>
            {isExpanded && children.map((child, idx) => renderTaskRow(child, allTasks, index + idx + 1, projectColor))}
          </React.Fragment>
        )}
      </Draggable>
    );
  };

  const renderProjectHeader = (proj, type = 'project', isPlaceholder = false) => (
    <tr key={`header-${proj.id || proj.placeholder}`} className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
      <td colSpan={visibleColumns.length} className="py-2 px-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: proj.color || '#6366f1' }} />
          <span className={cn("font-semibold text-slate-700", isPlaceholder && "italic text-slate-400")}>{proj.name}</span>
          <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded capitalize">{type}</span>
          {proj.status && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded",
              proj.status === 'active' ? 'bg-green-100 text-green-700' :
              proj.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            )}>
              {proj.status}
            </span>
          )}
          {proj.start_date && proj.end_date && (
            <span className="text-xs text-slate-400 ml-auto">
              {format(new Date(proj.start_date), 'MMM d')} - {format(new Date(proj.end_date), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </td>
    </tr>
  );

  const renderPortfolioSummary = () => {
    if (viewMode !== 'portfolio') return null;
    
    const totalProjects = projects.length;
    const totalPrograms = programs.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedTasks = displayTasks.filter(t => t.status === 'done').length;
    const totalTasks = displayTasks.length;
    
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-slate-700 mb-3">Portfolio Overview</h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{totalPrograms}</p>
            <p className="text-xs text-slate-500">Programs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalProjects}</p>
            <p className="text-xs text-slate-500">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{activeProjects}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{totalTasks}</p>
            <p className="text-xs text-slate-500">Total Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%</p>
            <p className="text-xs text-slate-500">Complete</p>
          </div>
        </div>
      </div>
    );
  };

  const parentTasks = displayTasks.filter(t => !t.parent_task_id);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCell) {
        const taskId = selectedCell.split('-')[0];
        const task = displayTasks.find(t => t.id === taskId);
        if (task) handleCopyTask(task);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedTask) {
        handlePasteTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, copiedTask, displayTasks]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Project Title */}
      {!hideProjectHeader && viewMode === 'project' && project && (
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input value={titleInput} onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    className="text-2xl font-bold h-10 max-w-md" autoFocus />
                  <Button size="sm" onClick={handleSaveTitle}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingTitle(false)}>Cancel</Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-800">{project?.name}</h1>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditTitle}>
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </div>
                  {(() => {
                    const prog = programs.find(p => p.id === project?.program_id);
                    return prog && onGoBack ? (
                      <button onClick={onGoBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 group transition-colors mt-0.5">
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform flex-shrink-0" />
                        <span>Back to: <span className="text-indigo-500 font-medium">{prog.name}</span></span>
                      </button>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Manager Field */}
      {!hideProjectHeader && viewMode === 'project' && project && (
        <div className="flex items-center gap-2 mb-3">

          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Project Manager:</span>
          <div className="relative max-w-[240px]">
            <Input
              value={pmQuery !== null ? pmQuery : (project?.owner || '')}
              readOnly={isReadOnly}
              onChange={e => {
                setPmQuery(e.target.value);
                setPmDropOpen(true);
                updateProjectSafe(project.id, { owner: e.target.value });
              }}
              onFocus={() => { if (isReadOnly) return; setPmQuery(project?.owner || ''); setPmDropOpen(true); }}
              onBlur={() => setTimeout(() => { setPmDropOpen(false); setPmQuery(null); }, 200)}
              className="h-7 text-sm border-slate-200"
              placeholder="Search or type name..."
            />
            {pmDropOpen && resources.length > 0 && (
              <div className="absolute z-30 top-8 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                {resources
                  .filter(r => r.full_name.toLowerCase().includes((pmQuery || '').toLowerCase()))
                  .slice(0, 7)
                  .map(r => (
                    <button key={r.id}
                      onMouseDown={() => { updateProjectSafe(project.id, { owner: r.full_name }); setPmDropOpen(false); setPmQuery(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700">
                      {r.full_name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portfolio Summary */}
      {renderPortfolioSummary()}

      {/* Formatting Toolbar joined with spreadsheet */}
      <FormattingToolbar 
        formatting={cellFormatting[selectedCell] || {}}
        onFormattingChange={handleFormatChange}
        onSave={() => console.log('Save')}
        onIndent={canIndentSelectedTasks ? handleIndent : undefined}
        onOutdent={canOutdentSelectedTasks ? handleOutdent : undefined}
        indentDisabled={!canIndentSelectedTasks}
        outdentDisabled={!canOutdentSelectedTasks}
        onBulkInsert={() => { if (!isReadOnly) setBulkInsertDialogOpen(true); }}
        selectedCell={selectedCell}
        tasks={displayTasks}
        project={project}
      />

      <div className="flex-1 overflow-auto bg-white border-x border-b border-slate-300 shadow-sm">
        <DragDropContext onDragEnd={handleDragEnd}>
          <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-b from-slate-100 to-slate-200 border-b-2 border-slate-300">
                {visibleColumns.map(col => (
                  <th
                    key={col.key}
                    style={{ width: colWidths[col.key], minWidth: colWidths[col.key] }}
                    className={cn(
                      "relative py-2 px-2 text-xs font-semibold text-slate-700 border-r border-slate-300 select-none overflow-hidden",
                      col.align === 'center' && "text-center"
                    )}
                  >
                    {col.label}
                    <div
                      className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                      onMouseDown={e => { e.preventDefault(); handleColResize(col.key, e.clientX, colWidths[col.key]); }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <Droppable droppableId="tasks">
              {(provided) => (
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {viewMode === 'project' ? (
                    <>
                      {(() => {
                        const _sorted = [...displayTasks.filter(t => !t.parent_task_id)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                        const _vis = []; let _collLvl = null;
                        for (let _i = 0; _i < _sorted.length; _i++) {
                          const _t = _sorted[_i]; const _lvl = _t.indent_level || 0;
                          if (_collLvl !== null && _lvl > _collLvl) continue;
                          _collLvl = null; _vis.push(_t);
                          const _nx = _sorted[_i + 1];
                          if (_nx && (_nx.indent_level || 0) > _lvl && expandedRows.includes(_t.id)) _collLvl = _lvl;
                        }
                        return _vis.map((_t, _idx) => renderTaskRow(_t, displayTasks, _idx));
                      })()}
                      {provided.placeholder}
                      {Array.from({ length: 12 }, (_, i) => (
                        <tr key={`phantom-${i}`} className="border-b border-slate-100 hover:bg-blue-50/20">
                          <td className="border-r border-slate-200 px-1 h-8 text-xs text-slate-200 font-mono bg-slate-50 text-center w-10 select-none">{displayTasks.length + i + 1}</td>
                          <td className="border-r border-slate-200 w-12 bg-slate-50 h-8" />
                          <td className="border-r border-slate-200 w-16 bg-slate-50 h-8" />
                          <td className="border-r border-slate-200 min-w-[220px] h-8">
                            <input
                              readOnly={isReadOnly}
                              className="w-full h-8 px-2 text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-300 rounded text-slate-700"
                              onBlur={e => { if (isReadOnly) return; const t = e.target.value.trim(); if (t) { addTaskSafe({ title: t, project_id: project?.id, order: displayTasks.length + i, task_type: 'activity', duration: 1 }); e.target.value = ''; } }}
                              onKeyDown={e => { if (isReadOnly) return; if (e.key === 'Enter') { const t = e.target.value.trim(); if (t) { addTaskSafe({ title: t, project_id: project?.id, order: displayTasks.length + i, task_type: 'activity', duration: 1 }); e.target.value = ''; } } }}
                            />
                          </td>
                          {visibleColumns.slice(4).map(col => <td key={col.key} className={cn('border-r border-slate-200 h-8', col.width)} />)}
                        </tr>
                      ))}
                    </>
                  ) : viewMode === 'program' && groups ? (
                    <>
                      {groups.map(proj => {
                        const projectTasks = displayTasks.filter(t => t.project_id === proj.id);
                        const projectParentTasks = projectTasks.filter(t => !t.parent_task_id);
                        return (
                          <React.Fragment key={proj.id}>
                            {renderProjectHeader(proj)}
                            {projectParentTasks.map((task, index) => renderTaskRow(task, projectTasks, index, proj.color))}
                            <tr className="border-b border-slate-200 hover:bg-slate-50">
                              <td colSpan={visibleColumns.length} className="px-4 py-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-600 h-6 text-xs"
                                  onClick={() => handleQuickAdd(proj.id)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Task to {proj.name}
                                </Button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      {/* Placeholder sections */}
                      {['Project A', 'Project B', 'Project C'].filter(name => 
                        !groups.some(g => g.name === name)
                      ).map((placeholderName, idx) => (
                        <React.Fragment key={`placeholder-${idx}`}>
                          {renderProjectHeader(
                            { placeholder: idx, name: placeholderName, color: '#e5e7eb' }, 
                            'project',
                            true
                          )}
                          <tr className="border-b border-slate-200 hover:bg-slate-50">
                            <td colSpan={visibleColumns.length} className="px-4 py-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-slate-600 h-6 text-xs italic"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Project
                              </Button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </>
                  ) : viewMode === 'portfolio' && groups ? (
                    groups.map(item => {
                      if (item.type === 'program') {
                        return (
                          <React.Fragment key={`program-${item.id}`}>
                            {renderProjectHeader(item, 'program')}
                            {item.projects?.map(proj => {
                              const projectTasks = displayTasks.filter(t => t.project_id === proj.id);
                              const projectParentTasks = projectTasks.filter(t => !t.parent_task_id);
                              return (
                                <React.Fragment key={proj.id}>
                                  {renderProjectHeader(proj, 'project')}
                                  {projectParentTasks.map((task, index) => renderTaskRow(task, projectTasks, index, proj.color))}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      } else {
                        const projectTasks = displayTasks.filter(t => t.project_id === item.id);
                        const projectParentTasks = projectTasks.filter(t => !t.parent_task_id);
                        return (
                          <React.Fragment key={item.id}>
                            {renderProjectHeader(item)}
                            {projectParentTasks.map((task, index) => renderTaskRow(task, projectTasks, index, item.color))}
                          </React.Fragment>
                        );
                      }
                    })
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="text-center py-8 text-slate-400">
                        No data to display
                      </td>
                    </tr>
                  )}
                </tbody>
              )}
            </Droppable>
          </table>
        </DragDropContext>
      </div>

      {/* Bulk Insert Dialog */}
      <Dialog open={bulkInsertDialogOpen} onOpenChange={setBulkInsertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Multiple Tasks</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Number of tasks to add</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={bulkInsertCount}
              onChange={(e) => setBulkInsertCount(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkInsertDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkInsert}>Insert Tasks</Button>
          </div>
        </DialogContent>
      </Dialog>




      </div>
      );
      }