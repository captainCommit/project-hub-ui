import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Flag } from "lucide-react";
import { format } from 'date-fns';

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
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-4 min-w-max p-1">
        {columnsToRender.map(column => (
          <div 
            key={column.id}
            className="w-72 flex-shrink-0"
            onDragOver={canDrag ? handleDragOver : undefined}
            onDrop={canDrag ? (e) => handleDrop(e, column.id) : undefined}
          >
            <div className={cn("rounded-xl p-3", column.color || 'bg-slate-100')}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">{column.title}</h3>
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
                    <CardContent className="p-3">
                      <p className="font-medium text-sm mb-2">{task.title}</p>
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
      </div>
    </div>
  );
}