import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportRecords } from '@/lib/exportUtils';
import { DataTable, PageBody } from './DirectoryKit';
import { RaidActions, RaidToolbar, filterRaidItems, raidColumns } from './RaidTable';

const today = () => new Date().toISOString().split('T')[0];

const getStatuses = (t) => {
  try {
    const stored = localStorage.getItem('app_raid_status_' + t);
    if (stored) {
      const p = JSON.parse(stored);
      if (Array.isArray(p) && p.length) return p;
    }
  } catch (e) {}
  return t === 'risk' || t === 'issue'
    ? [{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'blocked', label: 'Blocked' }, { value: 'cancelled', label: 'Cancelled' }]
    : [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }];
};

// ─── Add Dialog ───────────────────────────────────────────────────────────────
export function AddDialog({ open, onOpenChange, type, projects, programs, resources, onAdd, existingCount }) {
  const emptyForm = () => ({
    program_id: '', project_id: '', priority: 'medium', status: 'open',
    cause: '', effect: '', what_happening: '', impact: '',
    assigned_to: '', target_date: '', date_entered: today(), description: ''
  });
  const [form, setForm] = useState(emptyForm());
  const [resourceQ, setResourceQ] = useState('');
  const [showResourceDrop, setShowResourceDrop] = useState(false);

  const filteredProjects = form.program_id
    ? projects.filter(p => p.program_id === form.program_id)
    : projects;

  const filteredResources = resources.filter(r =>
    r.full_name.toLowerCase().includes(resourceQ.toLowerCase())
  ).slice(0, 8);

  const label = type === 'risk' ? 'Risk' : 'Issue';
  const idField = type === 'risk' ? 'risk_id' : 'issue_id';

  const isValid = type === 'risk'
    ? (form.project_id && form.cause && form.effect)
    : (form.project_id && form.what_happening && form.impact);

  const handleSubmit = () => {
    if (!isValid) return;
    const id = (type === 'risk' ? 'RL' : 'IL') + '-' + String(existingCount + 1).padStart(3, '0');
    const title = type === 'risk'
      ? 'If ' + form.cause + ', then ' + form.effect
      : form.what_happening + ', impacting ' + form.impact;
    onAdd({ ...form, [idField]: id, title });
    onOpenChange(false);
    setForm(emptyForm());
    setResourceQ('');
  };

  const statuses = getStatuses(type);

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(emptyForm()); setResourceQ(''); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New {label}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Program</Label>
              <Select value={form.program_id} onValueChange={v => setForm(p => ({ ...p, program_id: v, project_id: '' }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="All programs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Project <span className="text-red-500">*</span></Label>
              <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Projects</SelectItem>
                  {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.value || s} value={s.value || s}>{s.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === 'risk' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Cause (If…) <span className="text-red-500">*</span></Label>
                <Input value={form.cause} onChange={e => setForm(p => ({ ...p, cause: e.target.value }))}
                  placeholder="e.g. key resource leaves" className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Effect (Then…) <span className="text-red-500">*</span></Label>
                <Input value={form.effect} onChange={e => setForm(p => ({ ...p, effect: e.target.value }))}
                  placeholder="e.g. delivery delayed" className="h-8 text-sm mt-1" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">What is happening <span className="text-red-500">*</span></Label>
                <Input value={form.what_happening} onChange={e => setForm(p => ({ ...p, what_happening: e.target.value }))}
                  placeholder="Describe the issue..." className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Impact <span className="text-red-500">*</span></Label>
                <Input value={form.impact} onChange={e => setForm(p => ({ ...p, impact: e.target.value }))}
                  placeholder="ability to..." className="h-8 text-sm mt-1" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Additional details..." rows={2} className="text-sm mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Assigned To</Label>
              <div className="relative mt-1">
                <Input value={resourceQ || form.assigned_to}
                  onChange={e => { setResourceQ(e.target.value); setForm(p => ({ ...p, assigned_to: e.target.value })); setShowResourceDrop(true); }}
                  onFocus={() => setShowResourceDrop(true)}
                  onBlur={() => setTimeout(() => setShowResourceDrop(false), 200)}
                  placeholder="Search resources..." className="h-8 text-sm" />
                {showResourceDrop && filteredResources.length > 0 && (
                  <div className="absolute z-20 top-9 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                    {filteredResources.map(r => (
                      <button key={r.id} onMouseDown={() => { setForm(p => ({ ...p, assigned_to: r.full_name })); setResourceQ(''); setShowResourceDrop(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700">{r.full_name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Date Entered</Label>
              <Input type="date" value={form.date_entered} onChange={e => setForm(p => ({ ...p, date_entered: e.target.value }))}
                className="h-8 text-sm mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500">Target Date</Label>
            <Input type="date" value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))}
              className="h-8 text-sm mt-1 w-48" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="bg-[#c87b14] hover:bg-[#a86610]">
            New {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────
export default function RiskIssueSheet({
  items,
  projects,
  programs = [],
  resources = [],
  type = 'risk',
  filters,
  onFiltersChange,
  actionsSlot = null,
  onItemClick,
  onAddItem,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const idField = type === 'risk' ? 'risk_id' : 'issue_id';
  const label = type === 'risk' ? 'Risk' : 'Issue';

  const filteredItems = filterRaidItems(items, filters, programs, idField);

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';

  const exportColumns = [
    { label: `${label} ID`, value: (i) => i[idField] },
    { label: 'Status', key: 'status' },
    { label: 'Program', value: (i) => getProgramName(i.program_id) },
    { label: 'Project', value: (i) => getProjectName(i.project_id) },
    { label: 'Priority', key: 'priority' },
    { label: 'Title', key: 'title' },
    { label: 'Description', key: 'description' },
    { label: 'Assigned To', key: 'assigned_to' },
    { label: 'Target Date', key: 'target_date' },
    { label: 'Entered By', key: 'logged_by' },
    { label: 'Entered Date', key: 'date_entered' },
  ];

  const handleExportAll = () => exportRecords(filteredItems, exportColumns, `${type}_log_export_${new Date().toISOString().slice(0, 10)}.csv`);

  return (
    <PageBody>
      <RaidActions slot={actionsSlot} noun={label} onExport={handleExportAll} exportDisabled={filteredItems.length === 0} onNew={() => setAddOpen(true)} />
      <RaidToolbar
        filters={filters}
        onFiltersChange={onFiltersChange}
        items={items}
        projects={projects}
        programs={programs}
        searchPlaceholder={`Search ${label.toLowerCase()}s...`}
      />
      <DataTable
        columns={raidColumns({ noun: label, idField, getProjectName })}
        rows={filteredItems}
        onRowClick={onItemClick}
        noun={`${label.toLowerCase()}s`}
        minWidth={760}
        empty={items.length ? `No ${label.toLowerCase()}s match your filters.` : `No ${label.toLowerCase()}s yet. Click "New ${label}" to create one.`}
      />

      <AddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        type={type}
        projects={projects}
        programs={programs}
        resources={resources}
        existingCount={items.length}
        onAdd={onAddItem}
      />
    </PageBody>
  );
}
