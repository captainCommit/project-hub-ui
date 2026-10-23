import React from 'react';
import { Bell, ClipboardList, UserPlus, MessageSquare, LifeBuoy, AlertTriangle, CalendarClock, RefreshCw, X } from 'lucide-react';
import { parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Approvals waiting on you, work assigned to you and mentions, plus the app's other notifications.
const KIND_META = {
  approval: { icon: ClipboardList, color: '#D97706' },
  assignment: { icon: UserPlus, color: '#0056D2' },
  mention: { icon: MessageSquare, color: '#475569' },
  comment: { icon: MessageSquare, color: '#475569' },
  support: { icon: LifeBuoy, color: '#0056D2' },
  risk: { icon: AlertTriangle, color: '#C2410C' },
  due: { icon: CalendarClock, color: '#C2410C' },
  status: { icon: RefreshCw, color: '#475569' },
  update: { icon: Bell, color: '#475569' },
};

const INK = '#1D1D1F';
const SUB = '#6E6E73';
const FAINT = '#8E8E93';
const ACCENT = '#0056D2';
const LINE = '#E5E5E5';

const relative = (ts) => (ts && isValid(parseISO(ts)) ? formatDistanceToNow(parseISO(ts), { addSuffix: true }) : '');

export default function HomeNotifications({
  items = [], readAt, onOpen, onMarkAllRead, markingRead = false, onRemove, onClearRead, clearingRead = false,
}) {
  const readTime = readAt ? new Date(readAt).getTime() : null;
  // Feed notifications carry their own read flag; the rest are unread if newer than the last "Mark all as read".
  const isUnread = (item) => (item.unread !== undefined ? item.unread : readTime === null || new Date(item.ts).getTime() > readTime);
  const count = items.filter(isUnread).length;
  const readItems = items.filter(item => !isUnread(item));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Notifications"
          className="relative w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 flex-shrink-0"
        >
          <Bell className="w-4 h-4" style={{ color: '#64748B' }} />
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              {count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: LINE }}>
          <Bell className="w-4 h-4 flex-shrink-0" style={{ color: INK }} />
          <span className="text-[13px] font-bold" style={{ color: INK }}>Notifications</span>
          {count > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F5F5F7', color: INK }}>
              {count} new
            </span>
          )}
          {items.length > 0 && (
            <span className="ml-auto flex items-center gap-3">
              <button
                onClick={(e) => { e.preventDefault(); onMarkAllRead(); }}
                disabled={count === 0 || markingRead}
                className="text-[11px] hover:underline disabled:opacity-40 disabled:no-underline"
                style={{ color: SUB }}
              >
                Mark all as read
              </button>
              <button
                onClick={(e) => { e.preventDefault(); onClearRead(readItems); }}
                disabled={readItems.length === 0 || clearingRead}
                className="text-[11px] hover:underline disabled:opacity-40 disabled:no-underline"
                style={{ color: SUB }}
              >
                Clear read
              </button>
            </span>
          )}
        </div>

        <div className="max-h-[330px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-center" style={{ color: SUB }}>
              You're all caught up.
            </p>
          ) : (
            items.map(item => {
              const meta = KIND_META[item.kind] || KIND_META.mention;
              const Icon = meta.icon;
              const unread = isUnread(item);
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onOpen(item)}
                  className="group flex items-start gap-3 px-4 py-3 rounded-none border-b last:border-b-0 focus:bg-[#F7F9FC]"
                  style={{ borderColor: LINE }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold" style={{ color: INK }}>{item.title}</span>
                    <span className="block text-[11px] mt-0.5 truncate" style={{ color: SUB }}>{item.subtitle}</span>
                    <span className="block text-[10px] mt-1" style={{ color: FAINT }}>{relative(item.ts)}</span>
                  </span>
                  {unread && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: ACCENT }} />}
                  {/* Stopping the click keeps the menu open and the notification from opening. */}
                  <button
                    title="Remove"
                    aria-label="Remove notification"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(item); }}
                    className="flex-shrink-0 -mr-1 p-0.5 rounded opacity-60 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-200"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: FAINT }} />
                  </button>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
