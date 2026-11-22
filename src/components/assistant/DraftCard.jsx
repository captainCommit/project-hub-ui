import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Calendar, CheckCircle2, ExternalLink, FileText, Flag, Folder, FolderTree, Loader2, Pencil, Signal, User, Zap,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const NAVY = '#002046';
const MUTED = '#6B7C99';
const ORANGE = '#E8711A';

const KIND = {
  risk: { label: 'Risk', log: 'Risk Log', view: 'View in Risk Log' },
  issue: { label: 'Issue', log: 'Issue Log', view: 'View in Issue Log' },
  task: { label: 'Task', log: 'schedule', view: 'View task' },
};

const PRIORITY_TONES = {
  CRITICAL: 'bg-red-50 text-red-700', HIGH: 'bg-orange-50 text-orange-700', MEDIUM: 'bg-amber-50 text-amber-700', LOW: 'bg-slate-100 text-slate-600',
};

const Pill = ({ className, children }) => (
  <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium', className)}>{children}</span>
);

/** One label/value line of the card; the value turns into an input while editing. */
function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-[13px]">
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: MUTED }} />
      <span className="w-24 flex-shrink-0 font-medium" style={{ color: NAVY }}>{label}</span>
      <div className="flex-1 min-w-0 text-slate-700">{children}</div>
    </div>
  );
}

const inputClass = 'w-full h-8 rounded-md border border-slate-200 px-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-slate-400';

/**
 * A risk, issue or task Compass drafted: the person reviews it, may edit it, and creates it (as themselves, with
 * their own rights). Once created it shows the new record's number with a link to it.
 *
 * projects: [{ id, name, program_name }] the person can see. options: the account's option sets.
 * onCreate(changes) returns a promise.
 */
export default function DraftCard({ action, projects, options, onCreate }) {
  const { draft, outcome } = action;
  const kind = KIND[draft.kind] || KIND.risk;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => ({
    project_id: draft.project_id || '', title: draft.title || '', cause: draft.cause || '', effect: draft.effect || '',
    description: draft.description || '', priority: draft.priority || '', status: draft.status || '',
    assigned_to_name: draft.assigned_to_name || '', target_date: draft.target_date || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setValues(v => ({ ...v, [key]: value }));

  const choices = useMemo(() => {
    const sets = Array.isArray(options) ? options : [];
    const of = (name) => (sets.find(s => s.entity_type === draft.kind.toUpperCase() && s.name === name)?.values || [])
      .filter(v => v.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(v => ({ value: String(v.value).toUpperCase(), label: v.label }));
    return { priority: of('PRIORITY'), status: of('STATUS') };
  }, [options, draft.kind]);

  if (outcome?.status === 'CREATED') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-[13px]">
          <p className="font-semibold" style={{ color: NAVY }}>
            {kind.label} created: <Link to={outcome.link} className="text-[#1D4ED8] hover:underline">{outcome.number || outcome.title}</Link>
          </p>
          <p className="text-slate-600">The {draft.kind} has been added to the {kind.log}{outcome.project ? ` for ${outcome.project}` : ''}.</p>
        </div>
        <Link to={outcome.link} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50" style={{ color: NAVY }}>
          <ExternalLink className="w-3.5 h-3.5" /> {kind.view}
        </Link>
      </div>
    );
  }

  const project = projects.find(p => p.id === values.project_id);
  const labelOf = (list, value, fallback) => list.find(o => o.value === String(value).toUpperCase())?.label || fallback || '—';
  const projectPicker = (
    <Select value={values.project_id || undefined} onValueChange={set('project_id')}>
      <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Choose a project" /></SelectTrigger>
      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
    </Select>
  );
  const optionPicker = (key, list) => (
    <Select value={String(values[key]).toUpperCase() || undefined} onValueChange={set(key)}>
      <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
      <SelectContent>{list.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
  const text = (key, multiline = false) => (multiline
    ? <textarea value={values[key]} onChange={e => set(key)(e.target.value)} rows={2} className={cn(inputClass, 'h-auto py-1.5')} />
    : <input value={values[key]} onChange={e => set(key)(e.target.value)} className={inputClass} />);

  const create = async () => {
    setSaving(true);
    try {
      await onCreate({
        project_id: values.project_id || undefined, title: values.title.trim(), cause: values.cause, effect: values.effect,
        description: values.description, priority: values.priority || undefined, status: values.status || undefined,
        assigned_to_name: values.assigned_to_name, target_date: values.target_date || undefined,
      });
    } catch {
      // The hook already showed what went wrong.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold mb-2" style={{ color: NAVY }}>Review {kind.label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <Row icon={FolderTree} label="Program">{project?.program_name || draft.program || '—'}</Row>
          <Row icon={Folder} label="Project">{editing || !values.project_id ? projectPicker : project?.name || draft.project}</Row>
          <Row icon={Signal} label="Priority">
            {editing ? optionPicker('priority', choices.priority)
              : <Pill className={PRIORITY_TONES[String(values.priority).toUpperCase()] || PRIORITY_TONES.LOW}>{labelOf(choices.priority, values.priority, draft.priority_label)}</Pill>}
          </Row>
          <Row icon={Flag} label="Status">
            {editing ? optionPicker('status', choices.status)
              : <Pill className="bg-blue-50 text-blue-700">{labelOf(choices.status, values.status, draft.status_label)}</Pill>}
          </Row>
        </div>
        <div>
          <Row icon={FileText} label={draft.kind === 'task' ? 'Name' : 'Title'}>{editing ? text('title') : values.title}</Row>
          {draft.kind === 'risk' ? (
            <>
              <Row icon={Zap} label="Cause (If…)">{editing ? text('cause', true) : values.cause || '—'}</Row>
              <Row icon={AlertTriangle} label="Effect (Then…)">{editing ? text('effect', true) : values.effect || '—'}</Row>
            </>
          ) : (
            <Row icon={FileText} label="Description">{editing ? text('description', true) : values.description || '—'}</Row>
          )}
          {draft.kind !== 'task' && <Row icon={User} label="Assigned To">{editing ? text('assigned_to_name') : values.assigned_to_name || '—'}</Row>}
          <Row icon={Calendar} label={draft.kind === 'task' ? 'Due Date' : 'Target Date'}>
            {editing ? <input type="date" value={values.target_date} onChange={e => set('target_date')(e.target.value)} className={inputClass} /> : values.target_date || '—'}
          </Row>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button type="button" onClick={() => setEditing(e => !e)} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 h-9 text-sm font-medium hover:bg-orange-50 disabled:opacity-50"
          style={{ borderColor: ORANGE, color: ORANGE }}>
          <Pencil className="w-3.5 h-3.5" /> {editing ? 'Done' : 'Edit'}
        </button>
        <button type="button" onClick={create} disabled={saving || !values.project_id || !values.title.trim()}
          title={!values.project_id ? 'Choose a project first' : undefined}
          className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: ORANGE }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create {kind.label}
        </button>
      </div>
    </div>
  );
}
