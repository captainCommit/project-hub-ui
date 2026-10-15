import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { templatesApi } from '@/api/collaboration';
import { useAuth } from '@/lib/AuthContext';
import { confirmAction } from '@/components/ui/confirm-dialog';

const colorOptions = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#64748b', label: 'Slate' }
];

export default function ProjectDialog({ 
  open, 
  onOpenChange, 
  project, 
  onSave,
  onDelete,
  type = 'project',
  programs = [],
  portfolios = []
}) {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const { selectedAccountId } = useAuth();
  const { data: projectTemplates = [] } = useQuery({
    queryKey: ['project_templates', selectedAccountId],
    queryFn: () => templatesApi.list(selectedAccountId),
    enabled: type === 'project' && !!selectedAccountId,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    color: '#6366f1',
    start_date: '',
    end_date: '',
    program_id: '',
    portfolio_id: '',
    template_id: '',
    default_view: 'sheet',
    budget: ''
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planning',
        color: project.color || '#6366f1',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        program_id: project.program_id || '',
        portfolio_id: project.portfolio_id || '',
        template_id: project.template_id || '',
        default_view: 'sheet',
        budget: project.budget ?? ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        color: '#6366f1',
        start_date: '',
        end_date: '',
        program_id: '',
        portfolio_id: '',
        template_id: '',
        default_view: 'sheet',
        budget: ''
      });
    }
  }, [project]);

  const handleSave = () => {
    // Send the budget only when it was changed, so saving other fields never clears one the person can't see.
    const { budget, ...rest } = formData;
    const budgetChanged = String(budget ?? '') !== String(project?.budget ?? '');
    onSave(type === 'project' && budgetChanged ? { ...rest, budget } : rest);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project?.id ? `Edit ${typeLabel}` : `New ${typeLabel}`}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{typeLabel} Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Enter ${type} name`}
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
                  <SelectItem value="planning">Not Started</SelectItem>
                  <SelectItem value="active">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <Select 
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: formData.color }}
                    />
                    <span>{colorOptions.find(c => c.value === formData.color)?.label}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {type === 'project' && (
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={formData.template_id || 'standard'} onValueChange={v => setFormData({ ...formData, template_id: v === 'standard' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (default)</SelectItem>
                  {projectTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  {projectTemplates.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-400">No custom templates yet — create one in the Templates section.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'project' && !project?.id && (
            <div className="space-y-2">
              <Label>Open in</Label>
              <Select value={formData.default_view} onValueChange={v => setFormData({ ...formData, default_view: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sheet">Sheet view</SelectItem>
                  <SelectItem value="mondayboard">Board view</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'project' && programs.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Program (optional)</Label>
              <Select value={formData.program_id || 'none'} onValueChange={v => setFormData({ ...formData, program_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="No program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No program</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'project' && (
            <div className="space-y-2">
              <Label>Budget (optional)</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g. 250000"
              />
            </div>
          )}
          {type === 'program' && portfolios.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Portfolio (optional)</Label>
              <Select value={formData.portfolio_id || 'none'} onValueChange={v => setFormData({ ...formData, portfolio_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="No portfolio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No portfolio</SelectItem>
                  {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
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
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
        </div>
        
        {project?.id && onDelete && (
          <div className="mt-2 pt-3 border-t border-slate-100 flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50" onClick={async () => {
              if (await confirmAction({ title: `Delete this ${type}?`, description: 'This also deletes all associated items and cannot be undone.' })) {
                onDelete();
                onOpenChange(false);
              }
            }}>
              Delete {typeLabel}
            </Button>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            {project?.id ? 'Update' : 'Create'} {typeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}