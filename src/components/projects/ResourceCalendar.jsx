import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resourcesApi } from "@/api/resources";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isValid, isSameDay } from "date-fns";
import { Plus, Trash2, X, AlertTriangle, Search, Edit2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_DOTS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-500',
  'bg-cyan-500', 'bg-lime-500', 'bg-fuchsia-500', 'bg-indigo-500',
];

const COLOR_BADGES = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-lime-100 text-lime-700 border-lime-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
];

/** @typedef {{ resourceId: string, data: Record<string, any> }} TimeOffCreateVariables */
/** @typedef {{ timeOffId: string, resourceId: string, data: Record<string, any> }} TimeOffUpdateVariables */
/** @typedef {{ timeOffId: string, resourceId: string }} TimeOffDeleteVariables */

// Build a compact timeline: 12-week strip from today
function buildWeeks(referenceDate) {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - start.getDay()); // go to sunday
  const weeks = [];
  for (let w = 0; w < 12; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      days.push(date);
    }
    weeks.push(days);
  }
  return weeks;
}

export default function ResourceCalendar({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [search, setSearch] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null));
  const [mutationError, setMutationError] = useState('');
  const [formData, setFormData] = useState({ resource_id: '', resource_name: '', start_date: '', end_date: '', time_off_type_id: '', type: '', notes: '', hours: '', all_day: true, status_id: '' });

  // 12-week timeline grid
  const refDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const weeks = useMemo(() => buildWeeks(refDate), [refDate]);
  const dateRange = useMemo(() => {
    const start = weeks[0]?.[0];
    const end = weeks[weeks.length - 1]?.[6];
    return start && end ? `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}` : 'unknown';
  }, [weeks]);

  const {
    data: calendarData = { resources: [], allocations: [], timeOff: [], projects: [] },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-resource-calendar', selectedAccountId, dateRange],
    queryFn: () => {
      const [start_date, end_date] = dateRange.split('_');
      return resourcesApi.getAccountResourceCalendar(selectedAccountId, { start_date, end_date });
    },
    enabled: Boolean(selectedAccountId) && dateRange !== 'unknown',
  });

  const resources = calendarData.resources || [];
  const allocations = calendarData.allocations || [];
  const vacations = calendarData.timeOff || [];
  const projects = calendarData.projects || [];

  const selectedResourceId = formData.resource_id || resources.find(r => r.name === formData.resource_name)?.id || '';

  useQuery({
    queryKey: ['resource-time-off', selectedResourceId],
    queryFn: () => resourcesApi.listResourceTimeOff(selectedResourceId),
    enabled: Boolean(selectedResourceId),
  });

  const invalidateTimeOffQueries = (resourceId) => {
    queryClient.invalidateQueries({ queryKey: ['account-resource-calendar', selectedAccountId] });
    if (resourceId) {
      queryClient.invalidateQueries({ queryKey: ['resource-time-off', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-detail', resourceId] });
    }
  };

  const createTimeOff = useMutation({
    mutationFn: (/** @type {TimeOffCreateVariables} */ { resourceId, data }) => resourcesApi.createResourceTimeOff(resourceId, data),
    onSuccess: (_result, variables) => {
      invalidateTimeOffQueries(variables.resourceId);
      resetForm();
    },
    onError: () => setMutationError('Unable to save time off. Please check the details and try again.'),
  });
  const updateTimeOff = useMutation({
    mutationFn: (/** @type {TimeOffUpdateVariables} */ { timeOffId, data }) => resourcesApi.updateResourceTimeOff(timeOffId, data),
    onSuccess: (_result, variables) => {
      invalidateTimeOffQueries(variables.resourceId);
      resetForm();
    },
    onError: () => setMutationError('Unable to update time off. Please check the details and try again.'),
  });
  const deleteTimeOff = useMutation({
    mutationFn: (/** @type {TimeOffDeleteVariables} */ { timeOffId }) => resourcesApi.deleteResourceTimeOff(timeOffId),
    onSuccess: (_result, variables) => {
      invalidateTimeOffQueries(variables.resourceId);
      resetForm();
    },
    onError: () => setMutationError('Unable to delete time off. Please try again.'),
  });

  const isSubmitting = createTimeOff.isPending || updateTimeOff.isPending || deleteTimeOff.isPending;

  const resetForm = () => {
    setFormData({ resource_id: '', resource_name: '', start_date: '', end_date: '', time_off_type_id: '', type: '', notes: '', hours: '', all_day: true, status_id: '' });
    setEditingId(null);
    setShowForm(false);
    setMutationError('');
  };

  const startAddTimeOff = () => {
    setFormData({ resource_id: '', resource_name: '', start_date: '', end_date: '', time_off_type_id: '', type: '', notes: '', hours: '', all_day: true, status_id: '' });
    setEditingId(null);
    setMutationError('');
    setShowForm(true);
  };

  const handleResourceNameChange = (resourceName) => {
    const resourceId = resources.find(r => r.name === resourceName)?.id || '';
    setFormData(p => ({ ...p, resource_name: resourceName, resource_id: resourceId }));
  };

  const handleEdit = (entry) => {
    const resourceId = entry.resource_id || resources.find(r => r.name === entry.resource_name)?.id || '';
    setEditingId(entry.id);
    setFormData({
      resource_id: resourceId,
      resource_name: entry.resource_name || '',
      start_date: entry.start_date || '',
      end_date: entry.end_date || '',
      time_off_type_id: entry.time_off_type_id || '',
      type: entry.type || '',
      notes: entry.notes || '',
      hours: entry.hours ?? '',
      all_day: entry.all_day ?? true,
      status_id: entry.status_id || '',
    });
    setMutationError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setMutationError('');
    const resourceId = formData.resource_id || resources.find(r => r.name === formData.resource_name)?.id;
    if (!resourceId) {
      setMutationError('Select a valid resource before saving time off.');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setMutationError('Start date and end date are required.');
      return;
    }
    try {
      if (editingId) await updateTimeOff.mutateAsync({ timeOffId: editingId, resourceId, data: formData });
      else await createTimeOff.mutateAsync({ resourceId, data: formData });
    } catch {
      // onError sets the friendly message; keep the form open for correction/retry.
    }
  };

  const handleDelete = async () => {
    if (!editingId || isSubmitting) return;
    const resourceId = formData.resource_id || resources.find(r => r.name === formData.resource_name)?.id;
    if (!resourceId) {
      setMutationError('Select a valid resource before deleting time off.');
      return;
    }
    try {
      await deleteTimeOff.mutateAsync({ timeOffId: editingId, resourceId });
    } catch {
      // onError sets the friendly message; keep the form open for correction/retry.
    }
  };

  // Resource color map
  const allResources = useMemo(() => [...new Set([
    ...resources.map(r => r.name).filter(Boolean),
    ...vacations.map(v => v.resource_name).filter(Boolean),
    ...allocations.map(a => a.resource_name).filter(Boolean),
  ])].sort(), [resources, vacations, allocations]);
  const colorMap = useMemo(() => {
    const map = {};
    allResources.forEach((name, i) => {
      map[name] = { dot: COLOR_DOTS[i % COLOR_DOTS.length], badge: COLOR_BADGES[i % COLOR_BADGES.length] };
    });
    return map;
  }, [allResources]);

  const today = new Date();

  const isDayOff = (resourceName, day) =>
    vacations.some(v => {
      if (v.resource_name !== resourceName) return false;
      const s = parseISO(v.start_date);
      const e = parseISO(v.end_date);
      return isValid(s) && isValid(e) && day >= s && day <= e;
    });

  const getAllocationForDay = (resourceName, day) =>
    allocations.find(a => {
      if (a.resource_name !== resourceName) return false;
      const s = parseISO(a.start_date);
      const e = parseISO(a.end_date);
      return isValid(s) && isValid(e) && day >= s && day <= e;
    });

  const getConflicts = (_resourceName) => [];

  const getAssignedProjects = (resourceName) => {
    const resourceAllocations = allocations.filter(a => a.resource_name === resourceName);
    const byId = resourceAllocations.map(a => a.project_id).filter(Boolean).map(id => projects.find(p => p.id === id)).filter(Boolean);
    const byName = resourceAllocations.filter(a => a.project_name).map(a => ({ id: a.project_id || a.project_name, name: a.project_name }));
    return [...byId, ...byName].filter((project, index, arr) => project?.name && arr.findIndex(p => p?.name === project.name) === index);
  };

  const filteredResources = allResources.filter(r => r.toLowerCase().includes(search.toLowerCase()));

  const totalConflicts = 0;
  const hasCalendarData = allResources.length > 0 || vacations.length > 0 || allocations.length > 0;

  const weekLabel = (wdays) => {
    const first = wdays[0], last = wdays[6];
    if (first.getMonth() === last.getMonth()) return format(first, 'MMM d') + ' – ' + format(last, 'd');
    return format(first, 'MMM d') + ' – ' + format(last, 'MMM d');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1100px] max-h-[92vh] overflow-hidden flex flex-col p-0" style={{ fontFamily: 'Segoe UI, sans-serif' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Resource Calendar</h2>
              <p className="text-xs text-slate-400">{allResources.length} resources · {vacations.length} time-off entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalConflicts > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {totalConflicts} conflict{totalConflicts > 1 ? 's' : ''}
              </div>
            )}
            <Button size="sm" className="h-8" disabled={!selectedAccountId || isSubmitting} onClick={startAddTimeOff}>
              <Plus className="w-4 h-4 mr-1" /> Add Time Off
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main grid area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + week navigation */}
            <div className="flex items-center gap-3 px-4 py-2 border-b bg-slate-50 flex-shrink-0">
              <div className="relative w-52">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..." className="h-7 text-xs pl-7" />
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setWeekOffset(0)}>Today</Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            {/* Timeline table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: 900 }}>
                <thead className="sticky top-0 z-10 bg-white">
                  {/* Month row */}
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 w-44 sticky left-0 z-20">Resource</th>
                    {weeks.map((wdays, wi) => (
                      <th key={wi} colSpan={7} className="text-center text-[10px] font-medium text-slate-500 py-1 border-r border-slate-100 bg-white">
                        {weekLabel(wdays)}
                      </th>
                    ))}
                  </tr>
                  {/* Day headers */}
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200" />
                    {weeks.map((wdays) =>
                      wdays.map((day, di) => {
                        const isWeekend = di === 0 || di === 6;
                        const isT = isSameDay(day, today);
                        return (
                          <th key={day.toISOString()} className={cn(
                            'w-8 py-1 text-center border-r border-slate-100 font-medium',
                            isWeekend ? 'bg-slate-100 text-slate-400' : 'text-slate-500',
                            isT && 'bg-blue-100 text-blue-700'
                          )}>
                            <div>{format(day, 'EEE')[0]}</div>
                            <div className="text-[9px] font-normal">{format(day, 'd')}</div>
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!selectedAccountId && (
                    <tr>
                      <td colSpan={1 + weeks.length * 7} className="text-center py-16 text-slate-400">Select an account to view the resource calendar.</td>
                    </tr>
                  )}
                  {selectedAccountId && isLoading && (
                    <tr>
                      <td colSpan={1 + weeks.length * 7} className="text-center py-16 text-slate-400">Loading resource calendar...</td>
                    </tr>
                  )}
                  {selectedAccountId && isError && (
                    <tr>
                      <td colSpan={1 + weeks.length * 7} className="text-center py-16">
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <span>{error?.message || 'Unable to load resource calendar.'}</span>
                          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {selectedAccountId && !isLoading && !isError && !hasCalendarData && (
                    <tr>
                      <td colSpan={1 + weeks.length * 7} className="text-center py-16 text-slate-400">No resource calendar data available.</td>
                    </tr>
                  )}
                  {selectedAccountId && !isLoading && !isError && hasCalendarData && filteredResources.length === 0 && (
                    <tr>
                      <td colSpan={1 + weeks.length * 7} className="text-center py-16 text-slate-400">
                        No matching resources.
                      </td>
                    </tr>
                  )}
                  {selectedAccountId && !isLoading && !isError && filteredResources.map((name, ri) => {
                    const col = colorMap[name];
                    const conflicts = getConflicts(name);
                    const assignedProjects = getAssignedProjects(name);
                    return (
                      <tr key={name} className={cn('border-b border-slate-100 hover:bg-slate-50/60 transition-colors', ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                        {/* Resource name cell */}
                        <td className={cn('sticky left-0 z-10 px-3 py-2 border-r border-slate-200 whitespace-nowrap', ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', col?.dot)} />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-700 truncate max-w-[110px]" title={name}>{name}</div>
                              {assignedProjects.length > 0 && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                                  {assignedProjects.map(p => p?.name).filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                            {conflicts.length > 0 && (
                              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        {/* Day cells */}
                        {weeks.map(wdays =>
                          wdays.map((day, di) => {
                            const off = isDayOff(name, day);
                            const allocation = getAllocationForDay(name, day);
                            const isWeekend = di === 0 || di === 6;
                            const isT = isSameDay(day, today);
                            const hasConflict = false;
                            return (
                              <td key={day.toISOString()} className={cn(
                                'w-8 h-8 border-r border-slate-100 text-center align-middle',
                                isWeekend && !off && !allocation && 'bg-slate-50',
                                isT && !off && !allocation && 'bg-blue-50',
                                allocation && !off && 'bg-emerald-50',
                                off && !hasConflict && `${col?.dot.replace('bg-', 'bg-').replace('-500', '-200')} opacity-90`,
                                hasConflict && 'bg-amber-200',
                              )}>
                                {off && (
                                  <div className={cn('w-full h-full flex items-center justify-center', hasConflict ? 'bg-amber-200' : col?.dot.replace('500', '200'))}>
                                    {hasConflict
                                      ? <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      : <div className={cn('w-3 h-1 rounded-full opacity-60', col?.dot)} />
                                    }
                                  </div>
                                )}
                                {!off && allocation && (
                                  <div className="w-full h-full flex items-center justify-center" title={`${allocation.project_name || 'Allocation'}${allocation.percentage ? ` · ${allocation.percentage}%` : ''}${allocation.hours ? ` · ${allocation.hours}h` : ''}`}>
                                    <div className="w-4 h-1.5 rounded-full bg-emerald-400 opacity-80" />
                                  </div>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-t bg-slate-50 flex items-center gap-4 text-[10px] text-slate-500 flex-shrink-0">
              <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded bg-blue-200" /> Time off</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded bg-amber-200 flex items-center justify-center"><AlertTriangle className="w-2 h-2 text-amber-600" /></div> Task conflict</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded bg-blue-100" /> Today</div>
              <div className="ml-auto text-slate-400">Calendar rendering is read-only</div>
            </div>
          </div>

          {/* Right panel: entries list + time-off form */}
          <div className="w-64 border-l bg-white flex flex-col flex-shrink-0">
            {showForm ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">{editingId ? 'Edit Time Off' : 'Add Time Off'}</h3>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={resetForm} disabled={isSubmitting}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Resource Name</Label>
                    <Input value={formData.resource_name} onChange={e => handleResourceNameChange(e.target.value)} placeholder="Enter name" className="h-8 text-sm" list="resource-names" disabled={isSubmitting || Boolean(editingId)} />
                    <datalist id="resource-names">
                      {resources.filter(r => r.id && r.name).map(r => <option key={r.id} value={r.name} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Start Date</Label>
                    <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-sm" disabled={isSubmitting} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">End Date</Label>
                    <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-sm" disabled={isSubmitting} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Type (optional)</Label>
                    <Input value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} placeholder="e.g. Annual leave" className="h-8 text-sm" disabled={isSubmitting || Boolean(formData.time_off_type_id)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Hours (optional)</Label>
                    <Input type="number" value={formData.hours} onChange={e => setFormData(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 8" className="h-8 text-sm" disabled={isSubmitting} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Notes (optional)</Label>
                    <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Annual leave" rows={2} className="text-sm resize-none" disabled={isSubmitting} />
                  </div>
                  {mutationError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1">{mutationError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSubmit} size="sm" className="flex-1 h-8" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add'}</Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
                  </div>
                  {editingId && (
                    <Button variant="outline" size="sm" className="w-full h-8 text-red-500 hover:text-red-600" onClick={handleDelete} disabled={isSubmitting}>
                      <Trash2 className="w-3 h-3 mr-1.5" /> {deleteTimeOff.isPending ? 'Deleting...' : 'Delete Entry'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b">
                  <p className="text-xs font-semibold text-slate-600">All Time Off Entries</p>
                  <p className="text-[10px] text-slate-400">{vacations.length} total</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {vacations.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-8">No entries yet.</p>
                    )}
                    {[...vacations].sort((a, b) => (a.resource_name || '').localeCompare(b.resource_name || '')).map(v => {
                      const col = colorMap[v.resource_name];
                      const conflicts = getConflicts(v.resource_name);
                      return (
                        <div key={v.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1', col?.dot)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-slate-700 truncate">{v.resource_name}</span>
                              {conflicts.length > 0 && <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-500">{v.start_date} → {v.end_date}</p>
                            {v.type && <p className="text-[10px] text-slate-400 truncate">{v.type}</p>}
                            {v.notes && <p className="text-[10px] text-slate-400 truncate">{v.notes}</p>}
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 p-0.5" onClick={() => handleEdit(v)} disabled={isSubmitting}>
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}