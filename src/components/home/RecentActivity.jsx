import React from 'react';
import { useScrollGutter } from '@/hooks/useScrollGutter';
import { cn } from '@/lib/utils';
import { Check, MessageSquare, Pencil, Plus, FileText } from 'lucide-react';
import { parseISO, isValid, formatDistanceToNow } from 'date-fns';
import DashboardCard, { TEXT, MUTED, BORDER } from '@/components/home/DashboardCard';

const KIND_META = {
  project: { icon: Pencil, bg: '#FF8A00' },
  task: { icon: Check, bg: '#00B66A' },
  issue: { icon: MessageSquare, bg: '#2196F3' },
  risk: { icon: Plus, bg: '#9C27B0' },
  assumption: { icon: FileText, bg: '#4A9FE0' },
  dependency: { icon: FileText, bg: '#4A9FE0' },
};

export default function RecentActivity({ items = [], onOpen, viewAllTo }) {
  const [scrollRef, scrolls] = useScrollGutter(items);
  return (
    <DashboardCard title="Recent Activity" viewAllTo={viewAllTo} heightClass="lg:h-[218px]">
      {items.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: MUTED }}>No recent activity yet.</p>
      ) : (
        <div ref={scrollRef} className={cn('flex-1 min-h-0 overflow-y-auto mt-2', scrolls && 'pr-3')}>
          {items.map(item => {
            const meta = KIND_META[item.kind] || KIND_META.project;
            const Icon = meta.icon;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => onOpen(item.projectId)}
                className="w-full flex items-center gap-2.5 py-1.5 text-left border-b last:border-b-0"
                style={{ borderColor: BORDER }}
              >
                <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                  <Icon className="w-3 h-3 text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold truncate" style={{ color: TEXT }}>{item.label}</span>
                  <span className="block text-[10px] truncate" style={{ color: MUTED }}>{item.projectName}</span>
                </span>
                <span className="text-[10px] whitespace-nowrap flex-shrink-0" style={{ color: MUTED }}>
                  {item.ts && isValid(parseISO(item.ts)) ? formatDistanceToNow(parseISO(item.ts), { addSuffix: true }) : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}