import React from 'react';
import { useScrollGutter } from '@/hooks/useScrollGutter';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import DashboardCard, { TEXT, MUTED, BORDER, BLUE } from '@/components/home/DashboardCard';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'week', label: 'Due this week' },
  { key: 'upcoming', label: 'Upcoming' },
];

const BADGE_TONE = {
  urgent: { background: '#FDE8EA', color: '#F5222D' },
  warn: { background: '#FFF0D8', color: '#F28C00' },
  muted: { background: '#F0F4F9', color: '#6882A7' },
};

export default function MyPriorities({ items, counts, activeTab, onTabChange, onOpen, onComplete }) {
  const [scrollRef, scrolls] = useScrollGutter(items);
  return (
    <DashboardCard title="My Priorities" heightClass="lg:h-full min-h-0">
      <div className="flex items-center gap-1.5 flex-wrap mt-3 mb-1 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={activeTab === tab.key
              ? { background: BLUE, color: '#ffffff' }
              : { background: '#F0F4F9', color: '#4A6482' }}
          >
            {tab.label} ({counts[tab.key] ?? 0})
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: MUTED }}>Nothing here right now.</p>
      ) : (
        <div ref={scrollRef} className={cn('flex-1 min-h-0 overflow-y-auto', scrolls && 'pr-3')}>
          {items.map(item => (
            <div
              key={`${item.kind}-${item.id}`}
              className="group flex items-center gap-2.5 py-2.5 border-b last:border-b-0"
              style={{ borderColor: BORDER }}
            >
              <button
                onClick={() => onComplete(item)}
                disabled={!item.completeStatusId}
                title={item.completeStatusId ? 'Mark complete' : 'No completed status is set up for this kind of item'}
                className="w-[15px] h-[15px] rounded-full border flex-shrink-0 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                style={{ borderColor: '#C3D3E8' }}
              />
              <button onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{item.title}</p>
                <p className="text-[10px] truncate" style={{ color: MUTED }}>{item.kind} · {item.projectName}</p>
              </button>
              <span className="hidden sm:flex items-center gap-1 text-[10px] whitespace-nowrap flex-shrink-0" style={{ color: MUTED }}>
                <Calendar className="w-3 h-3" />{item.dateLabel}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                style={BADGE_TONE[item.tone]}
              >
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}