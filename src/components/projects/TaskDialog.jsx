import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";

export default function TaskDialog({ 
  open, 
  onOpenChange, 
  task, 
  tasks = [],
  onSave, 
  onDelete 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    start_date: '',
    due_date: '',
    duration: 1,
    progress: 0,
    parent_task_id: '',
    predecessors: []
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        duration: task.duration || 1,
        progress: task.progress || 0,
        parent_task_id: task.parent_task_id || '',
        predecessors: task.predecessors || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        start_date: '',
        due_date: '',
        duration: 1,
        progress: 0,
        parent_task_id: '',
        predecessors: []
      });
    }
  }, [task]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const parentTaskOptions = tasks.filter(t => t.id !== task?.id && !t.parent_task_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Task Name</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Duration (days)</Label>
            <Input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Predecessors</Label>
            <Select 
              value="select"
              onValueChange={(value) => {
                if (value !== 'select' && !formData.predecessors.includes(value)) {
                  setFormData({ ...formData, predecessors: [...formData.predecessors, value] });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add predecessor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select" disabled>Add predecessor...</SelectItem>
                {tasks.filter(t => t.id !== task?.id && !formData.predecessors.includes(t.id)).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.predecessors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.predecessors.map(predId => {
                  const predTask = tasks.find(t => t.id === predId);
                  return predTask ? (
                    <span 
                      key={predId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs"
                    >
                      {predTask.title}
                      <button 
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          predecessors: formData.predecessors.filter(id => id !== predId) 
                        })}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Parent Task</Label>
            <Select 
              value={formData.parent_task_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, parent_task_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top level)</SelectItem>
                {parentTaskOptions.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Progress: {formData.progress}%</Label>
            <Slider
              value={[formData.progress]}
              onValueChange={([value]) => setFormData({ ...formData, progress: value })}
              max={100}
              step={5}
            />
          </div>
        </div>
        
        <div className="flex justify-between">
          {task && (
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete(task.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {task ? 'Update' : 'Create'} Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}