import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getRaidStatuses, setRaidStatuses, RAID_DEFAULTS } from '@/lib/raidStatuses';
import { useThemePreference } from '@/lib/theme';
import { X, Plus, ChevronDown, ChevronRight, AlertCircle, Loader2, Sun, Moon, Monitor } from 'lucide-react';

const DAYS = [{ v: 0, l: 'Sun' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }];

const LANDING_OPTIONS = [
  { value: 'favorites', label: 'Home', description: 'Open to the home page and your favorites' },
  { value: 'all_portfolios', label: 'All Portfolios', description: 'Show the portfolios overview' },
  { value: 'all_programs', label: 'All Programs', description: 'Show all programs' },
  { value: 'sprints', label: 'Sprints', description: 'Open to the sprint board' },
];

const DEFAULT_TASK_VIEW_OPTIONS = [
  { value: 'sheet', label: 'Sheet' },
  { value: 'gantt', label: 'Gantt' },
  { value: 'mondayboard', label: 'Board' },
  { value: 'board', label: 'Cards' },
  { value: 'audit', label: 'Audit' },
];

const RAID_TYPES = [
  { key: 'risk', label: 'Risk', color: 'text-orange-500', optionKeys: ['risk', 'risk_status', 'risk_statuses'] },
  { key: 'issue', label: 'Issue', color: 'text-red-500', optionKeys: ['issue', 'issue_status', 'issue_statuses'] },
  { key: 'assumption', label: 'Assumption', color: 'text-teal-500', optionKeys: ['assumption', 'assumption_status', 'assumption_statuses'] },
  { key: 'decision', label: 'Decision', color: 'text-indigo-500', optionKeys: ['decision', 'decision_status', 'decision_statuses'] },
  { key: 'task_status', label: 'Task Status', color: 'text-blue-500', optionKeys: ['task_status', 'task_statuses', 'status', 'statuses'] },
  { key: 'task_type', label: 'Task Type', color: 'text-purple-500', optionKeys: ['task_type', 'task_types', 'type', 'types'] },
  { key: 'priority', label: 'Priority', color: 'text-amber-500', optionKeys: ['priority', 'priorities'] },
];

const normalizeOptionKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function RAIDStatusEditor({ type, label, optionSet, onCreateValue, onUpdateValue, onDeleteValue, isMutating, mutationError }) {
  const [statuses, setStatuses] = useState(() => getRaidStatuses(type));
  const [newStatus, setNewStatus] = useState('');
  const [editingValue, setEditingValue] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const {
    data: values = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['option-set-values', optionSet?.id],
    queryFn: () => settingsApi.listOptionValues(optionSet.id),
    enabled: expanded && Boolean(optionSet?.id),
  });
  const statusRows = optionSet ? values : statuses;
  const isSystemValue = (value) => Boolean(value?.protected || value?.is_protected || value?.system || value?.is_system);

  const add = () => {
    if (!newStatus.trim()) return;
    if (optionSet?.id) {
      onCreateValue(optionSet.id, {
        value: newStatus.trim().toLowerCase().replace(/\s+/g, '_'),
        label: newStatus.trim(),
        sort_order: values.length,
        active: true,
      }, () => setNewStatus(''));
      return;
    }
    const updated = [...statuses, { value: newStatus.trim().toLowerCase().replace(/\s+/g, '_'), label: newStatus.trim() }];
    setStatuses(updated);
    setRaidStatuses(type, updated);
    setNewStatus('');
  };

  const remove = (idx, status) => {
    if (optionSet?.id && status?.id) {
      if (isSystemValue(status)) return;
      onDeleteValue(optionSet.id, status.id);
      return;
    }
    const updated = statuses.filter((_, i) => i !== idx);
    setStatuses(updated);
    setRaidStatuses(type, updated);
  };

  const reset = () => {
    if (optionSet?.id) return;
    const defaults = RAID_DEFAULTS[type] || [];
    setStatuses(defaults);
    setRaidStatuses(type, defaults);
  };

  const startEditing = (status) => {
    if (!optionSet?.id || !status?.id || isSystemValue(status)) return;
    setEditingValue({ ...status, label: status.label || status.value || '', value: status.value || '', color: status.color || '' });
  };

  const saveEditing = () => {
    if (!optionSet?.id || !editingValue?.id || !editingValue.label?.trim() || isMutating) return;
    onUpdateValue(optionSet.id, editingValue.id, {
      value: editingValue.value || editingValue.label.trim().toLowerCase().replace(/\s+/g, '_'),
      label: editingValue.label.trim(),
      color: editingValue.color || undefined,
      sort_order: editingValue.sort_order,
      active: editingValue.active,
    }, () => setEditingValue(null));
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <span className="text-sm font-medium text-slate-700">{label} Statuses</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">{optionSet && isLoading ? 'Loading...' : `${statusRows.length} statuses`}</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 space-y-3">
          {optionSet && isLoading && (
            <div className="flex items-center justify-center py-3 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mr-2" /> Loading values...
            </div>
          )}
          {optionSet && isError && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-center text-xs text-red-600">
              <AlertCircle className="w-4 h-4 mx-auto mb-1" />
              <p className="mb-2">{error?.message || `Unable to load ${label.toLowerCase()}.`}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          )}
          {optionSet && mutationError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{mutationError}</span>
            </div>
          )}
          {optionSet && !isLoading && !isError && statusRows.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">No values yet.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {!isLoading && !isError && statusRows.map((s, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700">
                <button onClick={() => startEditing(s)} disabled={!optionSet?.id || isSystemValue(s) || isMutating} className={cn(optionSet?.id && !isSystemValue(s) && !isMutating && 'hover:text-indigo-600')}>
                  {s.label || s.value || s}
                </button>
                {isSystemValue(s) && <span className="text-[9px] uppercase text-slate-300">system</span>}
                <button onClick={() => remove(idx, s)} disabled={isMutating || isSystemValue(s)} className="text-slate-300 hover:text-red-500 transition-colors disabled:cursor-not-allowed disabled:hover:text-slate-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {editingValue && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input value={editingValue.label} onChange={e => setEditingValue(prev => ({ ...prev, label: e.target.value }))} disabled={isMutating} placeholder="Label" className="h-8 text-sm" />
                <Input value={editingValue.color || ''} onChange={e => setEditingValue(prev => ({ ...prev, color: e.target.value }))} disabled={isMutating} placeholder="Color (optional)" className="h-8 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingValue(null)} disabled={isMutating}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={saveEditing} disabled={isMutating || !editingValue.label?.trim()}>
                  {isMutating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Save
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Input value={newStatus} onChange={e => setNewStatus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="Add status..." className="h-8 text-sm flex-1" disabled={isMutating || (optionSet && (isLoading || isError))} />
            <Button size="sm" variant="outline" className="h-8 px-3" onClick={add} disabled={!newStatus.trim() || isMutating || (optionSet && (isLoading || isError))}>
              {isMutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {!optionSet && <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Reset to defaults</button>}
        </div>
      )}
    </div>
  );
}

function SpecificDatesCalendar({ holidays = [], onCreate, onUpdate, onDelete, isLoading, isError, error, onRetry, isMutating, mutationError, nonWorkingWeekdays }) {
  const currentYear = new Date().getFullYear();
  const [showCalendar, setShowCalendar] = useState(false);
  const [form, setForm] = useState(null);

  const toggleDate = (dateStr) => {
    const holiday = holidays.find(item => item.date === dateStr);
    setForm(holiday
      ? { id: holiday.id, name: holiday.name || '', date: holiday.date || dateStr, description: holiday.description || '', recurring: Boolean(holiday.recurring) }
      : { name: '', date: dateStr, description: '', recurring: false });
  };

  const closeForm = () => setForm(null);
  const submitForm = () => {
    if (!form?.date || !form?.name?.trim() || isMutating) return;
    const payload = { name: form.name.trim(), date: form.date, description: form.description || '', recurring: Boolean(form.recurring) };
    if (form.id) onUpdate(form.id, payload, closeForm);
    else onCreate(payload, closeForm);
  };
  const sortedHolidays = [...holidays].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Specific Non-Working Dates</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Select holidays or company days off for {currentYear}–{currentYear + 1}
            {holidays.length > 0 && <span className="ml-2 text-indigo-600 font-medium">({holidays.length} selected)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCalendar(v => !v)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
            {showCalendar ? 'Hide' : 'Show'} Calendar
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
          <span className="text-xs">Loading holidays...</span>
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-center text-xs text-red-600">
          <AlertCircle className="w-4 h-4 mx-auto mb-1" />
          <p className="mb-2">{error?.message || 'Unable to load holidays.'}</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRetry}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && mutationError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{mutationError}</span>
        </div>
      )}

      {!isLoading && !isError && holidays.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg mb-3">No holidays have been added yet.</p>
      )}

      {!isLoading && !isError && holidays.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {sortedHolidays.slice(0, 12).map(holiday => (
            <span key={holiday.id || holiday.date} className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
              <button disabled={isMutating} onClick={() => setForm({ id: holiday.id, name: holiday.name || '', date: holiday.date || '', description: holiday.description || '', recurring: Boolean(holiday.recurring) })} className="hover:text-red-900 disabled:cursor-not-allowed">
                {holiday.name || holiday.date} {holiday.name && holiday.date ? `(${holiday.date})` : ''}
              </button>
              <button disabled={isMutating} onClick={() => holiday.id && onDelete(holiday.id)} className="hover:text-red-900 disabled:cursor-not-allowed"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
          {holidays.length > 12 && <span className="text-xs text-slate-400">+{holidays.length - 12} more</span>}
        </div>
      )}

      {form && !isLoading && !isError && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-slate-500">Holiday Name</label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} disabled={isMutating} placeholder="Holiday name" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500">Date</label>
              <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} disabled={isMutating} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <Input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} disabled={isMutating} placeholder="Description (optional)" className="h-8 text-sm" />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={Boolean(form.recurring)} onChange={e => setForm(prev => ({ ...prev, recurring: e.target.checked }))} disabled={isMutating} />
            Recurs every year
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={closeForm} disabled={isMutating}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={submitForm} disabled={isMutating || !form.date || !form.name?.trim()}>
              {isMutating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}{form.id ? 'Save' : 'Add Holiday'}
            </Button>
          </div>
        </div>
      )}

      {showCalendar && !isLoading && !isError && (
        <div className="space-y-5">
          {[currentYear, currentYear + 1].map(year => (
            <div key={year}>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{year}</p>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 12 }, (_, mi) => {
                  const daysInMonth = new Date(year, mi + 1, 0).getDate();
                  const firstDow = new Date(year, mi, 1).getDay();
                  const monthName = new Date(year, mi, 1).toLocaleString('default', { month: 'long' });
                  return (
                    <div key={mi} className="bg-slate-50 rounded-xl border border-slate-200 p-2.5">
                      <p className="text-[11px] font-semibold text-slate-600 mb-1.5 text-center">{monthName}</p>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['S','M','T','W','T','F','S'].map((d, i) => <span key={i} className="text-[8px] text-slate-400 font-medium py-0.5">{d}</span>)}
                        {Array.from({ length: firstDow }, (_, i) => <span key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isSelected = holidays.some(holiday => holiday.date === dateStr);
                          const dow = new Date(year, mi, day).getDay();
                          const isWeekend = nonWorkingWeekdays.includes(dow);
                          return (
                            <button key={day} onClick={() => !isWeekend && !isMutating && toggleDate(dateStr)} title={dateStr}
                              className={cn('text-[9px] w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors',
                                isSelected ? 'bg-red-500 text-white font-bold' :
                                isWeekend || isMutating ? 'text-slate-300 cursor-default' :
                                'text-slate-600 hover:bg-red-100 hover:text-red-600 cursor-pointer')}>
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const THEME_CHOICES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Match system', icon: Monitor },
];

export default function SettingsContent() {
  const [theme, setTheme] = useThemePreference();
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [dateFormat, setDateFormat] = useState(localStorage.getItem('app_date_format') || 'MM/dd/yyyy');
  const [nonWorkingDays, setNonWorkingDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_nonworking_days') || '[0,6]'); } catch { return [0, 6]; }
  });
  const [hideDelivery, setHideDelivery] = useState(localStorage.getItem('app_hide_delivery') === 'true');
  const [landingPage, setLandingPage] = useState(localStorage.getItem('app_landing_page') || 'all_portfolios');
  const [defaultTaskView, setDefaultTaskView] = useState(localStorage.getItem('app_default_task_view') || 'sheet');
  const [mutationError, setMutationError] = useState('');
  const [holidayMutationError, setHolidayMutationError] = useState('');
  const [optionValueMutationError, setOptionValueMutationError] = useState('');

  const {
    data: accountSettings = {},
    isLoading: loadingAccountSettings,
    isError: isAccountSettingsError,
    error: accountSettingsError,
    refetch: retryAccountSettings,
  } = useQuery({
    queryKey: ['account-settings', selectedAccountId],
    queryFn: () => settingsApi.getAccountSettings(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  const {
    data: accountHolidays = [],
    isLoading: loadingAccountHolidays,
    isError: isAccountHolidaysError,
    error: accountHolidaysError,
    refetch: retryAccountHolidays,
  } = useQuery({
    queryKey: ['account-holidays', selectedAccountId],
    queryFn: () => settingsApi.listHolidays(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  const {
    data: accountOptionSets = [],
    isLoading: loadingAccountOptionSets,
    isError: isAccountOptionSetsError,
    error: accountOptionSetsError,
    refetch: retryAccountOptionSets,
  } = useQuery({
    queryKey: ['account-option-sets', selectedAccountId],
    queryFn: () => settingsApi.listOptionSets(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  useQuery({
    queryKey: ['account-options', selectedAccountId],
    queryFn: () => settingsApi.listOptions(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  useEffect(() => {
    if (!accountSettings || Object.keys(accountSettings).length === 0) return;
    if (accountSettings.date_format !== undefined) setDateFormat(accountSettings.date_format);
    if (accountSettings.default_landing_page !== undefined) setLandingPage(accountSettings.default_landing_page);
    if (accountSettings.hide_delivery_section !== undefined) setHideDelivery(Boolean(accountSettings.hide_delivery_section));
  }, [accountSettings]);

  const updateGeneralSettings = useMutation({
    mutationFn: (data) => settingsApi.updateAccountSettings(selectedAccountId, data),
    onSuccess: (updatedSettings) => {
      setMutationError('');
      queryClient.invalidateQueries({ queryKey: ['account-settings', selectedAccountId] });
      if (updatedSettings.date_format !== undefined) localStorage.setItem('app_date_format', updatedSettings.date_format);
      if (updatedSettings.default_landing_page !== undefined) localStorage.setItem('app_landing_page', updatedSettings.default_landing_page);
      if (updatedSettings.hide_delivery_section !== undefined) localStorage.setItem('app_hide_delivery', String(updatedSettings.hide_delivery_section));
    },
    onError: () => {
      setMutationError('We couldn’t save that setting. Please try again.');
    },
  });

  const isSavingGeneralSettings = updateGeneralSettings.isPending;

  const applyGeneralSetting = (data, onSuccess) => {
    if (!selectedAccountId || isSavingGeneralSettings) return;
    setMutationError('');
    updateGeneralSettings.mutate(data, { onSuccess });
  };

  const invalidateHolidays = () => {
    queryClient.invalidateQueries({ queryKey: ['account-holidays', selectedAccountId] });
  };

  const createHoliday = useMutation({
    mutationFn: ({ data }) => settingsApi.createHoliday(selectedAccountId, data),
    onSuccess: (_created, variables) => {
      setHolidayMutationError('');
      invalidateHolidays();
      variables?.closeForm?.();
    },
    onError: () => {
      setHolidayMutationError('We couldn’t add that holiday. Please try again.');
    },
  });

  const updateHoliday = useMutation({
    mutationFn: ({ holidayId, data }) => settingsApi.updateHoliday(holidayId, data),
    onSuccess: (_updated, variables) => {
      setHolidayMutationError('');
      invalidateHolidays();
      variables?.closeForm?.();
    },
    onError: () => {
      setHolidayMutationError('We couldn’t save that holiday. Please try again.');
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: ({ holidayId }) => settingsApi.deleteHoliday(holidayId),
    onSuccess: () => {
      setHolidayMutationError('');
      invalidateHolidays();
    },
    onError: () => {
      setHolidayMutationError('We couldn’t delete that holiday. Please try again.');
    },
  });

  const isHolidayMutationPending = createHoliday.isPending || updateHoliday.isPending || deleteHoliday.isPending;

  const handleCreateHoliday = (data, closeForm) => {
    if (!selectedAccountId || isHolidayMutationPending) return;
    setHolidayMutationError('');
    createHoliday.mutate({ data, closeForm });
  };

  const handleUpdateHoliday = (holidayId, data, closeForm) => {
    if (!holidayId || isHolidayMutationPending) return;
    setHolidayMutationError('');
    updateHoliday.mutate({ holidayId, data, closeForm });
  };

  const handleDeleteHoliday = (holidayId) => {
    if (!holidayId || isHolidayMutationPending) return;
    setHolidayMutationError('');
    deleteHoliday.mutate({ holidayId });
  };

  const invalidateOptionValueData = (optionSetId) => {
    if (optionSetId) queryClient.invalidateQueries({ queryKey: ['option-set-values', optionSetId] });
    queryClient.invalidateQueries({ queryKey: ['account-option-sets', selectedAccountId] });
    queryClient.invalidateQueries({ queryKey: ['account-options', selectedAccountId] });
  };

  const createOptionValue = useMutation({
    mutationFn: ({ optionSetId, data }) => settingsApi.createOptionValue(optionSetId, data),
    onSuccess: (_created, variables) => {
      setOptionValueMutationError('');
      invalidateOptionValueData(variables.optionSetId);
      variables?.onSuccess?.();
    },
    onError: () => {
      setOptionValueMutationError('We couldn’t add that option value. Please try again.');
    },
  });

  const updateOptionValue = useMutation({
    mutationFn: ({ optionValueId, data }) => settingsApi.updateOptionValue(optionValueId, data),
    onSuccess: (_updated, variables) => {
      setOptionValueMutationError('');
      invalidateOptionValueData(variables.optionSetId);
      variables?.onSuccess?.();
    },
    onError: () => {
      setOptionValueMutationError('We couldn’t save that option value. Please try again.');
    },
  });

  const deleteOptionValue = useMutation({
    mutationFn: ({ optionValueId }) => settingsApi.deleteOptionValue(optionValueId),
    onSuccess: (_deleted, variables) => {
      setOptionValueMutationError('');
      invalidateOptionValueData(variables.optionSetId);
    },
    onError: () => {
      setOptionValueMutationError('We couldn’t delete that option value. Please try again.');
    },
  });

  const isOptionValueMutationPending = createOptionValue.isPending || updateOptionValue.isPending || deleteOptionValue.isPending;

  const handleCreateOptionValue = (optionSetId, data, onSuccess) => {
    if (!optionSetId || isOptionValueMutationPending) return;
    setOptionValueMutationError('');
    createOptionValue.mutate({ optionSetId, data, onSuccess });
  };

  const handleUpdateOptionValue = (optionSetId, optionValueId, data, onSuccess) => {
    if (!optionSetId || !optionValueId || isOptionValueMutationPending) return;
    setOptionValueMutationError('');
    updateOptionValue.mutate({ optionSetId, optionValueId, data, onSuccess });
  };

  const handleDeleteOptionValue = (optionSetId, optionValueId) => {
    if (!optionSetId || !optionValueId || isOptionValueMutationPending) return;
    setOptionValueMutationError('');
    deleteOptionValue.mutate({ optionSetId, optionValueId });
  };

  const findOptionSet = (optionKeys = []) => accountOptionSets.find((optionSet) => {
    const candidates = [optionSet.key, optionSet.code, optionSet.name, optionSet.label].map(normalizeOptionKey);
    return optionKeys.map(normalizeOptionKey).some(key => candidates.includes(key));
  });

  const toggleDay = (day) => {
    const updated = nonWorkingDays.includes(day) ? nonWorkingDays.filter(d => d !== day) : [...nonWorkingDays, day];
    setNonWorkingDays(updated);
    localStorage.setItem('app_nonworking_days', JSON.stringify(updated));
  };

  const save = (key, value) => localStorage.setItem(key, String(value));

  if (!selectedAccountId) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
        <p className="text-sm font-medium text-slate-600">Select an account to manage settings.</p>
        <p className="text-xs mt-1">Account settings are available after an account is selected.</p>
      </div>
    );
  }

  if (loadingAccountSettings) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
        <span className="text-sm">Loading account settings...</span>
      </div>
    );
  }

  if (isAccountSettingsError) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
        <p className="text-sm mb-3">{accountSettingsError?.message || 'Unable to load account settings.'}</p>
        <Button size="sm" variant="outline" onClick={() => retryAccountSettings()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* General */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">General</p>
            {isSavingGeneralSettings && (
              <span className="inline-flex items-center gap-1 text-xs text-indigo-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
          </div>
          {mutationError && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{mutationError}</span>
            </div>
          )}
        </div>

        {/* Appearance: saved in this browser for the person using it, unlike the account settings below */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Appearance</p>
            <p className="text-xs text-slate-400 mt-0.5">Light or dark screens, just for you on this browser</p>
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {THEME_CHOICES.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setTheme(value)} aria-pressed={theme === value}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  theme === value ? 'bg-[#002046] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Format */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Date Format</p>
            <p className="text-xs text-slate-400 mt-0.5">How dates are displayed across the app</p>
          </div>
          <Select value={dateFormat} disabled={isSavingGeneralSettings} onValueChange={v => applyGeneralSetting({ date_format: v }, () => setDateFormat(v))}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
              <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
              <SelectItem value="D MMM YYYY">D MMM YYYY</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Landing Page */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Default Landing Page</p>
              <p className="text-xs text-slate-400 mt-0.5">Where the app opens when you first load it</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANDING_OPTIONS.map(opt => (
              <button key={opt.value} disabled={isSavingGeneralSettings} onClick={() => applyGeneralSetting({ default_landing_page: opt.value }, () => setLandingPage(opt.value))}
                className={cn('flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 text-left transition-all',
                  landingPage === opt.value
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                  isSavingGeneralSettings && 'opacity-60 cursor-not-allowed')}>
                <span className={cn('text-sm font-medium', landingPage === opt.value ? 'text-indigo-700' : 'text-slate-700')}>
                  {opt.label}
                  {landingPage === opt.value && <span className="ml-2 text-xs font-normal text-indigo-400">(current)</span>}
                </span>
                <span className="text-xs text-slate-400">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Default Sheet View */}
        <div className="px-5 py-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-800">Default View for Projects</p>
            <p className="text-xs text-slate-400 mt-0.5">Which view opens by default when you select a project</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DEFAULT_TASK_VIEW_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { setDefaultTaskView(opt.value); save('app_default_task_view', opt.value); }}
                className={cn('px-3 py-2 rounded-lg border-2 text-xs font-medium text-center transition-all',
                  defaultTaskView === opt.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hide Delivery */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Hide Delivery Section</p>
            <p className="text-xs text-slate-400 mt-0.5">Removes the Delivery category (including Sprints and Test Cases) from the sidebar</p>
          </div>
          <button disabled={isSavingGeneralSettings} onClick={() => { const v = !hideDelivery; applyGeneralSetting({ hide_delivery_section: v }, () => setHideDelivery(v)); }}
            className={cn('w-10 h-5 rounded-full transition-colors relative flex-shrink-0', hideDelivery ? 'bg-indigo-600' : 'bg-slate-200', isSavingGeneralSettings && 'opacity-60 cursor-not-allowed')}>
            <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', hideDelivery ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </div>
      </div>

      {/* Non-Working Days */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Schedule</p>
        </div>
        <div className="px-5 py-4">
          <div className="mb-2">
            <p className="text-sm font-medium text-slate-800">Non-Working Weekdays</p>
            <p className="text-xs text-slate-400 mt-0.5">Checked days are excluded from project schedules</p>
          </div>
          <div className="flex gap-2">
            {DAYS.map(({ v, l }) => (
              <button key={v} onClick={() => toggleDay(v)}
                className={cn('flex-1 py-2 rounded-lg border text-xs font-medium transition-colors',
                  nonWorkingDays.includes(v) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-4">
          <SpecificDatesCalendar
            holidays={accountHolidays}
            onCreate={handleCreateHoliday}
            onUpdate={handleUpdateHoliday}
            onDelete={handleDeleteHoliday}
            isLoading={loadingAccountHolidays}
            isError={isAccountHolidaysError}
            error={accountHolidaysError}
            onRetry={() => retryAccountHolidays()}
            isMutating={isHolidayMutationPending}
            mutationError={holidayMutationError}
            nonWorkingWeekdays={nonWorkingDays}
          />
        </div>
      </div>

      {/* User Access Types */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User Access</p>
          <p className="text-xs text-slate-400 mt-0.5">Roles define what each user can do in the app</p>
        </div>
        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4 border-2" style={{ borderColor: '#002046', backgroundColor: '#002046' + '0a' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#002046' }}>A</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#002046' }}>Admin</p>
                  <p className="text-[10px] text-slate-400">Full control</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {['Create & delete portfolios, programs, and projects','Share projects with other users','Manage app settings & RAID statuses','Full edit access to all views','Access Financials section & budget data on dashboards','Invite and manage users'].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold flex-shrink-0" style={{ color: '#c87b14' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-4 border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-slate-400">U</span>
                <div>
                  <p className="text-sm font-bold text-slate-600">User</p>
                  <p className="text-[10px] text-slate-400">Standard access</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {['Edit tasks and project schedules','Update RAID logs (Risks, Issues, Assumptions, Decisions)','Manage Change Register entries','View portfolios, programs, and reports','Excludes Financials section & budget data on dashboards','Cannot delete portfolios, programs, or projects'].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-slate-400 flex-shrink-0">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* RAID Status Options */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RAID Log Status Options</p>
          <p className="text-xs text-slate-400 mt-0.5">Customise the status values shown in each RAID log. Changes take effect immediately.</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {loadingAccountOptionSets && (
            <div className="flex items-center justify-center py-4 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
              <span className="text-xs">Loading option sets...</span>
            </div>
          )}
          {!loadingAccountOptionSets && isAccountOptionSetsError && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-center text-xs text-red-600">
              <AlertCircle className="w-4 h-4 mx-auto mb-1" />
              <p className="mb-2">{accountOptionSetsError?.message || 'Unable to load option sets.'}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => retryAccountOptionSets()}>Retry</Button>
            </div>
          )}
          {!loadingAccountOptionSets && !isAccountOptionSetsError && accountOptionSets.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">No option sets are available.</p>
          )}
          {!loadingAccountOptionSets && !isAccountOptionSetsError && RAID_TYPES.map(rt => (
            <RAIDStatusEditor
              key={rt.key}
              type={rt.key}
              label={rt.label}
              optionSet={findOptionSet(rt.optionKeys)}
              onCreateValue={handleCreateOptionValue}
              onUpdateValue={handleUpdateOptionValue}
              onDeleteValue={handleDeleteOptionValue}
              isMutating={isOptionValueMutationPending}
              mutationError={optionValueMutationError}
            />
          ))}
        </div>
      </div>
    </div>
  );
}