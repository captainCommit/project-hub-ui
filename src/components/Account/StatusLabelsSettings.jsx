import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Briefcase, CheckSquare, ChevronRight, Flag, Info, Landmark, Layers, Loader2, Pencil, RotateCcw, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { toast, toastError } from '@/components/ui/use-toast';
import { settingsApi } from '@/api/settings';
import { useAuth } from '@/lib/AuthContext';
import { HEALTH_DEFAULTS, SWATCHES, TEST_RESULT_DEFAULTS, WORK_STATUS_DEFAULTS, accountSettingsQueryKey, swatchFor, useStatusLabels } from '@/lib/statusLabels';

const NAVY = '#002046';
const MUTED = '#6B7C99';

// The portfolio/program/project status option values that match each work-status key, so the dropdowns in the
// edit dialogs show the same renamed label as the directory pills.
const WORK_STATUS_OPTION_VALUES = { in_progress: 'ACTIVE', on_hold: 'ON_HOLD', completed: 'COMPLETE', cancelled: 'CANCELLED' };

/**
 * The cards in Settings > Status & Priority Labels. Each has `sections`: kind 'settings' are labels the app works out
 * itself, kept on the account settings with a colour (statusKey names them in useStatusLabels); kind 'options' are the
 * account's option sets, and `merge` puts the same value from several sets on one row (priorities are the same
 * everywhere). A card with one section shows no section title.
 */
const GROUPS = [
  {
    key: 'work', icon: Briefcase, title: 'Portfolio, Program & Project',
    sections: [{ kind: 'settings', settingsKey: 'WORK_STATUS', statusKey: 'workStatus', defaults: WORK_STATUS_DEFAULTS }],
    description: 'Project status labels (e.g., Not Started, In Progress, On Hold, Completed, Cancelled)',
    drawerText: 'Update the project status labels used across portfolios, programs, and projects. Changes apply everywhere in Row.',
  },
  {
    key: 'health', icon: Activity, title: 'Health',
    sections: [{ kind: 'settings', settingsKey: 'HEALTH', statusKey: 'health', defaults: HEALTH_DEFAULTS }],
    description: 'Health status labels (e.g., On Track, At Risk, Off Track, Not Applicable)',
    drawerText: 'Update the health labels shown on portfolios, programs, and projects.',
  },
  {
    key: 'priority', icon: Flag, title: 'Priority',
    sections: [{ kind: 'options', merge: true, name: 'PRIORITY' }],
    description: 'Priority levels (e.g., Critical, High, Medium, Low)',
    drawerText: 'Update the priority levels used for tasks, RAID items, decisions, change requests, and requirements.',
  },
  {
    key: 'tasks', icon: CheckSquare, title: 'Tasks',
    sections: [
      { kind: 'options', entity: 'TASK', name: 'STATUS', title: 'Task statuses' },
      { kind: 'options', entity: 'TASK', name: 'TYPE', title: 'Task types' },
    ],
    description: 'Task statuses and types (e.g., Not Started, In Progress, Blocked, Complete; Work Package, Activity, Milestone)',
    drawerText: 'Update the task statuses and types used in schedules and boards.',
  },
  {
    key: 'raid', icon: AlertTriangle, title: 'RAID',
    sections: [
      { kind: 'options', entity: 'RISK', name: 'STATUS', title: 'Risk statuses' },
      { kind: 'options', entity: 'ISSUE', name: 'STATUS', title: 'Issue statuses' },
      { kind: 'options', entity: 'ASSUMPTION', name: 'STATUS', title: 'Assumption statuses' },
      { kind: 'options', entity: 'DEPENDENCY', name: 'STATUS', title: 'Dependency statuses' },
    ],
    description: 'Risk, issue, assumption, and dependency statuses (e.g., Open, In Progress, Mitigating, Closed)',
    drawerText: 'Update the statuses used in the risk, issue, assumption, and dependency logs.',
  },
  {
    key: 'governance', icon: Landmark, title: 'Governance',
    sections: [
      { kind: 'options', entity: 'DECISION', name: 'STATUS', title: 'Decision statuses' },
      { kind: 'options', entity: 'CHANGE_REQUEST', name: 'STATUS', title: 'Change request statuses' },
    ],
    description: 'Decision and change request statuses (e.g., In Review, Approved, Implemented, Cancelled, Deferred)',
    drawerText: 'Update the statuses used in the decision log and change register.',
  },
  {
    key: 'delivery', icon: Layers, title: 'Delivery',
    sections: [
      { kind: 'options', entity: 'REQUIREMENT', name: 'STATUS', title: 'Requirement statuses' },
      { kind: 'settings', settingsKey: 'TEST_RESULT', statusKey: 'testResult', defaults: TEST_RESULT_DEFAULTS, title: 'Test results' },
      { kind: 'options', entity: 'SPRINT', name: 'STATUS', title: 'Sprint statuses' },
    ],
    description: 'Requirement, test and sprint statuses (e.g., In Review, Validated; Pass, Fail, Not Implemented; Planned, Active)',
    drawerText: 'Update the requirement statuses, test results and sprint statuses used in Delivery.',
  },
];

const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

/**
 * The drawer's sections: [{ ...section, title, rows: [{ id, key?, ids, defaultLabel, label, color? }] }].
 * Row ids are unique across the drawer; `key` is the status key for 'settings' rows, `ids` the option values to rename.
 */
function buildSections(group, optionSets, statusLabels) {
  const titled = group.sections.length > 1;
  return group.sections.map(section => {
    const title = titled ? section.title : null;
    if (section.kind === 'settings') {
      const current = statusLabels[section.statusKey];
      return {
        ...section, title,
        rows: Object.entries(section.defaults).map(([key, base]) => ({
          id: `${section.settingsKey}:${key}`, key, ids: [], defaultLabel: base.label, label: current[key].label, color: current[key].color,
        })),
      };
    }
    if (section.merge) {
      const rows = new Map();
      optionSets.filter(set => set.name === section.name).forEach(set => {
        (set.values || []).slice().sort(byOrder).forEach(value => {
          const row = rows.get(value.value) || { id: value.value, ids: [], defaultLabel: value.default_label, label: value.label };
          row.ids.push(value.id);
          rows.set(value.value, row);
        });
      });
      return { ...section, title, rows: [...rows.values()] };
    }
    const set = optionSets.find(s => s.entity_type === section.entity && s.name === section.name);
    return {
      ...section, title,
      rows: (set?.values || []).slice().sort(byOrder).map(value => ({
        id: value.id, ids: [value.id], defaultLabel: value.default_label, label: value.label,
      })),
    };
  });
}

function ColorPicker({ value, onChange }) {
  const swatch = swatchFor(value);
  return (
    <Select value={swatch.hex} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[64px] px-2 gap-1" aria-label={`Colour: ${swatch.name}`}>
        <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: swatch.hex }} />
      </SelectTrigger>
      <SelectContent>
        {SWATCHES.map(s => (
          <SelectItem key={s.hex} value={s.hex}>
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: s.hex }} />{s.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditLabelsDrawer({ group, sections, statusLabels, accountId, onClose }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => Object.fromEntries(
    sections.flatMap(section => section.rows).map(row => [row.id, { label: row.label, color: row.color }]),
  ));
  const rows = sections.flatMap(section => section.rows);
  const isChanged = (section, row) => draft[row.id].label.trim() !== row.label || (section.kind === 'settings' && draft[row.id].color !== row.color);
  const changed = sections.flatMap(section => section.rows.filter(row => isChanged(section, row)));
  const blank = rows.some(row => !draft[row.id].label.trim());

  const save = useMutation({
    mutationFn: async () => {
      const settingsSections = sections.filter(section => section.kind === 'settings' && section.rows.some(row => isChanged(section, row)));
      if (settingsSections.length) {
        const next = { ...statusLabels.raw };
        settingsSections.forEach(section => {
          // Only what differs from the default is stored, so later default changes still reach this account.
          next[section.settingsKey] = Object.fromEntries(section.rows.flatMap(row => {
            const { label, color } = draft[row.id];
            const base = section.defaults[row.key];
            if (label.trim() === base.label && color === base.color) return [];
            return [[row.key, { label: label.trim(), ...(color !== base.color ? { color } : {}) }]];
          }));
        });
        await settingsApi.updateAccountSettings(accountId, { status_labels: next });
        const work = settingsSections.find(section => section.settingsKey === 'WORK_STATUS');
        if (work) {
          // Keep the status dropdowns in the edit dialogs in step with the pills.
          const sets = await settingsApi.listOptionSetsWithValues(accountId);
          await Promise.all(work.rows.filter(row => isChanged(work, row)).flatMap(row => {
            const value = WORK_STATUS_OPTION_VALUES[row.key];
            if (!value) return [];
            return sets
              .filter(set => ['PORTFOLIO', 'PROGRAM', 'PROJECT'].includes(set.entity_type) && set.name === 'STATUS')
              .flatMap(set => (set.values || []).filter(v => v.value === value))
              .map(v => settingsApi.updateOptionValue(v.id, { label: draft[row.id].label.trim() }));
          }));
        }
      }
      await Promise.all(changed.flatMap(row => row.ids.map(id => settingsApi.updateOptionValue(id, { label: draft[row.id].label.trim() }))));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSettingsQueryKey(accountId) });
      queryClient.invalidateQueries({ queryKey: ['account-options', accountId] });
      queryClient.invalidateQueries({ queryKey: ['status-label-options', accountId] });
      queryClient.invalidateQueries({ queryKey: ['option-set-values'] });
      toast({ title: 'Labels saved', description: `${group.title} labels are updated everywhere.` });
      onClose();
    },
    onError: (error) => toastError(error.message || 'The labels could not be saved.'),
  });

  const Icon = group.icon;
  return (
    <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle style={{ color: NAVY }}>Edit Labels</SheetTitle>
      </SheetHeader>
      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" style={{ color: NAVY }} /></span>
          <p className="text-base font-semibold" style={{ color: NAVY }}>{group.title}</p>
        </div>
        <p className="text-sm" style={{ color: MUTED }}>{group.drawerText}</p>
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: '#EEF4FF', color: '#1E3A8A' }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-px" />
          <span>You can rename the labels to match your organization&apos;s terminology. The status behavior and reporting will remain the same.</span>
        </div>

        {sections.map((section, index) => { const withColor = section.kind === 'settings'; return (
          <div key={section.title || index} className="rounded-lg border border-slate-200 overflow-hidden">
            {section.title && <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-slate-50 border-b border-slate-200" style={{ color: MUTED }}>{section.title}</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs border-b border-slate-100" style={{ color: NAVY }}>
                  <th className="px-3 py-2 font-semibold w-[38%]">
                    <span className="inline-flex items-center gap-1">Default Label
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs font-normal">The name the app ships with. Reset to Defaults brings it back.</TooltipContent>
                      </Tooltip></TooltipProvider>
                    </span>
                  </th>
                  <th className="px-3 py-2 font-semibold">Label <span className="font-normal" style={{ color: MUTED }}>(What users will see)</span></th>
                  {withColor && <th className="px-3 py-2 font-semibold w-[76px]">Color</th>}
                </tr>
              </thead>
              <tbody>
                {section.rows.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-xs" style={{ color: MUTED }}>This list isn&apos;t set up for the account.</td></tr>
                )}
                {section.rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2 text-slate-700">{row.defaultLabel || <span className="italic" style={{ color: MUTED }}>Custom</span>}</td>
                    <td className="px-3 py-2">
                      <Input value={draft[row.id].label} maxLength={50} className="h-8 text-sm"
                        onChange={e => setDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], label: e.target.value } }))} />
                    </td>
                    {withColor && (
                      <td className="px-3 py-2">
                        <ColorPicker value={draft[row.id].color} onChange={color => setDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], color } }))} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ); })}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button className="text-white" style={{ backgroundColor: NAVY }} disabled={save.isPending || blank || !changed.length} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Save Changes
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

/** Settings > Status & Priority Labels: rename (and for statuses the app works out, recolour) the labels people see. */
export default function StatusLabelsSettings() {
  const { selectedAccountId, selectedAccount } = useAuth();
  const queryClient = useQueryClient();
  const statusLabels = useStatusLabels();
  const [openKey, setOpenKey] = useState(null);
  const canEdit = selectedAccount?.role === 'OWNER';

  const { data: optionSets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['status-label-options', selectedAccountId],
    queryFn: () => settingsApi.listOptionSetsWithValues(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  const open = GROUPS.find(group => group.key === openKey);
  const sections = useMemo(() => (open ? buildSections(open, optionSets, statusLabels) : []), [open, optionSets, statusLabels]);

  const reset = useMutation({
    mutationFn: () => settingsApi.resetStatusLabels(selectedAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSettingsQueryKey(selectedAccountId) });
      queryClient.invalidateQueries({ queryKey: ['account-options', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['status-label-options', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['option-set-values'] });
      toast({ title: 'Labels reset', description: 'Every status, type and priority label is back to its default.' });
    },
    onError: (error) => toastError(error.message || 'The labels could not be reset.'),
  });

  const confirmReset = async () => {
    const ok = await confirmAction({
      title: 'Reset all labels to their defaults?',
      description: 'Every renamed status, type, priority and health label goes back to its original name and colour. Values your account added keep their names.',
      confirmLabel: 'Reset to Defaults',
    });
    if (ok) reset.mutate();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0"><Tag className="w-5 h-5" style={{ color: NAVY }} /></span>
          <div>
            <p className="text-base font-bold" style={{ color: NAVY }}>Status &amp; Priority Labels</p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>Customize the names for statuses, types, and priorities used across Row. Changes apply everywhere in the app.</p>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1.5 bg-white" style={{ color: NAVY }} disabled={reset.isPending} onClick={confirmReset}>
            {reset.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Reset to Defaults
          </Button>
        )}
      </div>
      <div className="px-5 pb-5 space-y-2.5">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: '#EEF4FF', color: '#1E3A8A' }}>
          <Info className="w-4 h-4 flex-shrink-0" />
          Rename the labels to match your organization&apos;s terminology. The status behavior and reporting will remain the same.
        </div>
        {isError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 flex items-center justify-between">
            The label lists could not load. <button type="button" className="font-medium underline" onClick={() => refetch()}>Retry</button>
          </div>
        )}
        {GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.key} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
              <Icon className="w-5 h-5 flex-shrink-0" style={{ color: NAVY }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: NAVY }}>{group.title}</p>
                <p className="text-xs truncate" style={{ color: MUTED }}>{group.description}</p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" className="gap-1.5 bg-white h-8" style={{ color: NAVY }}
                  disabled={group.sections.some(section => section.kind === 'options') && (isLoading || isError)} onClick={() => setOpenKey(group.key)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Labels
                </Button>
              )}
              {canEdit && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
            </div>
          );
        })}
        {!canEdit && <p className="text-xs pt-1" style={{ color: MUTED }}>Only account owners can change these labels.</p>}
      </div>

      <Sheet open={!!open} onOpenChange={(value) => { if (!value) setOpenKey(null); }}>
        {open && (
          <EditLabelsDrawer key={open.key} group={open} sections={sections} statusLabels={statusLabels}
            accountId={selectedAccountId} onClose={() => setOpenKey(null)} />
        )}
      </Sheet>
    </div>
  );
}
