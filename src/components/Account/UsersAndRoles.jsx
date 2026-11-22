import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, Crown, Eye, FileUp, FolderKanban, Info, KeyRound, Layers, Loader2, MoreHorizontal, Plus, RotateCcw,
  Search, Send, ShieldCheck, Trash2, UserCog, Users as UsersIcon, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { toast, toastError } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { accountsApi } from '@/api/accounts';
import { accessApi } from '@/api/access';
import { ROLE_ACTIONS, ROLE_AREAS, rolesApi, rolesQueryKey } from '@/api/roles';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { MY_ACCESS_QUERY_KEY } from '@/hooks/useMyAccess';
import UserCsvImport from '@/components/Account/UserCsvImport';
import { accountMembersQueryKey } from '@/components/Account/AccountUsers';

const NAVY = '#002046';
const MUTED = '#6B7C99';
const ORANGE = '#E8711A';

const ROLE_ICONS = { OWNER: Crown, PORTFOLIO_MANAGER: Briefcase, PROGRAM_MANAGER: Layers, PROJECT_MANAGER: FolderKanban, CONTRIBUTOR: UserCog, VIEWER: Eye };
const AVATAR_COLORS = ['#DBEAFE', '#FEF3C7', '#DCFCE7', '#FCE7F3', '#EDE9FE', '#CCFBF1', '#FEE2E2'];
const STATUS_OPTIONS = [{ value: 'ACTIVE', label: 'Active' }, { value: 'INVITED', label: 'Invited' }];

const nameOf = (m) => m.full_name || [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email;
const initials = (m) => nameOf(m).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
const avatarColor = (id) => AVATAR_COLORS[[...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function Card({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col min-w-0">
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-slate-100">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-7 h-7 flex-shrink-0 mt-0.5" style={{ color: NAVY }} />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight" style={{ color: NAVY }}>{title}</p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function OrangeButton({ children, ...props }) {
  return (
    <Button size="sm" className="h-9 gap-1.5 text-white border-0 hover:opacity-90 flex-shrink-0" style={{ backgroundColor: ORANGE }} {...props}>
      {children}
    </Button>
  );
}

function StatusPill({ member }) {
  const invited = !member.has_signed_in;
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={invited ? { backgroundColor: '#FEF3C7', color: '#B45309' } : { backgroundColor: '#DCFCE7', color: '#15803D' }}>
      {invited ? 'Invited' : 'Active'}
    </span>
  );
}

// Add User

const EMPTY_INVITE = { first_name: '', last_name: '', email: '', title: '', department: '', role_id: '' };

function AddUserDialog({ open, onOpenChange, accountId, roles }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_INVITE);
  useEffect(() => { if (open) setForm(EMPTY_INVITE); }, [open]);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const complete = Object.values(form).every(v => String(v).trim()) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());

  const invite = useMutation({
    mutationFn: () => accountsApi.inviteUser(accountId, { ...form, email: form.email.trim(), update_existing: false }),
    onSuccess: (/** @type {any} */ result) => {
      queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(accountId) });
      if (result?.status === 'ALREADY_EXISTS') {
        toast({ title: 'Already a member', description: `${result.email} is already in this account. Change their role in the table.` });
      } else {
        toast({ title: 'Invitation sent', description: `${form.first_name} ${form.last_name} will get an email to join.` });
      }
      onOpenChange(false);
    },
    onError: (error) => toastError(error.message || 'The invitation could not be sent.'),
  });

  const field = (key, label, placeholder, type = 'text') => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold" style={{ color: NAVY }}>{label} <span className="text-red-500">*</span></Label>
      <Input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} className="h-9" maxLength={255} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>Add User</DialogTitle>
          <p className="text-xs" style={{ color: MUTED }}>Invite a new user to Row and set their job title and access role.</p>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (complete && !invite.isPending) invite.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            {field('first_name', 'First Name', 'Enter first name')}
            {field('last_name', 'Last Name', 'Enter last name')}
          </div>
          {field('email', 'Email', 'name@company.com', 'email')}
          {field('title', 'Job Title', 'Enter job title')}
          {field('department', 'Department', 'Enter department')}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: NAVY }}>Access Role <span className="text-red-500">*</span></Label>
            <Select value={form.role_id} onValueChange={(role_id) => setForm(f => ({ ...f, role_id }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select an access role" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: '#F1F5F9', color: '#334155' }}>
            <Info className="w-4 h-4 flex-shrink-0 mt-px" style={{ color: MUTED }} />
            <span><strong>Job Title</strong> describes the person&apos;s position (e.g., Business Analyst, Project Manager) and is used for resource planning. <strong>Access Role</strong> determines what the user can see and do in Row (e.g., Contributor, Project Manager).</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={invite.isPending}>Cancel</Button>
            <Button type="submit" className="gap-1.5 text-white border-0" style={{ backgroundColor: ORANGE }} disabled={!complete || invite.isPending}>
              {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Assignments: where someone with an "Assigned projects only" role works.

function AssignmentsDialog({ member, accountId, role, onOpenChange }) {
  const queryClient = useQueryClient();
  const { portfolios, programs, projects } = useAccountHierarchy();
  const [pick, setPick] = useState('');
  const { data: allGrants = [], isLoading } = useQuery({
    queryKey: ['access-grants', accountId, 'all'],
    queryFn: () => accessApi.listGrants(accountId, {}),
    enabled: !!member,
  });
  const grants = allGrants.filter(g => g.user.id === member?.id);
  const taken = new Set(grants.map(g => `${g.scope_type.toLowerCase()}:${g.scope_id}`));
  const options = [
    ...portfolios.map(p => ({ value: `portfolio:${p.id}`, label: `Portfolio · ${p.name}` })),
    ...programs.map(p => ({ value: `program:${p.id}`, label: `Program · ${p.name}` })),
    ...projects.map(p => ({ value: `project:${p.id}`, label: `Project · ${p.name}` })),
  ].filter(o => !taken.has(o.value));
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['access-grants', accountId] });
    queryClient.invalidateQueries({ queryKey: [MY_ACCESS_QUERY_KEY, accountId] });
  };
  const add = useMutation({
    mutationFn: () => {
      const [kind, id] = pick.split(':');
      // The grant's role is no longer used for permissions; the account role decides.
      return accessApi.grant(accountId, { [`${kind}_id`]: id, user_id: member.id, role: 'MEMBER' });
    },
    onSuccess: () => { setPick(''); refresh(); },
    onError: (error) => toastError(error.message || 'That could not be added.'),
  });
  const remove = useMutation({
    mutationFn: (id) => accessApi.removeGrant(id),
    onSuccess: refresh,
    onError: (error) => toastError(error.message || 'That could not be removed.'),
  });

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>Assignments · {member ? nameOf(member) : ''}</DialogTitle>
          <p className="text-xs" style={{ color: MUTED }}>
            {role?.scope === 'ALL'
              ? `Their role (${role.name}) already reaches every project. Assignments matter only for "Assigned projects only" roles.`
              : 'They can reach these, and everything inside them, plus any project they are allocated to in Resources → Capacity. What they can do there comes from their role.'}
          </p>
        </DialogHeader>
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Add a portfolio, program or project" /></SelectTrigger>
            <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="h-9 text-white" style={{ backgroundColor: NAVY }} disabled={!pick || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </Button>
        </div>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {isLoading && <p className="px-3 py-4 text-sm text-center" style={{ color: MUTED }}>Loading…</p>}
          {!isLoading && grants.length === 0 && <p className="px-3 py-4 text-sm text-center" style={{ color: MUTED }}>Not assigned to anything yet.</p>}
          {grants.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: NAVY }}>{g.scope_name}</p>
                <p className="text-xs capitalize" style={{ color: MUTED }}>{g.scope_type.toLowerCase()}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" aria-label={`Remove ${g.scope_name}`}
                disabled={remove.isPending} onClick={() => remove.mutate(g.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Users

function UsersPanel({ accountId, roles, isOwner, onAdd }) {
  const queryClient = useQueryClient();
  const { user, refreshAccounts } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assigning, setAssigning] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: accountMembersQueryKey(accountId),
    queryFn: () => accountsApi.listMembers(accountId),
    enabled: !!accountId,
  });
  const roleById = useMemo(() => Object.fromEntries(roles.map(r => [r.id, r])), [roles]);

  const afterChange = (member) => {
    queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: rolesQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    queryClient.invalidateQueries({ queryKey: [MY_ACCESS_QUERY_KEY, accountId] });
    if (member.id === user?.id) refreshAccounts(user);
  };
  const changeRole = useMutation({
    mutationFn: ({ member, roleId }) => accountsApi.changeUserAccountRole(accountId, member.id, roleId),
    onSuccess: (_r, { member, roleId }) => { toast({ title: 'Role changed', description: `${nameOf(member)} is now ${roleById[roleId]?.name}.` }); afterChange(member); },
    onError: (error) => toastError(error.message || 'The role could not be changed.'),
  });
  const removeUser = useMutation({
    mutationFn: (member) => accountsApi.removeUser(accountId, member.id),
    onSuccess: (_r, member) => { toast({ title: 'User removed', description: `${nameOf(member)} no longer has access to this account.` }); afterChange(member); },
    onError: (error) => toastError(error.message || 'The user could not be removed.'),
  });

  const pickRole = async (member, roleId) => {
    if (roleId === member.role_id) return;
    const next = roleById[roleId];
    const self = member.id === user?.id;
    const ok = await confirmAction({
      title: 'Change role?',
      description: `${self ? 'Your' : `${nameOf(member)}'s`} role will change to ${next?.name}. ${
        member.role === 'OWNER' && next?.key !== 'OWNER'
          ? (self ? "You'll lose owner rights (users, settings and billing) straight away." : "They'll lose owner rights (users, settings and billing).")
          : 'What they can see and do changes straight away.'}`,
      confirmLabel: 'Change role',
      destructive: false,
    });
    if (ok) changeRole.mutate({ member, roleId });
  };
  const confirmRemove = async (member) => {
    const ok = await confirmAction({
      title: `Remove ${nameOf(member)}?`,
      description: member.id === user?.id
        ? "You'll lose access to this account straight away."
        : 'They lose access to this account and everything in it. Their past work stays. You can add them again later.',
      confirmLabel: 'Remove',
    });
    if (ok) removeUser.mutate(member);
  };

  const term = search.trim().toLowerCase();
  const shown = members
    .filter(m => statusFilter === 'ALL' || (statusFilter === 'INVITED') === !m.has_signed_in)
    .filter(m => !term || [nameOf(m), m.email, m.role_name, m.title].some(v => (v || '').toLowerCase().includes(term)))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  return (
    <Card icon={UsersIcon} title="Users" subtitle="Invite users, assign roles, and manage access."
      action={isOwner && <OrangeButton onClick={onAdd}><Plus className="w-4 h-4" /> Add User</OrangeButton>}>
      <div className="p-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="h-9 pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {isOwner && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" /> Import CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs border-y border-slate-100" style={{ color: MUTED }}>
              <th className="px-4 py-2 font-semibold">User</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">Role</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: MUTED }}>Loading…</td></tr>}
            {!isLoading && shown.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: MUTED }}>No users match.</td></tr>}
            {shown.map(m => {
              const isOwnerRow = roleById[m.role_id]?.key === 'OWNER';
              return (
                <tr key={m.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: avatarColor(m.id), color: NAVY }}>{initials(m)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate" style={{ color: NAVY }}>
                          {nameOf(m)}{m.id === user?.id && <span className="ml-1 text-xs font-normal" style={{ color: MUTED }}>(you)</span>}
                        </p>
                        <p className="text-xs truncate" style={{ color: MUTED }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5"><StatusPill member={m} /></td>
                  <td className="px-2 py-2.5">
                    {isOwner ? (
                      <Select value={m.role_id || ''} onValueChange={(roleId) => pickRole(m, roleId)} disabled={changeRole.isPending}>
                        <SelectTrigger className="h-8 w-[160px] text-xs" aria-label={`Role for ${nameOf(m)}`}><SelectValue placeholder="No role" /></SelectTrigger>
                        <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <span className="text-xs" style={{ color: NAVY }}>{m.role_name || '—'}</span>}
                  </td>
                  <td className="px-2 py-2.5">
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="p-1.5 rounded hover:bg-slate-100" aria-label={`More for ${nameOf(m)}`}>
                            <MoreHorizontal className="w-4 h-4" style={{ color: NAVY }} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={isOwnerRow} onClick={() => setAssigning(m)}>
                            <KeyRound className="w-4 h-4 mr-2" /> Assignments
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmRemove(m)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Remove user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-auto px-4 py-3 border-t border-slate-100 flex items-center gap-2 text-xs" style={{ color: MUTED }}>
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>Project assignments and allocation hours are managed in <Link to="/ResourceManagementHub" className="underline" style={{ color: NAVY }}>Resources → Capacity</Link>.</span>
      </div>

      <AssignmentsDialog member={assigning} accountId={accountId} role={assigning ? roleById[assigning.role_id] : null}
        onOpenChange={(open) => !open && setAssigning(null)} />
      <UserCsvImport open={importOpen} onOpenChange={setImportOpen} accountId={accountId}
        onDone={() => queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) })} />
    </Card>
  );
}

// Roles & Permissions

const NEW_ROLE = '__new';
const blankPermissions = () => Object.fromEntries(ROLE_AREAS.map(a => [a.key, []]));

function RolesPanel({ accountId, roles, isOwner, isLoading }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const selected = selectedId === NEW_ROLE ? null : roles.find(r => r.id === selectedId) || roles.find(r => r.key === 'PROJECT_MANAGER') || roles[0];

  // Start a draft from the selected role whenever another role is picked (or the role reloads).
  useEffect(() => {
    if (selectedId === NEW_ROLE) return;
    if (selected) setDraft({ name: selected.name, description: selected.description || '', permissions: selected.permissions, scope: selected.scope });
  }, [selected?.id, selected?.permissions, selected?.scope, selected?.name, selected?.description, selectedId]);

  const editable = isOwner && (selectedId === NEW_ROLE || selected?.editable);
  const dirty = draft && (selectedId === NEW_ROLE || (selected && (
    JSON.stringify(draft.permissions) !== JSON.stringify(selected.permissions) || draft.scope !== selected.scope
    || draft.name !== selected.name || (draft.description || '') !== (selected.description || ''))));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: rolesQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: accountMembersQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: [MY_ACCESS_QUERY_KEY, accountId] });
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { name: draft.name.trim(), description: draft.description || null, permissions: draft.permissions, scope: draft.scope };
      return selectedId === NEW_ROLE ? rolesApi.create(accountId, body) : rolesApi.update(selected.id, body);
    },
    onSuccess: (/** @type {any} */ role) => {
      toast({ title: selectedId === NEW_ROLE ? 'Role added' : 'Role saved', description: `${role.name} costs a ${role.seat === 'VIEWER' ? 'viewer' : 'full'} seat.` });
      setSelectedId(role.id);
      refresh();
    },
    onError: (error) => toastError(error.message || 'The role could not be saved.'),
  });
  const reset = useMutation({
    mutationFn: () => rolesApi.reset(selected.id),
    onSuccess: () => { toast({ title: 'Role reset', description: `${selected.name} is back to its default rights.` }); refresh(); },
    onError: (error) => toastError(error.message || 'The role could not be reset.'),
  });
  const remove = useMutation({
    mutationFn: () => rolesApi.remove(selected.id),
    onSuccess: () => { toast({ title: 'Role deleted' }); setSelectedId(null); refresh(); },
    onError: (error) => toastError(error.message || 'The role could not be deleted.'),
  });

  const toggle = (area, action, on) => setDraft(d => {
    let actions = new Set(d.permissions[area] || []);
    if (on) { actions.add(action); actions.add('VIEW'); } else if (action === 'VIEW') actions = new Set(); else actions.delete(action);
    return { ...d, permissions: { ...d.permissions, [area]: ROLE_ACTIONS.map(a => a.key).filter(k => actions.has(k)) } };
  });

  const startNew = () => { setSelectedId(NEW_ROLE); setDraft({ name: '', description: '', permissions: blankPermissions(), scope: 'ASSIGNED' }); };
  const current = selectedId === NEW_ROLE ? { name: 'New role', key: null } : selected;
  const RoleIcon = (current && ROLE_ICONS[current.key]) || UserCog;

  return (
    <Card icon={ShieldCheck} title="Roles & Permissions" subtitle="Define what each role can do and how they can access projects."
      action={isOwner && <OrangeButton onClick={startNew}><Plus className="w-4 h-4" /> Add Role</OrangeButton>}>
      <div className="flex flex-col md:flex-row min-h-0 flex-1">
        <div className="md:w-[190px] flex-shrink-0 p-3 md:border-r border-b md:border-b-0 border-slate-100">
          <p className="text-xs font-semibold px-2 mb-2" style={{ color: NAVY }}>Roles ({roles.length})</p>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin mx-2" />}
          <div className="space-y-1">
            {roles.map(r => {
              const Icon = ROLE_ICONS[r.key] || UserCog;
              const active = selectedId !== NEW_ROLE && selected?.id === r.id;
              return (
                <button key={r.id} type="button" onClick={() => setSelectedId(r.id)}
                  className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm border transition-colors',
                    active ? 'border-[#1D4ED8] bg-blue-50 font-semibold' : 'border-transparent hover:bg-slate-50')} style={{ color: NAVY }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1">{r.name}</span>
                  <span className="text-[10px]" style={{ color: MUTED }}>{r.member_count}</span>
                </button>
              );
            })}
            {selectedId === NEW_ROLE && (
              <div className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm border border-[#1D4ED8] bg-blue-50 font-semibold" style={{ color: NAVY }}>
                <UserCog className="w-4 h-4" /> New role
              </div>
            )}
          </div>
        </div>

        {draft && current && (
          <div className="flex-1 min-w-0 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <RoleIcon className="w-5 h-5 flex-shrink-0" style={{ color: NAVY }} />
                {editable && (selectedId === NEW_ROLE || !selected?.is_system) ? (
                  <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Role name"
                    className="h-8 font-semibold max-w-[220px]" maxLength={100} />
                ) : <p className="font-bold truncate" style={{ color: NAVY }}>{current.name}</p>}
              </div>
              {editable && (
                <div className="flex items-center gap-2">
                  {selected?.is_system && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={selected.is_default || reset.isPending}
                      onClick={async () => { if (await confirmAction({ title: `Reset ${selected.name}?`, description: 'Its rights and scope go back to the defaults.', confirmLabel: 'Reset to default', destructive: false })) reset.mutate(); }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Reset to default
                    </Button>
                  )}
                  {selectedId !== NEW_ROLE && !selected?.is_system && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-red-600" disabled={remove.isPending}
                      onClick={async () => { if (await confirmAction({ title: `Delete ${selected.name}?`, description: 'Only roles nobody holds can be deleted.' })) remove.mutate(); }}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  )}
                  <Button size="sm" className="h-8 text-white" style={{ backgroundColor: NAVY }}
                    disabled={!dirty || !draft.name.trim() || save.isPending} onClick={() => save.mutate()}>
                    {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Save Changes
                  </Button>
                </div>
              )}
            </div>
            {editable ? (
              <Textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="What this role is for" className="text-xs min-h-[48px]" maxLength={500} />
            ) : (
              <p className="text-xs" style={{ color: MUTED }}>
                {draft.description}{selected?.key === 'OWNER' && ' The Owner role always has every right and can\'t be changed.'}
              </p>
            )}

            <div>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>Permissions</p>
              <p className="text-xs mb-2" style={{ color: MUTED }}>Set what this role can do in each area of Row.</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs min-w-[380px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200" style={{ color: NAVY }}>
                      <th className="text-left px-3 py-2 font-semibold">Area</th>
                      {ROLE_ACTIONS.map(a => <th key={a.key} className="px-1.5 py-2 font-semibold text-center">{a.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLE_AREAS.map(area => (
                      <tr key={area.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-1.5" style={{ color: NAVY }}>{area.label}</td>
                        {ROLE_ACTIONS.map(action => {
                          const checked = (draft.permissions[area.key] || []).includes(action.key);
                          return (
                            <td key={action.key} className="px-1.5 py-1.5 text-center">
                              <Checkbox checked={checked} disabled={!editable} aria-label={`${area.label}: ${action.label}`}
                                onCheckedChange={(on) => toggle(area.key, action.key, !!on)} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
                Tasks are part of Projects: Projects &gt; Edit lets someone add, change and remove tasks. Approve covers approval statuses (Approved, Validated, Implemented, Passed).
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold flex items-center gap-1" style={{ color: NAVY }}>
                Access Scope
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="w-3.5 h-3.5 cursor-help" style={{ color: MUTED }} /></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">Assigned means an assignment on the project, its program or its portfolio, or a resource allocation to the project.</TooltipContent>
                </Tooltip></TooltipProvider>
              </p>
              <p className="text-xs mb-2" style={{ color: MUTED }}>Choose which projects this role can access.</p>
              {[
                { value: 'ASSIGNED', title: 'Assigned projects only', text: 'Users can access only the projects they are assigned to. Access to programs and portfolios depends on the permissions selected above.' },
                { value: 'ALL', title: 'All projects', text: 'Users can access all projects across the organization. Access to programs and portfolios depends on the permissions selected above.' },
              ].map(option => (
                <label key={option.value} className={cn('flex items-start gap-2.5 py-1.5', editable ? 'cursor-pointer' : 'cursor-default')}>
                  <input type="radio" name="role-scope" className="mt-1 accent-[#002046]" checked={draft.scope === option.value} disabled={!editable}
                    onChange={() => setDraft(d => ({ ...d, scope: option.value }))} />
                  <span>
                    <span className="block text-sm font-medium" style={{ color: NAVY }}>{option.title}</span>
                    <span className="block text-xs" style={{ color: MUTED }}>{option.text}</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedId !== NEW_ROLE && selected && (
              <p className="text-xs" style={{ color: MUTED }}>
                {selected.member_count} {selected.member_count === 1 ? 'person has' : 'people have'} this role · {selected.seat === 'VIEWER' ? 'Viewer seat ($10)' : 'Full seat ($20)'}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Account > Users & Roles: the account's users (with their role) beside the roles and what each can do. */
export default function UsersAndRoles({ accountId }) {
  const { selectedAccount } = useAuth();
  const isOwner = selectedAccount?.role === 'OWNER';
  const [adding, setAdding] = useState(false);
  const { data: roles = [], isLoading } = useQuery({
    queryKey: rolesQueryKey(accountId),
    queryFn: () => rolesApi.list(accountId),
    enabled: !!accountId,
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
      <UsersPanel accountId={accountId} roles={roles} isOwner={isOwner} onAdd={() => setAdding(true)} />
      <RolesPanel accountId={accountId} roles={roles} isOwner={isOwner} isLoading={isLoading} />
      <AddUserDialog open={adding} onOpenChange={setAdding} accountId={accountId} roles={roles} />
    </div>
  );
}
