import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { parseDate } from '@/lib/dateUtils';
const STATUS_CONFIG = {
  on_hold: { label: 'On Hold', pill: 'bg-orange-100 text-orange-700' },
  not_started: { label: 'Not Started', pill: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', pill: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', pill: 'bg-emerald-100 text-emerald-700' },
};
const STATUS_ORDER = ['not_started', 'in_progress', 'on_hold', 'completed'];
const COLS = 'minmax(180px,2fr) 120px 108px 140px 140px minmax(120px,1fr) minmax(120px,1fr) 88px';
const BORDER = 'border-slate-300';

const resolveStatus = (s) => {
  if (s === 'completed' || s === 'done' || s === 'complete') return 'completed';
  if (s === 'in_progress') return 'in_progress';
  if (s === 'on_hold' || s === 'blocked') return 'on_hold';
  return 'not_started';
};

const inputCls = 'w-full h-full min-h-[44px] bg-transparent border-0 outline-none text-xs px-2 text-slate-700 focus:bg-slate-100';

export default function BoardView({ tasks = [], onTaskClick, onTaskUpdate, onAddTask, onDeleteTask }) {
  const [collapsed, setCollapsed] = useState({});
  const [focusNew, setFocusNew] = useState(false);
  const knownIds = useRef(new Set());
  const titleRefs = useRef({});
  const didAutoSection = useRef(false);

  const phases = tasks.filter(t => t.task_type === 'phase').sort((a, b) => (a.order || 0) - (b.order || 0));
  const phasedTaskIds = new Set();
  const phaseGroups = phases.map(phase => {
    const nextPhaseOrder = phases.filter(p => p.order > phase.order).sort((a, b) => a.order - b.order)[0]?.order ?? Infinity;
    const grouped = tasks.filter(t => t.task_type !== 'phase' && (t.order || 0) > (phase.order || 0) && (t.order || 0) < nextPhaseOrder);
    grouped.forEach(t => phasedTaskIds.add(t.id));
    return { phase, tasks: grouped, nextPhaseOrder };
  });
  const ungrouped = tasks.filter(t => t.task_type !== 'phase' && !phasedTaskIds.has(t.id));
  const maxOrderAll = tasks.reduce((m, t) => Math.max(m, t.order || 0), 0);

  useEffect(() => {
    if (didAutoSection.current) return;
    if (tasks.length === 0 && onAddTask) {
      didAutoSection.current = true;
      onAddTask({ title: 'Section 1', task_type: 'phase', order: 1000 });
    }
  }, [tasks.length, onAddTask]);

  // Auto-focus the title cell of a newly created row (Monday.com style).
  useEffect(() => {
    if (focusNew) {
      const newTask = tasks.find(t => !knownIds.current.has(t.id));
      if (newTask) {
        setFocusNew(false);
        setTimeout(() => { const el = titleRefs.current[newTask.id]; if (el) { el.focus(); el.select(); } }, 40);
      }
    }
    tasks.forEach(t => knownIds.current.add(t.id));
  }, [tasks, focusNew]);

  const handleAddInline = (sectionId, phase, nextPhaseOrder) => {
    let order;
    if (sectionId === '__ungrouped') {
      const firstPhaseOrder = phases[0]?.order ?? Infinity;
      order = firstPhaseOrder !== Infinity ? firstPhaseOrder - 1 : maxOrderAll + 1;
    } else if (phase) {
      const grp = phaseGroups.find(g => g.phase.id === sectionId);
      const mo = (grp?.tasks || []).reduce((m, t) => Math.max(m, t.order || 0), phase.order || 0);
      order = mo + 1;
      if (nextPhaseOrder !== Infinity && order >= nextPhaseOrder) order = (phase.order + nextPhaseOrder) / 2;
    } else {
      order = maxOrderAll + 1;
    }
    onAddTask?.({ title: 'New Task', task_type: 'activity', order });
    setFocusNew(true);
  };

  const addSection = () => {
    onAddTask?.({ title: 'New Section', task_type: 'phase', order: maxOrderAll + 1000 });
  };

  const handleDeleteSection = (phase, groupTasks) => {
    if (!window.confirm('Delete this section and all its tasks?')) return;
    groupTasks.forEach(t => onDeleteTask?.(t.id));
    onDeleteTask?.(phase.id);
  };

  const renderColumns = () => (
    <div className={cn('grid border-b', BORDER, 'bg-slate-50')} style={{ gridTemplateColumns: COLS }}>
      {['Task Name', 'Status', '% Complete', 'Start Date', 'End Date', 'Assigned to', 'Owner', 'Updates'].map((h, i, arr) => (
        <div key={h} className={cn('py-2.5 px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider', i < arr.length - 1 && cn('border-r', BORDER))}>{h}</div>
      ))}
    </div>
  );

  const renderTaskRow = (task) => {
    const st = STATUS_CONFIG[resolveStatus(task.status)];
    const isOverdue = task.due_date && parseDate(task.due_date) < new Date() && resolveStatus(task.status) !== 'completed';
    const commentCount = task.comments?.length || 0;
    const progress = task.progress || 0;
    return (
      <div className={cn('grid items-stretch border-b', BORDER)} style={{ gridTemplateColumns: COLS, minHeight: 44 }}>
        {/* Task Name */}
        <div className={cn('border-r', BORDER)}>
          <input ref={el => { titleRefs.current[task.id] = el; }} defaultValue={task.title} key={task.id + '-title'}
            onBlur={e => { const v = e.target.value.trim(); if (v && v !== task.title) onTaskUpdate?.(task.id, { title: v }); }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            className={cn(inputCls, 'font-medium')} />
        </div>
        {/* Status */}
        <div className={cn('border-r', BORDER, 'flex items-center px-1')}>
          <Select value={resolveStatus(task.status)} onValueChange={(v) => onTaskUpdate?.(task.id, { status: v })}>
            <SelectTrigger className="h-8 border-0 bg-transparent text-xs px-1 shadow-none focus:ring-0 w-full">
              <SelectValue><span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap', st.pill)}>{st.label}</span></SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map(s => <SelectItem key={s} value={s}><span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full', STATUS_CONFIG[s].pill)}>{STATUS_CONFIG[s].label}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* % Complete */}
        <div className={cn('border-r', BORDER, 'flex items-center justify-center gap-0.5')}>
          <input type="number" min="0" max="100" value={progress}
            onChange={e => onTaskUpdate?.(task.id, { progress: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
            className="w-12 bg-transparent border-0 outline-none text-xs text-slate-600 text-center focus:bg-slate-100 rounded px-1 py-0.5" />
          <span className="text-[10px] text-slate-400">%</span>
        </div>
        {/* Start Date */}
        <div className={cn('border-r', BORDER)}>
          <input type="date" value={task.start_date || ''} onChange={e => onTaskUpdate?.(task.id, { start_date: e.target.value })} className={inputCls} />
        </div>
        {/* End Date */}
        <div className={cn('border-r', BORDER)}>
          <input type="date" value={task.due_date || ''} onChange={e => onTaskUpdate?.(task.id, { due_date: e.target.value })}
            className={cn(inputCls, isOverdue && 'text-red-600 font-semibold')} />
        </div>
        {/* Assigned to */}
        <div className={cn('border-r', BORDER)}>
          <input defaultValue={(task.resources || []).join(', ')} key={task.id + '-res'} placeholder="—"
            onBlur={e => onTaskUpdate?.(task.id, { resources: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className={inputCls} />
        </div>
        {/* Owner */}
        <div className={cn('border-r', BORDER)}>
          <input defaultValue={task.assignee || ''} key={task.id + '-own'} placeholder="—"
            onBlur={e => onTaskUpdate?.(task.id, { assignee: e.target.value.trim() })}
            className={inputCls} />
        </div>
        {/* Actions */}
        <div className="flex items-center justify-center gap-0.5 px-1">
          <button onClick={() => onTaskClick?.(task)} className="flex items-center gap-0.5 px-1.5 py-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Updates">
            <MessageSquare className="w-3.5 h-3.5" />{commentCount > 0 && <span className="text-[10px] font-semibold">{commentCount}</span>}
          </button>
          <button onClick={() => { if (window.confirm('Delete this task?')) onDeleteTask?.(task.id); }} className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete task">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderAddItem = (sectionId, phase, nextPhaseOrder) => (
    <button onClick={() => handleAddInline(sectionId, phase, nextPhaseOrder)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#002046] px-4 py-2 w-full text-left">
      <Plus className="w-3 h-3" /> Add task
    </button>
  );

  const renderSection = (groupId, label, groupTasks, phase, nextPhaseOrder, editable) => {
    const isCollapsed = collapsed[groupId];
    const total = groupTasks.length;
    const done = groupTasks.filter(t => resolveStatus(t.status) === 'completed').length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    return (
      <div key={groupId} className="mb-4 bg-white border border-slate-300 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none" style={{ background: '#002046' }} onClick={() => setCollapsed(p => ({ ...p, [groupId]: !p[groupId] }))}>
          <span className="text-white/70">{isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          {editable && phase ? (
            <input defaultValue={phase.title} key={phase.id + '-hdr'} onClick={e => e.stopPropagation()}
              onBlur={e => { const v = e.target.value.trim(); if (v && v !== phase.title) onTaskUpdate?.(phase.id, { title: v }); }}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              className="flex-1 bg-transparent text-white text-sm font-semibold outline-none px-2 py-0.5 rounded hover:bg-white/10 focus:bg-white/20" placeholder="Section name" />
          ) : (
            <span className="text-sm font-semibold text-white flex-1 truncate">{label}</span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#c87b14' }} /></div>
            <span className="text-xs text-white/60 w-8 text-right">{pct}%</span>
            <span className="text-xs text-white/40">{total} task{total !== 1 ? 's' : ''}</span>
            {editable && phase && (
              <button onClick={e => { e.stopPropagation(); handleDeleteSection(phase, groupTasks); }} className="p-1 ml-1 text-white/60 hover:text-white hover:bg-white/10 rounded" title="Delete section"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>
        {!isCollapsed && (
          <div className={cn('border-t', BORDER)}>
            {renderColumns()}
            {groupTasks.length === 0 && <div className="px-4 py-6 text-xs text-slate-400 text-center">No tasks yet. Add one below.</div>}
            {groupTasks.map(task => renderTaskRow(task))}
            {renderAddItem(groupId, phase, nextPhaseOrder)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      {phaseGroups.map(g => renderSection(g.phase.id, g.phase.title, g.tasks, g.phase, g.nextPhaseOrder, true))}
      {ungrouped.length > 0 && renderSection('__ungrouped', 'Other Tasks', ungrouped, null, Infinity, false)}
      <button onClick={addSection} className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-slate-500 hover:text-[#002046] border-2 border-dashed border-slate-300 hover:border-[#002046] rounded-xl w-full transition-colors">
        <Plus className="w-4 h-4" /> Add section
      </button>
    </div>
  );
}