import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { templatesApi } from '@/api/collaboration';
import { getDefaultTemplateId } from '@/lib/projectTemplates';
import { useAuth } from '@/lib/AuthContext';
import { useAccountResources } from '@/hooks/useAccountLookups';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { X } from 'lucide-react';
import { splitOwners, joinOwners } from '@/lib/owners';
import { useAccountOptions } from '@/hooks/useStatusOptions';
import { useStatusLabels } from '@/lib/statusLabels';

// The dialog's statuses and the account's status option values behind them. Not Started is no status at all.
const STATUS_OPTION_VALUES = { active: 'ACTIVE', on_hold: 'ON_HOLD', completed: 'COMPLETE', cancelled: 'CANCELLED' };
const STATUS_LABEL_KEYS = { planning: 'not_started', active: 'in_progress', on_hold: 'on_hold', completed: 'completed', cancelled: 'cancelled' };
// What records carry (lower-cased option values, or older names) -> the dialog's status.
const toDialogStatus = (status) => ({
  active: 'active', in_progress: 'active', on_hold: 'on_hold', complete: 'completed', completed: 'completed', cancelled: 'cancelled',
}[String(status || '').toLowerCase()] || 'planning');

/** Several names as removable chips; type a name (or pick a suggestion) and press Enter or comma to add it. */
function OwnersInput({ value, onChange, suggestions, placeholder }) {
  const [text, setText] = useState('');
  const add = (raw) => {
    const name = raw.replace(/,/g, ' ').trim();
    if (name && !value.some(v => v.toLowerCase() === name.toLowerCase())) onChange([...value, name]);
    setText('');
  };
  return (
    <div className="min-h-9 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
      {value.map(name => (
        <span key={name} className="inline-flex items-center gap-1 rounded-md bg-[#EAF0F8] px-2 py-0.5 text-xs text-[#002046]">
          {name}
          <button type="button" aria-label={`Remove ${name}`} className="hover:text-red-600" onClick={() => onChange(value.filter(v => v !== name))}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        list="owner-suggestions"
        value={text}
        onChange={(e) => {
          // Picking a suggestion fills the box with an exact name: add it straight away.
          if (suggestions.includes(e.target.value)) add(e.target.value);
          else setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && text.trim()) { e.preventDefault(); add(text); }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text.trim() && add(text)}
        placeholder={value.length ? 'Add another owner' : placeholder}
        className="flex-1 min-w-[140px] h-7 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <datalist id="owner-suggestions">
        {suggestions.filter(s => !value.includes(s)).map(s => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

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
  // Portfolios have one or more owners, required, and no colour (designer request, Portfolio > New Portfolio).
  const isPortfolio = type === 'portfolio';

  const { selectedAccountId } = useAuth();
  const { data: projectTemplates = [] } = useQuery({
    queryKey: ['project_templates', selectedAccountId],
    queryFn: () => templatesApi.list(selectedAccountId),
    enabled: type === 'project' && !!selectedAccountId,
  });
  const resources = useAccountResources();
  const { data: optionSets } = useAccountOptions();
  const { workStatus } = useStatusLabels();
  const statusSet = (Array.isArray(optionSets) ? optionSets : []).find(set => set.entity_type === type.toUpperCase() && set.name === 'STATUS');
  /** The status_id to save for a dialog status: null for Not Started, undefined if the account has no such option. */
  const statusIdFor = (status) => {
    if (status === 'planning') return null;
    return statusSet?.values?.find(v => String(v.value).toUpperCase() === STATUS_OPTION_VALUES[status])?.id;
  };

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
    budget: '',
    person: '',
    owners: []
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: toDialogStatus(project.status),
        color: project.color || '#6366f1',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        program_id: project.program_id || '',
        portfolio_id: project.portfolio_id || '',
        template_id: project.template_id || '',
        default_view: 'sheet',
        budget: project.budget ?? '',
        person: (type === 'project' ? project.project_manager || project.owner : project.owner) || '',
        owners: splitOwners(project.owner)
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
        // New projects start from the default template chosen on the Templates page.
        template_id: type === 'project' ? getDefaultTemplateId() : '',
        default_view: 'sheet',
        budget: '',
        person: '',
        owners: []
      });
    }
  }, [project, type]);

  const handleSave = () => {
    // Send the budget only when it was changed, so saving other fields never clears one the person can't see.
    // The person is a project's manager, or a portfolio's or program's owner.
    const { budget, person, owners, ...fields } = formData;
    // Only send a status the account can store; an unchanged one is left alone.
    const statusId = formData.status !== toDialogStatus(project?.status) || !project?.id ? statusIdFor(formData.status) : undefined;
    const rest = { ...fields, ...(statusId !== undefined ? { status_id: statusId } : {}) };
    const budgetChanged = String(budget ?? '') !== String(project?.budget ?? '');
    if (type === 'project') onSave({ ...rest, project_manager: person.trim(), ...(budgetChanged ? { budget } : {}) });
    else if (isPortfolio) onSave({ ...rest, owner: joinOwners(owners) });
    else onSave({ ...rest, owner: person.trim() });
    onOpenChange(false);
  };

  const required = <span className="text-red-500"> *</span>;
  const complete = Boolean(formData.name.trim()) && (!isPortfolio || formData.owners.length > 0);
  const statusSelect = (
    <Select
      value={formData.status}
      onValueChange={(value) => setFormData({ ...formData, status: value })}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(status => (
          <SelectItem key={status} value={status}>{workStatus[STATUS_LABEL_KEYS[status]].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Capped to the window: the fields scroll and the buttons stay in view. */}
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{project?.id ? `Edit ${typeLabel}` : `New ${typeLabel}`}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-2 -mx-1 px-1 overflow-y-auto min-h-0 flex-1">
          <div className="space-y-2">
            <Label>{typeLabel} Name{isPortfolio && required}</Label>
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
          
          {isPortfolio ? (
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                {statusSelect}
              </div>
              <div className="space-y-2">
                <Label>Portfolio Owner(s){required}</Label>
                <OwnersInput value={formData.owners} onChange={(owners) => setFormData({ ...formData, owners })}
                  suggestions={[...new Set(resources.map(r => r.full_name).filter(Boolean))]} placeholder="Search or type a name" />
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              {statusSelect}
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
          )}

          {type === 'project' && (
          <div className={!project?.id ? 'grid grid-cols-2 gap-4' : undefined}>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={projectTemplates.some(t => t.id === formData.template_id) ? formData.template_id : 'standard'} onValueChange={v => setFormData({ ...formData, template_id: v === 'standard' ? '' : v })}>
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
          {!project?.id && (
            <div className="space-y-2">
              <Label>Open in</Label>
              <Select value={formData.default_view} onValueChange={v => setFormData({ ...formData, default_view: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sheet">Sheet</SelectItem>
                  <SelectItem value="gantt">Gantt</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
          {!isPortfolio && <div className="space-y-2">
            <Label>{type === 'project' ? 'Project Manager' : `${typeLabel} Owner`}</Label>
            <Input
              list="work-item-person-options"
              value={formData.person}
              onChange={(e) => setFormData({ ...formData, person: e.target.value })}
              placeholder="Search or type a name"
            />
            <datalist id="work-item-person-options">
              {resources.map(r => <option key={r.id} value={r.full_name} />)}
            </datalist>
          </div>}
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
              if (await confirmAction({ title: `Delete this ${type}?`, description: 'This also deletes all associated items. You can restore it from Account > Recently Deleted for 30 days.' })) {
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
          <Button onClick={handleSave} disabled={!complete} className="bg-[#002046] hover:bg-[#003070]">
            {project?.id ? 'Update' : 'Create'} {typeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}