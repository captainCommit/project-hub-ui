import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Plus, X, Download, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportRecords } from '@/lib/exportUtils';
import StarButton from '@/components/projects/StarButton';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  in_review: 'bg-amber-100 text-amber-700',
  validated: 'bg-emerald-100 text-emerald-700',
  deferred: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  in_review: 'In Review',
  validated: 'Validated',
  deferred: 'Deferred',
  cancelled: 'Cancelled',
};

const emptyForm = () => ({
  title: '', description: '', priority: 'medium', status: 'in_review',
  entered_by: '', entered_date: '', test_case_id: [],
  project_id: '', program_id: '', portfolio_id: '',
});

const EXPORT_COLUMNS = [
  { label: 'Requirement ID', key: 'requirement_id' },
  { label: 'Test Case ID', key: 'test_case_id' },
  { label: 'Status', key: 'status' },
  { label: 'Priority', key: 'priority' },
  { label: 'Title', key: 'title' },
  { label: 'Description', key: 'description' },
  { label: 'Entered By', key: 'entered_by' },
  { label: 'Entered Date', key: 'entered_date' },
];

export default function RequirementView() {
  const queryClient = useQueryClient();
  const [filterPortfolioId, setFilterPortfolioId] = useState('all');
  const [filterProgramId, setFilterProgramId] = useState('all');
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  const { data: requirements = [], isLoading } = useQuery({ queryKey: ['requirements'], queryFn: () => base44.entities.Requirement.list('-created_date') });
  const { projects, programs, portfolios } = useAccountHierarchy();
  const { data: testCases = [] } = useQuery({ queryKey: ['test_cases'], queryFn: () => base44.entities.TestCase.list() });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Requirement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['requirements'] }); setPanelOpen(false); setForm(emptyForm()); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Requirement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['requirements'] }); setPanelOpen(false); setEditingId(null); setForm(emptyForm()); },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';

  const programsForFilter = filterPortfolioId === 'all' ? programs : programs.filter(p => p.portfolio_id === filterPortfolioId);
  const projectsForFilter = filterProgramId === 'all'
    ? (filterPortfolioId === 'all' ? projects : projects.filter(p => p.portfolio_id === filterPortfolioId || programsForFilter.some(pg => pg.id === p.program_id)))
    : projects.filter(p => p.program_id === filterProgramId);

  const filtered = requirements.filter(r => {
    if (filterPortfolioId !== 'all' && r.portfolio_id !== filterPortfolioId) return false;
    if (filterProgramId !== 'all' && r.program_id !== filterProgramId) return false;
    if (filterProjectId !== 'all' && r.project_id !== filterProjectId) return false;
    return true;
  });

  const handleExportAll = () => exportRecords(filtered, EXPORT_COLUMNS, `requirements_${new Date().toISOString().slice(0, 10)}.csv`);

  const handleSubmit = () => {
    if (!form.title || !form.project_id) return;
    if (editingId) {
      update.mutate({ id: editingId, data: form });
    } else {
      const id = `REQ-${String(requirements.length + 1).padStart(3, '0')}`;
      create.mutate({ ...form, requirement_id: id });
    }
  };

  const handleRowClick = (r) => {
    setEditingId(r.id);
    setForm({
      title: r.title || '', description: r.description || '', priority: r.priority || 'medium',
      status: r.status || 'in_review', entered_by: r.entered_by || '', entered_date: r.entered_date || '',
      test_case_id: Array.isArray(r.test_case_id) ? r.test_case_id : (r.test_case_id ? [r.test_case_id] : []), project_id: r.project_id || '', program_id: r.program_id || '',
      portfolio_id: r.portfolio_id || '',
    });
    setPanelOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqId = params.get('reqId');
    if (reqId && requirements.length) {
      const r = requirements.find(x => x.id === reqId);
      if (r) handleRowClick(r);
    }
  }, [requirements]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Header */}
      <div style={{ background: '#002046' }} className="px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Requirements</h1>
            <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">{filtered.length} requirement{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3">
        <select value={filterPortfolioId} onChange={e => { setFilterPortfolioId(e.target.value); setFilterProgramId('all'); setFilterProjectId('all'); }}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
          <option value="all">All Portfolios</option>
          {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterProgramId} onChange={e => { setFilterProgramId(e.target.value); setFilterProjectId('all'); }}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
          <option value="all">All Programs</option>
          {programsForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
          <option value="all">All Projects</option>
          {projectsForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={handleExportAll} className="h-8 gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => { setForm(emptyForm()); setEditingId(null); setPanelOpen(true); }} className="h-8 gap-1.5 bg-[#c87b14] hover:bg-[#c87b14]/90 text-white">
            <Plus className="w-3.5 h-3.5" /> Add Requirement
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="p-5">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <ScrollArea className="max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm" style={{ minWidth: 1100 }}>
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  {[
                    { h: '', w: 'w-10' },
                    { h: 'Requirement ID', w: 'w-24' },
                    { h: 'Test Case ID', w: 'w-24' },
                    { h: 'Status', w: '' },
                    { h: 'Program', w: '' },
                    { h: 'Project', w: '' },
                    { h: 'Priority', w: '' },
                    { h: 'Title', w: 'min-w-[300px]' },
                    { h: 'Entered By', w: '' },
                    { h: 'Entered Date', w: '' },
                  ].map(({ h, w }) => (
                    <th key={h} className={cn('text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap', w)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={10} className="text-center py-10 text-slate-400 text-xs">Loading...</td></tr>}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-14 text-slate-400 text-sm">No requirements yet. Click "Add Requirement" to create one.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(r)}>
                    <td className="px-2 py-2.5"><StarButton type="requirement" id={r.id} name={r.title} /></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">{r.requirement_id}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 align-top"><div className="max-w-[180px] flex flex-wrap gap-1">{(() => { const ids = Array.isArray(r.test_case_id) ? r.test_case_id : (r.test_case_id ? [r.test_case_id] : []); return ids.length ? ids.map((id, i) => <span key={i} className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{id}</span>) : '—'; })()}</div></td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[r.status] || STATUS_COLORS.in_review)}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 align-top"><div className="max-w-[160px] break-words whitespace-normal leading-snug">{getProgramName(r.program_id)}</div></td>
                    <td className="px-4 py-2.5 text-slate-700 align-top"><div className="max-w-[180px] break-words whitespace-normal leading-snug">{getProjectName(r.project_id)}</div></td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium)}>{r.priority}</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 align-top">
                      <div className="max-w-[360px] break-words whitespace-normal leading-snug">{r.title}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{r.entered_by || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{r.entered_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </div>

      {/* Add / Edit Requirement Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setPanelOpen(false)}>
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">{editingId ? 'Edit Requirement' : 'Add Requirement'}</h2>
              <button onClick={() => { setPanelOpen(false); setEditingId(null); }} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Portfolio</Label>
                    <Select value={form.portfolio_id} onValueChange={v => setForm(p => ({ ...p, portfolio_id: v }))}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Program</Label>
                    <Select value={form.program_id} onValueChange={v => setForm(p => ({ ...p, program_id: v }))}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Project <span className="text-red-500">*</span></Label>
                    <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <Field label="Requirement ID"><Input value={editingId ? (requirements.find(t => t.id === editingId)?.requirement_id || '') : `REQ-${String(requirements.length + 1).padStart(3, '0')}`} disabled className="h-8 text-sm bg-slate-50 text-slate-400" /></Field>
                <Field label="Title *"><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Requirement title..." className="h-8 text-sm" /></Field>
                <Field label="Description"><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="text-sm" /></Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Priority">
                    <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="validated">Validated</SelectItem>
                        <SelectItem value="deferred">Deferred</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Linked Test Case(s)">
                  <TestCaseMultiSelect
                    options={form.project_id ? testCases.filter(t => t.project_id === form.project_id) : testCases}
                    selected={Array.isArray(form.test_case_id) ? form.test_case_id : (form.test_case_id ? [form.test_case_id] : [])}
                    onChange={(arr) => setForm(p => ({ ...p, test_case_id: arr }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Entered By"><Input value={form.entered_by} onChange={e => setForm(p => ({ ...p, entered_by: e.target.value }))} className="h-8 text-sm" /></Field>
                  <Field label="Entered Date"><Input type="date" value={form.entered_date} onChange={e => setForm(p => ({ ...p, entered_date: e.target.value }))} className="h-8 text-sm" /></Field>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => { setPanelOpen(false); setEditingId(null); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title || !form.project_id} className="bg-[#002046] hover:bg-[#002046]/90">{editingId ? 'Save Changes' : 'Add Requirement'}</Button>
            </div>
          </div>
        </div>
      )}
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

function TestCaseMultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} className="h-8 w-full text-sm border border-slate-200 rounded-md px-2 text-left text-slate-700 bg-white flex items-center justify-between">
        <span className="truncate text-xs">{selected.length ? `${selected.length} test case${selected.length !== 1 ? 's' : ''} linked` : '—'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {options.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No test cases available</div>}
          {options.map(t => {
            const val = t.test_case_id || t.id;
            const checked = selected.includes(val);
            return (
              <button type="button" key={t.id} onClick={() => toggle(val)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50">
                <span className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0', checked ? 'bg-[#002046] border-[#002046]' : 'border-slate-300')}>
                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span className="truncate">{t.test_case_id ? `${t.test_case_id} — ${t.title}` : t.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}