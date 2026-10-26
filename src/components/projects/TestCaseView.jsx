import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SquareCheckBig, Plus, X, FileText, CircleCheck, CircleX, CirclePlay } from 'lucide-react';
import { exportRecords } from '@/lib/exportUtils';
import StarButton from '@/components/projects/StarButton';
import {
  PageHeader, PageBody, PrimaryButton, ExportButton, StatGrid, StatCard, FilterBar, SearchInput, FilterSelect, optionsFrom,
  DataTable, TitleCell, Pill, PriorityPill, DetailsChevron, SOFT,
} from '@/components/projects/DirectoryKit';
import { useAccountHierarchy, useAccountRequirements, useAccountSprints, useAccountTestCases } from '@/hooks/useAccountLookups';
import { useGlobalScope } from '@/lib/globalScope';
import { mapTestCaseFromApi, mapTestCaseInputToPayload, testCasesApi } from '@/api/projectLogs';

const RESULT_TONES = { pass: 'green', fail: 'red', not_executed: 'grey' };
const PASS_FAIL_LABELS = { not_executed: 'Not Implemented', pass: 'Pass', fail: 'Fail' };
const RESULT_OPTIONS = Object.entries(PASS_FAIL_LABELS).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
// Testing draws High in sand rather than orange.
const TESTING_PRIORITY_TONES = { critical: 'red', high: 'sand', medium: 'grey', low: 'grey' };

const emptyForm = () => ({
  title: '', description: '', priority: 'medium', designed_by: '', executed_by: '',
  execution_date: '', pass_fail: 'not_executed', dependencies: '', test_steps: '',
  conditions: '', test_input: '', expected_results: '', actual_results: '', comments: '',
  project_id: '', program_id: '', portfolio_id: '', sprint_id: '', requirement_id: '',
});

const EXPORT_COLUMNS = [
  { label: 'Test Case ID', key: 'test_case_id' },
  { label: 'Requirement ID', key: 'requirement_id' },
  { label: 'Sprint ID', key: 'sprint_id' },
  { label: 'Title', key: 'title' },
  { label: 'Description', key: 'description' },
  { label: 'Priority', key: 'priority' },
  { label: 'Designed By', key: 'designed_by' },
  { label: 'Implemented By', key: 'executed_by' },
  { label: 'Implementation Date', key: 'execution_date' },
  { label: 'Result', value: (tc) => PASS_FAIL_LABELS[tc.pass_fail] || PASS_FAIL_LABELS.not_executed },
  { label: 'Dependencies', key: 'dependencies' },
  { label: 'Test Steps', key: 'test_steps' },
  { label: 'Conditions', key: 'conditions' },
  { label: 'Test Input', key: 'test_input' },
  { label: 'Expected Results', key: 'expected_results' },
  { label: 'Actual Results', key: 'actual_results' },
  { label: 'Comments', key: 'comments' },
];

export default function TestCaseView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterImplementer, setFilterImplementer] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { testCases, isLoading } = useAccountTestCases();
  // The stats and table show what's inside the global scope; new IDs still count every test case in the account.
  const { inScope, scopeHierarchy } = useGlobalScope();
  const { projects, programs, portfolios } = scopeHierarchy(useAccountHierarchy());
  const shown = testCases.filter(inScope);
  const sprints = useAccountSprints();
  const { requirements } = useAccountRequirements();

  const [editingId, setEditingId] = useState(null);

  const invalidateLinks = () => {
    queryClient.invalidateQueries({ queryKey: ['test_cases'] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
  };

  const create = useMutation({
    mutationFn: async (data) => mapTestCaseFromApi(await testCasesApi.create(data.project_id, mapTestCaseInputToPayload(data, { requirements, sprints }))),
    onSuccess: () => { invalidateLinks(); setPanelOpen(false); setForm(emptyForm()); },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }) => mapTestCaseFromApi(await testCasesApi.update(id, mapTestCaseInputToPayload(data, { requirements, sprints }))),
    onSuccess: () => { invalidateLinks(); setPanelOpen(false); setEditingId(null); setForm(emptyForm()); },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';

  const reqLinksFor = (tc) => requirements.filter(r => {
    const ids = Array.isArray(r.test_case_id) ? r.test_case_id : (r.test_case_id ? [r.test_case_id] : []);
    return ids.includes(tc.test_case_id || tc.id);
  });

  /** Requirement codes this test case covers: its own link, or requirements that list it. */
  const requirementCodesFor = (tc) => {
    if (tc.requirement_id) return [tc.requirement_id];
    return reqLinksFor(tc).map(r => r.requirement_id || r.id);
  };

  const resultCounts = { pass: 0, fail: 0, not_executed: 0 };
  shown.forEach(tc => { resultCounts[tc.pass_fail in resultCounts ? tc.pass_fail : 'not_executed'] += 1; });
  const share = (n) => (shown.length ? Math.round(n / shown.length * 100) : 0);

  const filtered = shown.filter(tc => {
    if (search) {
      const q = search.toLowerCase();
      if (!(tc.title || '').toLowerCase().includes(q) && !(tc.test_case_id || '').toLowerCase().includes(q)) return false;
    }
    if (filterProjectId && tc.project_id !== filterProjectId) return false;
    if (filterResult && (tc.pass_fail || 'not_executed') !== filterResult) return false;
    if (filterPriority && tc.priority !== filterPriority) return false;
    if (filterImplementer && tc.executed_by !== filterImplementer) return false;
    return true;
  });

  const columns = [
    {
      key: 'testcase', label: 'Test Case', sortValue: tc => tc.test_case_id,
      render: tc => (
        <TitleCell
          code={[tc.test_case_id, tc.sprint_id].filter(Boolean).join('  |  ')}
          title={tc.title}
          sub={`Project: ${getProjectName(tc.project_id)}`}
          leading={<StarButton type="testcase" id={tc.id} name={tc.title} />}
          dense
        />
      ),
    },
    {
      key: 'requirements', label: 'Requirements', sortValue: tc => requirementCodesFor(tc).length, className: 'text-center', headerClassName: 'text-center',
      render: tc => {
        const codes = requirementCodesFor(tc);
        return <span className="text-sm" style={{ color: SOFT }} title={codes.join(', ')}>{codes.length}</span>;
      },
    },
    { key: 'priority', label: 'Priority', sortValue: tc => PRIORITY_RANK[tc.priority] ?? 9, render: tc => <PriorityPill priority={tc.priority} tones={TESTING_PRIORITY_TONES} /> },
    {
      key: 'result', label: 'Result', sortValue: tc => PASS_FAIL_LABELS[tc.pass_fail] || '',
      render: tc => <Pill tone={RESULT_TONES[tc.pass_fail] || 'grey'}>{PASS_FAIL_LABELS[tc.pass_fail] || PASS_FAIL_LABELS.not_executed}</Pill>,
    },
    { key: 'implementer', label: 'Implemented By', sortValue: tc => tc.executed_by, render: tc => <span className="text-sm" style={{ color: SOFT }}>{tc.executed_by || '—'}</span> },
    { key: 'date', label: 'Implementation Date', sortValue: tc => tc.execution_date, render: tc => <span className="text-sm" style={{ color: SOFT }}>{tc.execution_date || '—'}</span> },
    { key: 'open', label: 'Details', className: 'w-16', render: () => <DetailsChevron /> },
  ];

  const handleExportAll = () => exportRecords(filtered, EXPORT_COLUMNS, `test_cases_${new Date().toISOString().slice(0, 10)}.csv`);

  const handleSubmit = () => {
    if (!form.title || !form.project_id) return;
    if (editingId) {
      update.mutate({ id: editingId, data: form });
    } else {
      const id = `TC-${String(testCases.length + 1).padStart(3, '0')}`;
      create.mutate({ ...form, test_case_id: id });
    }
  };

  const handleRowClick = (tc) => {
    setEditingId(tc.id);
    setForm({
      title: tc.title || '', description: tc.description || '', priority: tc.priority || 'medium',
      designed_by: tc.designed_by || '', executed_by: tc.executed_by || '', execution_date: tc.execution_date || '',
      pass_fail: tc.pass_fail || 'not_executed', dependencies: tc.dependencies || '', test_steps: tc.test_steps || '',
      conditions: tc.conditions || '', test_input: tc.test_input || '', expected_results: tc.expected_results || '',
      actual_results: tc.actual_results || '', comments: tc.comments || '',
      project_id: tc.project_id || '', program_id: tc.program_id || '', portfolio_id: tc.portfolio_id || '',
      sprint_id: tc.sprint_id || '', requirement_id: tc.requirement_id || '',
    });
    setPanelOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tcId = params.get('tcId');
    if (tcId && testCases.length) {
      const tc = testCases.find(t => t.id === tcId);
      if (tc) handleRowClick(tc);
    }
  }, [testCases]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageBody>
        <PageHeader
          icon={SquareCheckBig}
          iconBox={false}
          title="Testing"
          subtitle="Manage test cases, implementation results, and requirement coverage across projects."
          actions={(
            <PrimaryButton icon={Plus} onClick={() => { setForm(emptyForm()); setEditingId(null); setPanelOpen(true); }}>
              New Test Case
            </PrimaryButton>
          )}
        />

        <StatGrid className="lg:grid-cols-4">
          <StatCard value={shown.length} label="Test Cases" sub="Across all projects" icon={FileText} />
          <StatCard value={resultCounts.pass} label="Passed" sub={`${share(resultCounts.pass)}% success rate`} icon={CircleCheck} />
          <StatCard value={resultCounts.fail} label="Failed" sub={`${share(resultCounts.fail)}% failure rate`} icon={CircleX} />
          <StatCard value={resultCounts.not_executed} label="Not Implemented" sub={`${share(resultCounts.not_executed)}% pending implementation`} icon={CirclePlay} />
        </StatGrid>

        <FilterBar right={<ExportButton onClick={handleExportAll} disabled={filtered.length === 0} />}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search test cases..." />
          <FilterSelect value={filterProjectId} onChange={setFilterProjectId} allLabel="All Projects" options={projects.map(p => ({ value: p.id, label: p.name }))} />
          <FilterSelect value={filterResult} onChange={setFilterResult} allLabel="Result" options={RESULT_OPTIONS} />
          <FilterSelect value={filterPriority} onChange={setFilterPriority} allLabel="Priority" options={PRIORITY_OPTIONS} />
          <FilterSelect value={filterImplementer} onChange={setFilterImplementer} allLabel="Implemented By" options={optionsFrom(shown.map(tc => tc.executed_by))} />
        </FilterBar>

        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={handleRowClick}
          noun="test cases"
          minWidth={980}
          dense
          initialSort={{ key: 'testcase', dir: 'asc' }}
          empty={isLoading ? 'Loading...' : shown.length ? 'No test cases match your filters.' : 'No test cases yet. Click "New Test Case" to create one.'}
        />
      </PageBody>

      {/* Add Test Case Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setPanelOpen(false)}>
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">{editingId ? 'Edit Test Case' : 'New Test Case'}</h2>
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

                <Field label="Sprint ID">
                  <Select value={form.sprint_id} onValueChange={v => setForm(p => ({ ...p, sprint_id: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select sprint..." /></SelectTrigger>
                    <SelectContent>
                      {(form.project_id ? sprints.filter(s => s.project_id === form.project_id) : sprints).map(s => (
                        <SelectItem key={s.id} value={s.sprint_id || s.id}>{s.sprint_id ? `${s.sprint_id} — ${s.name}` : s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Requirement ID">
                  <Select value={form.requirement_id} onValueChange={v => setForm(p => ({ ...p, requirement_id: v === '__none' ? '' : v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select requirement..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— None —</SelectItem>
                      {(form.project_id ? requirements.filter(r => r.project_id === form.project_id) : requirements).map(r => (
                        <SelectItem key={r.id} value={r.requirement_id || r.id}>{r.requirement_id ? `${r.requirement_id} — ${r.title}` : r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Test Case ID"><Input value={editingId ? (testCases.find(t => t.id === editingId)?.test_case_id || '') : `TC-${String(testCases.length + 1).padStart(3, '0')}`} disabled className="h-8 text-sm bg-slate-50 text-slate-400" /></Field>
                <Field label="Title *"><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Test case title..." className="h-8 text-sm" /></Field>
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
                  <Field label="Pass / Fail">
                    <Select value={form.pass_fail} onValueChange={v => setForm(p => ({ ...p, pass_fail: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_executed">Not Implemented</SelectItem>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Designed By"><Input value={form.designed_by} onChange={e => setForm(p => ({ ...p, designed_by: e.target.value }))} className="h-8 text-sm" /></Field>
                  <Field label="Implemented By"><Input value={form.executed_by} onChange={e => setForm(p => ({ ...p, executed_by: e.target.value }))} className="h-8 text-sm" /></Field>
                </div>
                <Field label="Implementation Date"><Input type="date" value={form.execution_date} onChange={e => setForm(p => ({ ...p, execution_date: e.target.value }))} className="h-8 text-sm" /></Field>
                <Field label="Dependencies"><Textarea value={form.dependencies} onChange={e => setForm(p => ({ ...p, dependencies: e.target.value }))} rows={2} className="text-sm" /></Field>
                <Field label="Test Steps"><Textarea value={form.test_steps} onChange={e => setForm(p => ({ ...p, test_steps: e.target.value }))} rows={3} className="text-sm" /></Field>
                <Field label="Conditions"><Textarea value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} rows={2} className="text-sm" /></Field>
                <Field label="Test Input"><Textarea value={form.test_input} onChange={e => setForm(p => ({ ...p, test_input: e.target.value }))} rows={2} className="text-sm" /></Field>
                <Field label="Expected Results"><Textarea value={form.expected_results} onChange={e => setForm(p => ({ ...p, expected_results: e.target.value }))} rows={2} className="text-sm" /></Field>
                <Field label="Actual Results"><Textarea value={form.actual_results} onChange={e => setForm(p => ({ ...p, actual_results: e.target.value }))} rows={2} className="text-sm" /></Field>
                <Field label="Comments"><Textarea value={form.comments} onChange={e => setForm(p => ({ ...p, comments: e.target.value }))} rows={2} className="text-sm" /></Field>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => { setPanelOpen(false); setEditingId(null); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title || !form.project_id} className="bg-[#002046] hover:bg-[#002046]/90">{editingId ? 'Save Changes' : 'New Test Case'}</Button>
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