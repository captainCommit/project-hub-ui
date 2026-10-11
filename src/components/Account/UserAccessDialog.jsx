import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, Trash2 } from 'lucide-react';
import { accessApi } from '@/api/access';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { MY_ACCESS_QUERY_KEY } from '@/hooks/useMyAccess';
import GrantModulesEditor from '@/components/projects/GrantModulesEditor';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'VIEWER', label: 'Viewer' },
];
const RANK = { VIEWER: 1, MEMBER: 2, MANAGER: 3 };

/** Roles someone's seat allows: a grant never goes above their account role. */
const rolesForSeat = (accountRole) => ROLE_OPTIONS.filter((r) => RANK[r.value] <= (RANK[accountRole] ?? 0));
const roleLabel = (role) => role.charAt(0) + role.slice(1).toLowerCase();

export const accountGrantsQueryKey = (accountId) => ['access-grants', accountId, 'all'];

/** Everything one member can reach in the account, for owners to change. */
export default function UserAccessDialog({ open, onOpenChange, accountId, member }) {
  const queryClient = useQueryClient();
  const { portfolios, programs, projects } = useAccountHierarchy();
  const seatRoles = useMemo(() => rolesForSeat(member?.role), [member?.role]);
  const defaultRole = seatRoles.some((r) => r.value === 'MEMBER') ? 'MEMBER' : seatRoles[seatRoles.length - 1]?.value;
  const [form, setForm] = useState(
    /** @type {{ pick: string, role: string, modules: import('@/api/access').ProjectModule[], view_modules: import('@/api/access').ProjectModule[] | null }} */
    ({ pick: '', role: defaultRole, modules: ['TASKS'], view_modules: null }),
  );
  const [error, setError] = useState(null);

  const { data: allGrants = [], isLoading } = useQuery({
    queryKey: accountGrantsQueryKey(accountId),
    queryFn: () => accessApi.listGrants(accountId, {}),
    enabled: open && !!accountId,
  });
  const grants = allGrants.filter((g) => g.user.id === member?.id);
  const granted = new Set(grants.map((g) => `${g.scope_type.toLowerCase()}:${g.scope_id}`));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['access-grants', accountId] });
    queryClient.invalidateQueries({ queryKey: [MY_ACCESS_QUERY_KEY, accountId] });
  };
  const onError = (e) => setError(e?.message || 'That did not work.');
  const add = useMutation({
    mutationFn: () => {
      const [kind, id] = form.pick.split(':');
      return accessApi.grant(accountId, {
        [`${kind}_id`]: id,
        user_id: member.id,
        role: /** @type {import('@/api/access').GrantRole} */ (form.role),
        modules: form.modules,
        view_modules: form.view_modules,
      });
    },
    onSuccess: () => { setForm((f) => ({ ...f, pick: '' })); setError(null); refresh(); },
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

  if (!member) return null;
  const name = member.full_name || member.email;
  const options = [
    ...portfolios.map((p) => ({ value: `portfolio:${p.id}`, label: `Portfolio · ${p.name}` })),
    ...programs.map((p) => ({ value: `program:${p.id}`, label: `Program · ${p.name}` })),
    ...projects.map((p) => ({ value: `project:${p.id}`, label: `Project · ${p.name}` })),
  ].filter((o) => !granted.has(o.value));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#002046]">
            <KeyRound className="w-5 h-5 text-[#c87b14]" />
            Access for {name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">
          {roleLabel(member.role)} seat. Access on a portfolio or program covers everything inside it,
          and never goes above their account role.
        </p>

        <div className="rounded-lg border border-slate-200 p-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={form.pick} onValueChange={(pick) => setForm((f) => ({ ...f, pick }))}>
              <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Add a portfolio, program or project" /></SelectTrigger>
              <SelectContent>
                {options.length === 0 && <div className="px-2 py-1.5 text-xs text-slate-400">They already have access to everything.</div>}
                {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role }))}>
              <SelectTrigger className="h-9 sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {seatRoles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!form.pick || add.isPending}
              onClick={() => add.mutate()}
              className="h-9 bg-[#c87b14] hover:bg-[#a86610] text-white"
            >
              {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
          </div>
          <GrantModulesEditor
            role={form.role}
            viewModules={form.view_modules}
            modules={form.modules}
            onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="max-h-80 overflow-y-auto -mx-1 px-1 divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
          ) : grants.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No access yet. They can't see any projects.</p>
          ) : (
            grants.map((grant) => (
              <div key={grant.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{grant.scope_name}</p>
                    <p className="text-xs text-slate-400">{roleLabel(grant.scope_type)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Select value={grant.role} onValueChange={(role) => update.mutate({ id: grant.id, data: { role: /** @type {import('@/api/access').GrantRole} */ (role) } })}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {seatRoles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" aria-label={`Remove access to ${grant.scope_name}`}
                      onClick={() => remove.mutate(grant.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <GrantModulesEditor
                  role={grant.role}
                  viewModules={grant.view_modules}
                  modules={grant.modules}
                  disabled={update.isPending}
                  onChange={(next) => update.mutate({ id: grant.id, data: next })}
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
