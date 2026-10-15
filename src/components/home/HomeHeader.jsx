import React from 'react';
import { Plus, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import HomeNotifications from '@/components/home/HomeNotifications';

export default function HomeHeader({
  greeting, subtitle, search, onSearchChange,
  notifications = [], notificationsReadAt, onOpenNotification, onMarkAllRead, markingRead, onCreate,
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold truncate" style={{ color: '#1E293B' }}>{greeting}</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748B' }} />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full h-9 pl-9 pr-3 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
            style={{ color: '#1E293B' }}
          />
        </div>

        <HomeNotifications
          items={notifications}
          readAt={notificationsReadAt}
          onOpen={onOpenNotification}
          onMarkAllRead={onMarkAllRead}
          markingRead={markingRead}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white flex-shrink-0" style={{ background: '#002046' }}>
              <Plus className="w-4 h-4" /> Create
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreate('task')}>New Task</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreate('project')}>New Project</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreate('risk')}>New Risk</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}