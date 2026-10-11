import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, Users } from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { accessApi } from '@/api/access';
import { accountsApi } from '@/api/accounts';
import { MY_ACCESS_QUERY_KEY, useMyAccess } from '@/hooks/useMyAccess';
import { accountMembersQueryKey } from '@/components/Account/AccountUsers';
import ModulePicker from '@/components/projects/ModulePicker';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager', hint: 'Edits everything here and manages people' },
  { value: 'MEMBER', label: 'Member', hint: 'Edits the modules you pick' },
  { value: 'VIEWER', label: 'Viewer', hint: 'Read only' },
];
const RANK = { VIEWER: 1, MEMBER: 2, MANAGER: 3 };
const SCOPE_KEYS = { project: 'project_id', program: 'program_id', portfolio: 'portfolio_id' };

/** Roles someone's seat allows: a grant never goes above their account role. */
const rolesForSeat = (accountRole) => ROLE_OPTIONS.filter((r) => RANK[r.value] <= (RANK[accountRole] ?? 0));
const displayName = (user) => user.full_name || user.email;

/** "People with access" for a portfolio, program or project, backed by access grants. */
export default function ShareDialog({ open, onOpenChange, item, itemType }) {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const { canManage } = useMyAccess();
  const scope = item?.id ? { [SCOPE_KEYS[itemType] || 'project_id']: item.id } : null;
  const grantsKey = ['access-grants', selectedAccountId, itemType, item?.id];
  const manageable = !!item?.id && canManage(itemType, item.id);
  const [form, setForm] = useState(
    /** @type {{ user_id: string, role: import('@/api/access').GrantRole, modules: import('@/api/access').ProjectModule[] }} */
    ({ user_id: '', role: 'MEMBER', modules: ['TASKS'] }),
  );
  const [error, setError] = useState(null);

  const { data: grants = [], isLoading } = useQuery({
    queryKey: grantsKey,
    queryFn: () => accessApi.listGrants(selectedAccountId, scope),
    enabled: open && !!scope && !!selectedAccountId,
  });
  const { data: members = [] } = useQuery({
    queryKey: accountMembersQueryKey(selectedAccountId),
    queryFn: () => accountsApi.listMembers(selectedAccountId),
    enabled: open && manageable && !!selectedAccountId,
  });

  const directlyGranted = new Set(grants.filter((g) => !g.inherited).map((g) => g.user.id));
  const candidates = members.filter((m) => m.role !== 'OWNER' && !directlyGranted.has(m.id));
  const chosen = members.find((m) => m.id === form.user_id);
  const allowedRoles = useMemo(() => (chosen ? rolesForSeat(chosen.role) : ROLE_OPTIONS), [chosen]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: grantsKey });
    queryClient.invalidateQueries({ queryKey: [MY_ACCESS_QUERY_KEY, selectedAccountId] });
  };
  const onError = (e) => setError(e?.message || 'That did not work.');
  const add = useMutation({
    mutationFn: () => accessApi.grant(selectedAccountId, { ...scope, user_id: form.user_id, role: form.role, modules: form.modules }),
    onSuccess: () => { setForm({ user_id: '', role: 'MEMBER', modules: ['TASKS'] }); setError(null); refresh(); },
    onError,
  });
  const update = useMutation({
    mutationFn: (/** @type {{ id: string, data: Parameters<typeof accessApi.updateGrant>[1] }} */ { id, data }) =>
      accessApi.updateGrant(id, data),
    onSuccess: () => { setError(null); refresh(); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (/** @type {string} */ id) => accessApi.removeGrant(id),
    onSuccess: () => { setError(null); refresh(); },
    onError,
  });

  const pickPerson = (userId) => {
    const member = members.find((m) => m.id === userId);
    const roles = member ? rolesForSeat(member.role) : ROLE_OPTIONS;
    const role = /** @type {import('@/api/access').GrantRole} */ (roles.some((r) => r.value === form.role) ? form.role : roles[roles.length - 1].value);
    setForm((f) => ({ ...f, user_id: userId, role }));
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#002046]">
            <Users className="w-5 h-5 text-[#c87b14]" />
            People with access to "{item.name}"
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">
          Account owners can see and change everything. Access on a portfolio or program covers everything inside it.
        </p>

        {manageable && (
          <div className="rounded-lg border border-slate-200 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={form.user_id} onValueChange={pickPerson}>
                <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Add someone from the account" /></SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 && <div className="px-2 py-1.5 text-xs text-slate-400">Everyone already has access here.</div>}
                  {candidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{displayName(m)} · {m.role.toLowerCase()} seat</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role: /** @type {import('@/api/access').GrantRole} */ (role) }))}>
                <SelectTrigger className="h-9 sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!form.user_id || add.isPending}
                onClick={() => add.mutate()}
                className="h-9 bg-[#c87b14] hover:bg-[#a86610] text-white"
              >
                {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
            {form.role === 'MEMBER' && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500">Can edit</p>
                <ModulePicker value={form.modules} onChange={(modules) => setForm((f) => ({ ...f, modules }))} />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="max-h-80 overflow-y-auto -mx-1 px-1 divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
          ) : grants.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Only account owners have access so far.</p>
          ) : (
            grants.map((grant) => {
              const editable = manageable && !grant.inherited;
              return (
                <div key={grant.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{displayName(grant.user)}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {grant.user.email}
                        {grant.inherited && ` · via ${grant.scope_type.toLowerCase()} ${grant.scope_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {editable ? (
                        <Select value={grant.role} onValueChange={(role) => update.mutate({ id: grant.id, data: { role: /** @type {import('@/api/access').GrantRole} */ (role) } })}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {rolesForSeat(grant.user.account_role).map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{grant.role.charAt(0) + grant.role.slice(1).toLowerCase()}</span>
                      )}
                      {editable && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" aria-label={`Remove ${displayName(grant.user)}`}
                          onClick={() => remove.mutate(grant.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {grant.role === 'MEMBER' && (
                    <ModulePicker
                      value={grant.modules}
                      disabled={!editable}
                      onChange={(modules) => update.mutate({ id: grant.id, data: { modules } })}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
