import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Flag } from "lucide-react";
import { format } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { useUserPref } from '@/lib/userPrefs';

import { parseDate } from '@/lib/dateUtils';
const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', color: 'bg-purple-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
];

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600'
};

export default function KanbanBoard({ tasks, columns: boardColumns, onTaskClick, onTaskUpdate, readOnly = false, allowDrag = false, boardPositionMode = false }) {
  const columnsToRender = boardColumns?.length ? boardColumns : columns;
  const canDrag = !readOnly || allowDrag;
  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);
  const [hideEmptyColumns, setHideEmptyColumns] = useUserPref('board_hide_empty_columns', false);
  const visibleColumns = hideEmptyColumns
    ? columnsToRender.filter(column => getTasksByStatus(column.id).length > 0)
    : columnsToRender;
  const hiddenCount = columnsToRender.length - visibleColumns.length;

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
    const sortOrder = getTasksByStatus(status).filter(task => task.id !== taskId).length;
    onTaskUpdate?.(taskId, boardPositionMode ? { status_id: status, sort_order: sortOrder } : { status });
  };

  // Opening a card's details works on read-only boards too; only moving cards needs edit rights.
  const handleCardClick = (task) => {
    onTaskClick?.(task);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-end gap-2 pb-2 text-xs text-slate-500">
        {hiddenCount > 0 && <span>{hiddenCount} empty column{hiddenCount !== 1 ? 's' : ''} hidden</span>}
        <label htmlFor="board-hide-empty" className="cursor-pointer select-none">Hide empty columns</label>
        <Switch id="board-hide-empty" checked={hideEmptyColumns} onCheckedChange={setHideEmptyColumns} />
      </div>
      <div className="flex-1 overflow-x-auto">
      <div className="flex gap-3 min-w-max p-1">
        {visibleColumns.map(column => (
          <div 
            key={column.id}
            className="w-60 flex-shrink-0"
            onDragOver={canDrag ? handleDragOver : undefined}
            onDrop={canDrag ? (e) => handleDrop(e, column.id) : undefined}
          >
            <div className={cn("rounded-xl p-2.5", column.color || 'bg-slate-100')}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h3 className="font-semibold text-sm text-slate-700 truncate" title={column.title}>{column.title}</h3>
                <Badge variant="secondary" className="bg-white">
                  {getTasksByStatus(column.id).length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {getTasksByStatus(column.id).map(task => (
                  <Card 
                    key={task.id}
                    className={cn("transition-shadow bg-white", onTaskClick ? "cursor-pointer hover:shadow-md" : "cursor-default")}
                    draggable={canDrag}
                    onDragStart={canDrag ? (e) => handleDragStart(e, task.id) : undefined}
                    onClick={() => handleCardClick(task)}
                  >
                    <CardContent className="p-2.5">
                      <p className="font-medium text-sm mb-2 break-words">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <Badge className={cn("text-xs", priorityColors[task.priority])}>
                          <Flag className="w-3 h-3 mr-1" />
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(parseDate(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                      {task.progress > 0 && task.progress < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                              className="bg-indigo-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {getTasksByStatus(column.id).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {visibleColumns.length === 0 && (
          <div className="w-60 py-8 text-center text-slate-400 text-sm">Every column is empty.</div>
        )}
      </div>
      </div>
    </div>
  );
}