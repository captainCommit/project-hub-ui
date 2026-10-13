import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Info, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toastError } from '@/components/ui/use-toast';
import { AI_PROVIDERS, aiSettingsApi } from '@/api/ai';

const RETENTION_OPTIONS = [30, 60, 90, 180, 365, 730];
const EMPTY_FORM = { provider: 'OPENAI', model: '', api_key: '', base_url: '', azure_api_version: '', accept_data_notice: false };

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#c87b14]" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint = null, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function KeyForm({ accountId, onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const provider = AI_PROVIDERS.find(p => p.value === form.provider) || AI_PROVIDERS[0];
  const setField = (field, value) => { setError(null); setForm(current => ({ ...current, [field]: value })); };

  const save = useMutation({
    mutationFn: () => aiSettingsApi.saveKey(accountId, {
      provider: form.provider,
      model: form.model.trim(),
      api_key: form.api_key.trim(),
      base_url: provider.needsEndpoint ? form.base_url.trim() : null,
      azure_api_version: form.provider === 'AZURE_OPENAI' ? (form.azure_api_version.trim() || null) : null,
      accept_data_notice: form.accept_data_notice,
    }),
    onSuccess: onSaved,
    onError: (e) => setError(e?.message || 'The key could not be saved.'),
  });

  const ready = form.model.trim() && (form.api_key.trim() || provider.keyOptional)
    && (!provider.needsEndpoint || form.base_url.trim()) && form.accept_data_notice;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Provider">
          <Select value={form.provider} onValueChange={value => setField('provider', value)}>
            <SelectTrigger className="h-9" aria-label="Provider"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={form.provider === 'AZURE_OPENAI' ? 'Deployment name' : 'Model'} hint={provider.modelHint}>
          <Input value={form.model} onChange={e => setField('model', e.target.value)} className="h-9" autoComplete="off" />
        </Field>
      </div>
      {provider.needsEndpoint && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.provider === 'AZURE_OPENAI' ? 'Resource endpoint' : 'Base URL'}
            hint={form.provider === 'AZURE_OPENAI' ? 'For example https://your-resource.openai.azure.com' : 'The URL before /chat/completions, for example https://openrouter.ai/api/v1'}
          >
            <Input value={form.base_url} onChange={e => setField('base_url', e.target.value)} className="h-9" placeholder="https://" autoComplete="off" />
          </Field>
          {form.provider === 'AZURE_OPENAI' && (
            <Field label="API version" hint="Leave empty for 2024-10-21.">
              <Input value={form.azure_api_version} onChange={e => setField('azure_api_version', e.target.value)} className="h-9" autoComplete="off" />
            </Field>
          )}
        </div>
      )}
      <Field
        label={provider.keyOptional ? 'API key (optional)' : 'API key'}
        hint={form.provider === 'OPENAI' ? 'An API key from platform.openai.com. A ChatGPT subscription does not include one.' : 'Stored encrypted. Nobody can see it again after you save it.'}
      >
        <Input type="password" value={form.api_key} onChange={e => setField('api_key', e.target.value)} className="h-9" autoComplete="new-password" />
      </Field>
      <label className="flex gap-2.5 items-start rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 cursor-pointer">
        <Checkbox checked={form.accept_data_notice} onCheckedChange={value => setField('accept_data_notice', value === true)} className="mt-0.5" />
        <span>
          To answer a question, the assistant sends the project data it looks up (task names, risks, issues, comments)
          to <span className="font-medium">{provider.label}</span>. I confirm this is allowed for our account.
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => save.mutate()} disabled={!ready || save.isPending} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
          {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {save.isPending ? 'Checking the key…' : 'Test and save'}
        </Button>
        {onCancel && <Button size="sm" variant="ghost" onClick={onCancel} disabled={save.isPending}>Cancel</Button>}
        <span className="text-xs text-slate-500">We send one tiny request to check the key and that the model can use tools.</span>
      </div>
    </div>
  );
}

/** Owners: switch the assistant on or off, choose how long chats are kept, and connect the account's own model. */
export default function AiAssistantSettings({ accountId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const queryKey = ['ai-settings', accountId];
  const { data, isLoading, error } = useQuery({ queryKey, queryFn: () => aiSettingsApi.get(accountId), enabled: !!accountId });

  const applied = (updated) => {
    queryClient.setQueryData(queryKey, updated);
    queryClient.invalidateQueries({ queryKey: ['ai-status', accountId] });
  };
  const update = useMutation({
    mutationFn: (changes) => aiSettingsApi.update(accountId, changes),
    onSuccess: applied,
    onError: (e) => toastError(e?.message || 'The setting could not be saved.'),
  });
  const remove = useMutation({
    mutationFn: () => aiSettingsApi.removeKey(accountId),
    onSuccess: applied,
    onError: (e) => toastError(e?.message || 'The key could not be removed.'),
  });

  if (isLoading) return <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  if (error || !data) return <p className="text-sm text-red-600">{error?.message || 'Assistant settings could not load.'}</p>;

  const key = data.key;
  return (
    <div className="space-y-6">
      <Card title="AI assistant" icon={Bot}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Let people in this account use the assistant</p>
            <p className="text-xs text-slate-500">It only reads, and only what each person can already see.</p>
          </div>
          <Switch checked={data.assistant_enabled} disabled={update.isPending} onCheckedChange={value => update.mutate({ assistant_enabled: value })}
            aria-label="Assistant on" className="data-[state=checked]:bg-[#c87b14]" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Keep conversations for</p>
            <p className="text-xs text-slate-500">Chats nobody has used for longer than this are deleted.</p>
          </div>
          <Select value={String(data.retention_days)} onValueChange={value => update.mutate({ retention_days: Number(value) })}>
            <SelectTrigger className="h-9 w-32" aria-label="Keep conversations for"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...new Set([...RETENTION_OPTIONS, data.retention_days])].sort((a, b) => a - b).map(days => (
                <SelectItem key={days} value={String(days)}>{days % 365 === 0 ? `${days / 365} year${days === 365 ? '' : 's'}` : `${days} days`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card title="Your own model" icon={KeyRound}>
        <p className="text-sm text-slate-600">
          Connect your organisation's own AI provider. Its usage is billed by that provider, not by Project Hub.
        </p>
        {!data.key_storage_available ? (
          <div className="flex gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>This server isn't set up to store model keys yet. Ask your Project Hub administrator.</span>
          </div>
        ) : key && !editing ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
            <div className="flex gap-3 min-w-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-800">{key.provider_label} · {key.model}</p>
                {key.base_url && <p className="text-xs text-slate-500 truncate">{key.base_url}</p>}
                <p className="text-xs text-slate-500">
                  {key.key_last4 ? `Key ending ${key.key_last4}` : 'No key'}
                  {key.key_updated_at && ` · saved ${formatDate(key.key_updated_at)}${key.key_updated_by_name ? ` by ${key.key_updated_by_name}` : ''}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Change</Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
            </div>
          </div>
        ) : (
          <KeyForm
            accountId={accountId}
            onSaved={(updated) => { applied(updated); setEditing(false); }}
            onCancel={key ? () => setEditing(false) : null}
          />
        )}
      </Card>
    </div>
  );
}
