import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Settings, Download, ExternalLink, Edit2, X, Star, ArrowLeft, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { formatDate, parseDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReportGenerator from '@/components/projects/ReportGenerator';
import StarButton from '@/components/projects/StarButton';
import { useFavorites } from '@/lib/favorites';
import ResourceUtilizationTable from '@/components/projects/ResourceUtilizationTable';
import BudgetForecast from '@/components/projects/BudgetForecast';
import { projectsApi } from '@/api/projects';
import { toastError } from '@/components/ui/use-toast';
import { useAccountResources, invalidateHierarchy } from '@/hooks/useAccountLookups';

const STATUS_MAP = {
  planning:  { label: 'Not Started', cls: 'bg-slate-100 text-slate-600' },
  active:    { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  on_hold:   { label: 'On Hold',     cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled',   cls: 'bg-red-50 text-red-500' },
};
function sInfo(s) { return STATUS_MAP[s] || { label: s || '—', cls: 'bg-slate-100 text-slate-600' }; }

function healthColor(pct) {
  if (pct >= 70) return '#10b981';
  if (pct >= 30) return '#f59e0b';
  return '#ef4444';
}

const PRIORITY_CLS = { critical:'bg-red-100 text-red-700', high:'bg-orange-100 text-orange-700', medium:'bg-amber-100 text-amber-700', low:'bg-slate-100 text-slate-500' };
const PRIORITY_ORDER = { critical:0, high:1, medium:2, low:3 };

function ResourcePicker({ value, resources, onSelect, onClose }) {
  const [q, setQ] = useState(value || '');
  const filtered = resources.filter(r => r.full_name.toLowerCase().includes(q.toLowerCase())).slice(0, 7);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <input autoFocus value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key==='Escape') onClose(); if (e.key==='Enter') onSelect(q); }}
        className="h-7 text-xs border border-slate-300 rounded px-2 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        placeholder="Type name..." />
      {filtered.length > 0 && (
        <div className="absolute top-8 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px]">
          {filtered.map(r => (
            <button key={r.id} onMouseDown={() => onSelect(r.full_name)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700">{r.full_name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Collapsible Card ───────────────────────────────────────────────────────────
function CollapsibleCard({ id, title, collapsed, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-3 border-b border-slate-200 bg-[#002046] flex items-center gap-2 select-none">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex-1">{title}</h3>
        <button onClick={() => onToggle(id)} className="p-1 rounded hover:bg-white/10 text-white/70">
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}

// ── Quarterly Roadmap ──────────────────────────────────────────────────────────
function getQuarters(items) {
  const years = new Set();
  items.forEach(it => {
    if (it.start_date) years.add(it.start_date.slice(0,4));
    if (it.end_date)   years.add(it.end_date.slice(0,4));
  });
  if (!years.size) { const y = new Date().getFullYear(); years.add(String(y)); years.add(String(y+1)); }
  const quarters = [];
  [...years].sort().forEach(y => [1,2,3,4].forEach(q => quarters.push({ year:y, q, label:`Q${q} ${y}` })));
  return quarters;
}
function qStart(year,q){ return `${year}-${String((q-1)*3+1).padStart(2,'0')}-01`; }
function qEnd(year,q){ return `${year}-${['03-31','06-30','09-30','12-31'][q-1]}`; }

function RoadmapBar({ item, quarters, color }) {
  const start = item.start_date || item.end_date;
  const end   = item.end_date   || item.start_date;
  if (!start && !end) return <td colSpan={quarters.length} />;
  const firstQ=quarters[0], lastQ=quarters[quarters.length-1];
  const rs=parseDate(qStart(firstQ.year,firstQ.q)), re=parseDate(qEnd(lastQ.year,lastQ.q));
  const total=re-rs;
  const s=Math.max(0,(parseDate(start)-rs)/total);
  const e=Math.min(1,(parseDate(end)-rs)/total);
  if (e<=s) return <td colSpan={quarters.length} />;
  return (
    <td colSpan={quarters.length} className="px-0 py-1 relative h-8">
      <div className="absolute inset-y-1 left-2 right-2">
        <div className="relative h-full">
          <div className="absolute h-5 top-1 rounded-md flex items-center px-2 text-[10px] text-white font-medium overflow-hidden whitespace-nowrap"
            style={{ left:`${s*100}%`, width:`${Math.max((e-s)*100,3)}%`, backgroundColor:color||'#6366f1', minWidth:'8px' }}>
            <span className="truncate">{item.name}</span>
          </div>
        </div>
      </div>
    </td>
  );
}

function QuarterlyRoadmap({ projects }) {
  const quarters = getQuarters(projects);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (!scrollRef.current || quarters.length === 0) return;
    const now = new Date();
    let qIdx = quarters.findIndex(q => now >= new Date(qStart(q.year, q.q)) && now <= new Date(qEnd(q.year, q.q)));
    if (qIdx === -1) qIdx = 0;
    const colWidth = scrollRef.current.scrollWidth / quarters.length;
    scrollRef.current.scrollLeft = Math.max(0, colWidth * qIdx - scrollRef.current.clientWidth / 2 + colWidth / 2);
  }, [quarters.length]);

  return (
    <div ref={scrollRef} className="overflow-x-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#c87b14' }} /><span>Project</span></div>
      </div>
      <table className="text-xs min-w-[700px] w-full outlined-header">
        <thead>
          <tr className="border-b border-slate-100">
            {quarters.map(q => (
              <th key={q.label} className="text-center py-2 text-slate-400 font-medium text-[10px] min-w-[80px]">{q.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map(proj => (
            <tr key={proj.id} className="border-b border-slate-50">
              <RoadmapBar item={proj} quarters={quarters} color={'#c87b14'} />
            </tr>
          ))}
          {projects.length === 0 && (
            <tr><td colSpan={quarters.length} className="text-center py-8 text-slate-400 text-xs">No projects with dates to display</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Top 5 RAID ─────────────────────────────────────────────────────────────────
function TopRisks({ risks, projects = [], onNavigateToRiskLog }) {
  const top = risks
    .filter(r => r.status !== 'resolved')
    .sort((a,b) => (PRIORITY_ORDER[a.priority]||9) - (PRIORITY_ORDER[b.priority]||9))
    .slice(0, 5);
  if (!top.length) return <p className="text-xs text-slate-400 text-center py-6">No open risks.</p>;
  return (
    <table className="w-full text-xs">
      <thead><tr className="border-b border-slate-100 bg-slate-50">
        <th className="text-left px-4 py-2 text-slate-500">Risk</th>
        <th className="text-left px-4 py-2 text-slate-500">Project</th>
        <th className="text-left px-4 py-2 text-slate-500">Priority</th>
      </tr></thead>
      <tbody>
        {top.map(r => {
          const proj = projects.find(p => p.id === r.project_id);
          const projectLabel = !r.project_id ? 'All Projects' : (proj?.name || '—');
          return (
            <tr key={r.id} className="border-b border-slate-50 hover:bg-orange-50 cursor-pointer" onClick={() => onNavigateToRiskLog && onNavigateToRiskLog()}>
              <td className="px-4 py-2 text-slate-700">{r.title}</td>
              <td className="px-4 py-2 text-slate-500">{projectLabel}</td>
              <td className="px-4 py-2"><span className={cn('px-1.5 py-0.5 rounded-full font-semibold text-[10px]', PRIORITY_CLS[r.priority]||'')}>{r.priority}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TopIssues({ issues, projects = [], onNavigateToIssueLog }) {
  const top = issues
    .filter(i => i.status !== 'resolved')
    .sort((a,b) => (PRIORITY_ORDER[a.priority]||9) - (PRIORITY_ORDER[b.priority]||9))
    .slice(0, 5);
  if (!top.length) return <p className="text-xs text-slate-400 text-center py-6">No open issues.</p>;
  return (
    <table className="w-full text-xs">
      <thead><tr className="border-b border-slate-100 bg-slate-50">
        <th className="text-left px-4 py-2 text-slate-500">Issue</th>
        <th className="text-left px-4 py-2 text-slate-500">Project</th>
        <th className="text-left px-4 py-2 text-slate-500">Priority</th>
      </tr></thead>
      <tbody>
        {top.map(i => {
          const proj = projects.find(p => p.id === i.project_id);
          const projectLabel = !i.project_id ? 'All Projects' : (proj?.name || '—');
          return (
            <tr key={i.id} className="border-b border-slate-50 hover:bg-red-50 cursor-pointer" onClick={() => onNavigateToIssueLog && onNavigateToIssueLog()}>
              <td className="px-4 py-2 text-slate-700">{i.title}</td>
              <td className="px-4 py-2 text-slate-500">{projectLabel}</td>
              <td className="px-4 py-2"><span className={cn('px-1.5 py-0.5 rounded-full font-semibold text-[10px]', PRIORITY_CLS[i.priority]||'')}>{i.priority}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Card layout hook ──────────────────────────────────────────────────────────
const STORAGE_KEY_PREFIX = 'program_detail_layout_';
const DEFAULT_CARD_ORDER = ['projects', 'timeline', 'risks', 'utilization', 'budget'];

function useCardLayout(programId) {
  const storageKey = STORAGE_KEY_PREFIX + programId;
  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved?.order) return saved.order;
    } catch {}
    return DEFAULT_CARD_ORDER;
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved?.collapsed) return saved.collapsed;
    } catch {}
    return {};
  });

  const save = useCallback((newOrder, newCollapsed) => {
    localStorage.setItem(storageKey, JSON.stringify({ order: newOrder, collapsed: newCollapsed }));
  }, [storageKey]);

  const toggleCollapse = id => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    save(order, next);
  };

  const onDragStart = (e, id) => { e.dataTransfer.setData('cardId', id); };
  const onDragOver = (e, id) => { e.preventDefault(); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('cardId');
    if (fromId === targetId) return;
    const newOrder = [...order];
    const fromIdx = newOrder.indexOf(fromId);
    const toIdx = newOrder.indexOf(targetId);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, fromId);
    setOrder(newOrder);
    save(newOrder, collapsed);
  };

  return { order, collapsed, toggleCollapse, onDragStart, onDragOver, onDrop };
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ProgramDetailView({ program, projects, portfolios = [], risks = [], issues = [], onSelectProject, onEditItem, onNewProject, onRenameItem, onUpdateProject, onDeleteProgram, onDeleteProject, onBackToInventory }) {
  const programProjects = projects.filter(p => p.program_id === program.id);
  const totalProjects   = programProjects.length;
  const completedProjects = programProjects.filter(p => p.status === 'completed').length;
  const allProjectsCompleted = programProjects.length > 0 && programProjects.every(p => p.status === 'completed');
  const isCompleted = program.status === 'completed' || allProjectsCompleted;
  const taskPct = isCompleted ? 100 : (() => {
    const done = programProjects.filter(p => p.status === 'completed').length;
    const inProg = programProjects.filter(p => p.status === 'active').length;
    return totalProjects > 0 ? Math.round((done + inProg * 0.5) / totalProjects * 100) : 0;
  })();
  const hasStarted = programProjects.some(p => ['active','completed','on_hold'].includes(p.status));
  const statusLabel = isCompleted ? 'Complete' : hasStarted ? 'In Progress' : 'Not Started';

  const programRisks = risks.filter(r => programProjects.some(p => p.id === r.project_id));
  const openRisks  = programRisks.filter(r  => r.status !== 'resolved');
  const resolvedRisks = programRisks.filter(r => r.status === 'resolved');
  const programIssues = issues.filter(i => programProjects.some(p => p.id === i.project_id));
  const openIssues = programIssues.filter(i => i.status !== 'resolved');
  const resolvedIssues = programIssues.filter(i => i.status === 'resolved');
  const onTrackCount = programProjects.filter(p => p.status === 'active').length;
  const atRiskCount  = programProjects.filter(p => p.status === 'on_hold').length;
  const onTrackPct = totalProjects > 0 ? Math.round(onTrackCount / totalProjects * 100) : 0;
  const atRiskPct  = totalProjects > 0 ? Math.round(atRiskCount  / totalProjects * 100) : 0;

  const hasCriticalIssue = openIssues.some(i => i.priority === 'critical');
  const hasHighIssue = openIssues.some(i => i.priority === 'high');
  const healthIconColor = isCompleted ? '#10b981' : hasCriticalIssue ? '#ef4444' : hasHighIssue ? '#f59e0b' : '#10b981';
  const healthLabel = isCompleted ? '' : hasCriticalIssue ? 'Critical' : hasHighIssue ? 'At Risk' : 'On Track';
  const healthTooltip = isCompleted
    ? 'Completed — all work done'
    : hasCriticalIssue
    ? `Critical: ${openIssues.filter(i => i.priority === 'critical').length} critical issue(s) open`
    : hasHighIssue
    ? `At Risk: ${openIssues.filter(i => i.priority === 'high').length} high priority issue(s) open`
    : 'On Track: No critical or high priority issues';

  const [renamingProgram, setRenamingProgram] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [editingPM, setEditingPM] = useState(null);
  const { isFav, toggle: toggleFavItem } = useFavorites();

  const queryClient = useQueryClient();
  const resources = useAccountResources();
  const updateProjectManager = useMutation({
    mutationFn: ({ id, name }) => projectsApi.update(id, { project_manager: name.trim() || null }),
    onSuccess: () => { invalidateHierarchy(queryClient); onUpdateProject?.(); },
    onError: (error) => toastError(error.message),
  });

  const isFavorite = id => isFav('project', id);
  const toggleFavorite = project => toggleFavItem({ id: project.id, name: project.name, type: 'project', color: project.color });

  const handleSaveRename = () => {
    if (renameText.trim() && onRenameItem) onRenameItem(program.id, renameText.trim(), 'program');
    setRenamingProgram(false);
  };

  const exportToCSV = () => {
    const rows=[['Program','Project','Status','Start Date','End Date','Project Manager']];
    programProjects.forEach(p=>rows.push([program.name,p.name,sInfo(p.status).label,p.start_date||'—',p.end_date||'—',p.owner||'—']));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`${program.name.replace(/\s+/g,'_')}_report.csv`});a.click();
  };

  const progStartDate = programProjects.filter(p=>p.start_date).map(p=>p.start_date).sort()[0] || program.start_date || null;
  const progEndArr    = programProjects.filter(p=>p.end_date).map(p=>p.end_date).sort();
  const progEndDate   = progEndArr[progEndArr.length-1] || program.end_date || null;

  const { order, collapsed, toggleCollapse, onDragStart, onDragOver, onDrop } = useCardLayout(program.id);

  const cardDefs = {
    projects: {
      title: 'Projects',
      content: programProjects.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">No projects linked to this program.</p>
      ) : (
        <table className="w-full text-sm outlined-header">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Project','Status','Start Date','End Date','Project Manager',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {programProjects.map(project => {
              const ps = sInfo(project.status);
              return (
                <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={()=>onSelectProject(project)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor:project.color||'#6366f1' }}/>
                      <span className="font-medium text-slate-800 hover:text-blue-900">{project.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-300 ml-1"/>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',ps.cls)}>{ps.label}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(project.start_date)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(project.end_date)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs" onClick={e=>e.stopPropagation()}>
                    {editingPM===project.id ? (
                      <ResourcePicker value={project.owner} resources={resources}
                        onSelect={name=>{ if ((name||'').trim() !== (project.owner||'')) updateProjectManager.mutate({ id: project.id, name: name||'' }); setEditingPM(null); }}
                        onClose={()=>setEditingPM(null)}/>
                    ) : (
                      <span className="cursor-pointer hover:text-indigo-600 hover:underline" onClick={()=>setEditingPM(project.id)}>
                        {project.owner||<span className="text-slate-300 italic">click to set</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <button onClick={()=>toggleFavorite(project)} className="p-1 rounded hover:bg-amber-50"
                        style={{ color:isFavorite(project.id)?'#f59e0b':'#94a3b8' }}>
                        <Star className="w-3.5 h-3.5" fill={isFavorite(project.id)?'currentColor':'none'}/>
                      </button>
                      <button onClick={()=>onEditItem(project,'project')} className="p-1 text-slate-300 hover:text-slate-500 rounded">
                        <Settings className="w-3.5 h-3.5"/>
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    },
    timeline: {
      title: 'Program Timeline',
      content: (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <QuarterlyRoadmap projects={programProjects} />
        </div>
      )
    },
    risks: {
      title: 'Top 5 Risks and Issues',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div>
            <div className="px-5 py-2 bg-orange-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Open Risks</span>
            </div>
            <TopRisks risks={openRisks} projects={programProjects} onNavigateToRiskLog={() => { window.location.href = '/RiskLog'; }} />
          </div>
          <div>
            <div className="px-5 py-2 bg-red-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Open Issues</span>
            </div>
            <TopIssues issues={openIssues} projects={programProjects} onNavigateToIssueLog={() => { window.location.href = '/IssueLog'; }} />
          </div>
        </div>
      )
    },
    issues: null,
    utilization: {
      title: 'Resource Utilization',
      content: <ResourceUtilizationTable projectIds={programProjects.map(p => p.id)} scopeLabel="Program" />
    },
    budget: {
      title: 'Budget & Forecast',
      content: <BudgetForecast totalBudget={(Number(program.budget) || 0) + programProjects.reduce((s, p) => s + (Number(p.budget) || 0), 0)} projectIds={programProjects.map(p => p.id)} />
    },
  };

  const displayOrder = (() => {
    let o = order;
    const ensure = (key, afterKey) => {
      if (o.includes(key)) return;
      const idx = o.indexOf(afterKey);
      o = idx === -1 ? [...o, key] : [...o.slice(0, idx + 1), key, ...o.slice(idx + 1)];
    };
    ensure('utilization', 'risks');
    ensure('budget', 'utilization');
    return o;
  })();

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Banner */}
      <div style={{ background: '#ffffff' }} className="px-6 pt-5 pb-6 text-[#002046] border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {renamingProgram ? (
                <div className="flex items-center gap-2">
                  <Input value={renameText} onChange={e=>setRenameText(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')handleSaveRename();if(e.key==='Escape')setRenamingProgram(false);}}
                    className="text-2xl font-bold bg-[#002046]/5 border-[#002046]/30 text-[#002046] h-10 max-w-sm" autoFocus />
                  <button onClick={handleSaveRename} className="p-1.5 bg-emerald-500/80 hover:bg-emerald-500 rounded"><Check className="w-4 h-4 text-white"/></button>
                  <button onClick={()=>setRenamingProgram(false)} className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded"><X className="w-4 h-4 text-[#002046]"/></button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-[#002046]"><span className="font-normal text-[#002046]/60">Program:</span> {program.name}</h1>
                  <button onClick={()=>{setRenameText(program.name);setRenamingProgram(true);}} className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded-lg">
                    <Edit2 className="w-4 h-4 text-[#002046]/70"/>
                  </button>
                  <StarButton type="program" id={program.id} name={program.name} color={program.color} className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded-lg" iconClassName="w-4 h-4" />
                </>
              )}
            </div>
            {program.description && <p className="text-[#002046]/70 text-sm mt-1">{program.description}</p>}
            {(() => { const pf = portfolios.find(p => p.id === program.portfolio_id); return pf ? <p className="text-[#002046]/60 text-xs mt-1">Portfolio: <span className="text-amber-600 font-medium">{pf.name}</span></p> : null; })()}
            {(progStartDate||progEndDate) && <p className="text-[#002046]/60 text-xs mt-1">{progStartDate||''}{progStartDate&&progEndDate?' – ':''}{progEndDate||''}</p>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Button onClick={exportToCSV} variant="outline" size="sm" className="border-[#002046]/30 text-[#002046] hover:bg-[#002046]/10 bg-transparent text-xs h-8">
              <Download className="w-3.5 h-3.5 mr-1.5"/> Export
            </Button>
            <div className="[&_button]:border-[#002046]/30 [&_button]:text-[#002046] [&_button]:hover:bg-[#002046]/10 [&_button]:bg-transparent [&_button]:h-8">
              <ReportGenerator scope="program" program={program} />
            </div>
            <button onClick={()=>onEditItem(program,'program')} className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded-lg">
              <Settings className="w-4 h-4 text-[#002046]"/>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          {[
            { label: 'Status', value: statusLabel },
            { label: 'Health', isHealth: true },
            { label: 'Projects', value: totalProjects },
          ].map(({ label, value, isHealth }) => (
            <div key={label} className={`bg-slate-100 rounded-xl p-4${isHealth ? ' relative group cursor-default' : ''}`}>
              {isHealth ? (
                <>
                  <div className="flex flex-col items-start">
                    <span className="w-4 h-4 rounded-full mb-1.5 flex-shrink-0" style={{ backgroundColor: healthIconColor }} />
                    <p className="text-lg font-bold text-[#002046]">{healthLabel}</p>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">{healthTooltip}</div>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
                  </div>
                </>
              ) : (
                <p className="text-2xl font-bold text-[#002046]">{value}</p>
              )}
              <p className="text-xs text-[#002046]/70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {totalProjects > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#002046]/70 font-medium">Overall Completion</span>
              <span className="text-sm font-bold text-[#002046]">{taskPct}%</span>
            </div>
            <div className="h-2.5 bg-[#002046]/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width:`${taskPct}%`, backgroundColor: isCompleted ? '#10b981' : '#c87b14' }} />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          {onBackToInventory && (
            <button onClick={onBackToInventory} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-xs transition-colors group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Program Directory
            </button>
          )}
        </div>

        {displayOrder.map(cardId => {
          const card = cardDefs[cardId];
          if (!card) return null;
          return (
            <CollapsibleCard
              key={cardId}
              id={cardId}
              title={card.title}
              collapsed={!!collapsed[cardId]}
              onToggle={toggleCollapse}
            >
              {card.content}
            </CollapsibleCard>
          );
        })}
      </div>
    </div>
  );
}