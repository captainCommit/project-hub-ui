import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Folder, Plus, Trash2, Star, X, ArrowLeft, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { templatesApi } from '@/api/collaboration';
import { useAuth } from '@/lib/AuthContext';
import { confirmAction } from '@/components/ui/confirm-dialog';

const STANDARD_COLUMNS = [
  { key: 'task_type',    label: 'Type',         type: 'text' },
  { key: 'title',        label: 'Task Name',    type: 'text', required: true },
  { key: 'duration',     label: 'Duration',     type: 'number' },
  { key: 'start_date',   label: 'Start',        type: 'date' },
  { key: 'due_date',     label: 'Finish',       type: 'date' },
  { key: 'predecessors', label: 'Predecessors', type: 'text' },
  { key: 'status',       label: 'Status',       type: 'text' },
  { key: 'resources',    label: 'Resource',     type: 'text' },
  { key: 'progress',     label: '% Complete',   type: 'number' },
  { key: 'risk_id',      label: 'Risk ID',      type: 'text' },
  { key: 'issue_id',     label: 'Issue ID',     type: 'text' },
];

const TYPE_LABELS = { text: 'Text', date: 'Date', number: 'Number / Budget' };
const SYSTEM_TEMPLATE_ID = '__system__';

const SYSTEM_TEMPLATE = {
  id: SYSTEM_TEMPLATE_ID,
  name: 'Standard Project Template',
  description: 'Default template covering all standard project columns.',
  isSystem: true,
};

function getSavedColOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem('template_col_order') || 'null');
    if (saved && saved.length === STANDARD_COLUMNS.length) return saved;
  } catch {}
  return STANDARD_COLUMNS.map(c => c.key);
}

// ─── Drag-in-table column reorder ─────────────────────────────────────────────
function ColReorderTable({ colOrder, onChange }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const orderedCols = colOrder.map(k => STANDARD_COLUMNS.find(c => c.key === k)).filter(Boolean);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...colOrder];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragIdx(null); setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            {orderedCols.map((col, idx) => (
              <th key={col.key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'px-3 py-2.5 text-left text-slate-600 font-semibold whitespace-nowrap cursor-grab active:cursor-grabbing select-none transition-colors',
                  dragOverIdx === idx && dragIdx !== idx ? 'bg-indigo-100 border-l-2 border-indigo-400' : '',
                  dragIdx === idx ? 'opacity-40 bg-slate-200' : 'hover:bg-slate-100'
                )}>
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                  {col.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(i => (
            <tr key={i} className="border-b border-slate-50">
              {orderedCols.map(c => <td key={c.key} className="px-3 py-2 text-slate-300 italic">—</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── View Template Modal ───────────────────────────────────────────────────────
function ViewTemplateModal({ open, onOpenChange }) {
  const [colOrder, setColOrder] = useState(getSavedColOrder);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (open) { setColOrder(getSavedColOrder()); setSaved(false); } }, [open]);

  const handleSave = () => {
    localStorage.setItem('template_col_order', JSON.stringify(colOrder));
    setSaved(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Standard Project Template</DialogTitle></DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 mb-3">
          <strong>Tip:</strong> Drag any column header to reorder it. Click <strong>Save</strong> to persist the order.
        </div>

        <ColReorderTable colOrder={colOrder} onChange={v => { setColOrder(v); setSaved(false); }} />

        <div className="flex justify-between items-center mt-4">
          <span className={cn('text-xs flex items-center gap-1 transition-opacity', saved ? 'text-emerald-600 opacity-100' : 'opacity-0')}>
            <Check className="w-3.5 h-3.5" /> Column order saved
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Save Order</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({ template, onDelete, onView }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all group relative flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', template.isSystem ? 'bg-indigo-100' : 'bg-blue-50')}>
          {template.isSystem ? <Star className="w-4 h-4 text-indigo-600" /> : <Folder className="w-4 h-4 text-blue-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 truncate">{template.name}</p>
            {template.isSystem && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">System</span>}
          </div>
          {template.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>}
        </div>
        {!template.isSystem && onDelete && (
          <button onClick={() => onDelete(template.id)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {!template.isSystem && Array.isArray(template.columns) && template.columns.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.columns.map((col, i) => {
            const label = typeof col === 'string' ? col : (col.label || col.key);
            return <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{label}</span>;
          })}
        </div>
      )}
      {template.isSystem
        ? <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={onView}>View Template</Button>
        : <Button size="sm" variant="outline" className="h-7 text-xs w-full">Use Template</Button>
      }
    </div>
  );
}

// ─── System Template Reorder (inside editor) ──────────────────────────────────
function SystemTemplateReorder({ onSave, onCancel }) {
  const [colOrder, setColOrder] = useState(getSavedColOrder);

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
        Drag column headers to reorder them. Only column order can be customised for this template.
      </div>
      <ColReorderTable colOrder={colOrder} onChange={setColOrder} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { localStorage.setItem('template_col_order', JSON.stringify(colOrder)); onSave(); }}>
          Save Order
        </Button>
      </div>
    </div>
  );
}

// ─── Template Editor Dialog ────────────────────────────────────────────────────
function TemplateEditorDialog({ open, onOpenChange, existingTemplates = [], onCreate, onUpdate }) {
  const [step, setStep] = useState('choose');
  const [mode, setMode] = useState('new');
  const [sourceTemplateId, setSourceTemplateId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stdCols, setStdCols] = useState(['title', 'task_type', 'assignee', 'start_date', 'due_date', 'status']);
  const [customCols, setCustomCols] = useState([]);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');

  useEffect(() => {
    if (!open) { setStep('choose'); setMode('new'); setSourceTemplateId(''); setName(''); setDescription(''); setStdCols(['title', 'task_type', 'assignee', 'start_date', 'due_date', 'status']); setCustomCols([]); setNewColName(''); }
  }, [open]);

  const loadTemplate = (id) => {
    if (id === SYSTEM_TEMPLATE_ID) { setName('Standard Project Template'); setDescription(''); setStdCols([]); setCustomCols([]); return; }
    const t = existingTemplates.find(x => x.id === id);
    if (!t) return;
    setName(t.name || ''); setDescription(t.description || '');
    const cols = Array.isArray(t.columns) ? t.columns : [];
    const std = cols.filter(c => STANDARD_COLUMNS.some(s => s.key === (typeof c === 'string' ? c : c.key))).map(c => typeof c === 'string' ? c : c.key);
    const custom = cols.filter(c => !STANDARD_COLUMNS.some(s => s.key === (typeof c === 'string' ? c : c.key))).map(c => typeof c === 'string' ? { key: c, label: c, type: 'text' } : c);
    setStdCols(std.length ? std : ['title']); setCustomCols(custom);
  };

  const toggleStd = (key) => { if (key === 'title') return; setStdCols(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]); };
  const addCustomCol = () => {
    if (!newColName.trim()) return;
    const key = newColName.trim().toLowerCase().replace(/\s+/g, '_');
    setCustomCols(p => [...p, { key, label: newColName.trim(), type: newColType }]);
    setNewColName(''); setNewColType('text');
  };
  const removeCustomCol = (idx) => setCustomCols(p => p.filter((_, i) => i !== idx));
  const renameCustomCol = (idx, label) => setCustomCols(p => p.map((c, i) => i === idx ? { ...c, label, key: label.toLowerCase().replace(/\s+/g, '_') } : c));

  const buildColumns = () => [
    ...stdCols.map(k => { const s = STANDARD_COLUMNS.find(x => x.key === k); return { key: k, label: s?.label || k, type: s?.type || 'text' }; }),
    ...customCols,
  ];

  const handleSave = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), description, columns: buildColumns() };
    if (mode === 'update' && sourceTemplateId) onUpdate(sourceTemplateId, data);
    else onCreate(data);
    onOpenChange(false);
  };

  if (step === 'choose') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Custom Template</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Would you like to create a new template or update an existing one?</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => { setMode('new'); setStep('form'); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-sm font-medium text-slate-700">
              <Plus className="w-6 h-6 text-indigo-500" /> Start from scratch
            </button>
            <button onClick={() => { setMode('update'); setStep('form'); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-sm font-medium text-slate-700">
              <Folder className="w-6 h-6 text-blue-500" /> Update existing
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // System template selected for update → just reorder UI
  if (mode === 'update' && sourceTemplateId === SYSTEM_TEMPLATE_ID) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <button onClick={() => setSourceTemplateId('')} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowLeft className="w-4 h-4" /></button>
              <DialogTitle>Update Standard Project Template</DialogTitle>
            </div>
          </DialogHeader>
          <SystemTemplateReorder onSave={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('choose')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"><ArrowLeft className="w-4 h-4" /></button>
            <DialogTitle>{mode === 'update' ? 'Update Template' : 'New Template'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {mode === 'update' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Template to update</label>
              <Select value={sourceTemplateId} onValueChange={v => { setSourceTemplateId(v); loadTemplate(v); }}>
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SYSTEM_TEMPLATE_ID}>⭐ Standard Project Template</SelectItem>
                  {existingTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Template Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. IT Rollout Template" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this template for?" rows={2} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Standard Columns</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STANDARD_COLUMNS.map(col => (
                <label key={col.key} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors',
                  col.required ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-default' :
                  stdCols.includes(col.key) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  <input type="checkbox" checked={stdCols.includes(col.key) || col.required} disabled={col.required} onChange={() => toggleStd(col.key)} className="rounded" />
                  <span className="flex-1">{col.label}</span>
                  <span className="text-[9px] text-slate-400">{col.type}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Custom Columns</label>
            {customCols.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {customCols.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <input className="flex-1 bg-transparent text-xs text-slate-700 outline-none min-w-0"
                      value={col.label} onChange={e => renameCustomCol(idx, e.target.value)} />
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-white border border-slate-200 rounded flex-shrink-0">{TYPE_LABELS[col.type] || col.type}</span>
                    <button onClick={() => removeCustomCol(idx)} className="text-slate-300 hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Column name..."
                className="h-8 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && addCustomCol()} />
              <Select value={newColType} onValueChange={setNewColType}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number / Budget</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 px-3" onClick={addCustomCol} disabled={!newColName.trim()}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {mode === 'update' ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────
export default function TemplatesView() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { selectedAccountId } = useAuth();
  const { data: projectTemplates = [] } = useQuery({
    queryKey: ['project_templates', selectedAccountId],
    queryFn: () => templatesApi.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  const createTemplate = useMutation({
    mutationFn: d => templatesApi.create(selectedAccountId, d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_templates'] })
  });
  const updateTemplate = useMutation({
    mutationFn: ({ id, data }) => templatesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_templates'] })
  });
  const deleteTemplate = useMutation({
    mutationFn: id => templatesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_templates'] })
  });

  return (
    <div className="flex-1 overflow-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Use a template to quickly set up a new project, or save your own.</p>
        </div>
        <Button size="sm" onClick={() => setEditorOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
          <Plus className="w-3.5 h-3.5" /> Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TemplateCard template={SYSTEM_TEMPLATE} onView={() => setViewModalOpen(true)} />
        {projectTemplates.map(template => (
          <TemplateCard key={template.id} template={template}
            onDelete={async id => { if (await confirmAction({ title: 'Delete this template?', description: 'Projects already created from it are not affected.' })) deleteTemplate.mutate(id); }} />
        ))}
        <button onClick={() => setEditorOpen(true)}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group flex flex-col items-center justify-center min-h-[120px]">
          <Plus className="w-7 h-7 text-slate-300 group-hover:text-indigo-400 mb-2" />
          <p className="text-sm text-slate-400 group-hover:text-indigo-500">Save a custom template</p>
        </button>
      </div>

      <TemplateEditorDialog open={editorOpen} onOpenChange={setEditorOpen} existingTemplates={projectTemplates}
        onCreate={data => createTemplate.mutate(data)}
        onUpdate={(id, data) => updateTemplate.mutate({ id, data })} />
      <ViewTemplateModal open={viewModalOpen} onOpenChange={setViewModalOpen} />
    </div>
  );
}