import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { raidApi, mapDecisionFromApi, mapDecisionInputToPayload, mapDecisionListFromApi, mapDecisionOptionFromApi, mapDecisionOptionInputToPayload, mapDecisionOptionListFromApi } from '@/api/raid';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { Scale, Loader2, Plus, X, MessageSquare, ChevronDown, ChevronRight, AtSign, Download } from 'lucide-react';
import SavedFilterView from '@/components/projects/SavedFilterView';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import { exportRecords } from '@/lib/exportUtils';
import { getRaidStatuses, getStatusColor } from '@/lib/raidStatuses';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAccountHierarchy, useAccountResources } from '@/hooks/useAccountLookups';
import { confirmAction } from '@/components/ui/confirm-dialog';

const getDecisionStatuses = () => getRaidStatuses('decision');
const statusOptions = getDecisionStatuses();
const getStatus = (val) => statusOptions.find(s => s.value === val) || statusOptions[0] || { value: val, label: val };

const priorityColors = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const empty = { project_id: '', program_id: '', priority: 'medium', decision: '', description: '', proposed_date: '', proposed_by: '', status: 'draft' };

export default function DecisionLog({ embedded = false }) {
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();

  const { data: decisions = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['account-decisions', selectedAccountId],
    queryFn: async () => mapDecisionListFromApi(await raidApi.listAccountDecisions(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { projects, programs, portfolios } = useAccountHierarchy();
  const resources = useAccountResources();

  const decisionDetailId = selectedDecision?.id || null;
  const { data: selectedDecisionDetail } = useQuery({
    queryKey: ['decision-detail', decisionDetailId],
    queryFn: async () => mapDecisionFromApi(await raidApi.getDecision(decisionDetailId)),
    enabled: !!decisionDetailId,
  });

  const invalidateDecisionQueries = (projectId) => {
    queryClient.invalidateQueries({ queryKey: ['account-decisions', selectedAccountId] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
    }
  };

  const create = useMutation({
    mutationFn: async (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating a decision.');
      const payload = mapDecisionInputToPayload(data);
      return mapDecisionFromApi(await raidApi.createDecision(data.project_id, payload));
    },
    onSuccess: (created, variables) => invalidateDecisionQueries(created.project_id || variables.project_id),
  });
  const update = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = mapDecisionInputToPayload(data);
      if (Object.keys(payload).length === 0) return selectedDecision;
      return mapDecisionFromApi(await raidApi.updateDecision(id, payload));
    },
    onSuccess: (updated, variables) => {
      const projectId = updated?.project_id || selectedDecision?.project_id || variables?.data?.project_id;
      invalidateDecisionQueries(projectId);
      queryClient.invalidateQueries({ queryKey: ['decision-detail', variables.id] });
      if (updated?.id) setSelectedDecision(updated);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => raidApi.deleteDecision(id),
    onSuccess: () => {
      invalidateDecisionQueries(selectedDecision?.project_id);
      setSelectedDecision(null);
    },
  });

  const handleAdd = (data) => {
    const id = `DL-${String(decisions.length + 1).padStart(3, '0')}`;
    create.mutate({ ...data, decision_id: id });
  };

  const handleUpdate = (id, data) => {
    update.mutate({ id, data });
    if (selectedDecision?.id === id) setSelectedDecision(prev => ({ ...prev, ...data }));
  };

  const filteredProjectsForDropdown = filterPrograms.length ? projects.filter(p => filterPrograms.includes(p.program_id)) : projects;

  const filtered = decisions.filter(d => {
    if (filterPrograms.length && d.program_id && !filterPrograms.includes(d.program_id)) return false;
    if (filterProjects.length && !filterProjects.includes(d.project_id)) return false;
    return true;
  });

  const getProject = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgram = (id) => programs.find(p => p.id === id)?.name || '—';

  const exportColumns = [
    { label: 'Decision ID', key: 'decision_id' },
    { label: 'Status', key: 'status' },
    { label: 'Program', value: (d) => getProgram(d.program_id) },
    { label: 'Project', value: (d) => getProject(d.project_id) },
    { label: 'Priority', key: 'priority' },
    { label: 'Title', key: 'decision' },
    { label: 'Proposed By', key: 'proposed_by' },
    { label: 'Proposed Date', key: 'proposed_date' },
    { label: 'Related Record', key: 'related_record' },
  ];
  const handleExportAll = () => exportRecords(filtered, exportColumns, `decision_log_export_${new Date().toISOString().slice(0, 10)}.csv`);

  const DecisionState = ({ title, message, action }) => (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <Scale className="mx-auto mb-3 h-8 w-8 text-[#002046]" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        {action}
      </div>
    </div>
  );

  const renderDecisionState = () => {
    if (!selectedAccountId) {
      return <DecisionState title="No account selected" message="Select an account to load decisions." />;
    }
    if (isError) {
      return (
        <DecisionState
          title="Unable to load decisions"
          message={error?.message || 'The decision log could not be loaded.'}
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
              <Scale className="w-6 h-6 text-[#002046]" />
              <h1 className="text-2xl font-bold text-slate-800">Decision Log</h1>
              <span className="text-sm text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{decisions.length} decisions</span>
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
              storageKey="decision_log_views"
              currentFilters={{ programs: filterPrograms, projects: filterProjects }}
              onLoadFilters={f => { setFilterPrograms(f.programs || []); setFilterProjects(f.projects || []); }}
            />
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={() => setAddDialogOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c87b14] hover:bg-[#a86610] text-white text-sm font-medium rounded-lg transition-colors">
                + Add Decision
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden bg-white border border-slate-300 rounded-b-sm">
            {renderDecisionState() || <ScrollArea className="h-full">
              <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-b from-slate-100 to-slate-200 border-b-2 border-slate-300">
                    {[{l:'Decision ID',c:'text-center w-24'},{l:'Status',c:'text-center w-24'},{l:'Program',c:'text-left w-28'},{l:'Project',c:'text-left w-32'},{l:'Priority',c:'text-center w-24'},{l:'Title',c:'text-left min-w-[240px]'},{l:'Proposed By',c:'text-left w-28'},{l:'Proposed Date',c:'text-center w-28'},{l:'Related Record',c:'text-left w-32'}].map((h, i) => (
                      <th key={i} className={cn("py-2 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap", h.c)}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className={cn("border-b border-slate-200 hover:bg-blue-50/40 cursor-pointer", selectedDecision?.id === d.id && "bg-indigo-50")}
                      onClick={() => setSelectedDecision(d)}>
                      <td className="py-2 px-3 text-sm font-mono text-slate-600 whitespace-nowrap text-center">{d.decision_id}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatusColor(d.status))}>{getStatus(d.status).label}</span>
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-500 break-words">{getProgram(d.program_id)}</td>
                      <td className="py-2 px-3 text-sm break-words">{getProject(d.project_id)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", priorityColors[d.priority] || priorityColors.medium)}>{d.priority || 'medium'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm block">{d.decision || <span className="text-slate-300">—</span>}</span>
                      </td>
                      <td className="py-2 px-3 text-sm whitespace-nowrap">{d.proposed_by || '—'}</td>
                      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap text-center">{d.proposed_date || '—'}</td>
                      <td className="py-2 px-3 text-sm w-32">
                        {d.related_record ? (
                          <span title={decisions.find(x => x.decision_id === d.related_record)?.decision || d.related_record} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-mono cursor-default">{d.related_record}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      </tr>
                      ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-400 text-sm">No decisions found. Click "Add Decision" to create one.</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedDecision && (
          <DetailPanel
            decision={selectedDecisionDetail || selectedDecision}
            resources={resources}
            onUpdate={handleUpdate}
            onClose={() => setSelectedDecision(null)}
            onDelete={() => remove.mutate(selectedDecision.id)}
          />
        )}
        <AddDecisionDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          projects={projects}
          programs={programs}
          resources={resources}
          statusOptions={statusOptions}
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

const OPTION_COLORS = [
  { bg: 'bg-blue-50', title: 'text-blue-700' },
  { bg: 'bg-purple-50', title: 'text-purple-700' },
  { bg: 'bg-emerald-50', title: 'text-emerald-700' },
  { bg: 'bg-orange-50', title: 'text-orange-700' },
  { bg: 'bg-pink-50', title: 'text-pink-700' },
];

function DetailPanel({ decision, resources = [], onUpdate, onClose, onDelete }) {
  const [local, setLocal] = React.useState(decision);
  const [commentText, setCommentText] = React.useState('');
  const [templateOpen, setTemplateOpen] = React.useState(true);
  const [approvedByInput, setApprovedByInput] = React.useState('');
  const [mentionQuery, setMentionQuery] = React.useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => { setLocal(decision); }, [decision.id]);

  const { data: decisionOptions = [] } = useQuery({
    queryKey: ['decision-options', decision.id],
    queryFn: async () => mapDecisionOptionListFromApi(await raidApi.listDecisionOptions(decision.id)),
    enabled: !!decision?.id,
  });

  const invalidateOptions = () => queryClient.invalidateQueries({ queryKey: ['decision-options', decision.id] });
  const createOptionMutation = useMutation({
    mutationFn: async (data) => mapDecisionOptionFromApi(await raidApi.createDecisionOption(decision.id, mapDecisionOptionInputToPayload(data))),
    onSuccess: invalidateOptions,
  });
  const updateOptionMutation = useMutation({
    mutationFn: async ({ optionId, data }) => mapDecisionOptionFromApi(await raidApi.updateDecisionOption(optionId, mapDecisionOptionInputToPayload(data))),
    onSuccess: invalidateOptions,
  });
  const deleteOptionMutation = useMutation({
    mutationFn: (optionId) => raidApi.deleteDecisionOption(optionId),
    onSuccess: invalidateOptions,
  });

  const save = (field, value) => onUpdate(decision.id, { [field]: value });
  const saveTemplate = (tmpl) => { setLocal(p => ({ ...p, decision_template: tmpl })); };
  const approvedBy = local.approved_by || [];
  const filteredApproved = resources.filter(r => r.full_name.toLowerCase().includes(approvedByInput.toLowerCase()) && !approvedBy.includes(r.full_name)).slice(0, 7);
  const addApprovedBy = (name) => { if (!name.trim() || approvedBy.includes(name.trim())) return; const updated = [...approvedBy, name.trim()]; setLocal(p => ({ ...p, approved_by: updated })); onUpdate(decision.id, { approved_by: updated }); setApprovedByInput(''); };
  const removeApprovedBy = (name) => { const updated = approvedBy.filter(n => n !== name); setLocal(p => ({ ...p, approved_by: updated })); onUpdate(decision.id, { approved_by: updated }); };
  const handleCommentChange = (e) => { const val = e.target.value; setCommentText(val); const atIdx = val.lastIndexOf('@'); if (atIdx !== -1 && atIdx === val.length - 1) setMentionQuery(''); else if (atIdx !== -1 && val.slice(atIdx + 1).match(/^\w+$/)) setMentionQuery(val.slice(atIdx + 1)); else setMentionQuery(null); };
  const insertMention = (name) => { const atIdx = commentText.lastIndexOf('@'); setCommentText(commentText.slice(0, atIdx) + '@' + name + ' '); setMentionQuery(null); };
  const mentionSuggestions = mentionQuery !== null ? resources.filter(r => r.full_name.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 5) : [];
  const addComment = () => { if (!commentText.trim()) return; const comments = [...(local.comments || []), { text: commentText, author: 'You', date: new Date().toISOString() }]; setLocal(p => ({ ...p, comments })); onUpdate(decision.id, { comments }); setCommentText(''); setMentionQuery(null); };
  const tmpl = local.decision_template || {};
  const options = decisionOptions;
  const setTmplField = (key, val) => {
    saveTemplate({ ...tmpl, [key]: val });
    if (key === 'description') save('description', val);
    if (key === 'impact') save('outcome', val);
  };
  const updateOption = (idx, key, val) => {
    const option = options[idx];
    if (!option?.id) return;
    updateOptionMutation.mutate({ optionId: option.id, data: { ...option, [key]: val } });
  };
  const addOption = () => { if (options.length < 5) createOptionMutation.mutate({ title: `Option ${options.length + 1}`, pros: '', cons: '', effort: '' }); };
  const removeOption = (idx) => {
    const option = options[idx];
    if (option?.id) deleteOptionMutation.mutate(option.id);
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs text-slate-500 font-mono">{local.decision_id}</p>
          <h2 className="text-sm font-semibold text-slate-800 truncate">{local.decision || 'Decision Detail'}</h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDelete && <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 text-xs" onClick={async () => { if (await confirmAction({ title: 'Delete this decision?', description: 'This cannot be undone.' })) onDelete(); }}>Delete</Button>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <Field label="Status">
            <Select value={local.status || 'draft'} onValueChange={v => { setLocal(p => ({ ...p, status: v })); save('status', v); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={local.priority || 'medium'} onValueChange={v => { setLocal(p => ({ ...p, priority: v })); save('priority', v); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Approved By">
            <div className="flex flex-wrap gap-1 mb-1">
              {approvedBy.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                  {name}<button onClick={() => removeApprovedBy(name)} className="hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
            <div className="relative">
              <Input value={approvedByInput} onChange={e => setApprovedByInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addApprovedBy(approvedByInput); }}
                onBlur={() => setTimeout(() => setApprovedByInput(''), 200)}
                className="h-8 text-sm" placeholder="Search resources or type name..." />
              {approvedByInput && filteredApproved.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded shadow-lg mt-0.5">
                  {filteredApproved.map(r => (
                    <button key={r.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50" onMouseDown={() => addApprovedBy(r.full_name)}>{r.full_name}</button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Approved Date">
            <Input type="date" value={local.approved_date || ''} onChange={e => setLocal(p => ({ ...p, approved_date: e.target.value }))} onBlur={e => save('approved_date', e.target.value)} className="h-8 text-sm" />
          </Field>

          {local.related_record && (
            <Field label="Linked Change Request">
              <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-sm font-mono">{local.related_record}</span>
            </Field>
          )}

          {/* Comments */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Comments</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{(local.comments || []).length}</span>
              <span className="text-xs text-slate-400 ml-1 flex items-center gap-0.5"><AtSign className="w-3 h-3" /> to tag</span>
            </div>
            <div className="space-y-2 mb-3">
              {(local.comments || []).map((c, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">
                    {c.text.split(/(@\w+)/g).map((part, j) =>
                      part.startsWith('@') ? <span key={j} className="text-indigo-600 font-medium">{part}</span> : part
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">{c.author} · {new Date(c.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            <div className="relative">
              <Input value={commentText} onChange={handleCommentChange} onKeyDown={e => e.key === 'Enter' && !mentionQuery && addComment()} placeholder="Add a comment... use @ to tag" className="h-8 text-xs pr-16" />
              <Button size="sm" className="h-8 absolute right-0 top-0 rounded-l-none" onClick={addComment}>Add</Button>
              {mentionSuggestions.length > 0 && (
                <div className="absolute z-20 bottom-full left-0 right-0 bg-white border border-slate-200 rounded shadow-lg mb-0.5">
                  {mentionSuggestions.map(r => (
                    <button key={r.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50" onClick={() => insertMention(r.full_name)}>@{r.full_name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Decision Information - expanded by default */}
          <div className="border-t pt-4">
            <button className="flex items-center gap-2 w-full text-sm font-medium text-slate-700 hover:text-indigo-600" onClick={() => setTemplateOpen(p => !p)}>
              <span>Decision Information</span>
              {templateOpen ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
            {templateOpen && (
              <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
                <TmplField label="Description">
                  <Textarea defaultValue={local.description || tmpl.description || ''} onBlur={e => setTmplField('description', e.target.value)} placeholder="Describe the problem statement..." className="text-xs min-h-[50px]" />
                </TmplField>
                <TmplField label="Impact">
                  <Textarea defaultValue={local.outcome || tmpl.impact || ''} onBlur={e => setTmplField('impact', e.target.value)} placeholder="What is the impact?" className="text-xs min-h-[40px]" />
                </TmplField>
                {options.map((opt, idx) => {
                  const col = OPTION_COLORS[idx % OPTION_COLORS.length];
                  return (
                    <div key={idx} className={`${col.bg} rounded p-2 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${col.title}`}>Option {idx + 1}</p>
                        {options.length > 1 && <button className="text-slate-400 hover:text-red-500 text-xs" onClick={() => removeOption(idx)}><X className="w-3 h-3" /></button>}
                      </div>
                      <TmplField label="Title"><Input defaultValue={opt.title} onBlur={e => updateOption(idx, 'title', e.target.value)} className="h-7 text-xs" placeholder="Option title..." /></TmplField>
                      <TmplField label="Pros"><Textarea defaultValue={opt.pros} onBlur={e => updateOption(idx, 'pros', e.target.value)} className="text-xs min-h-[36px]" placeholder="List pros..." /></TmplField>
                      <TmplField label="Cons"><Textarea defaultValue={opt.cons} onBlur={e => updateOption(idx, 'cons', e.target.value)} className="text-xs min-h-[36px]" placeholder="List cons..." /></TmplField>
                      <TmplField label="Work Effort"><Input defaultValue={opt.effort} onBlur={e => updateOption(idx, 'effort', e.target.value)} className="h-7 text-xs" placeholder="e.g. 2 weeks" /></TmplField>
                    </div>
                  );
                })}
                {options.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No decision options yet.</p>}
                {options.length < 5 && (
                  <button onClick={addOption} className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded border border-dashed border-indigo-300">
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function TmplField({ label, children }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

function AddDecisionDialog({ open, onOpenChange, projects, programs, resources, statusOptions, onCreate }) {
  const today = new Date().toISOString().split('T')[0];
  const emptyForm = () => ({ decision: '', description: '', priority: 'medium', project_id: '', program_id: '', proposed_by: '', proposed_date: today, status: 'draft' });
  const [form, setForm] = useState(emptyForm());
  const [proposedByQ, setProposedByQ] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const filteredResources = resources.filter(r => r.full_name.toLowerCase().includes(proposedByQ.toLowerCase())).slice(0, 7);
  const filteredProjects = form.program_id ? projects.filter(p => p.program_id === form.program_id) : projects;

  const handleSubmit = () => {
    if (!form.decision || !form.project_id) return;
    onCreate(form);
    onOpenChange(false);
    setForm(emptyForm());
    setProposedByQ('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setForm(emptyForm()); setProposedByQ(''); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Decision</DialogTitle></DialogHeader>
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
              <Label className="text-xs text-slate-500">Decision Title <span className="text-red-500">*</span></Label>
              <Input value={form.decision} onChange={e => setForm(p => ({ ...p, decision: e.target.value }))} placeholder="Decision title..." className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Additional details..." rows={2} className="text-sm mt-1" />
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
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.decision || !form.project_id} className="bg-[#c87b14] hover:bg-[#a86610]">Add Decision</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}