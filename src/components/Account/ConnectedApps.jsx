import React, { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, Copy, Hash, Loader2, RefreshCw, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { toast, toastError } from '@/components/ui/use-toast';
import { DM_CATEGORY_LABELS, integrationsApi } from '@/api/integrations';

const formatTime = (value) => (value ? new Date(value).toLocaleString() : 'not yet');

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

function ChatLink({ accountId, provider, label, howToLink, state, options }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-integrations', accountId] });
  const update = useMutation({
    mutationFn: (categories) => integrationsApi.updateLink(accountId, provider, categories),
    onSuccess: refresh,
    onError: (error) => toastError(error?.message || 'Could not save.'),
  });
  const unlink = useMutation({ mutationFn: () => integrationsApi.unlink(accountId, provider), onSuccess: refresh });

  if (!state.connected) {
    return <p className="text-sm text-slate-500">This account isn’t connected to {label}. An account owner can connect it in Account &gt; Integrations.</p>;
  }
  if (!state.link) {
    return (
      <div className="text-sm text-slate-700 space-y-1">
        <p>Get your mentions and assignments in {label}, and look up or add work from there.</p>
        <p>To link, {howToLink}, then open the link it gives you.</p>
      </div>
    );
  }
  const categories = state.link.dm_categories;
  const toggle = (key, on) => update.mutate(on ? [...categories, key] : categories.filter(c => c !== key));
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-800">
        Linked to <strong>{state.link.external_name || `your ${label} user`}</strong> in {state.workspace}.
        <button type="button" className="ml-2 text-xs text-red-600 hover:underline" onClick={() => unlink.mutate()}>Unlink</button>
      </p>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-800">Send me direct messages for</p>
        {options.map(key => (
          <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={categories.includes(key)} onCheckedChange={(on) => toggle(key, !!on)} disabled={update.isPending} />
            {DM_CATEGORY_LABELS[key] || key}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ConnectedApps({ accountId }) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useQuery({ queryKey: ['my-integrations', accountId], queryFn: () => integrationsApi.mine(accountId), enabled: !!accountId });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-integrations', accountId] });
  const mine = query.data;

  // Arriving from Slack or Teams with ?link=…: link that user to whoever is signed in here.
  const linkToken = searchParams.get('link');
  const confirmed = useRef(false);
  const confirm = useMutation({
    mutationFn: (token) => integrationsApi.confirmLink(accountId, token),
    onSuccess: (link) => {
      toast({ title: `Linked ${link.provider === 'SLACK' ? 'Slack' : 'Teams'}${link.external_name ? ` (${link.external_name})` : ''}.` });
      refresh();
    },
    onError: (error) => toastError(error?.message || 'The link could not be confirmed.'),
    onSettled: () => {
      const next = new URLSearchParams(searchParams);
      next.delete('link');
      setSearchParams(next, { replace: true });
    },
  });
  useEffect(() => {
    if (linkToken && accountId && !confirmed.current) {
      confirmed.current = true;
      confirm.mutate(linkToken);
    }
  }, [linkToken, accountId]);

  useEffect(() => {
    const error = searchParams.get('integration_error');
    if (error) toastError(error);
    else if (searchParams.get('connected') === 'outlook') toast({ title: 'Outlook calendar connected.' });
  }, []);

  const feed = useMutation({
    mutationFn: (on) => (on ? integrationsApi.createCalendarFeed() : integrationsApi.deleteCalendarFeed()),
    onSuccess: refresh,
    onError: (error) => toastError(error?.message || 'Could not change the calendar feed.'),
  });
  const outlook = useMutation({
    mutationFn: (action) => (action === 'connect'
      ? integrationsApi.outlookConnectUrl().then(({ url }) => window.location.assign(url))
      : action === 'sync' ? integrationsApi.outlookSync() : integrationsApi.outlookDisconnect()),
    onSuccess: refresh,
    onError: (error) => toastError(error?.message || 'Something went wrong with Outlook.'),
  });

  if (query.isLoading || !mine) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const replaceFeed = async () => {
    if (await confirmAction({ title: 'Get a new calendar link?', description: 'Calendars subscribed to the current link stop updating.', confirmLabel: 'Get new link' })) feed.mutate(true);
  };
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast({ title: 'Copied.' }));

  return (
    <div className="space-y-6">
      {confirm.isPending && <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Linking…</p>}
      <Card title="Slack" icon={Hash}>
        <ChatLink accountId={accountId} provider="slack" label="Slack" howToLink={<>type <code className="px-1 rounded bg-slate-100">/projecthub link</code> in Slack</>} state={mine.slack} options={mine.dm_category_options} />
      </Card>
      <Card title="Microsoft Teams" icon={Users}>
        <ChatLink accountId={accountId} provider="teams" label="Teams" howToLink={<>send <code className="px-1 rounded bg-slate-100">link</code> to the Project Hub bot in a chat</>} state={mine.teams} options={mine.dm_category_options} />
      </Card>

      <Card title="Calendar" icon={CalendarDays}>
        <p className="text-sm text-slate-700">See your due tasks and milestones in your calendar, across all your accounts.</p>

        {mine.available.microsoft && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Outlook (Microsoft 365)</p>
            {mine.outlook_calendar ? (
              <>
                <p className="text-sm text-slate-700">
                  Kept up to date in the “Project Hub” calendar of {mine.outlook_calendar.email || 'your mailbox'} · last updated {formatTime(mine.outlook_calendar.last_synced_at)}
                </p>
                {mine.outlook_calendar.last_error && (
                  <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{mine.outlook_calendar.last_error}</p>
                )}
                <div className="flex gap-2">
                  {mine.outlook_calendar.status === 'ERROR'
                    ? <Button size="sm" onClick={() => outlook.mutate('connect')}>Connect again</Button>
                    : <Button size="sm" variant="outline" onClick={() => outlook.mutate('sync')} disabled={outlook.isPending}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Update now</Button>}
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => outlook.mutate('disconnect')}>Disconnect</Button>
                </div>
              </>
            ) : (
              <Button size="sm" className="bg-[#002046] hover:bg-[#003070]" onClick={() => outlook.mutate('connect')} disabled={outlook.isPending}>Connect Outlook calendar</Button>
            )}
          </div>
        )}

        {mine.calendar_feed && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Calendar subscription link</p>
            {mine.calendar_feed.enabled ? (
              <>
                <div className="flex gap-2">
                  <Input readOnly value={mine.calendar_feed.url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                  <Button size="sm" variant="outline" onClick={() => copy(mine.calendar_feed.url)}><Copy className="w-3.5 h-3.5" /></Button>
                </div>
                <p className="text-xs text-slate-500">
                  Add it in Outlook (Add calendar &gt; Subscribe from web), Google Calendar (Other calendars &gt; From URL) or Apple Calendar.
                  Keep it private: anyone with it can see these tasks.
                </p>
                <div className="flex gap-3 text-xs">
                  <button type="button" className="text-[#002046] hover:underline" onClick={replaceFeed}>Get a new link</button>
                  <button type="button" className="text-red-600 hover:underline" onClick={() => feed.mutate(false)}>Turn off</button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => feed.mutate(true)} disabled={feed.isPending}>Create a link</Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
