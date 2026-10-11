import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileUp, KeyRound, Loader2, Trash2, UserPlus } from 'lucide-react';
import { accountsApi } from '@/api/accounts';
import { useAuth } from '@/lib/AuthContext';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import ModulePicker from '@/components/projects/ModulePicker';
import UserAccessDialog from '@/components/Account/UserAccessDialog';
import UserCsvImport from '@/components/Account/UserCsvImport';

const INVITE_ROLES = [
  { value: 'OWNER', label: 'Owner', hint: 'Account admin: users, settings and billing' },
  { value: 'MANAGER', label: 'Manager', hint: 'Manages projects and resources' },
  { value: 'MEMBER', label: 'Member', hint: 'Works on projects' },
  { value: 'VIEWER', label: 'Viewer', hint: 'Read only' },
];

const roleLabel = (role) => (role ? role.charAt(0) + role.slice(1).toLowerCase() : '—');

export const accountMembersQueryKey = (accountId) => ['account-members', accountId];

const NO_ACCESS = 'none';

/** "project:<id>" and friends, for the optional "Add to" picker. */
const accessFromPick = (pick, modules) => {
  if (!pick || pick === NO_ACCESS) return null;
  const [kind, id] = pick.split(':');
  return { [`${kind}_id`]: id, modules };
};

/**
 * Members of one account, a form to add someone, and per-member role changes and removal.
 * Adding emails them a Cognito invite.
 * With showAccessPicker (the account's own owners), the form can also give them a first portfolio, program or project,
 * and each member's access can be edited.
 */
export default function AccountUsers({ accountId, showAccessPicker = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', full_name: '', role: 'MEMBER', pick: NO_ACCESS, modules: ['TASKS'] });
  const [notice, setNotice] = useState(null);
  const [accessFor, setAccessFor] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  // A role change waits here until it's confirmed, since it can take away someone's (or your own) rights.
  const [pendingRole, setPendingRole] = useState(/** @type {{ member: any, role: string } | null} */ (null));
  const { user, refreshAccounts } = useAuth();
  const { portfolios, programs, projects } = useAccountHierarchy();

  const { data: members = [], isLoading } = useQuery({
    queryKey: accountMembersQueryKey(accountId),
    queryFn: () => accountsApi.listMembers(accountId),
    enabled: !!accountId,
  });

  const invite = useMutation({
    mutationFn: () => accountsApi.inviteUser(accountId, {
      email: form.email,
      full_name: form.full_name,
      role: form.role,
      update_existing: true,
      access: form.role === 'OWNER' ? null : accessFromPick(form.pick, form.modules),
    }),
    onSuccess: (/** @type {any} */ result) => {
      const messages = {
        CREATED: `${result.email} was added. They'll get an email with a temporary password.`,
        UPDATED: `${result.email}'s role is now ${roleLabel(result.role)}.`,
        ALREADY_EXISTS: `${result.email} is already a ${roleLabel(result.role)} in this account.`,
      };
      setNotice({ ok: true, text: messages[result.status] || 'Done.' });
      setForm((f) => ({ ...f, email: '', full_name: '' }));
      queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
      queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    },
    onError: (error) => setNotice({ ok: false, text: error.message || 'Could not add the user.' }),
  });

  /** A change to your own membership changes what you can see, so reload your accounts too. */
  const afterMemberChange = (member) => {
    queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['access-grants', accountId] });
    if (member.id === user?.id) refreshAccounts(user);
  };
  const changeRole = useMutation({
    mutationFn: (/** @type {{ member: any, role: string }} */ { member, role }) =>
      accountsApi.changeUserRole(accountId, member.id, /** @type {any} */ (role)),
    onSuccess: (_result, { member, role }) => {
      setPendingRole(null);
      setNotice({ ok: true, text: `${member.email}'s role is now ${roleLabel(role)}.` });
      afterMemberChange(member);
    },
    onError: (error) => { setPendingRole(null); setNotice({ ok: false, text: error.message || 'Could not change the role.' }); },
  });
  const removeUser = useMutation({
    mutationFn: (/** @type {any} */ member) => accountsApi.removeUser(accountId, member.id),
    onSuccess: (_result, member) => {
      setNotice({ ok: true, text: `${member.email} was removed from the account.` });
      setRemoving(null);
      afterMemberChange(member);
    },
    onError: (error) => { setRemoving(null); setNotice({ ok: false, text: error.message || 'Could not remove the user.' }); },
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.email.trim() && !invite.isPending;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add User</p>
          <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => setImportOpen(true)}>
            <FileUp className="w-3.5 h-3.5 mr-1.5" /> Import CSV
          </Button>
        </div>
        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) invite.mutate();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} className="h-9" placeholder="name@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} className="h-9" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Role</Label>
              <Select value={form.role} onValueChange={(v) => setField('role', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label} <span className="text-slate-400">· {r.hint}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {showAccessPicker && form.role !== 'OWNER' && (
            <div className="space-y-2">
              <div className="space-y-1.5 sm:max-w-md">
                <Label className="text-xs text-slate-500">Add to</Label>
                <Select value={form.pick} onValueChange={(v) => setField('pick', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCESS}>Nothing yet · add them from a project later</SelectItem>
                    {portfolios.map((p) => <SelectItem key={p.id} value={`portfolio:${p.id}`}>Portfolio · {p.name}</SelectItem>)}
                    {programs.map((p) => <SelectItem key={p.id} value={`program:${p.id}`}>Program · {p.name}</SelectItem>)}
                    {projects.map((p) => <SelectItem key={p.id} value={`project:${p.id}`}>Project · {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'MEMBER' && form.pick !== NO_ACCESS && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Can edit</Label>
                  <ModulePicker value={form.modules} onChange={(modules) => setField('modules', modules)} />
                </div>
              )}
              <p className="text-xs text-slate-400">Owners see everything. Everyone else sees only what they're added to.</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={!canSubmit} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
              {invite.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
              {invite.isPending ? 'Adding…' : 'Add User'}
            </Button>
            {notice && <span className={notice.ok ? 'text-xs text-emerald-600 font-medium' : 'text-xs text-red-600 font-medium'}>{notice.text}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Users</p>
          <p className="text-xs text-slate-400">{members.length}</p>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {m.full_name || m.email}
                    {m.id === user?.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
                  </p>
                  {m.full_name && <p className="text-xs text-slate-500 truncate">{m.email}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!m.has_signed_in && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Invited</span>}
                  {showAccessPicker && (
                    m.role === 'OWNER' ? (
                      <span className="text-xs text-slate-400 px-2">Sees everything</span>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAccessFor(m)}>
                        <KeyRound className="w-3.5 h-3.5 mr-1" /> Access
                      </Button>
                    )
                  )}
                  <Select value={m.role} onValueChange={(role) => role !== m.role && setPendingRole({ member: m, role })} disabled={changeRole.isPending}>
                    <SelectTrigger className="h-8 w-28 text-xs" aria-label={`Role for ${m.full_name || m.email}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INVITE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600"
                    aria-label={`Remove ${m.full_name || m.email}`} onClick={() => setRemoving(m)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAccessPicker && (
        <UserAccessDialog
          key={accessFor?.id}
          open={!!accessFor}
          onOpenChange={(open) => !open && setAccessFor(null)}
          accountId={accountId}
          member={accessFor}
        />
      )}

      <UserCsvImport
        open={importOpen}
        onOpenChange={setImportOpen}
        accountId={accountId}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
          queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
        }}
      />

      <AlertDialog open={!!pendingRole} onOpenChange={(open) => !open && !changeRole.isPending && setPendingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {pendingRole?.member.id === user?.id ? 'Your' : `${pendingRole?.member.full_name || pendingRole?.member.email}'s`} role
                  will change from <strong>{roleLabel(pendingRole?.member.role)}</strong> to <strong>{roleLabel(pendingRole?.role)}</strong>.
                </p>
                {pendingRole?.member.role === 'OWNER' && (
                  <p className="text-amber-700">
                    {pendingRole?.member.id === user?.id
                      ? "You'll lose owner rights (users, settings and billing) straight away. Only another owner can give them back."
                      : "They'll lose owner rights (users, settings and billing) and only see what they're given access to."}
                  </p>
                )}
                {pendingRole?.role === 'VIEWER' && pendingRole?.member.role !== 'VIEWER' && (
                  <p>Viewers can't edit anything, whatever access they've been given.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changeRole.isPending}>Cancel</AlertDialogCancel>
            <Button
              disabled={changeRole.isPending}
              onClick={() => changeRole.mutate(pendingRole)}
              className="bg-[#c87b14] hover:bg-[#a86610] text-white"
            >
              {changeRole.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Change role
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.full_name || removing?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.id === user?.id
                ? "You'll lose access to this account straight away."
                : 'They lose access to this account and everything in it. Their past work stays. You can add them again later.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => removeUser.mutate(removing)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
