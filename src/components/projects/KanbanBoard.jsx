import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Calendar, Search, Filter, MoreVertical, Pencil, Palette, Trash2, Plus, PlusCircle, User, Columns3, Circle, Diamond, Package, Layers, Flag, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserPref } from '@/lib/userPrefs';
import { parseDate } from '@/lib/dateUtils';

const NAVY = '#002046';
const FALLBACK_COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', color: 'bg-purple-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
];
// Column colours offered in the column menu (header tint; stored on the task status).
const SWATCHES = ['#DCE7FB', '#FBDDDD', '#DDF3E6', '#FCF0C9', '#E6E0FB', '#E2E8F0'];
const TYPE_ICONS = { milestone: Diamond, activity: Circle, deliverable: Package, work_package: Layers, phase: Flag };
const TYPE_COLORS = { milestone: '#0E9254', activity: '#2F4B7E', deliverable: '#6D28D9', work_package: '#1A73F0', phase: '#0E7490' };

const typeKey = (task) => String(task.task_type?.value || task.task_type?.label || task.task_type || '').trim().toLowerCase().replace(/\s+/g, '_');
const typeLabel = (task) => task.task_type?.label || (typeof task.task_type === 'string' ? task.task_type : '');
const assigneeOf = (task) => task.assignments?.[0]?.resource_name || task.assignee || '';
const shortName = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || '';
};

/**
 * Task board: one column per task status, cards dragged between them.
 * Column management (rename, recolour, delete, add) changes the account's task statuses, so it is offered only
 * when canManageColumns; onRenameColumn(column, title), onRecolorColumn(column, hex), onDeleteColumn(column),
 * onAddColumn(title). onAddTask(column, title) adds a task straight into a column.
 */
export default function KanbanBoard({
  tasks, columns: boardColumns, onTaskClick, onTaskUpdate, readOnly = false, allowDrag = false, boardPositionMode = false,
  canManageColumns = false, manageColumnsHint = undefined, onRenameColumn = undefined, onRecolorColumn = undefined, onDeleteColumn = undefined,
  onAddColumn = undefined, onAddTask = undefined,
}) {
  const columnsToRender = boardColumns?.length ? boardColumns : FALLBACK_COLUMNS;
  const canDrag = !readOnly || allowDrag;
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [addingTaskIn, setAddingTaskIn] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [hideEmptyColumns, setHideEmptyColumns] = useUserPref('board_hide_empty_columns', false);

  const matches = (task) => {
    if (search && !String(task.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (assignee && assigneeOf(task) !== assignee) return false;
    return true;
  };
  const getTasksByStatus = (status) => tasks.filter(t => t.status === status && matches(t));
  const visibleColumns = hideEmptyColumns
    ? columnsToRender.filter(column => getTasksByStatus(column.id).length > 0)
    : columnsToRender;
  const hiddenCount = columnsToRender.length - visibleColumns.length;
  const people = [...new Set(tasks.map(assigneeOf).filter(Boolean))].sort();

  const handleDragStart = (e, taskId) => {
    if (!canDrag) return;
    e.dataTransfer.setData('taskId', taskId);
  };
  const handleDragOver = (e) => {
    if (!canDrag) return;
    e.preventDefault();
  };
  const handleDrop = (e, status) => {
    if (!canDrag) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const sortOrder = tasks.filter(task => task.status === status && task.id !== taskId).length;
    onTaskUpdate?.(taskId, boardPositionMode ? { status_id: status, sort_order: sortOrder } : { status });
  };

  const commitRename = (column) => {
    const title = renameText.trim();
    setRenaming(null);
    if (title && title !== column.title) onRenameColumn?.(column, title);
  };
  const commitNewColumn = () => {
    const title = newColumnTitle.trim();
    setAddingColumn(false);
    setNewColumnTitle('');
    if (title) onAddColumn?.(title);
  };
  const commitNewTask = (column) => {
    const title = newTaskTitle.trim();
    setAddingTaskIn(null);
    setNewTaskTitle('');
    if (title) onAddTask?.(column, title);
  };
  const editable = (column) => canManageColumns && !column.is_uncategorized;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks" className="h-9 pl-9 bg-white" />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-9 gap-1.5 bg-white', assignee && 'border-[#002046]')}>
              <Filter className="w-4 h-4" /> Filters{assignee ? ': 1' : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="text-[10px] font-semibold uppercase text-slate-400 px-1 mb-1">Assignee</p>
            <button type="button" onClick={() => setAssignee('')} className={cn('w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50', !assignee && 'font-semibold')}>Everyone</button>
            {people.map(p => (
              <button key={p} type="button" onClick={() => setAssignee(p)} className={cn('w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50', assignee === p && 'font-semibold')}>{p}</button>
            ))}
          </PopoverContent>
        </Popover>
        <label htmlFor="board-hide-empty" className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <Switch id="board-hide-empty" checked={hideEmptyColumns} onCheckedChange={setHideEmptyColumns} />
          Hide empty columns
          {hiddenCount > 0 && <span className="text-xs text-slate-400">({hiddenCount} hidden)</span>}
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white ml-auto"><Columns3 className="w-4 h-4" /> Manage columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-slate-500">
              {canManageColumns ? 'Columns are your account’s task statuses, so changes apply to every project.' : (manageColumnsHint || 'Only the account owner can change columns.')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columnsToRender.map(column => (
              <DropdownMenuItem key={column.id} disabled={!editable(column)} onClick={() => { setRenaming(column.id); setRenameText(column.title); }}>
                <span className="w-3 h-3 rounded-full mr-2 border border-slate-200" style={{ backgroundColor: column.hex || '#E2E8F0' }} />
                {column.title}
                {editable(column) && <Pencil className="w-3 h-3 ml-auto text-slate-400" />}
              </DropdownMenuItem>
            ))}
            {canManageColumns && onAddColumn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAddingColumn(true)}><Plus className="w-4 h-4 mr-2" /> Add column</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max p-1 items-start">
          {visibleColumns.map(column => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="w-[300px] flex-shrink-0 rounded-xl bg-slate-50/80"
                onDragOver={canDrag ? handleDragOver : undefined}
                onDrop={canDrag ? (e) => handleDrop(e, column.id) : undefined}>
                <div className={cn('rounded-t-xl px-4 py-3 flex items-center gap-2', !column.hex && (column.color || 'bg-slate-100'))}
                  style={column.hex ? { backgroundColor: column.hex } : undefined}>
                  {renaming === column.id ? (
                    <Input value={renameText} autoFocus onChange={e => setRenameText(e.target.value)} onBlur={() => commitRename(column)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(column); if (e.key === 'Escape') setRenaming(null); }}
                      className="h-8 text-base font-bold bg-white" />
                  ) : (
                    <h3 className="text-lg font-bold truncate flex-1" style={{ color: NAVY }} title={column.title}
                      onDoubleClick={() => { if (editable(column)) { setRenaming(column.id); setRenameText(column.title); } }}>{column.title}</h3>
                  )}
                  <span className="min-w-[28px] h-7 px-2 rounded-full bg-white text-sm font-semibold flex items-center justify-center" style={{ color: NAVY }}>{columnTasks.length}</span>
                  {editable(column) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-1 rounded hover:bg-white/60" aria-label={`${column.title} column options`}><MoreVertical className="w-4 h-4" style={{ color: NAVY }} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => { setRenaming(column.id); setRenameText(column.title); }}><Pencil className="w-4 h-4 mr-2" /> Edit column title</DropdownMenuItem>
                        <DropdownMenuLabel className="flex items-center text-sm font-normal"><Palette className="w-4 h-4 mr-2" /> Change color</DropdownMenuLabel>
                        <div className="flex gap-1.5 px-3 pb-2">
                          {SWATCHES.map(hex => (
                            <button key={hex} type="button" onClick={() => onRecolorColumn?.(column, hex)} aria-label={`Colour ${hex}`}
                              className={cn('w-6 h-6 rounded-md border', column.hex?.toLowerCase() === hex.toLowerCase() ? 'border-[#002046] ring-1 ring-[#002046]' : 'border-slate-200')}
                              style={{ backgroundColor: hex }} />
                          ))}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDeleteColumn?.(column)}><Trash2 className="w-4 h-4 mr-2" /> Delete column</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="p-3 space-y-3">
                  {columnTasks.map(task => {
                    const key = typeKey(task);
                    const TypeIcon = TYPE_ICONS[key] || Circle;
                    const person = assigneeOf(task);
                    const due = task.due_date ? parseDate(task.due_date) : null;
                    const progress = Math.round(Number(task.progress) || 0);
                    const blocked = /block/i.test(column.title);
                    return (
                      <div key={task.id}
                        className={cn('bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-shadow', onTaskClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default')}
                        draggable={canDrag}
                        onDragStart={canDrag ? (e) => handleDragStart(e, task.id) : undefined}
                        onClick={() => onTaskClick?.(task)}>
                        <p className="font-bold text-[15px] leading-snug break-words" style={{ color: NAVY }}>{task.title}</p>
                        {typeLabel(task) && (
                          <p className="flex items-center gap-1.5 text-sm mt-1" style={{ color: TYPE_COLORS[key] || '#2F4B7E' }}>
                            <TypeIcon className="w-4 h-4" /> {typeLabel(task)}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3 text-sm" style={{ color: NAVY }}>
                          <span className="flex items-center gap-1.5 min-w-0"><User className="w-4 h-4 flex-shrink-0" /><span className="truncate">{person ? shortName(person) : 'Unassigned'}</span></span>
                          {due && <span className="flex items-center gap-1.5 flex-shrink-0"><Calendar className="w-4 h-4" />{format(due, 'MMM d')}</span>}
                        </div>
                        {progress > 0 && progress < 100 && (
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div>
                            <span className="text-sm" style={{ color: NAVY }}>{progress}%</span>
                          </div>
                        )}
                        {blocked && (
                          <p className="flex items-center gap-1.5 mt-3 px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium w-fit"><AlertTriangle className="w-3.5 h-3.5" /> Needs attention</p>
                        )}
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 && <p className="text-center py-6 text-slate-400 text-sm">No tasks</p>}

                  {onAddTask && !column.is_uncategorized && (addingTaskIn === column.id ? (
                    <Input value={newTaskTitle} autoFocus placeholder="Task name, then Enter" onChange={e => setNewTaskTitle(e.target.value)}
                      onBlur={() => commitNewTask(column)}
                      onKeyDown={e => { if (e.key === 'Enter') commitNewTask(column); if (e.key === 'Escape') { setAddingTaskIn(null); setNewTaskTitle(''); } }}
                      className="h-10 bg-white" />
                  ) : (
                    <button type="button" onClick={() => setAddingTaskIn(column.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50" style={{ color: NAVY }}>
                      <Plus className="w-4 h-4" /> Add task
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {visibleColumns.length === 0 && (
            <div className="w-60 py-8 text-center text-slate-400 text-sm">Every column is empty.</div>
          )}
          {canManageColumns && onAddColumn && (
            addingColumn ? (
              <div className="w-[260px] flex-shrink-0 rounded-xl border-2 border-dashed border-slate-300 p-4">
                <Input value={newColumnTitle} autoFocus placeholder="Column name" onChange={e => setNewColumnTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitNewColumn(); if (e.key === 'Escape') setAddingColumn(false); }}
                  className="h-9 bg-white" />
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setAddingColumn(false)}>Cancel</Button>
                  <Button size="sm" onClick={commitNewColumn} style={{ backgroundColor: NAVY }}>Add</Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingColumn(true)}
                className="w-[220px] min-h-[300px] flex-shrink-0 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:bg-slate-50"
                style={{ color: NAVY }}>
                <PlusCircle className="w-8 h-8" />
                <span className="text-base font-medium">Add column</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
