import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseISO, isValid, startOfDay, differenceInCalendarDays, max as maxDate, min as minDate, format } from "date-fns";
import { Plus, Trash2, AlertCircle, AlertTriangle, CheckCircle2, Calendar, List, Users, ChevronUp, ChevronDown, Edit2 } from "lucide-react";
import { formatDate } from '@/lib/dateUtils';
import { cn } from "@/lib/utils";
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { mapTaskToUserStory, vacationsApi } from '@/api/accountData';
import { useAccountHierarchy, useAccountResources, useAccountSprints, useAccountTasks, useAccountVacations, useAllocationOverrides } from '@/hooks/useAccountLookups';
import { useGlobalScope } from '@/lib/globalScope';
import {
  FilterBar, SearchInput, FilterSelect, optionsFrom, ExportButton, PrimaryButton, DataTable, DetailsChevron, Pill,
  NAVY, MUTED, TONES,
} from '@/components/projects/DirectoryKit';
import {
  computeResourceWeekly, allocationPct, taskResourceNames, EMPTY_RESOURCE_SCOPE, scopedProjectIds, namesInProjects,
  ResourceScopeSelects, PersonLine, Avatar,
} from '@/components/resources/ResourceKit';
import { toastError } from '@/components/ui/use-toast';

const EMPTY_FORM = { resource_name: '', start_date: '', end_date: '', notes: '' };
const toDate = (s) => { const d = s ? parseISO(s) : null; return d && isValid(d) ? d : null; };
const daysIn = (v) => {
  const s = toDate(v.start_date), e = toDate(v.end_date);
  return s && e ? differenceInCalendarDays(e, s) + 1 : 0;
};
const rangeLabel = (start, end) => `${formatDate(start)} – ${formatDate(end)}`;
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart;

function ConflictPill({ count }) {
  if (count === 0) return <Pill tone="green" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>No conflicts</Pill>;
  return (
    <Pill tone={count === 1 ? 'amber' : 'red'} icon={count === 1 ? <AlertTriangle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}>
      {count} conflict{count === 1 ? '' : 's'}
    </Pill>
  );
}

/**
 * The most people in one department off on the same day: who they are, the dates they share and which of their
 * time-off entries make up the clash. Null when nobody's time off overlaps anyone else's.
 */
function departmentClash(entries) {
  let best = null;
  entries.forEach(candidate => {
    const day = candidate.start;
    const off = entries.filter(e => e.start <= day && e.end >= day);
    const people = new Set(off.map(e => e.v.resource_name));
    if (people.size < 2 || (best && people.size <= best.people)) return;
    best = {
      people: people.size,
      start: maxDate(off.map(e => e.start)),
      end: minDate(off.map(e => e.end)),
      ids: new Set(off.map(e => e.v.id)),
    };
  });
  return best;
}

// scope / onScopeChange: the program and project page filters, kept by the Resources page across its tabs.
export default function ResourceCalendarPage({ embedded = false, scope: scopeProp = undefined, onScopeChange = undefined }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [ownScope, setOwnScope] = useState(EMPTY_RESOURCE_SCOPE);
  const scope = scopeProp || ownScope;
  const setScope = onScopeChange || setOwnScope;
  const [selectedName, setSelectedName] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());

  const vacations = useAccountVacations();
  const { tasks } = useAccountTasks();
  // Conflicts look at all of a person's work (projects); the global scope narrows who is listed and the filter options.
  const hierarchy = useAccountHierarchy();
  const { projects } = hierarchy;
  const { active: scopeActive, scopeHierarchy } = useGlobalScope();
  const { projects: inScopeProjects, programs, portfolios } = scopeHierarchy(hierarchy);
  const sprints = useAccountSprints();
  const stories = useMemo(() => tasks.filter(t => t.sprint_id).map(mapTaskToUserStory), [tasks]);
  const resourceRecords = useAccountResources();

  const invalidateVacations = () => queryClient.invalidateQueries({ queryKey: ['account-time-off'] });
  const createVacation = useMutation({ mutationFn: (data) => vacationsApi.create(resourceRecords, data), onSuccess: () => { invalidateVacations(); resetForm(); }, onError: (error) => toastError(error.message) });
  const updateVacation = useMutation({ mutationFn: ({ id, data }) => vacationsApi.update(resourceRecords, id, data, vacations.find(v => v.id === id)), onSuccess: () => { invalidateVacations(); resetForm(); }, onError: (error) => toastError(error.message) });
  const deleteVacation = useMutation({ mutationFn: (id) => vacationsApi.delete(id), onSuccess: invalidateVacations });

  const resetForm = () => { setFormData(EMPTY_FORM); setEditingId(null); setFormOpen(false); };
  const openAdd = (resourceName = '') => { setEditingId(null); setFormData({ ...EMPTY_FORM, resource_name: resourceName }); setFormOpen(true); };
  const openEdit = (v) => { setEditingId(v.id); setFormData({ resource_name: v.resource_name, start_date: v.start_date, end_date: v.end_date, notes: v.notes || '' }); setFormOpen(true); };
  const handleSubmit = () => {
    if (!formData.resource_name || !formData.start_date || !formData.end_date) return;
    if (formData.end_date < formData.start_date) { toastError('The end date is before the start date.'); return; }
    if (editingId) updateVacation.mutate({ id: editingId, data: formData }); else createVacation.mutate(formData);
  };

  const today = startOfDay(new Date());
  // Upcoming = not over yet (includes time off that has started), soonest first.
  const upcomingByName = useMemo(() => {
    const map = {};
    vacations.forEach(v => {
      const start = toDate(v.start_date), end = toDate(v.end_date);
      if (!start || !end || end < today) return;
      (map[v.resource_name] = map[v.resource_name] || []).push({ v, start, end });
    });
    Object.values(map).forEach(list => list.sort((a, b) => a.start - b.start));
    return map;
  }, [vacations]);

  /** Work scheduled while the person is off: tasks they're on, and sprint stories during the sprint. */
  const conflictsFor = (name) => {
    const upcoming = upcomingByName[name] || [];
    if (!upcoming.length) return [];
    const out = [];
    tasks.forEach(task => {
      if (!taskResourceNames(task).includes(name)) return;
      const ts = toDate(task.start_date), te = toDate(task.due_date);
      if (!ts || !te) return;
      if (upcoming.some(u => overlaps(ts, te, u.start, u.end))) {
        out.push({ key: `t-${task.id}`, title: task.title, projectName: projects.find(p => p.id === task.project_id)?.name || '—', startDate: task.start_date, endDate: task.due_date });
      }
    });
    stories.filter(s => s.assignee === name).forEach(story => {
      const sprint = sprints.find(sp => sp.id === story.sprint_id);
      const ss = toDate(sprint?.start_date), se = toDate(sprint?.end_date);
      if (!ss || !se || out.some(c => c.key === `t-${story.id}`)) return;
      if (upcoming.some(u => overlaps(ss, se, u.start, u.end))) {
        out.push({ key: `s-${story.id}`, title: story.title, projectName: projects.find(p => p.id === story.project_id)?.name || '—', startDate: sprint.start_date, endDate: sprint.end_date });
      }
    });
    return out.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  };

  const namesInScope = useMemo(
    () => namesInProjects(tasks, scopedProjectIds(scope, inScopeProjects, scopeActive)),
    [tasks, scope, inScopeProjects, scopeActive],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resourceRecords
      .filter(r => {
        if (q && !(r.full_name || '').toLowerCase().includes(q)) return false;
        if (department && (r.department || '') !== department) return false;
        if (namesInScope && !namesInScope.has(r.full_name)) return false;
        return true;
      })
      .map(r => {
        const upcoming = upcomingByName[r.full_name] || [];
        return { id: r.id, resource: r, name: r.full_name, upcoming, conflicts: conflictsFor(r.full_name), next: upcoming[0] || null };
      });
  }, [resourceRecords, search, department, namesInScope, upcomingByName, tasks, stories, sprints, projects]);

  const departmentGroups = useMemo(() => {
    const groups = {};
    rows.forEach(row => {
      const dept = row.resource.department || 'Unassigned';
      (groups[dept] = groups[dept] || []).push(row);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const allocationOverrides = useAllocationOverrides();
  const resourceWeekly = useMemo(() => computeResourceWeekly(resourceRecords, tasks, projects, allocationOverrides), [resourceRecords, tasks, projects, allocationOverrides]);
  const selected = rows.find(r => r.name === selectedName) || null;

  const nextUnavailable = (row) => {
    if (!row.next) return '—';
    return row.next.start <= today ? `Off until ${formatDate(row.next.v.end_date)}` : formatDate(row.next.v.start_date);
  };

  const exportCsv = () => {
    const names = new Set(rows.map(r => r.name));
    const list = [['Resource', 'Department', 'Start Date', 'End Date', 'Days', 'Reason'],
      ...vacations.filter(v => names.has(v.resource_name)).map(v => [
        v.resource_name, resourceRecords.find(r => r.full_name === v.resource_name)?.department || '', v.start_date, v.end_date, daysIn(v), v.notes || '',
      ])];
    const csv = list.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'resource_availability.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const listColumns = [
    { key: 'name', label: 'Resource', sortValue: r => r.name, render: r => <PersonLine name={r.name} /> },
    { key: 'department', label: 'Department', sortValue: r => r.resource.department, render: r => <span className="text-sm text-slate-600">{r.resource.department || '—'}</span> },
    {
      key: 'upcoming', label: 'Upcoming Time Off', sortValue: r => r.next?.v.start_date || '', render: r => r.next ? (
        <span className="text-sm text-slate-600">
          {rangeLabel(r.next.v.start_date, r.next.v.end_date)}
          {r.upcoming.length > 1 && <span className="text-xs ml-1.5" style={{ color: MUTED }}>+{r.upcoming.length - 1} more</span>}
        </span>
      ) : <span className="text-slate-400">—</span>,
    },
    { key: 'conflicts', label: 'Conflicts', sortValue: r => r.conflicts.length, render: r => <ConflictPill count={r.conflicts.length} /> },
    { key: 'next', label: 'Next Unavailable', sortValue: r => r.next?.v.start_date || '', render: r => <span className="text-sm text-slate-600">{nextUnavailable(r)}</span> },
    { key: 'open', label: '', className: 'w-8', render: () => <DetailsChevron /> },
  ];

  const toggleDept = (dept) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(dept)) next.delete(dept); else next.add(dept);
    return next;
  });

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: '#EEF2F8' }}>
      {[{ key: 'list', label: 'List', icon: List }, { key: 'department', label: 'Department', icon: Users }].map(({ key, label, icon: Icon }) => (
        <button key={key} type="button" onClick={() => setViewMode(key)}
          className={cn('px-3 py-1.5 flex items-center gap-1.5 text-sm rounded-md transition-colors', viewMode === key ? 'bg-white shadow-sm font-semibold' : 'hover:bg-white/60')}
          style={{ color: viewMode === key ? NAVY : MUTED }}>
          <Icon className="w-4 h-4" /> {label}
        </button>
      ))}
    </div>
  );

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
        {!embedded && (
          <div className="bg-white px-6 pt-5 pb-4 border-b border-slate-200 flex-shrink-0">
            <h1 className="text-2xl font-bold text-[#002046]">Availability</h1>
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4" style={{ backgroundColor: '#F7F9FC' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {viewToggle}
            <div className="flex items-center gap-2">
              <ExportButton onClick={exportCsv} disabled={rows.length === 0} />
              <PrimaryButton icon={Plus} onClick={() => openAdd()} disabled={resourceRecords.length === 0}>Add Time Off</PrimaryButton>
            </div>
          </div>

          <FilterBar>
            {viewMode === 'list' && <SearchInput value={search} onChange={setSearch} placeholder="Search resources..." />}
            <FilterSelect value={department} onChange={setDepartment} allLabel="All Departments" options={optionsFrom(resourceRecords.map(r => r.department))} />
            <ResourceScopeSelects scope={scope} onChange={setScope} portfolios={portfolios} programs={programs} projects={inScopeProjects} showPortfolio={false} />
          </FilterBar>

          {viewMode === 'list' ? (
            <DataTable
              columns={listColumns}
              rows={rows}
              onRowClick={r => setSelectedName(r.name)}
              noun="resources"
              empty={resourceRecords.length ? 'No resources match your filters.' : 'No resources yet. Add people on the Capacity tab.'}
              initialSort={{ key: 'upcoming', dir: 'asc' }}
            />
          ) : (
            <div className="space-y-4">
              {departmentGroups.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No resources match your filters.</p>}
              {departmentGroups.map(([dept, members]) => {
                const entries = members.flatMap(m => m.upcoming);
                const clash = departmentClash(entries);
                const isOpen = !collapsed.has(dept);
                return (
                  <div key={dept} className="bg-white rounded-xl border border-[#E6ECF4] overflow-hidden">
                    <button type="button" onClick={() => toggleDept(dept)} className="w-full flex items-center gap-4 px-5 py-3 text-left">
                      <span className="text-lg font-bold" style={{ color: NAVY }}>{dept}</span>
                      {clash && (
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: TONES.red.fg }}>
                          <AlertCircle className="w-4 h-4" />
                          {clash.people} of {members.length} people off at the same time ({format(clash.start, 'MMM d')} – {format(clash.end, 'MMM d, yyyy')})
                        </span>
                      )}
                      <span className="ml-auto">{isOpen ? <ChevronUp className="w-5 h-5" style={{ color: NAVY }} /> : <ChevronDown className="w-5 h-5" style={{ color: NAVY }} />}</span>
                    </button>
                    {isOpen && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-[13px] font-semibold" style={{ color: NAVY }}>
                            <th className="text-left px-5 py-2 w-[30%]">Resource</th>
                            <th className="text-left px-3 py-2">Upcoming Time Off</th>
                            <th className="text-center px-3 py-2">Total Time Off (Days)</th>
                            <th className="text-left px-3 py-2">Next Unavailable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map(m => (
                            <tr key={m.id} onClick={() => setSelectedName(m.name)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                              <td className="px-5 py-2"><PersonLine name={m.name} size={28} /></td>
                              <td className="px-3 py-2">
                                {m.upcoming.length === 0 ? <span className="text-slate-400">—</span> : (
                                  <div className="flex flex-col items-start gap-1">
                                    {m.upcoming.map(u => {
                                      const hit = clash?.ids.has(u.v.id);
                                      return (
                                        <span key={u.v.id} className={cn('px-3 py-0.5 rounded-md text-sm', hit ? 'border font-semibold' : 'text-slate-600')}
                                          style={hit ? { borderColor: TONES.red.fg, color: TONES.red.fg, backgroundColor: TONES.red.bg } : undefined}>
                                          {rangeLabel(u.v.start_date, u.v.end_date)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-600">{m.upcoming.reduce((s, u) => s + daysIn(u.v), 0)}</td>
                              <td className="px-3 py-2 text-slate-600">{nextUnavailable(m)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* One person's capacity, time off and the work that clashes with it */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedName(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (() => {
            const r = selected.resource;
            const weekly = resourceWeekly[r.full_name]?.weekly || 0;
            const pct = allocationPct(weekly, r.weekly_capacity);
            return (
              <div className="space-y-6">
                <SheetHeader>
                  <SheetTitle className="sr-only">{r.full_name}</SheetTitle>
                  <div className="flex items-center gap-4">
                    <Avatar name={r.full_name} size={56} />
                    <div>
                      <p className="text-lg font-bold" style={{ color: NAVY }}>{r.full_name}</p>
                      <p className="text-sm" style={{ color: MUTED }}>{[r.role, r.department].filter(Boolean).join(' · ') || 'No role set'}</p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="grid grid-cols-3 gap-3 pb-5 border-b border-slate-100">
                  {[
                    { value: r.weekly_capacity != null ? `${r.weekly_capacity} hrs` : '—', label: 'Weekly Capacity' },
                    { value: `${Math.round(weekly)} hrs`, label: 'Allocated' },
                    { value: pct != null ? `${pct}%` : '—', label: 'Utilization' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-xl font-bold" style={{ color: NAVY }}>{s.value}</p>
                      <p className="text-xs" style={{ color: MUTED }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: NAVY }}>Upcoming Time Off</h3>
                    <button type="button" onClick={() => openAdd(r.full_name)} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                  {selected.upcoming.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No time off scheduled.</p>}
                  {selected.upcoming.map(u => (
                    <button key={u.v.id} type="button" onClick={() => openEdit(u.v)}
                      className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left group" style={{ backgroundColor: '#EEF2F8' }}>
                      <Calendar className="w-4 h-4 mt-0.5" style={{ color: NAVY }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{rangeLabel(u.v.start_date, u.v.end_date)}</p>
                        <p className="text-xs" style={{ color: MUTED }}>{u.v.notes || 'Time off'} ({daysIn(u.v)} day{daysIn(u.v) === 1 ? '' : 's'})</p>
                      </div>
                      <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" style={{ color: MUTED }} />
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold" style={{ color: NAVY }}>Conflicts ({selected.conflicts.length})</h3>
                  {selected.conflicts.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No work is scheduled during this person's time off.</p>}
                  {selected.conflicts.map(c => (
                    <div key={c.key} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: TONES.red.bg }}>
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: TONES.red.fg }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{c.title}</p>
                        <p className="text-xs text-slate-600">{rangeLabel(c.startDate, c.endDate)}</p>
                        <p className="text-xs" style={{ color: MUTED }}>{c.projectName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Add / edit time off */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Time Off' : 'Add Time Off'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Resource</Label>
              <Select value={formData.resource_name || undefined} onValueChange={v => setFormData(p => ({ ...p, resource_name: v }))}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Choose a resource" /></SelectTrigger>
                <SelectContent>
                  {[...resourceRecords].sort((a, b) => a.full_name.localeCompare(b.full_name)).map(r => <SelectItem key={r.id} value={r.full_name}>{r.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-slate-500">Start Date</Label><Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs text-slate-500">End Date</Label><Input type="date" value={formData.end_date} min={formData.start_date || undefined} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs text-slate-500">Reason (optional)</Label><Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Vacation" className="h-9 text-sm mt-1" /></div>
            <div className="flex items-center gap-2 pt-2">
              {editingId && (
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => { deleteVacation.mutate(editingId); resetForm(); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                <Button size="sm" onClick={handleSubmit} disabled={!formData.resource_name || !formData.start_date || !formData.end_date || createVacation.isPending || updateVacation.isPending}
                  style={{ backgroundColor: NAVY }}>
                  {editingId ? 'Save' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
