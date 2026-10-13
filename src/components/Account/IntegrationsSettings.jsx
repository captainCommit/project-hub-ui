import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Copy, Download, Hash, Loader2, Mail, MessageSquare, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { toast, toastError } from '@/components/ui/use-toast';
import { integrationsApi } from '@/api/integrations';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

const PROVIDERS = {
  slack: { label: 'Slack', key: 'SLACK', icon: Hash },
  teams: { label: 'Microsoft Teams', key: 'TEAMS', icon: Users },
};
const SCOPE_LABELS = { PORTFOLIO: 'Portfolio', PROGRAM: 'Program', PROJECT: 'Project' };
const DEFAULT_EVENTS = ['task_status_changed', 'risk_created_high', 'issue_created', 'task_overdue'];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

function Card({ title, icon: Icon, children, action = null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#c87b14]" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-1">{title}</p>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function ConnectionLine({ connection, empty }) {
  if (!connection) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-800">
        Connected to <strong>{connection.external_name || 'your organization'}</strong>
        {connection.connected_by_name && <span className="text-slate-500"> by {connection.connected_by_name}, {formatDate(connection.connected_at)}</span>}
      </p>
      {connection.status === 'ERROR' && (
        <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{connection.last_error || 'This connection needs to be set up again.'}</p>
      )}
    </div>
  );
}

function DestinationDialog({ accountId, overview, destination, onClose }) {
  const queryClient = useQueryClient();
  const { portfolios, programs, projects } = useAccountHierarchy();
  const connected = Object.entries(PROVIDERS).filter(([, p]) => overview.connections.some(c => c.provider === p.key && c.status === 'ACTIVE'));
  const [form, setForm] = useState(() => destination
    ? { provider: destination.provider?.toLowerCase(), channel_id: destination.channel_id, channel_name: destination.channel_name, scope_type: destination.scope_type, scope_id: destination.scope_id, events: destination.events, is_active: destination.is_active }
    : { provider: connected[0]?.[0] || 'slack', channel_id: '', channel_name: '', scope_type: 'PROJECT', scope_id: '', events: DEFAULT_EVENTS, is_active: true });
  const set = (changes) => setForm(current => ({ ...current, ...changes }));

  const channelsQuery = useQuery({
    queryKey: ['integration-channels', accountId, form.provider],
    queryFn: () => integrationsApi.channels(accountId, form.provider),
    enabled: !!form.provider,
  });
  const scopes = { PORTFOLIO: portfolios, PROGRAM: programs, PROJECT: projects }[form.scope_type] || [];

  const save = useMutation({
    mutationFn: () => (destination
      ? integrationsApi.updateDestination(accountId, destination.id, form)
      : integrationsApi.createDestination(accountId, form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', accountId] });
      onClose();
    },
    onError: (error) => toastError(error?.message || 'The channel could not be saved.'),
  });

  const toggleEvent = (key, on) => set({ events: on ? [...form.events, key] : form.events.filter(e => e !== key) });
  const ready = form.channel_id && form.scope_id && form.events.length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{destination ? 'Edit channel updates' : 'Send updates to a channel'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {connected.length > 1 && !destination && (
            <div className="flex gap-2">
              {connected.map(([id, provider]) => (
                <Button key={id} type="button" size="sm" variant={form.provider === id ? 'default' : 'outline'} onClick={() => set({ provider: id, channel_id: '', channel_name: '' })}>
                  {provider.label}
                </Button>
              ))}
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-800">Channel</span>
            <Select value={form.channel_id || undefined} onValueChange={(id) => set({ channel_id: id, channel_name: channelsQuery.data?.find(c => c.id === id)?.name || id })}>
              <SelectTrigger><SelectValue placeholder={channelsQuery.isLoading ? 'Loading channels…' : 'Choose a channel'} /></SelectTrigger>
              <SelectContent>
                {(channelsQuery.data || []).map(channel => (
                  <SelectItem key={channel.id} value={channel.id}>{form.provider === 'slack' ? '#' : ''}{channel.name}{channel.is_private ? ' (private)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="block text-xs text-slate-500">
              {form.provider === 'slack'
                ? 'Private channels appear once Project Hub has been invited to them (/invite @Project Hub).'
                : 'Channels appear once the Project Hub app has been added to their team.'}
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Select value={form.scope_type} onValueChange={(value) => set({ scope_type: value, scope_id: '' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SCOPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="col-span-2">
              <Select value={form.scope_id || undefined} onValueChange={(value) => set({ scope_id: value })}>
                <SelectTrigger><SelectValue placeholder={`Choose a ${SCOPE_LABELS[form.scope_type].toLowerCase()}`} /></SelectTrigger>
                <SelectContent>{scopes.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Post when</p>
            {overview.events.map(event => (
              <label key={event.key} className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.events.includes(event.key)} onCheckedChange={(on) => toggleEvent(event.key, !!on)} />
                {event.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Switch checked={form.is_active} onCheckedChange={(on) => set({ is_active: on })} /> Posting is on
          </label>
          <p className="text-xs text-slate-500">
            Everyone in the channel will see these updates. Only items you can see are posted, checked each time.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!ready || save.isPending} className="bg-[#002046] hover:bg-[#003070]">
            {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function IntegrationsSettings({ accountId, returnedFrom = null, returnError = null }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(/** @type {any} */ (null));
  const [teamsCode, setTeamsCode] = useState(/** @type {{ code: string, expires_at: string } | null} */ (null));
  const query = useQuery({ queryKey: ['integrations', accountId], queryFn: () => integrationsApi.overview(accountId), enabled: !!accountId });
  const overview = query.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['integrations', accountId] });

  useEffect(() => {
    if (returnError) toastError(returnError);
    else if (returnedFrom) toast({ title: { slack: 'Slack connected.', 'microsoft-mail': 'Mailbox connected.' }[returnedFrom] || 'Connected.' });
  }, [returnedFrom, returnError]);

  const go = useMutation({
    mutationFn: (/** @type {'slack' | 'microsoft-mail'} */ kind) => (kind === 'slack' ? integrationsApi.slackInstallUrl(accountId) : integrationsApi.microsoftMailUrl(accountId)),
    onSuccess: ({ url }) => { window.location.assign(url); },
    onError: (error) => toastError(error?.message || 'Could not start connecting.'),
  });
  const code = useMutation({
    mutationFn: () => integrationsApi.teamsCode(accountId),
    onSuccess: setTeamsCode,
    onError: (error) => toastError(error?.message || 'Could not create a code.'),
  });
  const disconnect = useMutation({
    mutationFn: (provider) => integrationsApi.disconnect(accountId, provider),
    onSuccess: refresh,
    onError: (error) => toastError(error?.message || 'Could not disconnect.'),
  });
  const removeDestination = useMutation({
    mutationFn: (id) => integrationsApi.deleteDestination(accountId, id),
    onSuccess: refresh,
    onError: (error) => toastError(error?.message || 'Could not remove the channel.'),
  });

  const byProvider = useMemo(() => Object.fromEntries((overview?.connections || []).map(c => [c.provider, c])), [overview]);
  const eventLabels = useMemo(() => Object.fromEntries((overview?.events || []).map(e => [e.key, e.label])), [overview]);

  if (query.isLoading || !overview) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const confirmDisconnect = async (provider, label) => {
    const ok = await confirmAction({
      title: `Disconnect ${label}?`,
      description: provider === 'microsoft-mail'
        ? 'Email will go out through Project Hub’s own sender again, if it is set up.'
        : 'Channel updates and everyone’s direct messages stop, and people will have to link again after reconnecting.',
      confirmLabel: 'Disconnect',
    });
    if (ok) disconnect.mutate(provider);
  };
  const chatConnected = byProvider.SLACK?.status === 'ACTIVE' || byProvider.TEAMS?.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <Card title="Slack" icon={Hash} action={byProvider.SLACK && (
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => confirmDisconnect('slack', 'Slack')}>Disconnect</Button>
      )}>
        <ConnectionLine connection={byProvider.SLACK} empty="Post project updates to Slack channels, and let people get their notifications and look up work there." />
        {overview.available.slack ? (
          <Button size="sm" onClick={() => go.mutate('slack')} disabled={go.isPending} className="bg-[#002046] hover:bg-[#003070]">
            {byProvider.SLACK ? 'Reconnect Slack' : 'Add to Slack'}
          </Button>
        ) : <p className="text-xs text-slate-500">Slack isn’t set up for Project Hub yet.</p>}
      </Card>

      <Card title="Microsoft Teams" icon={Users} action={byProvider.TEAMS && (
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => confirmDisconnect('teams', 'Microsoft Teams')}>Disconnect</Button>
      )}>
        <ConnectionLine connection={byProvider.TEAMS} empty="Post project updates to Teams channels, and let people chat with the Project Hub bot." />
        {overview.available.teams ? (
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            <li>
              Download the <a className="text-[#002046] underline" href={integrationsApi.teamsPackageUrl(accountId)} download><Download className="inline w-3.5 h-3.5 mr-0.5" />Project Hub app for Teams</a> and
              upload it in Teams (Apps &gt; Manage your apps &gt; Upload an app). Your Teams admin may need to allow it.
            </li>
            <li>Add the app to the teams whose channels should get updates.</li>
            <li>
              {byProvider.TEAMS ? 'To link a different organization, s' : 'S'}end the bot this message in Teams:{' '}
              {teamsCode ? (
                <span className="inline-flex items-center gap-1.5">
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">connect {teamsCode.code}</code>
                  <button type="button" aria-label="Copy" onClick={() => navigator.clipboard?.writeText(`connect ${teamsCode.code}`)}><Copy className="w-3.5 h-3.5 text-slate-500" /></button>
                  <span className="text-xs text-slate-500">(works once, for an hour)</span>
                </span>
              ) : (
                <Button size="sm" variant="outline" className="h-7" onClick={() => code.mutate()} disabled={code.isPending}>Get a code</Button>
              )}
            </li>
          </ol>
        ) : <p className="text-xs text-slate-500">Microsoft Teams isn’t set up for Project Hub yet.</p>}
      </Card>

      <Card
        title="Channel updates"
        icon={MessageSquare}
        action={chatConnected && <Button size="sm" variant="outline" className="h-7" onClick={() => setEditing({})}><Plus className="w-3.5 h-3.5 mr-1" />Add channel</Button>}
      >
        {!chatConnected ? (
          <p className="text-sm text-slate-500">Connect Slack or Teams first.</p>
        ) : overview.destinations.length === 0 ? (
          <p className="text-sm text-slate-500">No channels yet. Add one to post updates for a portfolio, program or project.</p>
        ) : (
          <ul className="divide-y divide-slate-100 -my-2">
            {overview.destinations.map(destination => (
              <li key={destination.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {destination.provider === 'SLACK' ? '#' : ''}{destination.channel_name}
                    <span className="font-normal text-slate-500"> · {SCOPE_LABELS[destination.scope_type]} {destination.scope_name}</span>
                    {!destination.is_active && <span className="ml-2 text-xs text-amber-700">paused</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{destination.events.map(e => eventLabels[e] || e).join(', ')}</p>
                </div>
                <button type="button" aria-label="Edit" onClick={() => setEditing(destination)} className="text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>
                <button type="button" aria-label="Remove" onClick={() => removeDestination.mutate(destination.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Email from Microsoft 365" icon={Mail} action={byProvider.MICROSOFT_MAIL && (
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => confirmDisconnect('microsoft-mail', 'the mailbox')}>Disconnect</Button>
      )}>
        <ConnectionLine connection={byProvider.MICROSOFT_MAIL} empty="Send this account’s notification emails from one of your own Microsoft 365 mailboxes, such as projects@yourcompany.com." />
        {overview.available.microsoft ? (
          <>
            <Button size="sm" variant="outline" onClick={() => go.mutate('microsoft-mail')} disabled={go.isPending}>
              {byProvider.MICROSOFT_MAIL ? 'Use a different mailbox' : 'Connect a mailbox'}
            </Button>
            <p className="text-xs text-slate-500">Sign in as the mailbox that should send the email. Project Hub can only send from it, not read it.</p>
          </>
        ) : <p className="text-xs text-slate-500">Microsoft 365 isn’t set up for Project Hub yet.</p>}
      </Card>

      {editing && <DestinationDialog accountId={accountId} overview={overview} destination={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  );
}
