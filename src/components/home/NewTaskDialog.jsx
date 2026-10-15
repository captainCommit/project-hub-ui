import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NONE = '__none';

// statusOptions: the account's task statuses ({ value: option id, label }); resources: account people ({ id, full_name }).
export default function NewTaskDialog({ open, onOpenChange, projects = [], statusOptions = [], resources = [], defaultResourceId = '', onSave }) {
  const blank = () => ({ title: '', project_id: '', resource_id: defaultResourceId || '', status_id: '', start_date: '', due_date: '' });
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isValid = form.title.trim() && form.project_id && !(form.start_date && form.due_date && form.due_date < form.start_date);

  const handleSubmit = () => {
    if (!isValid) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Task Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Enter task name"
            />
          </div>
          <div className="space-y-2">
            <Label>Project <span className="text-red-500">*</span></Label>
            <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={form.resource_id || NONE} onValueChange={v => setForm({ ...form, resource_id: v === NONE ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Who owns this?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status_id || NONE} onValueChange={v => setForm({ ...form, status_id: v === NONE ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Default</SelectItem>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          {form.start_date && form.due_date && form.due_date < form.start_date && (
            <p className="text-xs text-red-600">The due date can't be before the start date.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="bg-[#c87b14] hover:bg-[#a86610]">New Task</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
