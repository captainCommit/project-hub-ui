import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { raidApi, mapAssumptionFromApi, mapAssumptionInputToPayload, mapAssumptionListFromApi } from '@/api/raid';
import { useEntityComments } from '@/hooks/useEntityComments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Plus, X, MessageSquare, Loader2, Download } from 'lucide-react';
import SavedFilterView from '@/components/projects/SavedFilterView';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { exportRecords } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { useAccountHierarchy, useAccountResources } from '@/hooks/useAccountLookups';
import { confirmAction } from '@/components/ui/confirm-dialog';

const STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  validated: 'bg-emerald-100 text-emerald-700',
  invalidated: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
  open: 'Open',
  in_review: 'In Review',
  validated: 'Validated',
  invalidated: 'Invalidated',
  closed: 'Closed',
};

function AddAssumptionDialog({ open, onOpenChange, projects, programs, resources, onCreate }) {
  const today = new Date().toISOString().split('T')[0];
  const emptyForm = () => ({ description: '', entered_by: '', date_entered: today, project_id: '', program_id: '', status: 'open' });
  const [form, setForm] = useState(emptyForm());
  const [resourceQ, setResourceQ] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const filteredResources = resources.filter(r => r.full_name.toLowerCase().includes(resourceQ.toLowerCase())).slice(0, 7);

  const filteredProjects = form.program_id ? projects.filter(p => p.program_id === form.program_id) : projects;

  const handleSubmit = () => {
    if (!form.description || !form.project_id) return;
    onCreate(form);
    onOpenChange(false);
    setForm(emptyForm());
    setResourceQ('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(emptyForm()); setResourceQ(''); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Assumption</DialogTitle></DialogHeader>
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
            <Label className="text-xs text-slate-500">Assumption Description <span className="text-red-500">*</span></Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the assumption..." rows={3} className="mt-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Entered By</Label>
              <div className="relative mt-1">
                <Input value={resourceQ || form.entered_by}
                  onChange={e => { setResourceQ(e.target.value); setForm(p => ({ ...p, entered_by: e.target.value })); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                  placeholder="Search resources..." className="h-8 text-sm" />
                {showDrop && filteredResources.length > 0 && (
                  <div className="absolute z-20 top-9 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                    {filteredResources.map(r => (
                      <button key={r.id} onMouseDown={() => { setForm(p => ({ ...p, entered_by: r.full_name })); setResourceQ(''); setShowDrop(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700">{r.full_name}</button>
                    ))}
                  </div>
                )}
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
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.description || !form.project_id} className="bg-[#c87b14] hover:bg-[#a86610]">New Assumption</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AssumptionLog() {
  const qc = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [selectedAssumption, setSelectedAssumption] = useState(null);
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [vacationCalendarOpen, setVacationCalendarOpen] = useState(false);

  const { data: assumptions = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['account-assumptions', selectedAccountId],
    queryFn: async () => mapAssumptionListFromApi(await raidApi.listAccountAssumptions(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { projects, programs, portfolios } = useAccountHierarchy();
  const resources = useAccountResources();

  const assumptionDetailId = selectedAssumption?.id || null;
  const { data: selectedAssumptionDetail } = useQuery({
    queryKey: ['assumption-detail', assumptionDetailId],
    queryFn: async () => mapAssumptionFromApi(await raidApi.getAssumption(assumptionDetailId)),
    enabled: !!assumptionDetailId,
  });

  const invalidateAssumptionQueries = (projectId) => {
    qc.invalidateQueries({ queryKey: ['account-assumptions', selectedAccountId] });
    if (projectId) {
      qc.invalidateQueries({ queryKey: ['project-overview', projectId] });
    }
  };

  const create = useMutation({
    mutationFn: async (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating an assumption.');
      const payload = mapAssumptionInputToPayload(data);
      return mapAssumptionFromApi(await raidApi.createAssumption(data.project_id, payload));
    },
    onSuccess: (created, variables) => invalidateAssumptionQueries(created.project_id || variables.project_id),
  });
  const update = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = mapAssumptionInputToPayload(data);
      if (Object.keys(payload).length === 0) return selectedAssumption;
      return mapAssumptionFromApi(await raidApi.updateAssumption(id, payload));
    },
    onSuccess: (updated, variables) => {
      const projectId = updated?.project_id || selectedAssumption?.project_id || variables?.data?.project_id;
      invalidateAssumptionQueries(projectId);
      qc.invalidateQueries({ queryKey: ['assumption-detail', variables.id] });
      if (updated?.id) setSelectedAssumption(updated);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => raidApi.deleteAssumption(id),
    onSuccess: () => {
      invalidateAssumptionQueries(selectedAssumption?.project_id);
      setSelectedAssumption(null);
    },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';

  const filteredProjectsForDropdown = filterPrograms.length ? projects.filter(p => filterPrograms.includes(p.program_id)) : projects;

  const filtered = assumptions.filter(a => {
    if (filterPrograms.length && !filterPrograms.includes(a.program_id)) return false;
    if (filterProjects.length && !filterProjects.includes(a.project_id)) return false;
    return true;
  });

  const nextId = () => `AL-${String(assumptions.length + 1).padStart(3, '0')}`;

  const exportColumns = [
    { label: 'Assumption ID', key: 'assumption_id' },
    { label: 'Status', key: 'status' },
    { label: 'Program', value: (a) => getProgramName(a.program_id) },
    { label: 'Project', value: (a) => getProjectName(a.project_id) },
    { label: 'Assumption Description', key: 'description' },
    { label: 'Date Entered', key: 'date_entered' },
    { label: 'Entered By', key: 'entered_by' },
  ];
  const handleExportAll = () => exportRecords(filtered, exportColumns, `assumption_log_export_${new Date().toISOString().slice(0, 10)}.csv`);

  const handleCreate = (formData) => {
    create.mutate({ ...formData, assumption_id: nextId() });
  };

  const handleUpdate = (id, data) => update.mutate({ id, data });

  const AssumptionState = ({ title, message, action }) => (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-teal-600" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        {action}
      </div>
    </div>
  );

  const renderAssumptionState = () => {
    if (!selectedAccountId) {
      return <AssumptionState title="No account selected" message="Select an account to load assumptions." />;
    }
    if (isError) {
      return (
        <AssumptionState
          title="Unable to load assumptions"
          message={error?.message || 'The assumption log could not be loaded.'}
          action={(
            <button type="button" onClick={() => refetch()} className="mt-4 rounded-md bg-[#c87b14] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#a86610]">
              Retry
            </button>
          )}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => setVacationCalendarOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Assumption Log</h1>
              <p className="text-xs text-slate-500">{filtered.length} assumption{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SavedFilterView
              storageKey="assumption_log_views"
              currentFilters={{ programs: filterPrograms, projects: filterProjects }}
              onLoadFilters={f => { setFilterPrograms(f.programs || []); setFilterProjects(f.projects || []); }}
            />
            <Button size="sm" variant="outline" onClick={handleExportAll} className="h-8 gap-1 text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-[#c87b14] hover:bg-[#a86610] h-8 gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> New Assumption
            </Button>
          </div>
        </div>
        {/* Filter bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Program:</span>
            <MultiSelectFilter
              options={programs.map(p => ({ value: p.id, label: p.name }))}
              selected={filterPrograms}
              onChange={setFilterPrograms}
              allLabel="All Programs"
              className="h-8 w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Project:</span>
            <MultiSelectFilter
              options={filteredProjectsForDropdown.map(p => ({ value: p.id, label: p.name }))}
              selected={filterProjects}
              onChange={setFilterProjects}
              allLabel="All Projects"
              className="h-8 w-40"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {renderAssumptionState() || (isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  {['Assumption ID', 'Status', 'Program', 'Project', 'Assumption Description', 'Date Entered', 'Entered By', 'Comments'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No assumptions yet. Click "New Assumption" to create one.
                    </td>
                  </tr>
                )}
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => setSelectedAssumption(a)}
                    className={cn('border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors', selectedAssumption?.id === a.id && 'bg-indigo-50')}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">{a.assumption_id}</td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <Select value={a.status} onValueChange={val => { update.mutate({ id: a.id, data: { status: val } }); }}>
                        <SelectTrigger className={cn('h-6 text-xs border-0 px-2 rounded-full font-medium w-auto', STATUS_STYLES[a.status])} onClick={e => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[val])}>{label}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{a.program_id ? getProgramName(a.program_id) : '\u2014'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{a.project_id ? getProjectName(a.project_id) : '\u2014'}</td>
                    <td className="px-3 py-2 max-w-xs"><p className="truncate text-slate-800">{a.description}</p></td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{a.date_entered || '\u2014'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{a.entered_by || '\u2014'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{a.comment_count ?? 0}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </div>

      {selectedAssumption && (
        <AssumptionDetailPanel assumption={selectedAssumptionDetail || selectedAssumption} onUpdate={handleUpdate} onClose={() => setSelectedAssumption(null)} onDelete={() => remove.mutate(selectedAssumption.id)} />
      )}

      <AddAssumptionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}
        projects={projects} programs={programs} resources={resources} onCreate={handleCreate} />
    </div>
  );
}

function AssumptionDetailPanel({ assumption, onUpdate, onClose, onDelete }) {
  const [local, setLocal] = useState(assumption);
  const [commentText, setCommentText] = useState('');
  const { comments, addComment: postComment } = useEntityComments('ASSUMPTION', assumption.id);
  React.useEffect(() => { setLocal(assumption); }, [assumption.id]);
  const save = (field, value) => onUpdate(assumption.id, { [field]: value });
  const addComment = async () => {
    if (!commentText.trim()) return;
    await postComment(commentText.trim());
    setCommentText('');
  };
  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs text-slate-500 font-mono">{local.assumption_id}</p>
          <h2 className="text-sm font-semibold text-slate-800 truncate">{local.description || 'Assumption Detail'}</h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDelete && <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 text-xs" onClick={async () => { if (await confirmAction({ title: 'Delete this assumption?', description: 'This cannot be undone.' })) { onDelete(); onClose(); } }}>Delete</Button>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <DField label="Assumption Description">
            <Textarea value={local.description || ''} onChange={e => setLocal(p => ({ ...p, description: e.target.value }))}
              onBlur={e => save('description', e.target.value)} className="text-sm min-h-[70px]" />
          </DField>
          <DField label="Entered By">
            <Input value={local.entered_by || ''} onChange={e => setLocal(p => ({ ...p, entered_by: e.target.value }))}
              onBlur={e => save('entered_by', e.target.value)} className="h-8 text-sm" placeholder="Name..." />
          </DField>
          <DField label="Date Entered">
            <Input type="date" value={local.date_entered || ''} onChange={e => setLocal(p => ({ ...p, date_entered: e.target.value }))}
              onBlur={e => save('date_entered', e.target.value)} className="h-8 text-sm" />
          </DField>
          <DField label="Status">
            <Select value={local.status} onValueChange={val => { setLocal(p => ({ ...p, status: val })); save('status', val); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </DField>
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