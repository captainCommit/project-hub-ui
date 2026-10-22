import React, { useState, useEffect } from 'react';
import { raidEntityAdapters } from '@/api/raidEntities';
import { useAuth } from '@/lib/AuthContext';
import { useEntityComments } from '@/hooks/useEntityComments';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, MessageSquare, Loader2, Bell } from 'lucide-react';
import { DataTable, PageBody } from '@/components/projects/DirectoryKit';
import { RaidActions, RaidToolbar, filterRaidItems, raidColumns } from '@/components/projects/RaidTable';
import { exportRecords } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { confirmAction } from '@/components/ui/confirm-dialog';

// The default assumption statuses (Escalated is only offered where the log has that status).
const DEFAULT_STATUSES = [
  { value: 'draft', label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  { value: 'open', label: 'Open', className: 'bg-blue-100 text-blue-700' },
  { value: 'in_review', label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
  { value: 'validated', label: 'Validated', className: 'bg-emerald-100 text-emerald-700' },
  { value: 'invalidated', label: 'Invalidated', className: 'bg-red-100 text-red-700' },
  { value: 'closed', label: 'Closed', className: 'bg-slate-100 text-slate-600' },
];

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

function AddRecordDialog({ open, onOpenChange, projects, programs, resources, noun, descriptionLabel, idPrefix, idField, idStart, existingCount, statuses, showImpactDelay, showFallbackPlan, onCreate }) {
  const today = new Date().toISOString().split('T')[0];
  const emptyForm = () => ({ title: '', priority: 'medium', description: '', impact_of_delay: '', fallback_plan: '', assigned_to: '', target_date: '', entered_by: '', date_entered: today, project_id: '', program_id: '', status: 'open' });
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
        <DialogHeader><DialogTitle>New {noun}</DialogTitle></DialogHeader>
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
            <div>
              <Label className="text-xs text-slate-500">Assigned To</Label>
              <div className="mt-1">
                <ResourceInput value={form.assigned_to} onChange={v => setForm(p => ({ ...p, assigned_to: v }))} resources={resources} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Target Date</Label>
              <Input type="date" value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
            <div>
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
          <Button onClick={handleSubmit} disabled={!form.title || !form.project_id} className="bg-[#c87b14] hover:bg-[#a86610]">New {noun}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailPanel({ record, noun, idField, descriptionLabel, statuses, statusMap, showImpactDelay, showFallbackPlan, resources, commentEntityType, onUpdate, onClose, onDelete }) {
  const [local, setLocal] = useState(record);
  const [commentText, setCommentText] = useState('');
  const { comments, addComment: postComment } = useEntityComments(commentEntityType, record.id);
  useEffect(() => { setLocal(record); }, [record.id]);
  const save = (field, value) => onUpdate(record.id, { [field]: value });
  const addComment = async () => {
    if (!commentText.trim()) return;
    await postComment(commentText.trim());
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
          {onDelete && <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 text-xs" onClick={async () => { if (await confirmAction({ title: `Delete this ${noun.toLowerCase()}?`, description: 'This cannot be undone.' })) { onDelete(); onClose(); } }}>Delete</Button>}
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
          <DField label="Assigned To">
            <ResourceInput value={local.assigned_to || ''} onChange={v => { setLocal(p => ({ ...p, assigned_to: v })); save('assigned_to', v); }} resources={resources} />
          </DField>
          <DField label="Target Date">
            <Input type="date" value={local.target_date || ''} onChange={e => setLocal(p => ({ ...p, target_date: e.target.value }))}
              onBlur={e => save('target_date', e.target.value)} className="h-8 text-sm" />
          </DField>
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
          {statusMap.escalated && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline"
                className={cn('h-8 text-xs gap-1', local.status === 'escalated' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-600 hover:bg-amber-50')}
                disabled={local.status === 'escalated'}
                onClick={() => { setLocal(p => ({ ...p, status: 'escalated' })); save('status', 'escalated'); }}>
                <Bell className="w-3.5 h-3.5" />{local.status === 'escalated' ? 'Escalated' : 'Escalate'}
              </Button>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Comments</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{comments.length}</span>
            </div>
            <div className="space-y-2 mb-3">
              {comments.map((c, i) => (
                <div key={c.id || i} className="bg-slate-50 rounded-lg p-2">
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
  projects = [],
  programs = [],
  resources = [],
  statuses = DEFAULT_STATUSES,
  showImpactDelay = false,
  showFallbackPlan = false,
  showPriority = true,
  personLabel = undefined,
  dateLabel = 'Target Date',
  filters,
  onFiltersChange,
  actionsSlot = null,
  onCountChange = undefined,
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const { selectedAccountId } = useAuth();
  const entity = raidEntityAdapters[entityType];
  const statusMap = Object.fromEntries(statuses.map(s => [s.value, s]));
  const accountQueryKey = [...queryKey, selectedAccountId];

  const { data: records = [], isLoading } = useQuery({
    queryKey: accountQueryKey,
    queryFn: () => entity.list(selectedAccountId),
    enabled: !!selectedAccountId,
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
    mutationFn: (id) => entity.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setSelected(null); },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';

  const filtered = filterRaidItems(records, filters, programs, idField);

  useEffect(() => { onCountChange?.(filtered.length); }, [filtered.length, onCountChange]);

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
    { label: personLabel || 'Assigned To', key: 'assigned_to' },
    { label: dateLabel, key: 'target_date' },
    { label: 'Entered By', key: 'entered_by' },
    { label: 'Entered Date', key: 'date_entered' },
  ];
  const handleExport = () => exportRecords(filtered, exportColumns, `${noun.toLowerCase()}_log_export_${new Date().toISOString().slice(0, 10)}.csv`);
  const plural = noun === 'Dependency' ? 'dependencies' : `${noun.toLowerCase()}s`;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <PageBody>
        <RaidActions slot={actionsSlot} noun={noun} onExport={handleExport} exportDisabled={filtered.length === 0} onNew={() => setAddOpen(true)} />
        <RaidToolbar
          filters={filters}
          onFiltersChange={onFiltersChange}
          items={records}
          projects={projects}
          programs={programs}
          statuses={statuses.map(s => ({ value: s.value, label: s.label }))}
          showPriority={showPriority}
          assigneeLabel={personLabel || 'Assigned To'}
          searchPlaceholder={`Search ${plural}...`}
        />
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <DataTable
            columns={raidColumns({ noun, idField, getProjectName, showPriority, person: personLabel, dateLabel })}
            rows={filtered}
            onRowClick={setSelected}
            rowClassName={r => (selected?.id === r.id ? 'bg-slate-50' : '')}
            noun={plural}
            minWidth={760}
            empty={records.length ? `No ${plural} match your filters.` : `No ${plural} yet. Click "New ${noun}" to create one.`}
          />
        )}
      </PageBody>

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
          resources={resources}
          commentEntityType={entity.commentEntityType}
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
        onCreate={(data) => create.mutate(data)}
      />
    </div>
  );
}