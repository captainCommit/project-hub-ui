import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ClipboardList, UserPlus, MessageSquare, AlertTriangle, LifeBuoy } from 'lucide-react';
import { parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { notificationsApi } from '@/api/notifications';
import { notificationTarget } from '@/components/NotificationBell';

const POLL_MS = 60_000;

// Icon by what the notification is about, matched on its type first and then its record.
const KIND_META = [
  { match: /approv|decision|change/i, icon: ClipboardList, color: '#D97706' },
  { match: /assign/i, icon: UserPlus, color: '#0056D2' },
  { match: /mention|comment/i, icon: MessageSquare, color: '#475569' },
  { match: /risk|issue|assumption|due|overdue/i, icon: AlertTriangle, color: '#C2410C' },
  { match: /support|ticket/i, icon: LifeBuoy, color: '#475569' },
];
const metaFor = (n) =>
  KIND_META.find(k => k.match.test(n.notification_type || '')) ||
  KIND_META.find(k => k.match.test(n.entity_type || '')) ||
  { icon: Bell, color: '#475569' };

const INK = '#1D1D1F';
const SUB = '#6E6E73';
const FAINT = '#8E8E93';
const ACCENT = '#0056D2';
const LINE = '#E5E5E5';

const relative = (ts) => (ts && isValid(parseISO(ts)) ? formatDistanceToNow(parseISO(ts), { addSuffix: true }) : '');

export default function HomeNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Same query as the sidebar bell, so both stay in step.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
  const items = data?.results ?? [];
  const count = items.filter(n => !n.is_read).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });

  const open = (notification) => {
    if (!notification.is_read) markRead.mutate(notification.id);
    const target = notificationTarget(notification);
    if (target) navigate(target);
  };

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
              {count > 9 ? '9+' : count}
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
            <button
              onClick={(e) => { e.preventDefault(); markAllRead.mutate(); }}
              disabled={count === 0 || markAllRead.isPending}
              className="ml-auto text-[11px] hover:underline disabled:opacity-40 disabled:no-underline"
              style={{ color: SUB }}
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-[330px] overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-6 text-[12px] text-center" style={{ color: SUB }}>Loading notifications…</p>
          ) : isError ? (
            <div className="px-4 py-6 text-[12px] text-center space-y-2" style={{ color: SUB }}>
              <p>Notifications could not load.</p>
              <button onClick={(e) => { e.preventDefault(); refetch(); }} className="font-medium hover:underline" style={{ color: ACCENT }}>Try again</button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-center" style={{ color: SUB }}>
              You're all caught up.
            </p>
          ) : (
            items.map(item => {
              const meta = metaFor(item);
              const Icon = meta.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => open(item)}
                  className="flex items-start gap-3 px-4 py-3 rounded-none border-b last:border-b-0 focus:bg-[#F7F9FC]"
                  style={{ borderColor: LINE }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold" style={{ color: INK }}>{item.title}</span>
                    {item.message && <span className="block text-[11px] mt-0.5 truncate" style={{ color: SUB }}>{item.message}</span>}
                    <span className="block text-[10px] mt-1" style={{ color: FAINT }}>{relative(item.created_at)}</span>
                  </span>
                  {!item.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: ACCENT }} />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
