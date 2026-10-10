import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { accountsApi } from '@/api/accounts';

const INVITE_ROLES = [
  { value: 'ADMIN', label: 'Admin', hint: 'Manages users and account settings' },
  { value: 'MANAGER', label: 'Manager', hint: 'Manages projects and resources' },
  { value: 'MEMBER', label: 'Member', hint: 'Works on projects' },
  { value: 'VIEWER', label: 'Viewer', hint: 'Read only' },
];

const roleLabel = (role) => (role ? role.charAt(0) + role.slice(1).toLowerCase() : '—');

export const accountMembersQueryKey = (accountId) => ['account-members', accountId];

/** Members of one account, and a form to add someone. Adding emails them a Cognito invite. */
export default function AccountUsers({ accountId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', full_name: '', role: 'MEMBER' });
  const [notice, setNotice] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: accountMembersQueryKey(accountId),
    queryFn: () => accountsApi.listMembers(accountId),
    enabled: !!accountId,
  });

  const invite = useMutation({
    mutationFn: () => accountsApi.inviteUser(accountId, { ...form, update_existing: true }),
    onSuccess: (/** @type {any} */ result) => {
      const messages = {
        CREATED: `${result.email} was added. They'll get an email with a temporary password.`,
        UPDATED: `${result.email}'s role is now ${roleLabel(result.role)}.`,
        ALREADY_EXISTS: `${result.email} is already a ${roleLabel(result.role)} in this account.`,
      };
      setNotice({ ok: true, text: messages[result.status] || 'Done.' });
      setForm({ email: '', full_name: '', role: form.role });
      queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
      queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    },
    onError: (error) => setNotice({ ok: false, text: error.message || 'Could not add the user.' }),
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.email.trim() && !invite.isPending;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add User</p>
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
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.full_name || m.email}</p>
                  {m.full_name && <p className="text-xs text-slate-500 truncate">{m.email}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!m.has_signed_in && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Invited</span>}
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">{roleLabel(m.role)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
