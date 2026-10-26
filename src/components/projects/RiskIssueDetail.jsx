import React, { useState } from 'react';
import { getRaidStatuses } from '@/lib/raidStatuses';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmAction } from '@/components/ui/confirm-dialog';
import EscalateDialog from './EscalateDialog';

const priorityColors = {
  low: 'bg-blue-100 text-black',
  medium: 'bg-yellow-100 text-black',
  high: 'bg-orange-100 text-black',
  critical: 'bg-red-100 text-black'
};

function DField({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

export default function RiskIssueDetail({
  open,
  onOpenChange,
  item,
  type = 'risk',
  projects,
  resources = [],
  onUpdate,
  onDelete
}) {
  const [formData, setFormData] = useState(item || {});
  const [commentText, setCommentText] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [assignedQ, setAssignedQ] = useState(null);
  const [assignedDrop, setAssignedDrop] = useState(false);
  const [loggedByQ, setLoggedByQ] = useState(null);
  const [loggedByDrop, setLoggedByDrop] = useState(false);

  React.useEffect(() => {
    if (item) { setFormData(item); setCommentText(''); }
  }, [item?.id]);

  if (!open || !item) return null;

  const idField = type === 'risk' ? 'risk_id' : 'issue_id';
  const mitigationField = type === 'risk' ? 'mitigation' : 'resolution';
  const mitigationLabel = type === 'risk' ? 'Mitigation Plan' : 'Issue Resolution';
  const label = type === 'risk' ? 'Risk' : 'Issue';
  const raidStatuses = getRaidStatuses(type);
  const statusOptions = raidStatuses.map(s => ({ value: s.value || s, label: s.label || s }));

  const getProjectName = (id) => projects?.find(p => p.id === id)?.name || '—';

  const save = (field, value) => onUpdate(item.id, { [field]: value });

  const addComment = () => {
    if (!commentText.trim()) return;
    const comments = [...(formData.comments || []), { text: commentText, author: 'You', date: new Date().toISOString() }];
    setFormData(f => ({ ...f, comments }));
    onUpdate(item.id, { comments });
    setCommentText('');
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs font-mono text-slate-500">{item[idField]}</p>
          <h2 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 text-xs"
              onClick={async () => { if (await confirmAction({ title: `Delete this ${label.toLowerCase()}?`, description: 'This cannot be undone.' })) { onDelete(item.id); onOpenChange(false); } }}>
              Delete
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Project */}
          <DField label="Project">
            <p className="text-sm font-medium text-slate-800">{getProjectName(item.project_id)}</p>
          </DField>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <DField label="Status">
              <Select value={formData.status || 'open'} onValueChange={v => { setFormData(f => ({ ...f, status: v })); save('status', v); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DField>
            <DField label="Priority">
              <Select value={formData.priority || 'medium'} onValueChange={v => { setFormData(f => ({ ...f, priority: v })); save('priority', v); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map(p => (
                    <SelectItem key={p} value={p}>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[p])}>{p}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DField>
          </div>

          {/* Escalate: pick a person or team to notify and email; the item is then marked Escalated. */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"
              className={cn('h-8 text-xs gap-1', formData.status === 'escalated' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-600 hover:bg-amber-50')}
              title={formData.status === 'escalated' ? 'Already escalated. Escalate again to notify someone else.' : undefined}
              onClick={() => setEscalateOpen(true)}>
              <Bell className="w-3.5 h-3.5" />{formData.status === 'escalated' ? 'Escalated' : 'Escalate'}
            </Button>
          </div>
          <EscalateDialog
            open={escalateOpen}
            onOpenChange={setEscalateOpen}
            entityType={type === 'risk' ? 'RISK' : 'ISSUE'}
            item={formData}
            code={formData[type === 'risk' ? 'risk_id' : 'issue_id']}
            resources={resources}
            onEscalated={() => {
              if (formData.status === 'escalated') return;
              setFormData(f => ({ ...f, status: 'escalated' }));
              save('status', 'escalated');
            }}
          />

          {/* Assigned To */}
          <DField label="Assigned To">
            <div className="relative">
              <Input
                value={assignedQ !== null ? assignedQ : (formData.assigned_to || '')}
                onChange={e => { setAssignedQ(e.target.value); setAssignedDrop(true); setFormData(f => ({ ...f, assigned_to: e.target.value })); }}
                onFocus={() => { setAssignedQ(formData.assigned_to || ''); setAssignedDrop(true); }}
                onBlur={() => setTimeout(() => { setAssignedDrop(false); setAssignedQ(null); save('assigned_to', formData.assigned_to); }, 200)}
                placeholder="Search or type name..." className="h-8 text-sm"
              />
              {assignedDrop && resources.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                  {resources.filter(r => r.full_name.toLowerCase().includes((assignedQ || '').toLowerCase())).slice(0, 6).map(r => (
                    <button key={r.id} onMouseDown={() => { setFormData(f => ({ ...f, assigned_to: r.full_name })); save('assigned_to', r.full_name); setAssignedDrop(false); setAssignedQ(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700">{r.full_name}</button>
                  ))}
                </div>
              )}
            </div>
          </DField>

          {/* Logged By */}
          <DField label="Logged By">
            <div className="relative">
              <Input
                value={loggedByQ !== null ? loggedByQ : (formData.logged_by || '')}
                onChange={e => { setLoggedByQ(e.target.value); setLoggedByDrop(true); setFormData(f => ({ ...f, logged_by: e.target.value })); }}
                onFocus={() => { setLoggedByQ(formData.logged_by || ''); setLoggedByDrop(true); }}
                onBlur={() => setTimeout(() => { setLoggedByDrop(false); setLoggedByQ(null); save('logged_by', formData.logged_by); }, 200)}
                placeholder="Search or type name..." className="h-8 text-sm"
              />
              {loggedByDrop && resources.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md">
                  {resources.filter(r => r.full_name.toLowerCase().includes((loggedByQ || '').toLowerCase())).slice(0, 6).map(r => (
                    <button key={r.id} onMouseDown={() => { setFormData(f => ({ ...f, logged_by: r.full_name })); save('logged_by', r.full_name); setLoggedByDrop(false); setLoggedByQ(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700">{r.full_name}</button>
                  ))}
                </div>
              )}
            </div>
          </DField>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <DField label="Date Entered">
              <Input type="date" value={formData.date_entered || ''} onChange={e => setFormData(f => ({ ...f, date_entered: e.target.value }))}
                onBlur={e => save('date_entered', e.target.value)} className="h-8 text-xs" />
            </DField>
            <DField label="Target Date">
              <Input type="date" value={formData.target_date || ''} onChange={e => setFormData(f => ({ ...f, target_date: e.target.value }))}
                onBlur={e => save('target_date', e.target.value)} className="h-8 text-xs" />
            </DField>
          </div>

          {/* Description */}
          <DField label="Description">
            <Textarea value={formData.description || ''} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              onBlur={e => save('description', e.target.value)}
              placeholder={`Describe the ${label.toLowerCase()}...`} rows={3} className="text-sm" />
          </DField>

          {/* Mitigation / Resolution */}
          <DField label={mitigationLabel}>
            <Textarea value={formData[mitigationField] || ''} onChange={e => setFormData(f => ({ ...f, [mitigationField]: e.target.value }))}
              onBlur={e => save(mitigationField, e.target.value)}
              placeholder={`Enter ${mitigationLabel.toLowerCase()}...`} rows={3} className="text-sm" />
          </DField>

          {/* Comments */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Comments</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{(formData.comments || []).length}</span>
            </div>
            <div className="space-y-2 mb-3">
              {(formData.comments || []).map((c, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-800">{c.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{c.author} · {new Date(c.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Add a comment..." className="h-8 text-xs flex-1" />
              <Button size="sm" className="h-8" onClick={addComment}>Add</Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}