import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SettingsContent from '@/components/projects/SettingsContent';
import { UserCircle, Settings as SettingsIcon } from 'lucide-react';
import ProfileEditor from '@/components/Account/ProfileEditor';

const ACCOUNT_NAME = 'TaskFlow';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
      </div>
      <div className="text-sm text-slate-600 text-right max-w-[60%] truncate">{value}</div>
    </div>
  );
}

export default function Account() {
  const [tab, setTab] = useState('account');
  const { user, appPublicSettings } = useAuth();

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });

  const roleLabel = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User';
  const isAdmin = user?.role === 'admin';
  const sheetsOwned = projects.filter(p => p.created_by_id === user?.id || p.owner === user?.full_name).length;
  const plan = appPublicSettings?.public_settings?.plan_name || appPublicSettings?.public_settings?.plan || '—';

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b-2 border-slate-200 bg-white px-0">
          <button onClick={() => setTab('account')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'account' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <UserCircle className="w-4 h-4" /> Account
          </button>
          <button onClick={() => setTab('settings')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'settings' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>
        </div>

        {tab === 'account' ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl space-y-6">
              <ProfileEditor user={user} />
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                <div className="px-5 py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Information</p>
                </div>
                <InfoRow label="Account Name" value={ACCOUNT_NAME} />
                <InfoRow label="Email" value={user?.email || '—'} />
                <div className="flex items-center justify-between px-5 py-4">
                  <p className="text-sm font-medium text-slate-800">Role</p>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', isAdmin ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-600')}>{roleLabel}</span>
                </div>
                <InfoRow label="Plan" value={plan} />
                <InfoRow label="Sheets Owned" value={sheetsOwned} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl">
              <SettingsContent />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}