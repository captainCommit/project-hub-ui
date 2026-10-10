import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { Search, AlertCircle, Clock, Mail, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO, isValid, isBefore, differenceInCalendarDays } from 'date-fns';

const MODE_OPTIONS = {
  all: 'BOTH',
  overdue: 'OVERDUE',
  upcoming: 'UPCOMING',
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export default function ResourceTaskPulse() {
  const { selectedAccountId } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [days, setDays] = useState('14');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedForNudge, setSelectedForNudge] = useState(new Set()); // Set of row keys: `${resourceName}||${taskId}`

  const dueTaskFilters = useMemo(() => {
    const query = { mode: MODE_OPTIONS[filter] || 'BOTH' };
    if (days) query.days = Number(days);
    if (selectedProjectId) query.project_id = selectedProjectId;
    if (selectedProgramId) query.program_id = selectedProgramId;
    if (selectedAssignee) query.assigned_to = selectedAssignee;
    return query;
  }, [filter, days, selectedProjectId, selectedProgramId, selectedAssignee]);

  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-due-tasks', selectedAccountId, dueTaskFilters],
    queryFn: () => tasksApi.listDueTasks(selectedAccountId, dueTaskFilters),
    enabled: Boolean(selectedAccountId),
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const projects = useMemo(() => uniqueById(tasks
    .filter(task => task.project_id || task.project_name)
    .map(task => ({ id: task.project_id || task.project_name, name: task.project_name || task.project_id || 'Untitled Project', program_id: task.program_id || null }))), [tasks]);

  const programs = useMemo(() => uniqueById(tasks
    .filter(task => task.program_id || task.program_name)
    .map(task => ({ id: task.program_id || task.program_name, name: task.program_name || task.program_id || 'Untitled Program' }))), [tasks]);

  const portfolios = [];
  const assignees = useMemo(() => [...new Set(tasks.map(task => String(task.assigned_to || task.resource_name || task.assignee_name || '')).filter(Boolean))].sort(), [tasks]);
  const getProject = (id) => projects.find(p => p.id === id);

  // Build flat rows: {resourceName, task, isOverdue, daysNum}
  const allRows = useMemo(() => {
    const rows = [];
    tasks.forEach(task => {
      const dueDate = task.finish_date || task.due_date;
      const due = dueDate ? parseISO(dueDate) : null;
      const hasValidDue = due && isValid(due);
      const state = String(task.due_state || '').toUpperCase();
      const isOverdue = state === 'OVERDUE' || (state !== 'UPCOMING' && hasValidDue && isBefore(due, today));
      const overdueDays = toNumber(task.days_overdue);
      const upcomingDays = toNumber(task.days_until_due);
      const fallbackDays = hasValidDue ? Math.abs(differenceInCalendarDays(due, today)) : 0;
      const daysNum = isOverdue ? (overdueDays ?? fallbackDays) : (upcomingDays ?? fallbackDays);
      const resourceName = task.resource_name || task.assignee_name || task.assigned_to || 'Unassigned';

      rows.push({ resourceName, task: { ...task, due_date: dueDate, title: task.title || task.name || 'Untitled Task' }, isOverdue, daysNum });
    });
    return rows.sort((a, b) => {
      if (a.resourceName !== b.resourceName) return a.resourceName < b.resourceName ? -1 : 1;
      const pA = a.task.project_name || projects.find(p => p.id === a.task.project_id)?.name || '';
      const pB = b.task.project_name || projects.find(p => p.id === b.task.project_id)?.name || '';
      if (pA !== pB) return pA < pB ? -1 : 1;
      return a.isOverdue === b.isOverdue ? 0 : a.isOverdue ? -1 : 1;
    });
  }, [tasks, projects, today]);

  const projectsForFilter = selectedProgramId ? projects.filter(p => p.program_id === selectedProgramId) : projects;

  const filteredRows = useMemo(() => allRows.filter(row => {
    if (search && !row.resourceName.toLowerCase().includes(search.toLowerCase()) && !String(row.task.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedProgramId && row.task.program_id && row.task.program_id !== selectedProgramId) return false;
    if (selectedProjectId && row.task.project_id !== selectedProjectId) return false;
    if (selectedAssignee) {
      const rowAssignee = row.task.assigned_to || row.task.resource_name || row.task.assignee_name;
      if (rowAssignee && rowAssignee !== selectedAssignee) return false;
    }
    if (filter === 'overdue' && !row.isOverdue) return false;
    if (filter === 'upcoming' && row.isOverdue) return false;
    return true;
  }), [allRows, search, selectedProgramId, selectedProjectId, selectedAssignee, filter]);

  const totalOverdue = allRows.filter(r => r.isOverdue).length;
  const totalUpcoming = allRows.filter(r => !r.isOverdue).length;
  const uniqueResources = [...new Set(filteredRows.map(r => r.resourceName))];

  const rowKey = (row) => `${row.resourceName}||${row.task.id}`;

  const toggleRowSelect = (row, checked) => {
    setSelectedForNudge(prev => {
      const next = new Set(prev);
      checked ? next.add(rowKey(row)) : next.delete(rowKey(row));
      return next;
    });
  };

  const allFilteredKeys = filteredRows.map(rowKey);
  const allSelected = allFilteredKeys.length > 0 && allFilteredKeys.every(k => selectedForNudge.has(k));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedForNudge(new Set());
    else setSelectedForNudge(new Set(allFilteredKeys));
  };

  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}}
        onNewPortfolio={() => {}} onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Overdue / Upcoming Tasks</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => {
              const rows = [['Resource', 'Project', 'Task', 'Due Date', 'Status', 'Delay'],
                ...filteredRows.map(row => {
                  const proj = getProject(row.task.project_id);
                  return [row.resourceName, proj?.name || '', row.task.title, row.task.due_date || '', row.isOverdue ? 'Overdue' : 'Upcoming', row.isOverdue ? `${row.daysNum}d late` : `${row.daysNum}d left`];
                })];
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'task_pulse.csv'; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            {selectedForNudge.size > 0 && (
              <Button size="sm" className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                disabled title="Nudge notifications are unavailable until a backend nudge endpoint is added.">
                <Mail className="w-3.5 h-3.5" /> Nudge Selected ({selectedForNudge.size})
              </Button>
            )}
            {uniqueResources.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-slate-600"
                disabled title="Nudge notifications are unavailable until a backend nudge endpoint is added.">
                <Mail className="w-3.5 h-3.5" /> Nudge All
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center gap-3 flex-wrap">
          <select value={selectedProgramId} onChange={e => { setSelectedProgramId(e.target.value); setSelectedProjectId(''); setSelectedForNudge(new Set()); }}
            className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setSelectedForNudge(new Set()); }}
            className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
            <option value="">All Projects</option>
            {projectsForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
            <option value="all">All Status</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <select value={days} onChange={e => { setDays(e.target.value); setSelectedForNudge(new Set()); }}
            className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
          </select>
          <select value={selectedAssignee} onChange={e => { setSelectedAssignee(e.target.value); setSelectedForNudge(new Set()); }}
            className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
            <option value="">All Assignees</option>
            {assignees.map(name => <option key={name} value={String(name)}>{name}</option>)}
          </select>
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resource or task..." className="h-8 text-sm pl-8" />
          </div>
        </div>

        {/* Spreadsheet table */}
        <div className="flex-1 overflow-auto">
          {!selectedAccountId ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Select an account to view overdue and upcoming tasks.</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Loading overdue and upcoming tasks...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm">{error?.message || 'Unable to load overdue and upcoming tasks.'}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No overdue or upcoming tasks match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Resource</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Project</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Task</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Due Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Delay</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const proj = getProject(row.task.project_id);
                  const key = rowKey(row);
                  const isChecked = selectedForNudge.has(key);
                  const prevRow = filteredRows[idx - 1];
                  const isNewResource = !prevRow || prevRow.resourceName !== row.resourceName;
                  return (
                    <tr key={key}
                      className={cn('border-b border-slate-100 hover:bg-slate-50 transition-colors',
                        isChecked && 'bg-violet-50 hover:bg-violet-50/80',
                        isNewResource && idx > 0 && 'border-t-2 border-t-slate-200')}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" checked={isChecked}
                          onChange={e => toggleRowSelect(row, e.target.checked)}
                          className="rounded" />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                        {row.resourceName}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        <span className="font-medium text-slate-600">{proj ? proj.name : '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-xs">
                        <p className="truncate">{row.task.title}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{row.task.due_date}</td>
                      <td className="px-3 py-2.5">
                        {row.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-2.5 h-2.5" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" /> Upcoming
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {row.isOverdue ? (
                          <span className="text-red-600 font-semibold">{row.daysNum}d late</span>
                        ) : (
                          <span className={cn('font-semibold', row.daysNum <= 3 ? 'text-orange-600' : 'text-amber-600')}>
                            {row.daysNum === 0 ? 'Today' : row.daysNum === 1 ? 'Tomorrow' : `${row.daysNum}d left`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}