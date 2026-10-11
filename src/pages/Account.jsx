import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SettingsContent from '@/components/projects/SettingsContent';
import { UserCircle, Settings as SettingsIcon, Users } from 'lucide-react';
import ProfileEditor from '@/components/Account/ProfileEditor';
import AccountUsers from '@/components/Account/AccountUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

const USER_ADMIN_ROLES = ['OWNER', 'ADMIN'];

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
  const { user, appPublicSettings, accounts, selectedAccount, selectedAccountId, setSelectedAccountId } = useAuth();

  const { projects, programs, portfolios } = useAccountHierarchy();

  const accountRole = selectedAccount?.role;
  const roleLabel = accountRole ? accountRole.charAt(0) + accountRole.slice(1).toLowerCase() : '—';
  const isAdmin = USER_ADMIN_ROLES.includes(accountRole);
  const canManageUsers = !!selectedAccountId && (isAdmin || user?.is_platform_admin);
  const tabs = [
    { id: 'account', label: 'Account', icon: UserCircle },
    canManageUsers && { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ].filter(Boolean);
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
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === id ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'account' ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl space-y-6">
              <ProfileEditor user={user} />
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                <div className="px-5 py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Information</p>
                </div>
                {accounts.length > 1 ? (
                  <div className="flex items-center justify-between px-5 py-4">
                    <p className="text-sm font-medium text-slate-800">Account</p>
                    <Select value={selectedAccountId ?? undefined} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className="h-9 w-64"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <InfoRow label="Account Name" value={selectedAccount?.name || '—'} />
                )}
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
        ) : tab === 'users' && canManageUsers ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl">
              <AccountUsers accountId={selectedAccountId} />
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