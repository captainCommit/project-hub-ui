import React from 'react';

import { createPageUrl } from '@/utils';
import { Calendar, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { parseISO, isValid, isBefore, isAfter, addDays } from 'date-fns';

export default function ResourceMgmtSummary() {
  const { data: vacations = [] } = useQuery({ queryKey: ['resource_vacations'], queryFn: () => base44.entities.ResourceVacation.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks_all'], queryFn: () => base44.entities.Task.list() });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in14 = addDays(today, 14);

  const allResources = [...new Set(vacations.map(v => v.resource_name))];
  const activeTimeOff = vacations.filter(v => {
    const s = parseISO(v.start_date), e = parseISO(v.end_date);
    return isValid(s) && isValid(e) && s <= today && e >= today;
  });

  let overdueCount = 0, upcomingCount = 0;
  tasks.forEach(t => {
    if (!t.due_date || t.status === 'done') return;
    const due = parseISO(t.due_date);
    if (!isValid(due)) return;
    if (isBefore(due, today)) overdueCount++;
    else if (!isAfter(due, in14)) upcomingCount++;
  });

  const cards = [
    {
  
      icon: Calendar,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Resource Calendar',
      description: 'View and manage team time-off, leaves and availability',
      stats: [
        { label: 'Total Resources', value: allResources.length },
        { label: 'Time-off Entries', value: vacations.length },
        { label: 'Currently Away', value: activeTimeOff.length },
      ]
    },
    {
  
      icon: Clock,
      color: 'bg-orange-100 text-orange-600',
      title: 'Resource Task Pulse',
      description: 'Monitor overdue and upcoming tasks assigned to resources',
      stats: [
        { label: 'Overdue Tasks', value: overdueCount },
        { label: 'Due in 14 days', value: upcomingCount },
      ]
    }
  ];

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Resource Management</h1>
            <p className="text-sm text-slate-500">{allResources.length} resources tracked</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {cards.map(({ icon: Icon, color, title, description, stats }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 p-5 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">{title}</h2>
            <p className="text-sm text-slate-500 mb-4">{description}</p>
            <div className="flex gap-4">
              {stats.map(s => (
                <div key={s.label}>
                  <p className="text-xl font-bold text-slate-700">{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}