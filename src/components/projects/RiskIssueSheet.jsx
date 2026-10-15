import React, { useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Download } from "lucide-react";
import SavedFilterView from './SavedFilterView';
import MultiSelectFilter from './MultiSelectFilter';
import { cn } from "@/lib/utils";
import { exportRecords } from '@/lib/exportUtils';

import { parseDate } from '@/lib/dateUtils';
const priorityColors = {
  low: 'bg-blue-100 text-black',
  medium: 'bg-yellow-100 text-black',
  high: 'bg-orange-100 text-black',
  critical: 'bg-red-100 text-black'
};

const statusColors = {
  open: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-slate-100 text-slate-500',
  escalated: 'bg-red-200 text-red-800'
};

const statusLabels = {
  open: 'Open',
  resolved: 'Resolved',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  escalated: 'Escalated'
};

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
  portfolios = [],
  resources = [],
  type = 'risk',
  onItemClick,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) {
  const [filterPortfolios, setFilterPortfolios] = useState([]);
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [addOpen, setAddOpen] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortTh = ({ field, label, className = '' }) => (
    <th className={`py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-200 transition-colors ${className}`}
      onClick={() => handleSort(field)}>
      <span className="flex items-center gap-1 justify-inherit">
        {label}
        <span className="text-slate-400 text-[10px]">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </span>
    </th>
  );
  const idField = type === 'risk' ? 'risk_id' : 'issue_id';
  const label = type === 'risk' ? 'Risk' : 'Issue';
  const btnClass = 'h-7 text-xs gap-1 text-white bg-[#c87b14] hover:bg-[#a86610]';

  const portfolioProgramIds = filterPortfolios.length ? programs.filter(p => filterPortfolios.includes(p.portfolio_id)).map(p => p.id) : null;
  const scopedProgramIds = portfolioProgramIds || programs.map(p => p.id);
  const programOptions = programs.filter(p => scopedProgramIds.includes(p.id));
  const activeProgramIds = filterPrograms.length ? filterPrograms.filter(id => scopedProgramIds.includes(id)) : scopedProgramIds;
  const filteredProjectsForDropdown = projects.filter(p => activeProgramIds.includes(p.program_id));

  const filteredItems = (() => {
    let result = items.filter(item => {
      if (filterPortfolios.length && (!item.program_id || !portfolioProgramIds.includes(item.program_id))) return false;
      if (filterPrograms.length && !filterPrograms.includes(item.program_id)) return false;
      if (filterProjects.length && !filterProjects.includes(item.project_id)) return false;
      return true;
    });
    if (sortField) {
      result = [...result].sort((a, b) => {
        let av = a[sortField] || ''; let bv = b[sortField] || '';
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  })();

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';

  const isDatePast = (dateStr) => {
    if (!dateStr) return false;
    try { return isPast(parseISO(dateStr)); } catch (e) { return false; }
  };

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
    <div className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-lg" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Filter + Add Bar */}
      <div className="px-3 py-2 bg-slate-50 border-b flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Portfolio:</span>
          <MultiSelectFilter
            options={portfolios.map(p => ({ value: p.id, label: p.name }))}
            selected={filterPortfolios}
            onChange={(v) => { setFilterPortfolios(v); setFilterPrograms([]); setFilterProjects([]); }}
            allLabel="All Portfolios"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Program:</span>
          <MultiSelectFilter
            options={programOptions.map(p => ({ value: p.id, label: p.name }))}
            selected={filterPrograms}
            onChange={(v) => { setFilterPrograms(v); setFilterProjects([]); }}
            allLabel="All Programs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Project:</span>
          <MultiSelectFilter
            options={filteredProjectsForDropdown.map(p => ({ value: p.id, label: p.name }))}
            selected={filterProjects}
            onChange={setFilterProjects}
            allLabel="All Projects"
          />
        </div>
        <SavedFilterView
          storageKey={`${type}_log_views`}
          currentFilters={{ portfolios: filterPortfolios, programs: filterPrograms, projects: filterProjects }}
          onLoadFilters={f => { setFilterPortfolios(f.portfolios || []); setFilterPrograms(f.programs || []); setFilterProjects(f.projects || []); }}
        />
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleExportAll}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
        <Button size="sm" className={btnClass} onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New {label}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-b from-slate-100 to-slate-200 border-b-2 border-slate-300">
              <SortTh field={idField} label={`${label} ID`} className="text-center w-24" />
              <SortTh field="status" label="Status" className="text-center w-24" />
              <th className="py-2 px-3 text-xs font-semibold text-slate-700 text-left w-28">Program</th>
              <th className="py-2 px-3 text-xs font-semibold text-slate-700 text-left w-32">Project</th>
              <SortTh field="priority" label="Priority" className="text-center w-24" />
              <th className="py-2 px-3 text-xs font-semibold text-slate-700 text-left min-w-[240px]">Title</th>
              <SortTh field="assigned_to" label="Assigned To" className="text-left w-28" />
              <SortTh field="target_date" label="Target Date" className="text-center w-28" />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                  No {label.toLowerCase()}s found. Click "New {label}" to create one.
                </td>
              </tr>
            )}
            {filteredItems.map(item => (
              <tr key={item.id} className="border-b border-slate-200 hover:bg-blue-50/50 cursor-pointer" onClick={() => onItemClick(item)}>
                <td className="py-2 px-3 text-sm text-center font-mono text-slate-600">{item[idField]}</td>
                <td className="py-2 px-3 text-center">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusColors[item.status] || statusColors.open)}>
                    {statusLabels[item.status] || item.status || 'Open'}
                  </span>
                </td>
                <td className="py-2 px-3 text-xs text-slate-500">{getProgramName(item.program_id)}</td>
                <td className="py-2 px-3 text-sm">{getProjectName(item.project_id)}</td>
                <td className="py-2 px-3 text-center">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", priorityColors[item.priority] || priorityColors.medium)}>
                    {item.priority || 'medium'}
                  </span>
                </td>
                <td className="py-2 px-3 text-sm font-medium">{item.title}</td>
                <td className="py-2 px-3 text-sm">{item.assigned_to || '—'}</td>
                <td className={cn("py-2 px-3 text-xs text-center",
                  item.target_date && isDatePast(item.target_date) && item.status !== 'closed' && item.status !== 'resolved' && item.status !== 'cancelled' ? "text-red-600 font-medium" : "text-slate-500"
                )}>
                  {item.target_date ? format(parseDate(item.target_date), 'MMM d, yyyy') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

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
    </div>
  );
}