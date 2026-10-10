import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardCheck, Plus, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { exportRecords } from '@/lib/exportUtils';
import StarButton from '@/components/projects/StarButton';

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const PASS_FAIL_COLORS = {
  not_executed: 'bg-slate-100 text-slate-500',
  pass: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-red-100 text-red-700',
};

const PASS_FAIL_LABELS = { not_executed: 'Not Executed', pass: 'Pass', fail: 'Fail' };

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
  { label: 'Executed By', key: 'executed_by' },
  { label: 'Execution Date', key: 'execution_date' },
  { label: 'Pass/Fail', key: 'pass_fail' },
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
  const [filterPortfolioId, setFilterPortfolioId] = useState('all');
  const [filterProgramId, setFilterProgramId] = useState('all');
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { data: testCases = [], isLoading } = useQuery({ queryKey: ['test_cases'], queryFn: () => base44.entities.TestCase.list('-created_date') });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: () => base44.entities.Sprint.list() });
  const { data: requirements = [] } = useQuery({ queryKey: ['requirements'], queryFn: () => base44.entities.Requirement.list() });

  const [editingId, setEditingId] = useState(null);

  const create = useMutation({
    mutationFn: (data) => base44.entities.TestCase.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['test_cases'] }); setPanelOpen(false); setForm(emptyForm()); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TestCase.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['test_cases'] }); setPanelOpen(false); setEditingId(null); setForm(emptyForm()); },
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';
  const getProgramName = (id) => programs.find(p => p.id === id)?.name || '—';
  const getPortfolioName = (id) => portfolios.find(p => p.id === id)?.name || '—';

  const reqLinksFor = (tc) => requirements.filter(r => {
    const ids = Array.isArray(r.test_case_id) ? r.test_case_id : (r.test_case_id ? [r.test_case_id] : []);
    return ids.includes(tc.test_case_id || tc.id);
  });

  const programsForFilter = filterPortfolioId === 'all' ? programs : programs.filter(p => p.portfolio_id === filterPortfolioId);
  const projectsForFilter = filterProgramId === 'all'
    ? (filterPortfolioId === 'all' ? projects : projects.filter(p => p.portfolio_id === filterPortfolioId || programsForFilter.some(pg => pg.id === p.program_id)))
    : projects.filter(p => p.program_id === filterProgramId);

  const filtered = testCases.filter(tc => {
    if (filterPortfolioId !== 'all' && tc.portfolio_id !== filterPortfolioId) return false;
    if (filterProgramId !== 'all' && tc.program_id !== filterProgramId) return false;
    if (filterProjectId !== 'all' && tc.project_id !== filterProjectId) return false;
    return true;
  });

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
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Header */}
      <div style={{ background: '#002046' }} className="px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Test Cases</h1>
            <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">{filtered.length} test case{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportAll} className="h-8 gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" onClick={() => { setForm(emptyForm()); setEditingId(null); setPanelOpen(true); }} className="h-8 gap-1.5 bg-[#c87b14] hover:bg-[#c87b14]/90 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Test Case
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-3">
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
      </div>

      {/* Table */}
      <div className="p-5">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <ScrollArea className="max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm" style={{ minWidth: 1000 }}>
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  {['', 'Test Case ID', 'Requirement ID', 'Sprint ID', 'Title', 'Description', 'Priority', 'Designed By', 'Executed By', 'Execution Date', 'Pass/Fail'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={11} className="text-center py-10 text-slate-400 text-xs">Loading...</td></tr>}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-14 text-slate-400 text-sm">No test cases yet. Click "Add Test Case" to create one.</td></tr>
                )}
                {filtered.map(tc => (
                  <tr key={tc.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(tc)}>
                    <td className="px-2 py-2.5"><StarButton type="testcase" id={tc.id} name={tc.title} /></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">{tc.test_case_id}</td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                      {(() => {
                        if (tc.requirement_id) {
                          const r = requirements.find(x => x.requirement_id === tc.requirement_id || x.id === tc.requirement_id);
                          return r
                            ? <Link to={`/Requirements?reqId=${r.id}`} className="text-[#002046] hover:underline">{r.requirement_id || 'REQ'}</Link>
                            : <span className="text-slate-600">{tc.requirement_id}</span>;
                        }
                        const links = reqLinksFor(tc);
                        return links.length ? links.map(r => (
                          <Link key={r.id} to={`/Requirements?reqId=${r.id}`} className="text-[#002046] hover:underline mr-1.5 inline-block">{r.requirement_id || 'REQ'}</Link>
                        )) : '—';
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{tc.sprint_id || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">{tc.title}</td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-[220px] truncate">{tc.description || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', PRIORITY_COLORS[tc.priority] || PRIORITY_COLORS.medium)}>{tc.priority}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{tc.designed_by || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{tc.executed_by || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{tc.execution_date || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', PASS_FAIL_COLORS[tc.pass_fail] || PASS_FAIL_COLORS.not_executed)}>
                        {PASS_FAIL_LABELS[tc.pass_fail] || tc.pass_fail}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </div>

      {/* Add Test Case Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setPanelOpen(false)}>
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">{editingId ? 'Edit Test Case' : 'Add Test Case'}</h2>
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
                        <SelectItem value="not_executed">Not Executed</SelectItem>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Designed By"><Input value={form.designed_by} onChange={e => setForm(p => ({ ...p, designed_by: e.target.value }))} className="h-8 text-sm" /></Field>
                  <Field label="Executed By"><Input value={form.executed_by} onChange={e => setForm(p => ({ ...p, executed_by: e.target.value }))} className="h-8 text-sm" /></Field>
                </div>
                <Field label="Execution Date"><Input type="date" value={form.execution_date} onChange={e => setForm(p => ({ ...p, execution_date: e.target.value }))} className="h-8 text-sm" /></Field>
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
              <Button onClick={handleSubmit} disabled={!form.title || !form.project_id} className="bg-[#002046] hover:bg-[#002046]/90">{editingId ? 'Save Changes' : 'Add Test Case'}</Button>
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