import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, Loader2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toastError } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { aiAdminApi, formatAllowance } from '@/api/ai';

const CURRENCY = 'CAD';
const PROVIDERS = [['OPENAI', 'OpenAI'], ['ANTHROPIC', 'Anthropic'], ['GEMINI', 'Google Gemini']];
const STATUS_TONES = {
  REQUESTED: 'bg-amber-50 text-amber-700',
  ENABLED: 'bg-emerald-50 text-emerald-700',
  DISABLED: 'bg-slate-100 text-slate-600',
  DECLINED: 'bg-red-50 text-red-700',
};
const EMPTY_MODEL = { label: '', provider: 'OPENAI', model: '', input_cost_per_mtok_cents: '', output_cost_per_mtok_cents: '', margin_percent: '30', is_active: true };

const money = (cents) => new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2 }).format(cents / 100);
const dollars = (cents) => (cents == null ? '' : String(cents / 100));
const toCents = (value) => Math.round(Number(value) * 100);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

function Panel({ title, aside = null, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Labeled({ label, children, className = '' }) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function ModelForm({ initial, onDone }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial ? {
    ...initial,
    input_cost_per_mtok_cents: dollars(initial.input_cost_per_mtok_cents),
    output_cost_per_mtok_cents: dollars(initial.output_cost_per_mtok_cents),
    margin_percent: String(initial.margin_percent),
  } : EMPTY_MODEL);
  const setField = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        label: form.label.trim(),
        provider: form.provider,
        model: form.model.trim(),
        input_cost_per_mtok_cents: toCents(form.input_cost_per_mtok_cents),
        output_cost_per_mtok_cents: toCents(form.output_cost_per_mtok_cents),
        margin_percent: Number(form.margin_percent),
        is_active: form.is_active,
      };
      if (initial) {
        const { provider: _provider, ...changes } = body;
        return aiAdminApi.updateModel(initial.id, changes);
      }
      return aiAdminApi.createModel(body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ai-models'] }); onDone(); },
    onError: (e) => toastError(e?.message || 'The model could not be saved.'),
  });
  const ready = form.label.trim() && form.model.trim() && form.input_cost_per_mtok_cents !== '' && form.output_cost_per_mtok_cents !== '';

  return (
    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Labeled label="Name shown to accounts"><Input value={form.label} onChange={e => setField('label', e.target.value)} className="h-9 bg-white" /></Labeled>
        <Labeled label="Provider">
          <Select value={form.provider} onValueChange={value => setField('provider', value)} disabled={!!initial}>
            <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{PROVIDERS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Labeled>
        <Labeled label="Model name at the provider"><Input value={form.model} onChange={e => setField('model', e.target.value)} className="h-9 bg-white" /></Labeled>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Labeled label={`Input cost, ${CURRENCY} per million tokens`}>
          <Input type="number" min="0" step="0.01" value={form.input_cost_per_mtok_cents} onChange={e => setField('input_cost_per_mtok_cents', e.target.value)} className="h-9 bg-white" />
        </Labeled>
        <Labeled label={`Output cost, ${CURRENCY} per million tokens`}>
          <Input type="number" min="0" step="0.01" value={form.output_cost_per_mtok_cents} onChange={e => setField('output_cost_per_mtok_cents', e.target.value)} className="h-9 bg-white" />
        </Labeled>
        <Labeled label="Margin added, %">
          <Input type="number" min="0" step="1" value={form.margin_percent} onChange={e => setField('margin_percent', e.target.value)} className="h-9 bg-white" />
        </Labeled>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} /> Offered to accounts
        </label>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onDone} disabled={save.isPending}>Cancel</Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={!ready || save.isPending} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
          {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save model
        </Button>
      </div>
    </div>
  );
}

function ModelsPanel({ models }) {
  const [editing, setEditing] = useState(/** @type {string | null} */ (null));
  return (
    <Panel title="Models Project Hub provides" aside={
      editing !== 'new' && <Button size="sm" variant="outline" onClick={() => setEditing('new')}><Plus className="w-3.5 h-3.5 mr-1" />Add model</Button>
    }>
      <p className="px-5 pt-3 text-xs text-slate-500">
        The platform's provider keys are SSM parameters named /project-hub/&lt;stage&gt;/ai/&lt;provider&gt;-api-key, never stored here.
        Accounts pay the cost plus the margin, after their free allowance.
      </p>
      {models.length === 0 && editing !== 'new' && <p className="px-5 py-4 text-sm text-slate-500">No models yet.</p>}
      <div className="divide-y divide-slate-100 mt-2">
        {models.map(model => editing === model.id ? (
          <ModelForm key={model.id} initial={model} onDone={() => setEditing(null)} />
        ) : (
          <div key={model.id} className="px-5 py-3 flex items-center gap-4 text-sm">
            <div className="flex-1 min-w-0">
              <p className={cn('font-medium', model.is_active ? 'text-slate-800' : 'text-slate-400')}>
                {model.label}{!model.is_active && ' (not offered)'}
              </p>
              <p className="text-xs text-slate-500">
                {PROVIDERS.find(([value]) => value === model.provider)?.[1]} · {model.model} · in {money(model.input_cost_per_mtok_cents)} / out {money(model.output_cost_per_mtok_cents)} per M tokens · +{model.margin_percent}%
              </p>
            </div>
            {!model.key_configured && (
              <span className="text-xs text-amber-700 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />No key</span>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(model.id)}><Pencil className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>
      {editing === 'new' && <ModelForm initial={null} onDone={() => setEditing(null)} />}
    </Panel>
  );
}

function AccountTerms({ row, models, onDone }) {
  const queryClient = useQueryClient();
  const activeModels = models.filter(m => m.is_active);
  const [form, setForm] = useState({
    platform_model_id: row.platform_model_id || activeModels[0]?.id || '',
    allowance_kind: row.allowance_kind,
    allowance_amount: row.allowance_kind === 'CREDIT' ? dollars(row.allowance_amount) : String(row.allowance_amount),
    cap: dollars(row.monthly_cap_cents),
  });
  const setField = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const decide = useMutation({
    mutationFn: (/** @type {'ENABLED' | 'DISABLED' | 'DECLINED'} */ status) => aiAdminApi.decide(row.account_id, {
      status,
      platform_model_id: form.platform_model_id || null,
      allowance_kind: form.allowance_kind,
      allowance_amount: form.allowance_kind === 'CREDIT' ? toCents(form.allowance_amount || 0) : Math.round(Number(form.allowance_amount || 0)),
      ...(form.cap === '' ? { clear_cap: true } : { monthly_cap_cents: toCents(form.cap) }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ai-accounts'] }); onDone(); },
    onError: (e) => toastError(e?.message || 'That did not work.'),
  });
  const enabled = row.status === 'ENABLED';

  return (
    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
      <div className="grid sm:grid-cols-4 gap-3">
        <Labeled label="Model">
          <Select value={form.platform_model_id} onValueChange={value => setField('platform_model_id', value)}>
            <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Pick a model" /></SelectTrigger>
            <SelectContent>{activeModels.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </Labeled>
        <Labeled label="Free each month">
          <Select value={form.allowance_kind} onValueChange={value => setField('allowance_kind', value)}>
            <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TOKENS">Tokens</SelectItem>
              <SelectItem value="CREDIT">Credit ({CURRENCY})</SelectItem>
            </SelectContent>
          </Select>
        </Labeled>
        <Labeled label={form.allowance_kind === 'CREDIT' ? `Amount, ${CURRENCY}` : 'Tokens'}>
          <Input type="number" min="0" value={form.allowance_amount} onChange={e => setField('allowance_amount', e.target.value)} className="h-9 bg-white" />
        </Labeled>
        <Labeled label={`Monthly cap, ${CURRENCY} (empty: none)`}>
          <Input type="number" min="0" step="0.01" value={form.cap} onChange={e => setField('cap', e.target.value)} className="h-9 bg-white" />
        </Labeled>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500 flex-1 min-w-[12rem]">Past the allowance, usage is invoiced only when the account has a live subscription; otherwise it pauses.</p>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={decide.isPending}>Cancel</Button>
        {row.status === 'REQUESTED' && (
          <Button size="sm" variant="outline" className="text-red-600" disabled={decide.isPending} onClick={() => decide.mutate('DECLINED')}>Decline</Button>
        )}
        {enabled && (
          <Button size="sm" variant="outline" className="text-red-600" disabled={decide.isPending} onClick={() => decide.mutate('DISABLED')}>Switch off</Button>
        )}
        <Button size="sm" disabled={decide.isPending || !form.platform_model_id} onClick={() => decide.mutate('ENABLED')} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
          {decide.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}{enabled ? 'Save terms' : 'Switch on'}
        </Button>
      </div>
    </div>
  );
}

function AccountsPanel({ accounts, models }) {
  const [open, setOpen] = useState(/** @type {string | null} */ (null));
  return (
    <Panel title="Accounts">
      {accounts.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">No account has asked for a Project Hub model yet.</p>}
      <div className="divide-y divide-slate-100">
        {accounts.map(row => (
          <div key={row.account_id}>
            <div className="px-5 py-3 flex items-center gap-4 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{row.account_name}</p>
                <p className="text-xs text-slate-500">
                  {row.status === 'REQUESTED'
                    ? `Requested ${formatDate(row.requested_at)}${row.requested_by_email ? ` by ${row.requested_by_email}` : ''}`
                    : `${row.model_label || 'No model'} · ${formatAllowance(row.allowance_kind, row.allowance_amount, CURRENCY)} free${row.monthly_cap_cents != null ? ` · cap ${money(row.monthly_cap_cents)}` : ''}`}
                  {row.has_own_key && ' · uses its own key'}
                </p>
              </div>
              {row.status === 'ENABLED' && (
                <div className="text-right text-xs text-slate-500 tabular-nums">
                  <p>{new Intl.NumberFormat().format(row.usage.tokens)} tokens this month</p>
                  <p className="font-medium text-slate-700">{money(row.usage.billable_cents)} billable{row.usage.limit_reached ? ' · paused' : ''}</p>
                </div>
              )}
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_TONES[row.status])}>{row.status.charAt(0) + row.status.slice(1).toLowerCase()}</span>
              <Button size="sm" variant={row.status === 'REQUESTED' ? 'default' : 'ghost'}
                className={row.status === 'REQUESTED' ? 'bg-[#c87b14] hover:bg-[#a86610] text-white' : ''}
                onClick={() => setOpen(open === row.account_id ? null : row.account_id)}>
                {row.status === 'REQUESTED' ? <><Check className="w-3.5 h-3.5 mr-1" />Review</> : <Pencil className="w-3.5 h-3.5" />}
              </Button>
            </div>
            {open === row.account_id && <AccountTerms row={row} models={models} onDone={() => setOpen(null)} />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Which accounts have AI at all. Owners request it from Account > Connected apps; requests are listed first. */
function FeaturePanel({ accounts }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: ({ accountId, enabled }) => aiAdminApi.setFeature(accountId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ai-feature'] }),
    onError: (error) => toastError(error?.message || 'AI could not be switched.'),
  });
  const waiting = accounts.filter(a => a.requested_at && !a.enabled).length;
  return (
    <Panel title="AI access" aside={waiting > 0 && <span className="text-xs font-medium text-amber-700">{waiting} waiting</span>}>
      <p className="px-5 pt-3 text-xs text-slate-500">
        Accounts with AI off have no Ask Compass, reports or AI assistant tab. Owners can ask for it from Account &gt; Connected apps.
      </p>
      <div className="divide-y divide-slate-100 mt-2">
        {accounts.map(row => (
          <div key={row.account_id} className="px-5 py-3 flex items-center gap-4 text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{row.account_name}</p>
              {row.requested_at && !row.enabled && (
                <p className="text-xs text-amber-700">
                  Requested {formatDate(row.requested_at)}{row.requested_by_email ? ` by ${row.requested_by_email}` : ''}
                </p>
              )}
            </div>
            <span className={cn('text-xs font-medium', row.enabled ? 'text-emerald-700' : 'text-slate-500')}>{row.enabled ? 'On' : 'Off'}</span>
            <Switch checked={row.enabled} disabled={toggle.isPending} aria-label={`AI for ${row.account_name}`}
              onCheckedChange={(enabled) => toggle.mutate({ accountId: row.account_id, enabled })} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Platform admins: which accounts have AI, the models Project Hub provides, and which accounts use them on what terms. */
export default function PlatformAiAdmin() {
  const feature = useQuery({ queryKey: ['admin-ai-feature'], queryFn: aiAdminApi.featureAccounts });
  const models = useQuery({ queryKey: ['admin-ai-models'], queryFn: aiAdminApi.models });
  const accounts = useQuery({ queryKey: ['admin-ai-accounts'], queryFn: aiAdminApi.accounts });
  if (feature.isLoading || models.isLoading || accounts.isLoading) {
    return <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  }
  if (feature.error || models.error || accounts.error) {
    return <p className="text-sm text-red-600">{(feature.error || models.error || accounts.error)?.message || 'AI settings could not load.'}</p>;
  }
  return (
    <div className="space-y-6 max-w-4xl">
      <FeaturePanel accounts={feature.data || []} />
      <AccountsPanel accounts={accounts.data || []} models={models.data || []} />
      <ModelsPanel models={models.data || []} />
    </div>
  );
}
