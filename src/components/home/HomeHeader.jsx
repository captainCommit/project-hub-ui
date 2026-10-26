import React from 'react';
import { Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import HomeNotifications from '@/components/home/HomeNotifications';
import GlobalSearch from '@/components/home/GlobalSearch';

export default function HomeHeader({
  greeting, subtitle,
  notifications = [], notificationsReadAt, onOpenNotification, onMarkAllRead, markingRead,
  onRemoveNotification, onClearRead, clearingRead, onCreate,
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold truncate" style={{ color: '#1E293B' }}>{greeting}</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div data-tour="home-search" className="w-full sm:w-72">
          <GlobalSearch className="w-full" />
        </div>

        <div data-tour="home-bell">
          <HomeNotifications
            items={notifications}
            readAt={notificationsReadAt}
            onOpen={onOpenNotification}
            onMarkAllRead={onMarkAllRead}
            markingRead={markingRead}
            onRemove={onRemoveNotification}
            onClearRead={onClearRead}
            clearingRead={clearingRead}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-tour="home-create" className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white flex-shrink-0 hover:opacity-90" style={{ background: '#c87b14' }}>
              <Plus className="w-4 h-4" /> Create
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreate('project')}>Project</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreate('risk')}>Risk</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreate('issue')}>Issue</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreate('decision')}>Decision</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}