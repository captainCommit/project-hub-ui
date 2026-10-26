import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SettingsContent from '@/components/projects/SettingsContent';
import { Bell, Bot, CreditCard, Link2, UserCircle, Settings as SettingsIcon, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ProfileEditor from '@/components/Account/ProfileEditor';
import AccountUsers from '@/components/Account/AccountUsers';
import AccountBilling from '@/components/Account/AccountBilling';
import NotificationPreferences from '@/components/Account/NotificationPreferences';
import AiAssistantSettings from '@/components/Account/AiAssistantSettings';
import IntegrationsSettings from '@/components/Account/IntegrationsSettings';
import ConnectedApps from '@/components/Account/ConnectedApps';
import AiAccessCard from '@/components/Account/AiAccessCard';
import { useAiStatus } from '@/hooks/useAiStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

const USER_ADMIN_ROLES = ['OWNER'];

function SectionHeading({ title, sub }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-[#002046]">{title}</h2>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}

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
  const [searchParams] = useSearchParams();
  // Stripe Checkout and the billing portal send owners back to ?tab=billing; notification emails link to ?tab=notifications.
  // Slack/Microsoft sign-ins come back to ?tab=integrations (owners) and ?tab=connected (everyone); both are Connected apps now.
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get('tab') || 'account';
    return requested === 'integrations' ? 'connected' : requested;
  });
  const { user, appPublicSettings, accounts, selectedAccount, selectedAccountId, setSelectedAccountId } = useAuth();

  const { projects, programs, portfolios } = useAccountHierarchy();
  const { aiEnabled } = useAiStatus();

  const accountRole = selectedAccount?.role;
  const roleLabel = accountRole ? accountRole.charAt(0) + accountRole.slice(1).toLowerCase() : '—';
  const isAdmin = USER_ADMIN_ROLES.includes(accountRole);
  const canManageUsers = !!selectedAccountId && isAdmin;
  const tabs = [
    { id: 'account', label: 'Account', icon: UserCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'connected', label: 'Connected apps', icon: Link2 },
    canManageUsers && { id: 'users', label: 'Users', icon: Users },
    isAdmin && { id: 'billing', label: 'Billing', icon: CreditCard },
    isAdmin && aiEnabled && { id: 'ai', label: 'AI assistant', icon: Bot },
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
        ) : tab === 'notifications' ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl">
              <NotificationPreferences />
            </div>
          </div>
        ) : tab === 'users' && canManageUsers ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl">
              <AccountUsers accountId={selectedAccountId} showAccessPicker={isAdmin} />
            </div>
          </div>
        ) : tab === 'billing' && isAdmin ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl">
              <AccountBilling accountId={selectedAccountId} checkoutResult={searchParams.get('checkout')} />
            </div>
          </div>
        ) : tab === 'connected' ? (
          <div className="flex-1 overflow-auto p-8">
            {/* Everyone's own connections, then (for owners) the account-wide Slack and Microsoft 365 setup. */}
            <div className="max-w-3xl space-y-8">
              {/* The AI assistant is the account's, not a personal link, so it sits above both sections. */}
              <AiAccessCard />
              <section className="space-y-3">
                {isAdmin && <SectionHeading title="Your connections" sub="Link your own Slack user and calendar." />}
                <ConnectedApps accountId={selectedAccountId} />
              </section>
              {isAdmin && (
                <section className="space-y-3">
                  <SectionHeading title="Account integrations" sub="Connect this account to Slack and Microsoft 365. Only account owners see this." />
                  <IntegrationsSettings
                    accountId={selectedAccountId}
                    returnedFrom={searchParams.get('connected')}
                    returnError={searchParams.get('integration_error')}
                  />
                </section>
              )}
            </div>
          </div>
        ) : tab === 'ai' && isAdmin && aiEnabled ? (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl">
              <AiAssistantSettings accountId={selectedAccountId} />
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