import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, X, MessageSquare, Loader2, Download, Bell } from 'lucide-react';
import SavedFilterView from '@/components/projects/SavedFilterView';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import { exportRecords } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

const DEFAULT_STATUSES = [
  { value: 'open', label: 'Open', className: 'bg-blue-100 text-blue-700' },
  { value: 'in_review', label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
  { value: 'validated', label: 'Validated', className: 'bg-emerald-100 text-emerald-700' },
  { value: 'invalidated', label: 'Invalidated', className: 'bg-red-100 text-red-700' },
  { value: 'closed', label: 'Closed', className: 'bg-slate-100 text-slate-600' },
  { value: 'escalated', label: 'Escalated', className: 'bg-red-100 text-red-700' },
];

const priorityColors = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function ResourceInput({ value, onChange, resources, placeholder }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const filtered = resources.filter(r => r.full_name.toLowerCase().includes(q.toLowerCase())).slice(0, 7);
  return (
    <div className="relative">
      <Input
        value={q || value || ''}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder || 'Search resources...'}
        className="h-8 text-sm"
      />
      {show && filtered.length > 0 && (
        <div className="absolute z-20 top-9 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
          {filtered.map(r => (
            <button key={r.id} type="button" onMouseDown={() => { onChange(r.full_name); setQ(''); setShow(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700">{r.full_name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddRecordDialog({ open, onOpenChange, projects, programs, resources, noun, descriptionLabel, idPrefix, idField, idStart, existingCount, statuses, showImpactDelay, showFallbackPlan, showAssignedTo, onCreate }) {
  const today = new Date().toISOString().split('T')[0];
  const emptyForm = () => ({ title: '', priority: 'medium', description: '', impact_of_delay: '', fallback_plan: '', assigned_to: '', entered_by: '', date_entered: today, project_id: '', program_id: '', status: 'open' });
  const [form, setForm] = useState(emptyForm());
  const filteredProjects = form.program_id ? projects.filter(p => p.program_id === form.program_id) : projects;

  const handleSubmit = () => {
    if (!form.title || !form.project_id) return;
    const id = `${idPrefix}-${String(existingCount + idStart).padStart(3, '0')}`;
    onCreate({ ...form, [idField]: id });
    onOpenChange(false);
    setForm(emptyForm());
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setForm(emptyForm()); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add {noun}</DialogTitle></DialogHeader>
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
          <div>
            <Label className="text-xs text-slate-500">Title <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder={`${noun} title...`} className="h-8 text-sm mt-1" />
          </div>
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
            <Label className="text-xs text-slate-500">{descriptionLabel}</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder={`Describe the ${noun.toLowerCase()}...`} rows={3} className="mt-1 text-sm" />
          </div>
          {showImpactDelay && (
            <div>
              <Label className="text-xs text-slate-500">Impact of Delay</Label>
              <Textarea value={form.impact_of_delay} onChange={e => setForm(p => ({ ...p, impact_of_delay: e.target.value }))}
                placeholder="Describe the impact if this is delayed..." rows={2} className="mt-1 text-sm" />
            </div>
          )}
          {showFallbackPlan && (
            <div>
              <Label className="text-xs text-slate-500">Fallback Plan</Label>
              <Textarea value={form.fallback_plan} onChange={e => setForm(p => ({ ...p, fallback_plan: e.target.value }))}
                placeholder="Describe the fallback plan if the dependency isn't met..." rows={2} className="mt-1 text-sm" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {showAssignedTo && (
              <div>
                <Label className="text-xs text-slate-500">Assigned To</Label>
                <div className="mt-1">
                  <ResourceInput value={form.assigned_to} onChange={v => setForm(p => ({ ...p, assigned_to: v }))} resources={resources} />
                </div>
              </div>
            )}
            <div className={cn(showAssignedTo ? '' : 'col-span-2')}>
              <Label className="text-xs text-slate-500">Entered By</Label>
              <div className="mt-1">
                <ResourceInput value={form.entered_by} onChange={v => setForm(p => ({ ...p, entered_by: v }))} resources={resources} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Date Entered</Label>
              <Input type="date" value={form.date_entered} onChange={e => setForm(p => ({ ...p, date_entered: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title || !form.project_id} className="bg-[#c87b14] hover:bg-[#a86610]">Add {noun}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailPanel({ record, noun, idField, descriptionLabel, statuses, statusMap, showImpactDelay, showFallbackPlan, showAssignedTo, resources, onUpdate, onClose, onDelete }) {
  const [local, setLocal] = useState(record);
  const [commentText, setCommentText] = useState('');
  useEffect(() => { setLocal(record); }, [record.id]);
  const save = (field, value) => onUpdate(record.id, { [field]: value });
  const addComment = () => {
    if (!commentText.trim()) return;
    const comments = [...(local.comments || []), { text: commentText, author: 'You', date: new Date().toISOString() }];
    setLocal(p => ({ ...p, comments }));
    onUpdate(record.id, { comments });
    setCommentText('');
  };
  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs text-slate-500 font-mono">{local[idField]}</p>
          <h2 className="text-sm font-semibold text-slate-800 truncate">{local.title || local.description || `${noun} Detail`}</h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDelete && <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 text-xs" onClick={() => { if (window.confirm(`Delete this ${noun.toLowerCase()}? This cannot be undone.`)) { onDelete(); onClose(); } }}>Delete</Button>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <DField label="Title">
            <Input value={local.title || ''} onChange={e => setLocal(p => ({ ...p, title: e.target.value }))}
              onBlur={e => save('title', e.target.value)} className="h-8 text-sm" />
          </DField>
          <DField label="Priority">
            <Select value={local.priority || 'medium'} onValueChange={val => { setLocal(p => ({ ...p, priority: val })); save('priority', val); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </DField>
          <DField label={descriptionLabel}>
            <Textarea value={local.description || ''} onChange={e => setLocal(p => ({ ...p, description: e.target.value }))}
              onBlur={e => save('description', e.target.value)} className="text-sm min-h-[70px]" />
          </DField>
          {showImpactDelay && (
            <DField label="Impact of Delay">
              <Textarea value={local.impact_of_delay || ''} onChange={e => setLocal(p => ({ ...p, impact_of_delay: e.target.value }))}
                onBlur={e => save('impact_of_delay', e.target.value)} className="text-sm min-h-[60px]" placeholder="Describe impact if delayed..." />
            </DField>
          )}
          {showFallbackPlan && (
            <DField label="Fallback Plan">
              <Textarea value={local.fallback_plan || ''} onChange={e => setLocal(p => ({ ...p, fallback_plan: e.target.value }))}
                onBlur={e => save('fallback_plan', e.target.value)} className="text-sm min-h-[60px]" placeholder="Describe the fallback plan..." />
            </DField>
          )}
          {showAssignedTo && (
            <DField label="Assigned To">
              <ResourceInput value={local.assigned_to || ''} onChange={v => { setLocal(p => ({ ...p, assigned_to: v })); save('assigned_to', v); }} resources={resources} />
            </DField>
          )}
          <DField label="Entered By">
            <ResourceInput value={local.entered_by || ''} onChange={v => { setLocal(p => ({ ...p, entered_by: v })); save('entered_by', v); }} resources={resources} />
          </DField>
          <DField label="Date Entered">
            <Input type="date" value={local.date_entered || ''} onChange={e => setLocal(p => ({ ...p, date_entered: e.target.value }))}
              onBlur={e => save('date_entered', e.target.value)} className="h-8 text-sm" />
          </DField>
          <DField label="Status">
            <Select value={local.status} onValueChange={val => { setLocal(p => ({ ...p, status: val })); save('status', val); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </DField>
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Comments</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{(local.comments || []).length}</span>
            </div>
            <div className="space-y-2 mb-3">
              {(local.comments || []).map((c, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-800">{c.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{c.author} · {new Date(c.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Add a comment..." className="h-8 text-xs flex-1" />
              <Button size="sm" className="h-8" onClick={addComment}>Add</Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function DField({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

export default function SimpleRaidSheet({
  entityType,
  queryKey,
  idPrefix,
  idField,
  idStart = 1,
  noun,
  descriptionLabel,
  storageKey,
  projects = [],
  programs = [],
  portfolios = [],
  resources = [],
  statuses = DEFAULT_STATUSES,
  showImpactDelay = false,
  showFallbackPlan = false,
  showAssignedTo = false,
  onCountChange,
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [escalateDialog, setEscalateDialog] = useState(null);
  const [escalateTo, setEscalateTo] = useState('');
  const [escalateMode, setEscalateMode] = useState('resource');
  const [escalateDrop, setEscalateDrop] = useState(false);
  const [filterPortfolios, setFilterPortfolios] = useState([]);
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [addOpen, setAddOpen] = useState(false);

  const entity = base44.entities[entityType];
  const statusMap = Object.fromEntries(statuses.map(s => [s.value, s]));

  const { data: records = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => entity.list('-created_date'),
  });

  const create = useMutation({
    mutationFn: (data) => entity.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => entity.update(id, data),
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey }); setSelected(prev => prev?.id === updated.id ? updated : prev); },
  });
  const remove = useMutation({
    mutationFn: (id) => entity.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setSelected(null); },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';

  const portfolioProgramIds = filterPortfolios.length ? programs.filter(p => filterPortfolios.includes(p.portfolio_id)).map(p => p.id) : null;
  const scopedProgramIds = portfolioProgramIds || programs.map(p => p.id);
  const programOptions = programs.filter(p => scopedProgramIds.includes(p.id));
  const activeProgramIds = filterPrograms.length ? filterPrograms.filter(id => scopedProgramIds.includes(id)) : scopedProgramIds;
  const filteredProjectsForDropdown = projects.filter(p => activeProgramIds.includes(p.program_id));

  const filtered = records.filter(r => {
    if (filterPortfolios.length && (!r.program_id || !portfolioProgramIds.includes(r.program_id))) return false;
    if (filterPrograms.length && !filterPrograms.includes(r.program_id)) return false;
    if (filterProjects.length && !filterProjects.includes(r.project_id)) return false;
    return true;
  });

  useEffect(() => { onCountChange?.(filtered.length); }, [filtered.length, onCountChange]);

  const columns = [
    { key: 'id', label: `${noun} ID`, cls: 'text-center w-24' },
    { key: 'status', label: 'Status', cls: 'text-center w-24' },
    { key: 'program', label: 'Program', cls: 'text-left w-28' },
    { key: 'project', label: 'Project', cls: 'text-left w-32' },
    { key: 'priority', label: 'Priority', cls: 'text-center w-24' },
    { key: 'title', label: 'Title', cls: 'text-left w-[260px]' },
    ...(showAssignedTo ? [{ key: 'assigned_to', label: 'Assigned To', cls: 'text-left w-28' }] : []),
    { key: 'entered_by', label: 'Entered By', cls: 'text-left w-28' },
    { key: 'date_entered', label: 'Entered Date', cls: 'text-center w-28' },
    { key: 'escalate', label: 'Escalate', cls: 'text-center w-24' },
  ];

  const renderCell = (r, key) => {
    switch (key) {
      case 'id':
        return <td key={key} className="px-3 py-2 font-mono text-sm text-slate-500 whitespace-nowrap text-center">{r[idField]}</td>;
      case 'status':
        return (
          <td key={key} className="px-3 py-2" onClick={e => e.stopPropagation()}>
            <Select value={r.status} onValueChange={val => { update.mutate({ id: r.id, data: { status: val } }); }}>
              <SelectTrigger className={cn('h-6 text-xs border-0 px-2 rounded-full font-medium w-auto', statusMap[r.status]?.className)} onClick={e => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(s => (
                  <SelectItem key={s.value} value={s.value}><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', s.className)}>{s.label}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
        );
      case 'program':
        return <td key={key} className="px-3 py-2 text-xs text-slate-600 break-words">{r.program_id ? getProgramName(r.program_id) : '\u2014'}</td>;
      case 'project':
        return <td key={key} className="px-3 py-2 text-sm text-slate-600 break-words">{r.project_id ? getProjectName(r.project_id) : '\u2014'}</td>;
      case 'priority':
        return <td key={key} className="px-3 py-2 text-center"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[r.priority] || priorityColors.medium)}>{r.priority || 'medium'}</span></td>;
      case 'title':
        return <td key={key} className="px-3 py-2 text-slate-800 font-medium text-sm">{r.title || '\u2014'}</td>;
      case 'description':
        return <td key={key} className="px-3 py-2 max-w-xs"><p className="truncate text-slate-800">{r.description}</p></td>;
      case 'impact_of_delay':
        return <td key={key} className="px-3 py-2 max-w-xs"><p className="truncate text-slate-700">{r.impact_of_delay || '\u2014'}</p></td>;
      case 'fallback_plan':
        return <td key={key} className="px-3 py-2 max-w-xs"><p className="truncate text-slate-700">{r.fallback_plan || '\u2014'}</p></td>;
      case 'date_entered':
        return <td key={key} className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap text-center">{r.date_entered || '\u2014'}</td>;
      case 'assigned_to':
        return <td key={key} className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{r.assigned_to || '\u2014'}</td>;
      case 'entered_by':
        return <td key={key} className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{r.entered_by || '\u2014'}</td>;
      case 'escalate':
        return (
          <td key={key} className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost"
              className={cn('h-6 text-xs gap-1', r.status === 'escalated' ? 'text-red-700 bg-red-50' : 'text-amber-600 hover:bg-amber-50')}
              disabled={r.status === 'escalated'}
              onClick={e => { e.stopPropagation(); setEscalateDialog(r); setEscalateTo(''); setEscalateMode('resource'); }}>
              <Bell className="w-3 h-3" />{r.status === 'escalated' ? 'Escalated' : 'Escalate'}
            </Button>
          </td>
        );
      default:
        return <td key={key} className="px-3 py-2" />;
    }
  };

  const exportColumns = [
    { label: `${noun} ID`, key: idField },
    { label: 'Status', key: 'status' },
    { label: 'Program', value: (r) => getProgramName(r.program_id) },
    { label: 'Project', value: (r) => getProjectName(r.project_id) },
    { label: 'Priority', key: 'priority' },
    { label: 'Title', key: 'title' },
    { label: descriptionLabel, key: 'description' },
    ...(showImpactDelay ? [{ label: 'Impact of Delay', key: 'impact_of_delay' }] : []),
    ...(showFallbackPlan ? [{ label: 'Fallback Plan', key: 'fallback_plan' }] : []),
    ...(showAssignedTo ? [{ label: 'Assigned To', key: 'assigned_to' }] : []),
    { label: 'Entered By', key: 'entered_by' },
    { label: 'Entered Date', key: 'date_entered' },
  ];
  const handleExport = () => exportRecords(filtered, exportColumns, `${noun.toLowerCase()}_log_export_${new Date().toISOString().slice(0, 10)}.csv`);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Portfolio:</span>
            <MultiSelectFilter options={portfolios.map(p => ({ value: p.id, label: p.name }))} selected={filterPortfolios} onChange={(v) => { setFilterPortfolios(v); setFilterPrograms([]); setFilterProjects([]); }} allLabel="All Portfolios" className="h-8 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Program:</span>
            <MultiSelectFilter options={programOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterPrograms} onChange={(v) => { setFilterPrograms(v); setFilterProjects([]); }} allLabel="All Programs" className="h-8 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Project:</span>
            <MultiSelectFilter options={filteredProjectsForDropdown.map(p => ({ value: p.id, label: p.name }))} selected={filterProjects} onChange={setFilterProjects} allLabel="All Projects" className="h-8 w-40" />
          </div>
          <SavedFilterView storageKey={storageKey} currentFilters={{ portfolios: filterPortfolios, programs: filterPrograms, projects: filterProjects }} onLoadFilters={f => { setFilterPortfolios(f.portfolios || []); setFilterPrograms(f.programs || []); setFilterProjects(f.projects || []); }} />
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleExport} className="h-8 gap-1 text-xs"><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-[#c87b14] hover:bg-[#a86610] h-8 gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> Add {noun}</Button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <table className="w-full text-sm border-collapse" style={{ minWidth: '1100px' }}>
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  {columns.map(h => (
                    <th key={h.key} className={cn("px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap", h.cls)}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 text-sm">No {noun.toLowerCase()}s yet. Click "Add {noun}" to create one.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => setSelected(r)}
                    className={cn('border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors', selected?.id === r.id && 'bg-indigo-50')}>
                    {columns.map(h => renderCell(r, h.key))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <DetailPanel
          record={selected}
          noun={noun}
          idField={idField}
          descriptionLabel={descriptionLabel}
          statuses={statuses}
          statusMap={statusMap}
          showImpactDelay={showImpactDelay}
          showFallbackPlan={showFallbackPlan}
          showAssignedTo={showAssignedTo}
          resources={resources}
          onUpdate={(id, data) => update.mutate({ id, data })}
          onClose={() => setSelected(null)}
          onDelete={() => remove.mutate(selected.id)}
        />
      )}

      <AddRecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projects={projects}
        programs={programs}
        resources={resources}
        noun={noun}
        descriptionLabel={descriptionLabel}
        idPrefix={idPrefix}
        idField={idField}
        idStart={idStart}
        existingCount={records.length}
        statuses={statuses}
        showImpactDelay={showImpactDelay}
        showFallbackPlan={showFallbackPlan}
        showAssignedTo={showAssignedTo}
        onCreate={(data) => create.mutate(data)}
      />

      {escalateDialog && (
        <Dialog open={!!escalateDialog} onOpenChange={() => { setEscalateDialog(null); setEscalateTo(''); setEscalateMode('resource'); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Escalate {noun}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-1">
              <p className="text-xs text-slate-500 bg-slate-50 rounded p-2">{escalateDialog.title}</p>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                <button onClick={() => { setEscalateMode('resource'); setEscalateTo(''); }}
                  className={`flex-1 py-1.5 font-medium transition-colors ${escalateMode === 'resource' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  Resource
                </button>
                <button onClick={() => { setEscalateMode('department'); setEscalateTo(''); }}
                  className={`flex-1 py-1.5 font-medium transition-colors ${escalateMode === 'department' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  Department
                </button>
              </div>
              {escalateMode === 'resource' ? (
                <div>
                  <Label className="text-xs text-slate-600">Escalate to resource</Label>
                  <div className="relative mt-1">
                    <Input value={escalateTo}
                      onChange={e => { setEscalateTo(e.target.value); setEscalateDrop(true); }}
                      onFocus={() => setEscalateDrop(true)}
                      onBlur={() => setTimeout(() => setEscalateDrop(false), 200)}
                      placeholder="Search resources..." className="h-8 text-sm" autoFocus />
                    {escalateDrop && escalateTo && (
                      <div className="absolute z-30 top-9 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                        {resources.filter(r => r.full_name.toLowerCase().includes(escalateTo.toLowerCase())).slice(0, 8).map(r => (
                          <button key={r.id} onMouseDown={() => { setEscalateTo(r.full_name); setEscalateDrop(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700 flex justify-between">
                            <span>{r.full_name}</span>
                            {r.department && <span className="text-slate-400">{r.department}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-slate-600">Escalate to department</Label>
                  <select value={escalateTo} onChange={e => setEscalateTo(e.target.value)}
                    className="mt-1 w-full h-8 text-sm border border-input rounded-md px-2 bg-white">
                    <option value="">Select department...</option>
                    {[...new Set(resources.filter(r => r.department).map(r => r.department))].map(dept => (
                      <option key={dept} value={dept}>{dept} ({resources.filter(r => r.department === dept).length} members)</option>
                    ))}
                  </select>
                  {escalateTo && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Will notify: {resources.filter(r => r.department === escalateTo).map(r => r.full_name).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => { setEscalateDialog(null); setEscalateTo(''); setEscalateMode('resource'); }}>Cancel</Button>
              <Button size="sm" disabled={!escalateTo.trim()} className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  const item = escalateDialog;
                  update.mutate({ id: item.id, data: { status: 'escalated' } });
                  const subject = encodeURIComponent(`[ESCALATED] ${noun}: ${item.title}`);
                  const deptMembers = escalateMode === 'department' ? resources.filter(r => r.department === escalateTo).map(r => r.full_name).join(', ') : '';
                  const toLine = escalateMode === 'department' ? `Department: ${escalateTo}\nNotify: ${deptMembers}` : `Resource: ${escalateTo}`;
                  const body = encodeURIComponent(`This ${noun.toLowerCase()} has been escalated.\n\n${toLine}\n\nID: ${item[idField]}\nTitle: ${item.title}\nPriority: ${item.priority}\n\nPlease review and take immediate action.`);
                  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                  setEscalateDialog(null); setEscalateTo(''); setEscalateMode('resource');
                }}>
                Escalate &amp; Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}