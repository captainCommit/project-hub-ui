import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toastError } from '@/components/ui/use-toast';
import { notificationPreferencesApi } from '@/api/notifications';

const CATEGORIES = [
  { key: 'mentions', label: 'Mentions', description: 'Someone @mentions you in a comment.' },
  { key: 'assignments', label: 'Assignments', description: 'A task or risk is assigned to you.' },
  { key: 'due_soon', label: 'Due soon', description: 'Your tasks due today or tomorrow, each morning.' },
  { key: 'status_changes', label: 'Status changes', description: 'Decisions approved on items you can see.' },
  { key: 'comments', label: 'Comments', description: 'Any new comment on items you can see.' },
];

const FREQUENCIES = [
  { value: 'IMMEDIATE', label: 'Right away' },
  { value: 'DIGEST', label: 'Daily digest' },
  { value: 'OFF', label: 'Off' },
];

const FIELDS = [...CATEGORIES.map(c => c.key), 'my_work_summary', 'timezone', 'digest_hour'];

const hourLabel = (hour) => {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${suffix}`;
};

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

const allTimezones = (current) => {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }
  return [...new Set([current, browserTimezone(), ...zones].filter(Boolean))].sort();
};

export default function NotificationPreferences() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationPreferencesApi.get,
  });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(Object.fromEntries(FIELDS.map(field => [field, data[field]])));
  }, [data]);

  const save = useMutation({
    mutationFn: () => notificationPreferencesApi.update(form),
    onSuccess: (updated) => {
      queryClient.setQueryData(['notification-preferences'], updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (error) => toastError(error?.message || 'Your email settings could not be saved.'),
  });

  const timezones = useMemo(() => allTimezones(form?.timezone), [form?.timezone]);
  const localZone = browserTimezone();
  const dirty = !!data && !!form && FIELDS.some(field => form[field] !== data[field]);
  const setField = (field, value) => setForm(current => ({ ...current, [field]: value }));

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Notifications</p>
      </div>
      {isLoading || (!form && !isError) ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">Loading email settings…</p>
      ) : isError ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500 space-y-2">
          <p>Email settings could not load.</p>
          <button onClick={() => refetch()} className="text-[#c87b14] font-medium hover:underline">Try again</button>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          <p className="text-sm text-slate-600">
            Choose which notifications are also emailed to <span className="font-medium text-slate-800">{data.email}</span>.
            They always appear under the bell in the app.
          </p>
          {data.email_suppressed && (
            <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Emails to this address bounced or were marked as spam, so none are being sent. Contact your administrator to fix it.</span>
            </div>
          )}
          {!data.email_available && (
            <div className="flex gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Email sending isn't switched on yet. Your choices are saved and will apply once it is.</span>
            </div>
          )}

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {CATEGORIES.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
                <Select value={form[key]} onValueChange={value => setField(key, value)}>
                  <SelectTrigger className="h-9 w-36 flex-shrink-0" aria-label={`${label} emails`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 border border-slate-100 rounded-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">My work summary</p>
              <p className="text-xs text-slate-500">
                Your overdue, due-today and blocked tasks, plus new mentions, in the daily digest. Skipped on days with nothing to report.
              </p>
            </div>
            <Switch checked={form.my_work_summary} onCheckedChange={value => setField('my_work_summary', value)}
              aria-label="My work summary emails" className="data-[state=checked]:bg-[#c87b14]" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Daily digest and due-soon reminders</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>Send at</span>
              <Select value={String(form.digest_hour)} onValueChange={value => setField('digest_hour', Number(value))}>
                <SelectTrigger className="h-9 w-28" aria-label="Digest time"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <SelectItem key={hour} value={String(hour)}>{hourLabel(hour)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>in</span>
              <Select value={form.timezone} onValueChange={value => setField('timezone', value)}>
                <SelectTrigger className="h-9 w-60" aria-label="Timezone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timezones.map(zone => (
                    <SelectItem key={zone} value={zone}>{zone.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {localZone && localZone !== form.timezone && (
              <button onClick={() => setField('timezone', localZone)} className="text-xs text-[#c87b14] font-medium hover:underline">
                Use this device's timezone ({localZone.replace(/_/g, ' ')})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
              {save.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            {saved && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}
