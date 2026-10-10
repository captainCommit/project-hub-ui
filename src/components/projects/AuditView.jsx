import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, Clock, Mail, Download, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO, isValid, isBefore, isAfter, addDays } from 'date-fns';

export default function AuditView({ tasks = [], vacations = [], onTaskClick, auditEntries, readOnly = false }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedForNudge, setSelectedForNudge] = useState(new Set());

  if (readOnly && Array.isArray(auditEntries)) {
    return (
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl">
        <div className="divide-y divide-slate-100">
          {auditEntries.map(entry => {
            const actor = entry.actor_name || entry.user_name;
            const entityName = entry.entity_name || entry.entity_title;
            const message = entry.message || entry.details;
            const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
            const hasValidTimestamp = timestamp && !Number.isNaN(timestamp.getTime());

            return (
              <div key={entry.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.action && <span className="text-sm font-semibold text-slate-800">{entry.action}</span>}
                      {actor && <span className="text-xs text-slate-500">by {actor}</span>}
                      {hasValidTimestamp && <span className="text-xs text-slate-400">{timestamp.toLocaleString()}</span>}
                    </div>
                    {(entry.entity_type || entityName || entry.entity_id) && (
                      <div className="mt-1 text-xs text-slate-500">
                        {entry.entity_type && <span className="font-medium text-slate-600">{entry.entity_type}</span>}
                        {entityName && <span>{entry.entity_type ? ': ' : ''}{entityName}</span>}
                        {entry.entity_id && <span className="text-slate-400"> ({entry.entity_id})</span>}
                      </div>
                    )}
                    {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
                    {(entry.before !== undefined || entry.after !== undefined) && (
                      <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
                        {entry.before !== undefined && (
                          <pre className="bg-slate-50 border border-slate-100 rounded-md p-2 overflow-auto text-slate-500">{JSON.stringify(entry.before, null, 2)}</pre>
                        )}
                        {entry.after !== undefined && (
                          <pre className="bg-slate-50 border border-slate-100 rounded-md p-2 overflow-auto text-slate-500">{JSON.stringify(entry.after, null, 2)}</pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in14 = addDays(today, 14);

  // Is the resource on vacation overlapping the task's scheduled window?
  const isResourceAway = (resourceName, task) => {
    if (!resourceName || resourceName === 'Unassigned' || !vacations.length) return false;
    const ts = task.start_date ? parseISO(task.start_date) : null;
    const te = task.due_date ? parseISO(task.due_date) : null;
    return vacations.some(v => {
      if (v.resource_name !== resourceName) return false;
      const vs = parseISO(v.start_date), ve = parseISO(v.end_date);
      if (!isValid(vs) || !isValid(ve)) return false;
      const startRef = ts || te;
      const endRef = te || ts;
      if (!startRef || !endRef) return false;
      return startRef <= ve && endRef >= vs;
    });
  };

  const allRows = useMemo(() => {
    const rows = [];
    tasks.forEach(task => {
      if (!task.due_date || task.status === 'done') return;
      const due = parseISO(task.due_date);
      if (!isValid(due)) return;
      const isOverdue = isBefore(due, today);
      const isUpcoming = !isOverdue && !isAfter(due, in14);
      if (!isOverdue && !isUpcoming) return;

      const resources = new Set();
      if (task.assignee) resources.add(task.assignee);
      if (Array.isArray(task.resources)) task.resources.forEach(r => resources.add(r));
      if (resources.size === 0) resources.add('Unassigned');

      resources.forEach(resourceName => {
        const daysNum = isOverdue
          ? Math.floor((today - due) / 86400000)
          : Math.ceil((due - today) / 86400000);
        rows.push({ resourceName, task, isOverdue, daysNum, away: !isOverdue && isResourceAway(resourceName, task) });
      });
    });
    return rows.sort((a, b) => {
      if (a.resourceName !== b.resourceName) return a.resourceName < b.resourceName ? -1 : 1;
      return a.isOverdue === b.isOverdue ? 0 : a.isOverdue ? -1 : 1;
    });
  }, [tasks]);

  const filteredRows = useMemo(() => allRows.filter(row => {
    if (search && !row.resourceName.toLowerCase().includes(search.toLowerCase()) && !row.task.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'overdue' && !row.isOverdue) return false;
    if (filter === 'upcoming' && row.isOverdue) return false;
    return true;
  }), [allRows, search, filter]);

  const uniqueResources = [...new Set(filteredRows.map(r => r.resourceName))];

  const rowKey = (row) => `${row.resourceName}||${row.task.id}`;

  const buildEmailBodyForRows = (resourceName, rows) => {
    const overdue = rows.filter(r => r.isOverdue);
    const upcoming = rows.filter(r => !r.isOverdue);
    let body = `Hi ${resourceName},\n\nThis is a friendly reminder about your tasks:\n\n`;
    if (overdue.length) body += `OVERDUE:\n${overdue.map(r => `  • [OVERDUE] ${r.task.title} – due ${r.task.due_date}`).join('\n')}\n\n`;
    if (upcoming.length) body += `DUE IN THE NEXT 2 WEEKS:\n${upcoming.map(r => `  • ${r.task.title} – due ${r.task.due_date}`).join('\n')}\n\n`;
    body += `Please review and update the status of your tasks at your earliest convenience.\n\nThank you.`;
    return body;
  };

  const handleNudge = (resourceName) => {
    const rows = allRows.filter(r => r.resourceName === resourceName);
    const subject = encodeURIComponent(`Action Required: Task Reminder for ${resourceName}`);
    const body = encodeURIComponent(buildEmailBodyForRows(resourceName, rows));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleBulkNudge = () => {
    const selectedRows = filteredRows.filter(r => selectedForNudge.has(rowKey(r)));
    const byResource = {};
    selectedRows.forEach(r => {
      if (!byResource[r.resourceName]) byResource[r.resourceName] = [];
      byResource[r.resourceName].push(r);
    });
    Object.entries(byResource).forEach(([resourceName, rows], i) => {
      setTimeout(() => {
        const subject = encodeURIComponent(`Action Required: Task Reminder for ${resourceName}`);
        const body = encodeURIComponent(buildEmailBodyForRows(resourceName, rows));
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      }, i * 300);
    });
  };

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

  const handleExport = () => {
    const rows = [['Resource', 'Task', 'Due Date', 'Status', 'Delay'],
      ...filteredRows.map(row => [
        row.resourceName, row.task.title, row.task.due_date || '',
        row.isOverdue ? 'Overdue' : 'Upcoming',
        row.isOverdue ? `${row.daysNum}d late` : `${row.daysNum}d left`
      ])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'overdue_upcoming_tasks.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="bg-white border-b border-slate-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="h-8 text-sm border border-slate-200 rounded-md px-2 text-slate-700 bg-white">
          <option value="all">All Status</option>
          <option value="overdue">Overdue</option>
          <option value="upcoming">Upcoming</option>
        </select>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resource or task..." className="h-8 text-sm pl-8" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          {selectedForNudge.size > 0 && (
            <Button size="sm" className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleBulkNudge}>
              <Mail className="w-3.5 h-3.5" /> Nudge Selected ({selectedForNudge.size})
            </Button>
          )}
          {uniqueResources.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-slate-600"
              onClick={() => uniqueResources.forEach((r, i) => setTimeout(() => handleNudge(r), i * 300))}>
              <Mail className="w-3.5 h-3.5" /> Nudge All
            </Button>
          )}
        </div>
      </div>

      {/* Spreadsheet table */}
      <div className="flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
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
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Task</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Due Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Delay</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
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
                    <td className="px-3 py-2.5 text-slate-700 max-w-xs">
                      <button className="truncate text-left hover:text-indigo-600 hover:underline" onClick={() => onTaskClick?.(row.task)}>
                        {row.task.title}
                      </button>
                      {row.away && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                          <UserMinus className="w-3 h-3" /> Resource away during this task
                        </div>
                      )}
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
  );
}