import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { notificationsApi } from '@/api/notifications';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const POLL_MS = 60_000;

// Notifications only carry the entity, so link to the screen that lists that kind of record.
const ENTITY_PAGES = {
  RISK: 'RiskLog',
  ISSUE: 'IssueLog',
  ASSUMPTION: 'AssumptionLog',
  DECISION: 'DecisionLog',
};

const timeAgo = (value) => {
  const date = typeof value === 'string' ? parseISO(value) : null;
  return date && isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '';
};

export default function NotificationBell({ compact = false }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
  const notifications = data?.results ?? [];
  const unread = notifications.filter(n => !n.is_read).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });

  const handleOpenNotification = (notification) => {
    if (!notification.is_read) markRead.mutate(notification.id);
    const page = ENTITY_PAGES[notification.entity_type];
    if (page) {
      setOpen(false);
      navigate(createPageUrl(page));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0" title="Notifications">
          <Bell className={cn('w-4 h-4', compact ? 'text-white/80' : 'text-white/60')} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#d97706] text-white text-[10px] font-bold leading-4 text-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={12} className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">Notifications</span>
          {unread > 0 && (
            <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#002046] disabled:opacity-50">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">Loading notifications…</p>
          ) : isError ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500 space-y-2">
              <p>Notifications could not load.</p>
              <button onClick={() => refetch()} className="text-[#c87b14] font-medium hover:underline">Try again</button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">You're all caught up.</p>
          ) : notifications.map(notification => (
            <button key={notification.id} onClick={() => handleOpenNotification(notification)}
              className={cn('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-2.5',
                !notification.is_read && 'bg-orange-50/40')}>
              <span className={cn('mt-1.5 w-2 h-2 rounded-full flex-shrink-0', notification.is_read ? 'bg-transparent' : 'bg-[#d97706]')} />
              <span className="min-w-0">
                <span className={cn('block text-sm', notification.is_read ? 'text-slate-600' : 'font-medium text-slate-800')}>{notification.title}</span>
                {notification.message && <span className="block text-xs text-slate-500 mt-0.5">{notification.message}</span>}
                <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(notification.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
