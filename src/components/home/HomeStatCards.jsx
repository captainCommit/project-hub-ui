import React from 'react';
import { ListChecks, AlertCircle, CalendarClock, Folder } from 'lucide-react';

const CARD_META = [
  { key: 'tasks', label: 'Tasks to complete', icon: ListChecks, color: '#002046', tint: '#E6EBF2' },
  { key: 'overdue', label: 'Overdue', icon: AlertCircle, color: '#DC2626', tint: '#FEE2E2' },
  { key: 'week', label: 'Due this week', icon: CalendarClock, color: '#C2410C', tint: '#FFF7ED' },
  { key: 'projects', label: 'Active projects', icon: Folder, color: '#15803D', tint: '#DCFCE7' },
];

export default function HomeStatCards({ cards, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {CARD_META.map(meta => {
        const Icon = meta.icon;
        return (
          <button
            key={meta.key}
            onClick={() => onSelect(meta.key)}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 text-left transition-colors hover:border-slate-400"
          >
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.tint }}>
              <Icon className="w-[18px] h-[18px]" style={{ color: meta.color }} />
            </span>
            <span className="min-w-0 flex items-baseline gap-1.5">
              <span className="text-xl font-bold leading-none tabular-nums" style={{ color: '#1E293B' }}>{cards[meta.key] ?? 0}</span>
              <span className="text-xs truncate" style={{ color: '#64748B' }}>{meta.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}