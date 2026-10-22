import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Plus, X, ChevronDown, Check, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportRecords } from '@/lib/exportUtils';
import {
  PageHeader, PageBody, PrimaryButton, ExportButton, StatGrid, StatCard, FilterBar, SearchInput, FilterSelect,
  DataTable, TitleCell, Pill, PriorityPill, DetailsChevron, NAVY,
} from '@/components/projects/DirectoryKit';
import { useAccountHierarchy, useAccountRequirements, useAccountTestCases } from '@/hooks/useAccountLookups';
import { mapRequirementFromApi, mapRequirementInputToPayload, requirementsApi } from '@/api/projectLogs';

const STATUS_TONES = { in_review: 'orange', validated: 'green', deferred: 'grey', cancelled: 'red' };

const STATUS_LABELS = {
  in_review: 'In Review',
  validated: 'Validated',
  deferred: 'Deferred',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const COVERAGE_OPTIONS = [{ value: 'covered', label: 'Has test cases' }, { value: 'not_covered', label: 'No test cases' }];

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
  const [search, setSearch] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCoverage, setFilterCoverage] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  const { requirements, isLoading } = useAccountRequirements();
  const { projects, programs, portfolios } = useAccountHierarchy();
  const { testCases } = useAccountTestCases();

  const invalidateLinks = () => {
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
    queryClient.invalidateQueries({ queryKey: ['test_cases'] });
  };

  const create = useMutation({
    mutationFn: async (data) => {
      const created = mapRequirementFromApi(await requirementsApi.create(data.project_id, mapRequirementInputToPayload(data)));
      await requirementsApi.syncTestCaseLinks(created.id, data.test_case_id || [], testCases);
      return created;
    },
    onSuccess: () => { invalidateLinks(); setPanelOpen(false); setForm(emptyForm()); },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }) => {
      const updated = mapRequirementFromApi(await requirementsApi.update(id, mapRequirementInputToPayload(data)));
      await requirementsApi.syncTestCaseLinks(id, data.test_case_id || [], testCases);
      return updated;
    },
    onSuccess: () => { invalidateLinks(); setPanelOpen(false); setEditingId(null); setForm(emptyForm()); },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const linkedIds = (r) => (Array.isArray(r.test_case_id) ? r.test_case_id : (r.test_case_id ? [r.test_case_id] : []));

  const validatedCount = requirements.filter(r => r.status === 'validated').length;
  const inReviewCount = requirements.filter(r => r.status === 'in_review').length;
  const coveragePct = requirements.length ? Math.round(requirements.filter(r => linkedIds(r).length > 0).length / requirements.length * 100) : 0;

  const filtered = requirements.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!(r.title || '').toLowerCase().includes(q) && !(r.requirement_id || '').toLowerCase().includes(q)) return false;
    }
    if (filterProjectId && r.project_id !== filterProjectId) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (filterCoverage === 'covered' && linkedIds(r).length === 0) return false;
    if (filterCoverage === 'not_covered' && linkedIds(r).length > 0) return false;
    return true;
  });

  const columns = [
    {
      key: 'requirement', label: 'Requirement', sortValue: r => r.requirement_id,
      render: r => (
        <TitleCell code={r.requirement_id} title={r.title} sub={`Project: ${getProjectName(r.project_id)}`} />
      ),
    },
    { key: 'status', label: 'Status', sortValue: r => STATUS_LABELS[r.status] || r.status, render: r => <Pill tone={STATUS_TONES[r.status] || 'grey'}>{STATUS_LABELS[r.status] || r.status}</Pill> },
    { key: 'priority', label: 'Priority', sortValue: r => PRIORITY_RANK[r.priority] ?? 9, render: r => <PriorityPill priority={r.priority} /> },
    {
      key: 'tests', label: 'Test Cases', sortValue: r => linkedIds(r).length,
      render: r => {
        const count = linkedIds(r).length;
        return count
          ? <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: NAVY }} title={linkedIds(r).join(', ')}><CircleCheck className="w-4 h-4 text-slate-500" /> {count} linked</span>
          : <span className="text-sm text-slate-400">None</span>;
      },
    },
    { key: 'open', label: 'Details', className: 'w-16', render: () => <DetailsChevron /> },
  ];

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
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageBody>
        <PageHeader
          icon={ClipboardList}
          title="Requirements"
          subtitle="Track requirements, validation, and test coverage across projects."
          actions={(
            <PrimaryButton icon={Plus} onClick={() => { setForm(emptyForm()); setEditingId(null); setPanelOpen(true); }}>
              New Requirement
            </PrimaryButton>
          )}
        />

        <StatGrid className="lg:grid-cols-4">
          <StatCard value={requirements.length} label="Total Requirements" sub="Across all projects" />
          <StatCard value={validatedCount} label="Validated" sub="Approved requirements" />
          <StatCard value={inReviewCount} label="In Review" sub="Awaiting validation" />
          <StatCard value={requirements.length ? `${coveragePct}%` : '—'} label="Test Coverage" sub="Requirements with test cases" />
        </StatGrid>

        <FilterBar right={<ExportButton onClick={handleExportAll} disabled={filtered.length === 0} />}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search requirements..." />
          <FilterSelect value={filterProjectId} onChange={setFilterProjectId} allLabel="All Projects" options={projects.map(p => ({ value: p.id, label: p.name }))} />
          <FilterSelect value={filterStatus} onChange={setFilterStatus} allLabel="Status" options={STATUS_OPTIONS} />
          <FilterSelect value={filterPriority} onChange={setFilterPriority} allLabel="Priority" options={PRIORITY_OPTIONS} />
          <FilterSelect value={filterCoverage} onChange={setFilterCoverage} allLabel="Test Coverage" options={COVERAGE_OPTIONS} />
        </FilterBar>

        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={handleRowClick}
          noun="requirements"
          minWidth={760}
          initialSort={{ key: 'requirement', dir: 'asc' }}
          empty={isLoading ? 'Loading...' : requirements.length ? 'No requirements match your filters.' : 'No requirements yet. Click "New Requirement" to create one.'}
        />
      </PageBody>

      {/* Add / Edit Requirement Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setPanelOpen(false)}>
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">{editingId ? 'Edit Requirement' : 'New Requirement'}</h2>
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
              <Button onClick={handleSubmit} disabled={!form.title || !form.project_id} className="bg-[#002046] hover:bg-[#002046]/90">{editingId ? 'Save Changes' : 'New Requirement'}</Button>
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