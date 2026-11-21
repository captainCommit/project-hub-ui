import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { Plus, Layers, FileText, Rocket, Briefcase, Wrench, Search, Eye, MoreHorizontal, Info, User, Calendar, Star, Loader2, Copy, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { templatesApi } from '@/api/collaboration';
import { tasksApi } from '@/api/tasks';
import { useAuth } from '@/lib/AuthContext';
import { confirmAction } from '@/components/ui/confirm-dialog';
import { toastError } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { getDefaultTemplateId, setDefaultTemplateId, templateTasksFromTree } from '@/lib/projectTemplates';
import { NAVY, MUTED, TONES } from './DirectoryKit';

const STANDARD_COLUMNS = [
  { key: 'title', label: 'Task Name', required: true },
  { key: 'status', label: 'Status' },
  { key: 'start_date', label: 'Start' },
  { key: 'due_date', label: 'End' },
  { key: 'duration', label: 'Duration' },
  { key: 'predecessors', label: 'Predecessor' },
  { key: 'progress', label: '% Completion' },
  { key: 'resources', label: 'Assigned To' },
  { key: 'raid', label: 'Related Record' },
  { key: 'task_type', label: 'Type' },
  { key: 'priority', label: 'Priority' },
];
const DEFAULT_COLUMNS = ['title', 'status', 'start_date', 'due_date', 'duration', 'predecessors', 'progress', 'resources', 'raid'];

const ICONS = {
  file: { icon: FileText, tone: 'purple' },
  rocket: { icon: Rocket, tone: 'green' },
  briefcase: { icon: Briefcase, tone: 'orange' },
  wrench: { icon: Wrench, tone: 'grey' },
  layers: { icon: Layers, tone: 'blue' },
};
const SYSTEM_ID = '__standard__';
const SYSTEM_TEMPLATE = {
  id: SYSTEM_ID,
  name: 'Standard Project Template',
  description: 'Default project schedule with standard task columns and views.',
  isSystem: true,
  icon: 'layers',
  columns: DEFAULT_COLUMNS.map(key => ({ key, label: STANDARD_COLUMNS.find(c => c.key === key).label })),
  tasks: [],
};

const columnLabel = (col) => (typeof col === 'string' ? (STANDARD_COLUMNS.find(c => c.key === col)?.label || col) : (col.label || col.key));
const updatedLabel = (t) => {
  const d = t.updated_date ? parseISO(t.updated_date) : null;
  return d && isValid(d) ? format(d, 'MMM d, yyyy') : null;
};

// Starter tasks are typed one per line; two spaces of indent per level, "| 5" for a 5-day duration.
const tasksToText = (tasks = []) => tasks.map(t => `${'  '.repeat(t.level || 0)}${t.name}${t.duration_days ? ` | ${t.duration_days}` : ''}`).join('\n');
const textToTasks = (text) => text.split('\n').map(line => {
  if (!line.trim()) return null;
  const level = Math.floor((line.match(/^ */)[0].length) / 2);
  const [name, days] = line.trim().split('|').map(s => s.trim());
  const duration = Number(days);
  return { name, level, duration_days: Number.isFinite(duration) && duration > 0 ? duration : null };
}).filter(Boolean);

function TemplateIcon({ template, size = 48 }) {
  const meta = ICONS[template.icon] || ICONS.file;
  const tone = TONES[meta.tone];
  const Icon = meta.icon;
  return (
    <span className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, backgroundColor: tone.bg }}>
      <Icon className="w-6 h-6" style={{ color: tone.fg }} />
    </span>
  );
}

function PreviewDialog({ template, onClose, onUse }) {
  if (!template) return null;
  const columns = Array.isArray(template.columns) && template.columns.length ? template.columns : SYSTEM_TEMPLATE.columns;
  const tasks = Array.isArray(template.tasks) ? template.tasks : [];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <TemplateIcon template={template} size={40} />
            <div>
              <DialogTitle style={{ color: NAVY }}>{template.name}</DialogTitle>
              {template.description && <p className="text-sm mt-0.5" style={{ color: MUTED }}>{template.description}</p>}
            </div>
          </div>
        </DialogHeader>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Sheet columns</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead><tr style={{ backgroundColor: NAVY }}>{columns.map((c, i) => <th key={i} className="px-3 py-2 text-left text-white font-semibold whitespace-nowrap">{columnLabel(c)}</th>)}</tr></thead>
            <tbody>
              {(tasks.length ? tasks.slice(0, 12) : [null, null, null]).map((t, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {columns.map((c, j) => (
                    <td key={j} className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {j === 0 && t ? <span style={{ paddingLeft: (t.level || 0) * 14, color: NAVY }} className={cn(!t.level && 'font-semibold')}>{t.name}</span>
                        : (columnLabel(c) === 'Duration' && t?.duration_days ? `${t.duration_days}d` : <span className="text-slate-300">—</span>)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm" style={{ color: MUTED }}>
          {tasks.length ? `${tasks.length} starter task${tasks.length === 1 ? '' : 's'} are copied into each new project${tasks.length > 12 ? ' (first 12 shown)' : ''}.` : 'New projects start with an empty schedule.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onUse && <Button onClick={() => { onUse(template); onClose(); }} style={{ backgroundColor: NAVY }}>Use for a new project</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({ open, initial, mode, templates, projects, onClose, onSave, saving }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('file');
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [tasksText, setTasksText] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setIcon(initial?.icon || 'file');
    const cols = Array.isArray(initial?.columns) && initial.columns.length ? initial.columns.map(c => (typeof c === 'string' ? c : c.key)) : DEFAULT_COLUMNS;
    setColumns(cols.filter(k => STANDARD_COLUMNS.some(c => c.key === k)));
    setTasksText(tasksToText(initial?.tasks));
    setSourceId('');
  }, [open, initial]);

  const pickSource = async (id) => {
    setSourceId(id);
    if (mode === 'duplicate') {
      const t = [SYSTEM_TEMPLATE, ...templates].find(x => x.id === id);
      if (!t) return;
      setName(`${t.name} (copy)`); setDescription(t.description || ''); setIcon(t.icon || 'file');
      setColumns((t.columns || []).map(c => (typeof c === 'string' ? c : c.key)).filter(k => STANDARD_COLUMNS.some(c => c.key === k)));
      setTasksText(tasksToText(t.tasks));
      return;
    }
    // From a project: its task outline becomes the starter schedule.
    const project = projects.find(p => p.id === id);
    setLoadingSource(true);
    try {
      const tree = await tasksApi.getTree(id);
      setTasksText(tasksToText(templateTasksFromTree(tree)));
      if (!name) setName(`${project?.name || 'Project'} template`);
    } catch (error) {
      toastError(error.message || 'The project schedule could not be loaded.');
    } finally {
      setLoadingSource(false);
    }
  };

  const toggleColumn = (key) => setColumns(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      columns: STANDARD_COLUMNS.filter(c => c.required || columns.includes(c.key)).map(c => ({ key: c.key, label: c.label })),
      tasks: textToTasks(tasksText),
    });
  };

  const title = initial?.id ? 'Edit Template' : mode === 'duplicate' ? 'Duplicate a Template' : mode === 'project' ? 'Save a Project as a Template' : 'New Template';
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle style={{ color: NAVY }}>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!initial?.id && mode !== 'scratch' && (
            <div>
              <label className="text-sm font-medium" style={{ color: NAVY }}>{mode === 'duplicate' ? 'Template to copy' : 'Project to copy the schedule from'}</label>
              <Select value={sourceId || undefined} onValueChange={pickSource}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={mode === 'duplicate' ? 'Choose a template…' : 'Choose a project…'} /></SelectTrigger>
                <SelectContent>
                  {mode === 'duplicate'
                    ? [SYSTEM_TEMPLATE, ...templates].map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                    : projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {loadingSource && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: MUTED }}><Loader2 className="w-3 h-3 animate-spin" /> Copying the schedule…</p>}
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="text-sm font-medium" style={{ color: NAVY }}>Template name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. IT Implementation Template" className="mt-1" />
            </div>
            <div className="flex gap-1">
              {Object.keys(ICONS).map(k => (
                <button key={k} type="button" onClick={() => setIcon(k)} className={cn('rounded-xl p-0.5 border-2', icon === k ? 'border-[#002046]' : 'border-transparent')} aria-label={`Icon ${k}`}>
                  <TemplateIcon template={{ icon: k }} size={36} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: NAVY }}>Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What is this template for?" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: NAVY }}>Sheet columns</label>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_COLUMNS.map(col => {
                const on = col.required || columns.includes(col.key);
                return (
                  <button key={col.key} type="button" disabled={col.required} onClick={() => toggleColumn(col.key)}
                    className={cn('px-3 py-1.5 rounded-full text-xs border', on ? 'bg-[#002046] text-white border-[#002046]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50', col.required && 'opacity-70')}>
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: NAVY }}>Starter tasks</label>
            <p className="text-xs mb-1" style={{ color: MUTED }}>One task per line. Indent with two spaces to put a task under the one above; add "| 5" for a 5-day duration.</p>
            <Textarea value={tasksText} onChange={e => setTasksText(e.target.value)} rows={8} className="font-mono text-xs"
              placeholder={'Discovery\n  Gather requirements | 5\n  Sign-off | 1\nBuild\n  Configure system | 10'} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || saving} style={{ backgroundColor: NAVY }}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}{initial?.id ? 'Save Changes' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Project templates: the built-in standard template plus the account's own. One of them is the default that
 * new projects start from; onUseTemplate(templateId) opens the new-project form with a template chosen
 * ('' = standard). projects: for "save a project as a template".
 */
export default function TemplatesView({ onUseTemplate = undefined, projects = [] }) {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null);
  const [editor, setEditor] = useState(null); // { mode, initial }
  const [defaultId, setDefaultId] = useState(getDefaultTemplateId);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['project_templates', selectedAccountId],
    queryFn: () => templatesApi.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project_templates'] });
  const save = useMutation({
    mutationFn: ({ id, data }) => (id ? templatesApi.update(id, data) : templatesApi.create(selectedAccountId, data)),
    onSuccess: () => { invalidate(); setEditor(null); },
    onError: (error) => toastError(error.message),
  });
  const remove = useMutation({
    mutationFn: (id) => templatesApi.delete(id),
    onSuccess: (_r, id) => { if (defaultId === id) { setDefaultTemplateId(''); setDefaultId(''); } invalidate(); },
    onError: (error) => toastError(error.message),
  });

  const makeDefault = (id) => { const next = id === SYSTEM_ID ? '' : id; setDefaultTemplateId(next); setDefaultId(next); };
  const isDefault = (t) => (t.isSystem ? !defaultId || !templates.some(x => x.id === defaultId) : t.id === defaultId);

  const all = useMemo(() => [SYSTEM_TEMPLATE, ...templates], [templates]);
  const shown = all.filter(t => {
    if (search && !`${t.name} ${t.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'system' && !t.isSystem) return false;
    if (filter === 'mine' && t.isSystem) return false;
    if (filter === 'default' && !isDefault(t)) return false;
    return true;
  });

  const startProjectFrom = (t) => onUseTemplate?.(t.isSystem ? '' : t.id);

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: '#F7F9FC' }}>
      <div className="px-8 py-7 max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold leading-tight" style={{ color: NAVY }}>Project Templates</h1>
            <p className="text-base mt-1" style={{ color: MUTED }}>Start projects faster with reusable schedules and workflows.</p>
          </div>
          <Button onClick={() => setEditor({ mode: 'scratch' })} className="h-11 px-5 text-[15px] gap-2" style={{ backgroundColor: NAVY }}>
            <Plus className="w-5 h-5" /> Create Template
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: NAVY }} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="h-12 pl-12 text-[15px] bg-white" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-12 w-[220px] bg-white text-[15px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="system">System templates</SelectItem>
              <SelectItem value="mine">Created by you</SelectItem>
              <SelectItem value="default">Default template</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>Available Templates</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200/70" style={{ color: NAVY }}>{all.length} template{all.length === 1 ? '' : 's'}</span>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shown.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-[#E6ECF4] p-5 flex flex-col">
              <div className="flex items-start gap-4">
                <TemplateIcon template={t} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold" style={{ color: NAVY }}>{t.name}</p>
                    {t.isSystem && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100" style={{ color: NAVY }}>System</span>}
                    {isDefault(t) && <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: TONES.amber.bg, color: TONES.amber.fg }}><Star className="w-3 h-3" /> Default</span>}
                  </div>
                  {t.description && <p className="text-sm mt-1 line-clamp-2" style={{ color: MUTED }}>{t.description}</p>}
                </div>
                {!t.isSystem ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="p-1 rounded hover:bg-slate-100" aria-label="Template actions"><MoreHorizontal className="w-5 h-5" style={{ color: NAVY }} /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onUseTemplate && <DropdownMenuItem onClick={() => startProjectFrom(t)}>Use for a new project</DropdownMenuItem>}
                      {!isDefault(t) && <DropdownMenuItem onClick={() => makeDefault(t.id)}>Set as default</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => setEditor({ mode: 'edit', initial: t })}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditor({ mode: 'duplicate', initial: { ...t, id: undefined, name: `${t.name} (copy)` } })}>Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600"
                        onClick={async () => { if (await confirmAction({ title: `Delete "${t.name}"?`, description: 'Projects already created from it are not affected.' })) remove.mutate(t.id); }}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="p-1 rounded hover:bg-slate-100" aria-label="Template actions"><MoreHorizontal className="w-5 h-5" style={{ color: NAVY }} /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onUseTemplate && <DropdownMenuItem onClick={() => startProjectFrom(t)}>Use for a new project</DropdownMenuItem>}
                      {!isDefault(t) && <DropdownMenuItem onClick={() => makeDefault(SYSTEM_ID)}>Set as default</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => setEditor({ mode: 'duplicate', initial: { ...SYSTEM_TEMPLATE, id: undefined, isSystem: false, name: 'Standard Project Template (copy)' } })}>Duplicate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-auto pt-4">
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  {t.isSystem ? (
                    <span className="flex items-center gap-2 text-sm" style={{ color: MUTED }}><Info className="w-4 h-4" /> System template (read-only)</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: MUTED }}>
                      <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> Created by you</span>
                      {updatedLabel(t) && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Updated {updatedLabel(t)}</span>}
                    </span>
                  )}
                  <Button variant="outline" size="sm" className="ml-auto h-9 gap-1.5" onClick={() => setPreview(t)}><Eye className="w-4 h-4" /> Preview</Button>
                </div>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="text-sm py-10 text-center lg:col-span-2" style={{ color: MUTED }}>No templates match your search.</p>}
        </div>

        <div className="rounded-xl border border-[#E6ECF4] px-6 py-5 flex flex-wrap items-center gap-5" style={{ backgroundColor: '#F1F5FB' }}>
          <span className="w-16 h-14 rounded-lg flex items-center justify-center bg-white border border-[#DCE6F5]"><Plus className="w-7 h-7" style={{ color: '#7C9BD1' }} /></span>
          <div className="flex-1 min-w-[240px] border-l border-slate-200 pl-5">
            <p className="text-lg font-bold" style={{ color: NAVY }}>Create a New Template</p>
            <p className="text-sm" style={{ color: MUTED }}>Build a reusable template from scratch, duplicate an existing template, or save a project as a template.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 bg-white"><Plus className="w-4 h-4" /> Create Template</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditor({ mode: 'scratch' })}><Plus className="w-4 h-4 mr-2" /> From scratch</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditor({ mode: 'duplicate' })}><Copy className="w-4 h-4 mr-2" /> Duplicate a template</DropdownMenuItem>
              <DropdownMenuItem disabled={!projects.length} onClick={() => setEditor({ mode: 'project' })}><FolderInput className="w-4 h-4 mr-2" /> Save a project as a template</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PreviewDialog template={preview} onClose={() => setPreview(null)} onUse={onUseTemplate ? startProjectFrom : undefined} />
      <TemplateEditor
        open={!!editor}
        mode={editor?.initial?.id ? 'edit' : editor?.mode === 'edit' ? 'scratch' : editor?.mode || 'scratch'}
        initial={editor?.initial}
        templates={templates}
        projects={projects}
        saving={save.isPending}
        onClose={() => setEditor(null)}
        onSave={(data) => save.mutate({ id: editor?.initial?.id, data })}
      />
    </div>
  );
}
