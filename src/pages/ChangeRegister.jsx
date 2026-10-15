import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { FileEdit, Loader2, X, MessageSquare, Download } from 'lucide-react';
import SavedFilterView from '@/components/projects/SavedFilterView';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import { exportRecords } from '@/lib/exportUtils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAccountChangeRequests, useAccountDecisions, useAccountHierarchy, useAccountResources } from '@/hooks/useAccountLookups';
import { changeRequestsApi, mapChangeRequestFromApi, mapChangeRequestInputToPayload } from '@/api/projectLogs';
import { raidApi } from '@/api/raid';
import { confirmAction } from '@/components/ui/confirm-dialog';

const CR_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  { value: 'deferred', label: 'Deferred', color: 'bg-orange-100 text-orange-700' },
  { value: 'implemented', label: 'Implemented', color: 'bg-emerald-100 text-emerald-700' },
];

const getStatus = (val) => CR_STATUSES.find(s => s.value === val) || CR_STATUSES[0];
const priorityColors = {
  low: 'bg-blue-100 text-black',
  medium: 'bg-yellow-100 text-black',
  high: 'bg-orange-100 text-black',
  critical: 'bg-red-100 text-black',
};
const today = () => new Date().toISOString().split('T')[0];
const parseRelated = (val) => { if (!val) return []; try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {} return val ? [val] : []; };
const saveRelated = (arr) => arr.length === 0 ? '' : JSON.stringify(arr);

export default function ChangeRegister({ embedded = false }) {
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [selectedCR, setSelectedCR] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { changeRequests, isLoading } = useAccountChangeRequests();
  const { projects, programs, portfolios } = useAccountHierarchy();
  const resources = useAccountResources();
  const decisions = useAccountDecisions();

  const getRelatedDecisions = (programId) => {
    const hasProgram = programId && programId !== 'all';
    return hasProgram
      ? decisions.filter(d => !d.program_id || d.program_id === 'all' || d.program_id === programId)
      : decisions;
  };

  const linkDecision = async (relatedRecord, crCode) => {
    const decision = decisions.find(d => d.decision_id === relatedRecord || d.id === relatedRecord);
    if (!decision) return;
    await raidApi.updateDecision(decision.id, { related_record: crCode });
    queryClient.invalidateQueries({ queryKey: ['account-decisions'] });
  };

  const create = useMutation({
    mutationFn: async (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating a change request.');
      const cr = mapChangeRequestFromApi(await changeRequestsApi.create(data.project_id, mapChangeRequestInputToPayload(data)));
      if (data.related_record) await linkDecision(data.related_record, cr.cr_id);
      return cr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['change_requests'] })
  });

  const update = useMutation({
    mutationFn: async ({ id, data }) => {
      const cr = mapChangeRequestFromApi(await changeRequestsApi.update(id, mapChangeRequestInputToPayload(data)));
      if (data.related_record) await linkDecision(data.related_record, cr.cr_id);
      return cr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['change_requests'] })
  });

  const remove = useMutation({
    mutationFn: (id) => changeRequestsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['change_requests'] }); setSelectedCR(null); }
  });

  const handleAdd = (data) => {
    const id = `CR-${String(changeRequests.length + 1).padStart(3, '0')}`;
    create.mutate({ ...data, cr_id: id });
  };

  const handleUpdate = (id, data) => {
    update.mutate({ id, data });
    if (selectedCR?.id === id) setSelectedCR(prev => ({ ...prev, ...data }));
  };

  const filteredProjectsForDropdown = filterPrograms.length ? projects.filter(p => filterPrograms.includes(p.program_id)) : projects;

  const filtered = changeRequests.filter(c => {
    if (filterPrograms.length && !filterPrograms.includes(c.program_id)) return false;
    if (filterProjects.length && !filterProjects.includes(c.project_id)) return false;
    return true;
  });

  const getProject = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgram = (id) => programs.find(p => p.id === id)?.name || '—';

  const exportColumns = [
    { label: 'CR ID', key: 'cr_id' },
    { label: 'Status', value: (c) => getStatus(c.status).label },
    { label: 'Program', value: (c) => getProgram(c.program_id) },
    { label: 'Project', value: (c) => getProject(c.project_id) },
    { label: 'Priority', key: 'priority' },
    { label: 'Title', key: 'title' },
    { label: 'Proposed By', key: 'proposed_by' },
    { label: 'Proposed Date', key: 'proposed_date' },
    { label: 'Related Record', value: (c) => parseRelated(c.related_record).join('; ') },
  ];
  const handleExportAll = () => exportRecords(filtered, exportColumns, `change_register_export_${new Date().toISOString().slice(0, 10)}.csv`);

  if (isLoading) return embedded ? (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  ) : (
    <div className="h-screen flex items-center justify-center bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  const content = (
    <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {!embedded && (
            <div className="flex items-center gap-3 mb-4 px-6 pt-4">
              <FileEdit className="w-6 h-6 text-violet-500" />
              <h1 className="text-2xl font-bold text-slate-800">Change Register</h1>
              <span className="text-sm text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{changeRequests.length} changes</span>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 border border-b-0 border-slate-300 rounded-t-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Program:</span>
              <MultiSelectFilter
                options={programs.map(p => ({ value: p.id, label: p.name }))}
                selected={filterPrograms}
                onChange={setFilterPrograms}
                allLabel="All Programs"
                className="h-7 w-40 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Project:</span>
              <MultiSelectFilter
                options={filteredProjectsForDropdown.map(p => ({ value: p.id, label: p.name }))}
                selected={filterProjects}
                onChange={setFilterProjects}
                allLabel="All Projects"
                className="h-7 w-40 bg-white"
              />
            </div>
            <SavedFilterView
              storageKey="change_register_views"
              currentFilters={{ programs: filterPrograms, projects: filterProjects }}
              onLoadFilters={f => { setFilterPrograms(f.programs || []); setFilterProjects(f.projects || []); }}
            />
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={() => setAddDialogOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c87b14] hover:bg-[#a86610] text-white text-sm font-medium rounded-lg transition-colors">
                + New Change Request
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden bg-white border border-slate-300 rounded-b-sm">
            <ScrollArea className="h-full">
              <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-b from-slate-100 to-slate-200 border-b-2 border-slate-300">
                    {[{l:'CR ID',c:'text-center w-24'},{l:'Status',c:'text-center w-24'},{l:'Program',c:'text-left w-28'},{l:'Project',c:'text-left w-32'},{l:'Priority',c:'text-center w-24'},{l:'Title',c:'text-left min-w-[240px]'},{l:'Proposed By',c:'text-left w-28'},{l:'Proposed Date',c:'text-center w-28'},{l:'Related Record',c:'text-left w-44'}].map((h, i) => (
                      <th key={i} className={cn("py-2 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap", h.c)}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cr => (
                    <tr key={cr.id} className={cn("border-b border-slate-200 hover:bg-violet-50/30 cursor-pointer", selectedCR?.id === cr.id && "bg-violet-50")}
                      onClick={() => setSelectedCR(cr)}>
                      <td className="py-2 px-3 text-sm font-mono text-slate-600 whitespace-nowrap text-center">{cr.cr_id}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatus(cr.status).color)}>{getStatus(cr.status).label}</span>
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-500 break-words">{getProgram(cr.program_id)}</td>
                      <td className="py-2 px-3 text-sm break-words">{getProject(cr.project_id)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", priorityColors[cr.priority] || priorityColors.medium)}>{cr.priority || 'medium'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm block">{cr.title || <span className="text-slate-300">—</span>}</span>
                      </td>
                      <td className="py-2 px-3 text-sm whitespace-nowrap">{cr.proposed_by || '—'}</td>
                      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap text-center">{cr.proposed_date || '—'}</td>
                      <td className="py-2 px-3 w-44">
                        <div className="flex flex-wrap gap-1">
                          {parseRelated(cr.related_record).length > 0
                            ? parseRelated(cr.related_record).map(id => (
                                <span key={id} title={decisions.find(d => d.decision_id === id)?.decision || ''}
                                  className="px-2 py-0.5 bg-[#002046]/10 text-[#002046] rounded text-xs font-mono cursor-default">{id}</span>
                              ))
                            : <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-400 text-sm">No change requests yet. Click "New Change Request" to create one.</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCR && (
          <CRDetailPanel
            cr={selectedCR}
            resources={resources}
            decisions={decisions}
            getRelatedDecisions={getRelatedDecisions}
            onUpdate={handleUpdate}
            onClose={() => setSelectedCR(null)}
            onDelete={() => remove.mutate(selectedCR.id)}
          />
        )}

        <AddCRDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          projects={projects}
          programs={programs}
          resources={resources}
          decisions={decisions}
          getRelatedDecisions={getRelatedDecisions}
          onCreate={handleAdd}
        />
      </div>
  );
  if (embedded) return content;
  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      {content}
    </div>
  );
}

function CRDetailPanel({ cr, resources = [], decisions = [], getRelatedDecisions, onUpdate, onClose, onDelete }) {
  const [local, setLocal] = React.useState(cr);
  const [commentText, setCommentText] = React.useState('');
  const [proposedByQ, setProposedByQ] = React.useState('');
  const [showProposedByDrop, setShowProposedByDrop] = React.useState(false);

  React.useEffect(() => { setLocal(cr); }, [cr.id]);

  const save = (field, value) => { setLocal(p => ({ ...p, [field]: value })); onUpdate(cr.id, { [field]: value }); };
  const filteredResources = resources.filter(r => r.full_name.toLowerCase().includes(proposedByQ.toLowerCase())).slice(0, 7);

  const addComment = () => {
    if (!commentText.trim()) return;
    const comments = [...(local.comments || []), { text: commentText, author: 'You', date: new Date().toISOString() }];
    setLocal(p => ({ ...p, comments }));
    onUpdate(cr.id, { comments });
    setCommentText('');
  };

  const relatedDecisions = getRelatedDecisions(local.program_id);

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs text-slate-500 font-mono">{local.cr_id}</p>
          <h2 className="text-sm font-semibold text-slate-800 truncate">{local.title || 'Change Request Detail'}</h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDelete && <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 text-xs" onClick={async () => { if (await confirmAction({ title: 'Delete this change request?', description: 'This cannot be undone.' })) onDelete(); }}>Delete</Button>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={local.status || 'draft'} onValueChange={v => save('status', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {/* Priority */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Priority</Label>
            <Select value={local.priority || 'medium'} onValueChange={v => { setLocal(p => ({ ...p, priority: v })); save('priority', v); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Title</Label>
            <Input value={local.title || ''} onChange={e => setLocal(p => ({ ...p, title: e.target.value }))} onBlur={e => save('title', e.target.value)} className="h-8 text-sm" />
          </div>
          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea value={local.description || ''} onChange={e => setLocal(p => ({ ...p, description: e.target.value }))} onBlur={e => save('description', e.target.value)} className="text-sm min-h-[80px]" />
          </div>
          {/* Proposed By */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Proposed By</Label>
            <div className="relative">
              <Input value={showProposedByDrop ? proposedByQ : (local.proposed_by || '')}
                onChange={e => { setProposedByQ(e.target.value); setLocal(p => ({ ...p, proposed_by: e.target.value })); setShowProposedByDrop(true); }}
                onFocus={() => { setProposedByQ(local.proposed_by || ''); setShowProposedByDrop(true); }}
                onBlur={() => setTimeout(() => { setShowProposedByDrop(false); setProposedByQ(''); save('proposed_by', local.proposed_by || ''); }, 200)}
                className="h-8 text-sm" placeholder="Search resources..." />
              {showProposedByDrop && filteredResources.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded shadow-lg mt-0.5">
                  {filteredResources.map(r => (
                    <button key={r.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50" onMouseDown={() => { save('proposed_by', r.full_name); setLocal(p => ({ ...p, proposed_by: r.full_name })); setProposedByQ(''); setShowProposedByDrop(false); }}>{r.full_name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Proposed Date */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Proposed Date</Label>
            <Input type="date" value={local.proposed_date || ''} onChange={e => setLocal(p => ({ ...p, proposed_date: e.target.value }))} onBlur={e => save('proposed_date', e.target.value)} className="h-8 text-sm" />
          </div>
          {/* Related Record */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Related Record</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {parseRelated(local.related_record).map(id => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#002046]/10 text-[#002046] rounded text-xs font-mono">
                  {id}<button onClick={() => { const arr = parseRelated(local.related_record).filter(x => x !== id); const val = saveRelated(arr); save('related_record', val); setLocal(p => ({ ...p, related_record: val })); }} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <Select value="" onValueChange={v => { if (!v) return; const arr = parseRelated(local.related_record); if (!arr.includes(v)) { const val = saveRelated([...arr, v]); save('related_record', val); setLocal(p => ({ ...p, related_record: val })); } }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Add a related record…" /></SelectTrigger>
              <SelectContent>
                {relatedDecisions.filter(d => !parseRelated(local.related_record).includes(d.decision_id || d.id)).map(d => (
                  <SelectItem key={d.id} value={d.decision_id || d.id}>
                    <span className="font-mono text-xs mr-2">{d.decision_id}</span>
                    <span className="text-xs text-slate-500 truncate">{d.decision}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comments */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Comments</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{(local.comments || []).length}</span>
            </div>
            <div className="space-y-2 mb-3">
              {(local.comments || []).map((c, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{c.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{c.author} · {new Date(c.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            <div className="relative">
              <Input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a comment..." className="h-8 text-xs pr-16" />
              <Button size="sm" className="h-8 absolute right-0 top-0 rounded-l-none" onClick={addComment}>Add</Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function AddCRDialog({ open, onOpenChange, projects, programs, resources, decisions, getRelatedDecisions, onCreate }) {
  const emptyForm = () => ({ title: '', description: '', priority: 'medium', project_id: '', program_id: '', proposed_by: '', proposed_date: today(), status: 'draft', related_record: '' });
  const [form, setForm] = useState(emptyForm());
  const [proposedByQ, setProposedByQ] = useState('');
  const [showDrop, setShowDrop] = useState(false);

  const filteredResources = resources.filter(r => r.full_name.toLowerCase().includes(proposedByQ.toLowerCase())).slice(0, 7);
  const filteredProjects = form.program_id ? projects.filter(p => p.program_id === form.program_id) : projects;
  const relatedDecisions = getRelatedDecisions(form.program_id);

  const handleSubmit = () => {
    if (!form.title) return;
    onCreate(form);
    onOpenChange(false);
    setForm(emptyForm());
    setProposedByQ('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(emptyForm()); setProposedByQ(''); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Change Request</DialogTitle></DialogHeader>
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
              <Label className="text-xs text-slate-500">Project</Label>
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
              <Label className="text-xs text-slate-500">Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Change request title..." className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the change..." rows={2} className="text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Proposed By</Label>
              <div className="relative mt-1">
                <Input value={proposedByQ || form.proposed_by}
                  onChange={e => { setProposedByQ(e.target.value); setForm(p => ({ ...p, proposed_by: e.target.value })); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => { setShowDrop(false); setProposedByQ(''); }, 200)}
                  placeholder="Search resources..." className="h-8 text-sm" />
                {showDrop && filteredResources.length > 0 && (
                  <div className="absolute z-20 top-9 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                    {filteredResources.map(r => (
                      <button key={r.id} onMouseDown={() => { setForm(p => ({ ...p, proposed_by: r.full_name })); setProposedByQ(''); setShowDrop(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700">{r.full_name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Proposed Date</Label>
              <Input type="date" value={form.proposed_date} onChange={e => setForm(p => ({ ...p, proposed_date: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Related Record</Label>
              <div className="flex flex-wrap gap-1 mt-1 mb-1">
                {parseRelated(form.related_record).map(id => (
                  <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#002046]/10 text-[#002046] rounded text-xs font-mono">
                    {id}<button type="button" onClick={() => { const arr = parseRelated(form.related_record).filter(x => x !== id); setForm(p => ({ ...p, related_record: saveRelated(arr) })); }} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <Select value="" onValueChange={v => { if (!v) return; const arr = parseRelated(form.related_record); if (!arr.includes(v)) setForm(p => ({ ...p, related_record: saveRelated([...arr, v]) })); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Add a record…" /></SelectTrigger>
                <SelectContent>
                  {relatedDecisions.filter(d => !parseRelated(form.related_record).includes(d.decision_id || d.id)).map(d => (
                    <SelectItem key={d.id} value={d.decision_id || d.id}>
                      <span className="font-mono text-xs mr-1">{d.decision_id}</span>
                      <span className="text-xs text-slate-500">{d.decision?.slice(0, 20)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title} className="bg-[#c87b14] hover:bg-[#a86610]">New Change Request</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}