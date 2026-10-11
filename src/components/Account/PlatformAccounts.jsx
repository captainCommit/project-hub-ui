import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, ChevronRight, Loader2, Plus } from 'lucide-react';
import { accountsApi } from '@/api/accounts';
import { useAuth } from '@/lib/AuthContext';
import AccountUsers from '@/components/Account/AccountUsers';

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EMPTY_FORM = { name: '', slug: '', admin_email: '', admin_full_name: '' };

/** Platform admins: every account, creating an account with its first admin, and managing any account's users. */
export default function PlatformAccounts() {
  const queryClient = useQueryClient();
  const { user, refreshAccounts } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [notice, setNotice] = useState(null);
  const [openAccount, setOpenAccount] = useState(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['platform-accounts'],
    queryFn: () => accountsApi.listAllAccounts(),
  });

  const create = useMutation({
    mutationFn: () => accountsApi.create({
      name: form.name.trim(),
      slug: form.slug,
      admin_email: form.admin_email.trim() || null,
      admin_full_name: form.admin_full_name.trim() || null,
    }),
    onSuccess: async (/** @type {any} */ created) => {
      setNotice({
        ok: true,
        text: form.admin_email.trim()
          ? `${created.name} was created. ${form.admin_email.trim()} will get an email invite as its owner.`
          : `${created.name} was created with you as its owner.`,
      });
      setForm(EMPTY_FORM);
      setSlugEdited(false);
      queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
      // You may now be a member of the new account (no admin email, or your own).
      await refreshAccounts(user).catch(() => {});
    },
    onError: (error) => setNotice({ ok: false, text: error.message || 'Could not create the account.' }),
  });

  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }));
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && form.slug && !create.isPending;

  if (openAccount) {
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenAccount(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> All accounts
        </button>
        <h2 className="text-lg font-semibold text-slate-800">{openAccount.name}</h2>
        <AccountUsers accountId={openAccount.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Account</p>
        </div>
        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) create.mutate();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Account Name</Label>
              <Input required value={form.name} onChange={(e) => setName(e.target.value)} className="h-9" placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Slug</Label>
              <Input
                required
                value={form.slug}
                onChange={(e) => { setSlugEdited(true); setField('slug', slugify(e.target.value)); }}
                className="h-9"
                placeholder="acme-corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Owner Email</Label>
              <Input type="email" value={form.admin_email} onChange={(e) => setField('admin_email', e.target.value)} className="h-9" placeholder="Leave empty to own it yourself" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Owner Name</Label>
              <Input value={form.admin_full_name} onChange={(e) => setField('admin_full_name', e.target.value)} className="h-9" placeholder="Optional" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={!canSubmit} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
              {create.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {create.isPending ? 'Creating…' : 'Create Account'}
            </Button>
            {notice && <span className={notice.ok ? 'text-xs text-emerald-600 font-medium' : 'text-xs text-red-600 font-medium'}>{notice.text}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All Accounts</p>
          <p className="text-xs text-slate-400">{accounts.length}</p>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <button key={a.id} onClick={() => setOpenAccount(a)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {a.admins.length ? a.admins.map((admin) => admin.full_name || admin.email).join(', ') : 'No owner yet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
                  {a.member_count} {a.member_count === 1 ? 'user' : 'users'}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
