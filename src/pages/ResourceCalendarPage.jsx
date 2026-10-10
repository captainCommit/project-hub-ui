import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseISO, isValid } from "date-fns";
import { Plus, Trash2, X, AlertTriangle, Search, Edit2, Calendar, List, Download, Users } from "lucide-react";
import { formatDate } from '@/lib/dateUtils';
import { cn } from "@/lib/utils";
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { mapTaskToUserStory, vacationsApi } from '@/api/accountData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAccountHierarchy, useAccountResources, useAccountSprints, useAccountTasks, useAccountVacations } from '@/hooks/useAccountLookups';

const COLOR_DOTS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-500',
  'bg-cyan-500', 'bg-lime-500', 'bg-fuchsia-500', 'bg-indigo-500',
];
const COLOR_BADGES = [
  'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700',
];

export default function ResourceCalendarPage({ embedded = false }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list');
  const [sortField, setSortField] = useState('start_date');
  const [sortDir, setSortDir] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ resource_name: '', start_date: '', end_date: '', notes: '' });
  const [search, setSearch] = useState('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [conflictDialog, setConflictDialog] = useState(null);

  const vacations = useAccountVacations();
  const { tasks } = useAccountTasks();
  const { projects, programs, portfolios } = useAccountHierarchy();
  const sprints = useAccountSprints();
  const stories = useMemo(() => tasks.filter(t => t.sprint_id).map(mapTaskToUserStory), [tasks]);
  const resourceRecords = useAccountResources();

  const invalidateVacations = () => queryClient.invalidateQueries({ queryKey: ['account-time-off'] });
  const createVacation = useMutation({ mutationFn: (data) => vacationsApi.create(resourceRecords, data), onSuccess: () => { invalidateVacations(); resetForm(); }, onError: (error) => window.alert(error.message) });
  const updateVacation = useMutation({ mutationFn: ({ id, data }) => vacationsApi.update(resourceRecords, id, data, vacations.find(v => v.id === id)), onSuccess: () => { invalidateVacations(); resetForm(); }, onError: (error) => window.alert(error.message) });
  const deleteVacation = useMutation({ mutationFn: (id) => vacationsApi.delete(id), onSuccess: invalidateVacations });

  const resetForm = () => { setFormData({ resource_name: '', start_date: '', end_date: '', notes: '' }); setEditingId(null); setShowForm(false); };
  const handleEdit = (v) => { setEditingId(v.id); setFormData({ resource_name: v.resource_name, start_date: v.start_date, end_date: v.end_date, notes: v.notes || '' }); setShowForm(true); };
  const handleSubmit = () => { if (!formData.resource_name || !formData.start_date || !formData.end_date) return; if (editingId) updateVacation.mutate({ id: editingId, data: formData }); else createVacation.mutate(formData); };

  const allResources = useMemo(() => [...new Set(vacations.map(v => v.resource_name))].sort(), [vacations]);
  const directoryNames = useMemo(() => [...new Set(resourceRecords.map(r => r.full_name))].sort(), [resourceRecords]);
  const colorMap = useMemo(() => {
    const names = [...new Set([...directoryNames, ...allResources])].sort();
    const m = {};
    names.forEach((n, i) => { m[n] = { dot: COLOR_DOTS[i % COLOR_DOTS.length], badge: COLOR_BADGES[i % COLOR_BADGES.length] }; });
    return m;
  }, [directoryNames, allResources]);

  const getAssignedProjectIds = (name) => [...new Set(tasks.filter(t => t.assignee === name || (Array.isArray(t.resources) && t.resources.includes(name))).map(t => t.project_id).filter(Boolean))];

  const getConflictDetails = (name) => {
    const rv = vacations.filter(v => v.resource_name === name);
    const details = [];
    tasks.filter(t => (t.assignee === name || (Array.isArray(t.resources) && t.resources.includes(name))) && t.start_date && t.due_date).forEach(task => {
      const ts = parseISO(task.start_date), te = parseISO(task.due_date);
      if (!isValid(ts) || !isValid(te)) return;
      const proj = projects.find(p => p.id === task.project_id);
      rv.forEach(v => {
        const vs = parseISO(v.start_date), ve = parseISO(v.end_date);
        if (isValid(vs) && isValid(ve) && ts <= ve && te >= vs) {
          details.push({ type: 'Task', title: task.title, projectName: proj?.name || '—', startDate: task.start_date, endDate: task.due_date, vacation: { start: v.start_date, end: v.end_date } });
        }
      });
    });
    stories.filter(s => s.assignee === name).forEach(story => {
      const sprint = sprints.find(sp => sp.id === story.sprint_id);
      if (!sprint || !sprint.start_date || !sprint.end_date) return;
      const ss = parseISO(sprint.start_date), se = parseISO(sprint.end_date);
      if (!isValid(ss) || !isValid(se)) return;
      const proj = projects.find(p => p.id === story.project_id);
      rv.forEach(v => {
        const vs = parseISO(v.start_date), ve = parseISO(v.end_date);
        if (isValid(vs) && isValid(ve) && ss <= ve && se >= vs) {
          details.push({ type: 'Sprint', title: story.title, projectName: proj?.name || '—', startDate: sprint.start_date, endDate: sprint.end_date, vacation: { start: v.start_date, end: v.end_date } });
        }
      });
    });
    return details;
  };

  const departmentGroups = useMemo(() => {
    const groups = {};
    resourceRecords.forEach(r => {
      const dept = r.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r.full_name);
    });
    return groups;
  }, [resourceRecords]);

  const departmentOverlapWarning = (members) => {
    const activeVacs = vacations.filter(v => members.includes(v.resource_name));
    for (let i = 0; i < activeVacs.length; i++) {
      for (let j = i + 1; j < activeVacs.length; j++) {
        const a = activeVacs[i], b = activeVacs[j];
        if (a.resource_name === b.resource_name) continue;
        const as = parseISO(a.start_date), ae = parseISO(a.end_date);
        const bs = parseISO(b.start_date), be = parseISO(b.end_date);
        if (isValid(as) && isValid(ae) && isValid(bs) && isValid(be) && as <= be && ae >= bs) {
          return `${a.resource_name} & ${b.resource_name} are both off ${formatDate(a.start_date)}–${formatDate(a.end_date)}`;
        }
      }
    }
    return null;
  };

  const scopePrograms = useMemo(() => selectedPortfolioId ? programs.filter(p => p.portfolio_id === selectedPortfolioId) : programs, [programs, selectedPortfolioId]);
  const scopeProjects = useMemo(() => {
    if (selectedProgramId) return projects.filter(p => p.program_id === selectedProgramId);
    if (selectedPortfolioId) return projects.filter(p => p.portfolio_id === selectedPortfolioId);
    return projects;
  }, [projects, selectedProgramId, selectedPortfolioId]);

  const resourceMatchesScope = (name) => {
    const pids = getAssignedProjectIds(name);
    if (selectedPortfolioId && !pids.some(id => projects.find(p => p.id === id)?.portfolio_id === selectedPortfolioId)) return false;
    if (selectedProgramId && !pids.some(id => projects.find(p => p.id === id)?.program_id === selectedProgramId)) return false;
    if (selectedProjectId && !pids.includes(selectedProjectId)) return false;
    return true;
  };

  const filteredResources = allResources.filter(r => {
    if (search) {
      const terms = search.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (terms.length && !terms.some(t => r.toLowerCase().includes(t))) return false;
    }
    return resourceMatchesScope(r);
  });

  return (
    <div className={`flex bg-slate-50 ${embedded ? 'flex-1 overflow-hidden' : 'h-screen'}`} style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {!embedded && (
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-white flex-shrink-0">
          {!embedded && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Availability</h2>
            </div>
          </div>
          )}
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('list')} className={cn('px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors', viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50')}>
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button onClick={() => setViewMode('department')} className={cn('px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors border-l border-slate-200', viewMode === 'department' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50')}>
                <Users className="w-3.5 h-3.5" /> Department
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit form (slide-in panel) */}
        {showForm && (
          <div className="border-b bg-white px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{editingId ? 'Edit Time Off' : 'Add Time Off'}</h3>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={resetForm}><X className="w-3.5 h-3.5" /></Button>
            </div>
            <div className="flex gap-4 flex-wrap items-end">
              <div><Label className="text-xs text-slate-500">Resource Name</Label>
                <Input value={formData.resource_name} onChange={e => setFormData(p => ({ ...p, resource_name: e.target.value }))} placeholder="Enter name" className="h-8 text-sm mt-1 w-48" list="resource-names-form" />
                <datalist id="resource-names-form">{directoryNames.map(r => <option key={r} value={r} />)}</datalist>
              </div>
              <div><Label className="text-xs text-slate-500">Start Date</Label><Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-sm mt-1 w-36" /></div>
              <div><Label className="text-xs text-slate-500">End Date</Label><Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-sm mt-1 w-36" /></div>
              <div className="flex-1 min-w-[160px]"><Label className="text-xs text-slate-500">Reason (optional)</Label><Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Annual leave" className="h-8 text-sm mt-1" /></div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} size="sm" className="h-8">{editingId ? 'Update' : 'Add'}</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={resetForm}>Cancel</Button>
                {editingId && <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => { deleteVacation.mutate(editingId); resetForm(); }}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-4 py-2 border-b bg-slate-50 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={selectedPortfolioId} onChange={e => { setSelectedPortfolioId(e.target.value); setSelectedProgramId(''); setSelectedProjectId(''); }} className="h-7 text-xs border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
              <option value="">All Portfolios</option>
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={selectedProgramId} onChange={e => { setSelectedProgramId(e.target.value); setSelectedProjectId(''); }} className="h-7 text-xs border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
              <option value="">All Programs</option>
              {scopePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="h-7 text-xs border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
              <option value="">All Projects</option>
              {scopeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..." className="h-7 text-xs pl-7 w-full" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => {
                const rows = [['Resource', 'Start Date', 'End Date', 'Reason'],
                  ...vacations.map(v => [v.resource_name, v.start_date, v.end_date, v.notes || ''])];
                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'resource_calendar.csv'; a.click();
                URL.revokeObjectURL(url);
              }} className="h-8 px-3 text-xs border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 bg-white">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <Button size="sm" className="h-8 bg-[#c87b14] hover:bg-[#a86610]" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Add Time Off
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'department' ? (
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-4">
              {Object.entries(departmentGroups).length === 0 && (
                <p className="text-center text-slate-400 text-sm py-10">No resources yet.</p>
              )}
              {Object.entries(departmentGroups).map(([dept, members]) => {
                const warning = departmentOverlapWarning(members);
                const awayMembers = members.filter(name => vacations.some(v => v.resource_name === name));
                const availableMembers = members.filter(name => !vacations.some(v => v.resource_name === name));
                return (
                  <div key={dept} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{dept}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', awayMembers.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                        {awayMembers.length} of {members.length} away
                      </span>
                    </div>
                    {warning && (
                      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5 text-xs text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {warning}
                      </div>
                    )}
                    <div className="p-3 space-y-2">
                      {awayMembers.length === 0 && (
                        <p className="text-xs text-slate-400 py-1">No time off scheduled.</p>
                      )}
                      {awayMembers.map(name => {
                        const col = colorMap[name];
                        const vcs = vacations.filter(v => v.resource_name === name).sort((a, b) => a.start_date.localeCompare(b.start_date));
                        return (
                          <div key={name} className="flex items-start gap-2">
                            <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', col?.dot)} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-slate-700">{name}</div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {vcs.map(v => (
                                  <span key={v.id} className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded" title={v.notes || ''}>
                                    {formatDate(v.start_date)} – {formatDate(v.end_date)}
                                    {v.notes && <span className="text-slate-400">· {v.notes}</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {availableMembers.length > 0 && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          {availableMembers.length} available: {availableMembers.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm" style={{ minWidth: '900px' }}>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {[{ key: 'resource_name', label: 'Resource' }, { key: 'start_date', label: 'Start' }, { key: 'end_date', label: 'End' }].map(col => (
                        <th key={col.key} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700"
                          onClick={() => { if (sortField === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(col.key); setSortDir('asc'); } }}>
                          {col.label} {sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300">↕</span>}
                        </th>
                      ))}
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Reason</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Conflicts</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {vacations.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-xs">No time-off entries yet.</td></tr>
                    )}
                    {[...vacations]
                      .filter(v => {
                        if (search && !v.resource_name.toLowerCase().includes(search.toLowerCase())) return false;
                        return resourceMatchesScope(v.resource_name);
                      })
                      .sort((a, b) => {
                        let va = a[sortField] || ''; let vb = b[sortField] || '';
                        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                        return sortDir === 'asc' ? cmp : -cmp;
                      })
                      .map(v => {
                        const col = colorMap[v.resource_name];
                        const conflictDetails = getConflictDetails(v.resource_name);
                        return (
                          <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', col?.dot)} />
                                <span className="font-medium text-slate-700">{v.resource_name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{formatDate(v.start_date)}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{formatDate(v.end_date)}</td>
                            <td className="px-3 py-2 text-slate-400 text-xs">{v.notes || '—'}</td>
                            <td className="px-3 py-2 text-xs">
                              {conflictDetails.length > 0 ? (
                                <button
                                  onClick={() => setConflictDialog({ resource: v.resource_name, items: conflictDetails })}
                                  className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded transition-colors"
                                >
                                  <AlertTriangle className="w-3 h-3" /> {conflictDetails.length} conflict{conflictDetails.length > 1 ? 's' : ''}
                                </button>
                              ) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => handleEdit(v)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Conflict detail dialog */}
      <Dialog open={!!conflictDialog} onOpenChange={(open) => { if (!open) setConflictDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Conflicts — {conflictDialog?.resource}
            </DialogTitle>
          </DialogHeader>
          {conflictDialog && conflictDialog.items.length > 0 ? (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {conflictDialog.items.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', item.type === 'Task' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700')}>{item.type}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>Project: <span className="text-slate-700">{item.projectName}</span></div>
                    <div>Scheduled: <span className="text-slate-700">{formatDate(item.startDate)} – {formatDate(item.endDate)}</span></div>
                    <div>Time off: <span className="text-amber-700">{formatDate(item.vacation.start)} – {formatDate(item.vacation.end)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No conflicts found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}