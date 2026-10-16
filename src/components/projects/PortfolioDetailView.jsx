import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Settings, Download, Edit2, Check, X, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateRange, parseDate } from '@/lib/dateUtils';
import ReportGenerator from '@/components/projects/ReportGenerator';
import StarButton from '@/components/projects/StarButton';
import ResourceUtilizationTable from '@/components/projects/ResourceUtilizationTable';
import BudgetForecast from '@/components/projects/BudgetForecast';

const STATUS_MAP = {
  planning:  { label: 'Not Started', cls: 'bg-slate-100 text-slate-600' },
  active:    { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  on_hold:   { label: 'On Hold',     cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700' },
};
function sInfo(s) { return STATUS_MAP[s] || { label: s || '—', cls: 'bg-slate-100 text-slate-600' }; }
function pctDone(list) {
  if (!list.length) return 0;
  return Math.round(list.filter(p => p.status === 'completed').length / list.length * 100);
}

function healthColor(pct) {
  if (pct >= 70) return '#10b981'; // green
  if (pct >= 30) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const priorityCls = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-500' };

// ── Collapsible Card ───────────────────────────────────────────────────────────
function CollapsibleCard({ id, title, collapsed, onToggle, children, headerExtra }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-3 border-b border-slate-200 bg-[#002046] flex items-center gap-2 select-none">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex-1">{title}</h3>
        {headerExtra}
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
    if (it.start_date) years.add(it.start_date.slice(0, 4));
    if (it.end_date)   years.add(it.end_date.slice(0, 4));
  });
  if (!years.size) {
    const y = new Date().getFullYear();
    years.add(String(y)); years.add(String(y + 1));
  }
  const quarters = [];
  [...years].sort().forEach(y => [1,2,3,4].forEach(q => quarters.push({ year: y, q, label: `Q${q} ${y}` })));
  return quarters;
}
function qStart(year, q) { return `${year}-${String((q-1)*3+1).padStart(2,'0')}-01`; }
function qEnd(year, q) { return `${year}-${['03-31','06-30','09-30','12-31'][q-1]}`; }

function RoadmapBar({ item, quarters, color }) {
  const start = item.start_date || item.end_date;
  const end   = item.end_date   || item.start_date;
  if (!start && !end) return <td colSpan={quarters.length} />;
  const firstQ = quarters[0], lastQ = quarters[quarters.length - 1];
  const rs = parseDate(qStart(firstQ.year, firstQ.q)), re = parseDate(qEnd(lastQ.year, lastQ.q));
  const total = re - rs;
  const s = Math.max(0, (parseDate(start) - rs) / total);
  const e = Math.min(1, (parseDate(end) - rs) / total);
  if (e <= s) return <td colSpan={quarters.length} />;
  return (
    <td colSpan={quarters.length} className="px-0 py-1 relative h-8">
      <div className="absolute inset-y-1 left-2 right-2">
        <div className="relative h-full">
          <div className="absolute h-5 top-1 rounded-md flex items-center px-2 text-[10px] text-white font-medium overflow-hidden whitespace-nowrap"
            style={{ left: `${s*100}%`, width: `${Math.max((e-s)*100, 3)}%`, backgroundColor: color || '#6366f1', minWidth: '8px' }}>
            <span className="truncate">{item.name}</span>
          </div>
        </div>
      </div>
    </td>
  );
}

function QuarterlyRoadmap({ programs, projects }) {
  const allItems = [...programs, ...projects];
  const quarters = getQuarters(allItems);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (!scrollRef.current || quarters.length === 0) return;
    const now = new Date();
    let qIdx = quarters.findIndex(q => now >= new Date(qStart(q.year, q.q)) && now <= new Date(qEnd(q.year, q.q)));
    if (qIdx === -1) qIdx = 0;
    const colWidth = scrollRef.current.scrollWidth / quarters.length;
    scrollRef.current.scrollLeft = Math.max(0, colWidth * qIdx - scrollRef.current.clientWidth / 2 + colWidth / 2);
  }, [quarters.length]);

  const firstQ = quarters[0], lastQ = quarters[quarters.length - 1];
  const rangeStart = quarters.length ? new Date(qStart(firstQ.year, firstQ.q)) : null;
  const rangeEnd = quarters.length ? new Date(qEnd(lastQ.year, lastQ.q)) : null;
  const now = new Date();
  const showTodayLine = rangeStart && now >= rangeStart && now <= rangeEnd;
  const todayPct = showTodayLine ? (now - rangeStart) / (rangeEnd - rangeStart) * 100 : 0;

  return (
    <div ref={scrollRef} className="overflow-x-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#002046' }} /><span>Program</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#c87b14' }} /><span>Project</span></div>
        {showTodayLine && <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-red-500" /><span>Today</span></div>}
      </div>
      <div className="relative min-w-[700px]">
        {showTodayLine && (
          <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none" style={{ left: `${todayPct}%` }} />
        )}
        <table className="text-xs w-full outlined-header">
          <thead>
            <tr className="border-b border-slate-100">
              {quarters.map(q => (
                <th key={q.label} className="text-center py-2 text-slate-400 font-medium text-[10px] min-w-[80px]">{q.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {programs.map(prog => {
              const progProjects = projects.filter(p => p.program_id === prog.id);
              return (
                <React.Fragment key={prog.id}>
                  <tr className="border-b border-slate-100">
                    <RoadmapBar item={prog} quarters={quarters} color={'#002046'} />
                  </tr>
                  {progProjects.map(proj => (
                    <tr key={proj.id} className="border-b border-slate-50">
                      <RoadmapBar item={proj} quarters={quarters} color={'#c87b14'} />
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {programs.length === 0 && (
              <tr><td colSpan={quarters.length} className="text-center py-8 text-slate-400 text-xs">No programs with dates to display</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────────
function BudgetSection({ programs, projects }) {
  const totalBudget = [...programs, ...projects].reduce((s, it) => s + (it.budget || 0), 0);
  const fmt = n => n > 0 ? `$${n.toLocaleString()}` : '—';
  return (
    <div className="p-5">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-800">{fmt(totalBudget)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Budget</p>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-800">{programs.filter(p => p.budget).length}</p>
          <p className="text-xs text-slate-500 mt-1">Programs with Budget</p>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-800">{projects.filter(p => p.budget).length}</p>
          <p className="text-xs text-slate-500 mt-1">Projects with Budget</p>
        </div>
      </div>
      {totalBudget === 0 && <p className="text-xs text-slate-400 text-center py-4">No budget data entered yet.</p>}
    </div>
  );
}

// ── Top 5 RAID ─────────────────────────────────────────────────────────────────
function TopRisks({ risks, projects = [], onNavigateToRiskLog }) {
  const top = risks
    .filter(r => !['resolved', 'closed'].includes(r.status))
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
              <td className="px-4 py-2"><span className={cn('px-1.5 py-0.5 rounded-full font-semibold text-[10px]', priorityCls[r.priority]||'')}>{r.priority}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TopIssues({ issues, projects = [], onNavigateToIssueLog }) {
  const top = issues
    .filter(i => !['resolved', 'closed'].includes(i.status))
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
              <td className="px-4 py-2"><span className={cn('px-1.5 py-0.5 rounded-full font-semibold text-[10px]', priorityCls[i.priority]||'')}>{i.priority}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const STORAGE_KEY_PREFIX = 'portfolio_detail_layout_';

function useCardLayout(portfolioId, defaultOrder) {
  const storageKey = STORAGE_KEY_PREFIX + portfolioId;
  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved?.order) return saved.order;
    } catch {}
    return defaultOrder;
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

  const [dragOver, setDragOver] = useState(null);

  const onDragStart = (e, id) => { e.dataTransfer.setData('cardId', id); };
  const onDragOver = (e, id) => { e.preventDefault(); setDragOver(id); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('cardId');
    if (fromId === targetId) { setDragOver(null); return; }
    const newOrder = [...order];
    const fromIdx = newOrder.indexOf(fromId);
    const toIdx = newOrder.indexOf(targetId);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, fromId);
    setOrder(newOrder);
    save(newOrder, collapsed);
    setDragOver(null);
  };

  return { order, collapsed, toggleCollapse, onDragStart, onDragOver, onDrop, dragOver };
}

const DEFAULT_CARD_ORDER = ['programs', 'timeline', 'risks', 'utilization', 'budget'];

// ── Main ───────────────────────────────────────────────────────────────────────
export default function PortfolioDetailView({
  portfolio, programs, projects, risks = [], issues = [],
  onSelectProgram, onSelectProject, onEditItem, onNewProject, onNewProgram, onRenameItem, onDeletePortfolio, onDeleteProject, onBackToDirectory
}) {
  const portfolioPrograms = programs.filter(p => p.portfolio_id === portfolio.id);
  const allProjIds = portfolioPrograms.map(pg => pg.id);
  const allPortfolioProjects = projects.filter(p => p.portfolio_id === portfolio.id || allProjIds.includes(p.program_id));
  const getProgramProjects = (pid) => projects.filter(p => p.program_id === pid);
  const summaryProgramCount = portfolio.program_count ?? portfolioPrograms.length;
  const summaryProjectCount = portfolio.project_count ?? allPortfolioProjects.length;

  const [renamingPortfolio, setRenamingPortfolio] = useState(false);
  const [renameText, setRenameText] = useState('');

  const completedPrograms = portfolioPrograms.filter(p => p.status === 'completed').length;
  const inProgressPrograms = portfolioPrograms.filter(p => p.status === 'active').length;
  const pct = portfolioPrograms.length > 0 ? Math.round((completedPrograms + inProgressPrograms * 0.5) / portfolioPrograms.length * 100) : 0;
  const isCompleted = portfolio.status === 'completed' || (portfolioPrograms.length > 0 && portfolioPrograms.every(p => p.status === 'completed'));
  const statusLabel = isCompleted ? 'Complete' : portfolioPrograms.some(p => ['active','completed'].includes(p.status)) ? 'In Progress' : 'Not Started';

  const openRisks = risks.filter(r =>
    (allPortfolioProjects.some(p => p.id === r.project_id) || portfolioPrograms.some(pg => pg.id === r.program_id)) &&
    !['resolved', 'closed'].includes(r.status)
  );
  const openPortfolioIssues = issues.filter(i =>
    (allPortfolioProjects.some(p => p.id === i.project_id) || portfolioPrograms.some(pg => pg.id === i.program_id)) &&
    !['resolved', 'closed'].includes(i.status)
  );

  const openIssues = issues.filter(i =>
    (allPortfolioProjects.some(p => p.id === i.project_id) || portfolioPrograms.some(pg => pg.id === i.program_id)) &&
    !['resolved', 'closed'].includes(i.status)
  );
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

  const onTrack = portfolioPrograms.filter(pg => {
    const pp = getProgramProjects(pg.id);
    return pp.some(p => p.status === 'active') || pg.status === 'active';
  }).length;

  const { order, collapsed, toggleCollapse, onDragStart, onDragOver, onDrop } = useCardLayout(portfolio.id, DEFAULT_CARD_ORDER);

  const handleSaveRename = () => {
    if (renameText.trim() && onRenameItem) onRenameItem(portfolio.id, renameText.trim(), 'portfolio');
    setRenamingPortfolio(false);
  };

  const exportToCSV = () => {
    const rows = [['Portfolio','Program','Project','Status','Start','End','Owner']];
    portfolioPrograms.forEach(pg => {
      const pp = getProgramProjects(pg.id);
      if (!pp.length) rows.push([portfolio.name, pg.name, '—', sInfo(pg.status).label, '—', '—', '—']);
      else pp.forEach(p => rows.push([portfolio.name, pg.name, p.name, sInfo(p.status).label, p.start_date||'—', p.end_date||'—', p.owner||'—']));
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download: `${portfolio.name.replace(/\s+/g,'_')}_report.csv` });
    a.click();
  };

  const cardDefs = {
    programs: {
      title: 'Programs & Projects',
      content: (
        <>
          {portfolioPrograms.length === 0 && (
            <p className="text-xs text-slate-400 px-5 py-6 text-center">No programs linked to this portfolio.</p>
          )}
          {portfolioPrograms.map(program => {
            const progProjects = getProgramProjects(program.id);
            const si = sInfo(program.status);
            const progPct = pctDone(progProjects);
            const start = progProjects.filter(p=>p.start_date).map(p=>p.start_date).sort()[0];
            const endArr = progProjects.filter(p=>p.end_date).map(p=>p.end_date).sort();
            const end = endArr[endArr.length-1];
            return (
              <div key={program.id} className="border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/60">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#c87b14' }} />
                  <button className="flex-1 text-left min-w-0" onClick={() => onSelectProgram(program)}>
                    <span className="font-semibold text-slate-800 text-sm hover:text-blue-900 truncate block">{program.name}</span>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', si.cls)}>{si.label}</span>
                    {(start||end) && <span className="text-xs text-slate-400 hidden md:block">{formatDateRange(start,end)}</span>}
                    <span className="text-xs font-semibold" style={{ color: healthColor(progPct) }}>{progPct}%</span>
                    <button onClick={() => onEditItem(program,'program')} className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {progProjects.length > 0 && (
                  <table className="w-full text-xs">
                    <tbody>
                      {progProjects.map(project => {
                        const ps = sInfo(project.status);
                        return (
                          <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => onSelectProject(project)}>
                            <td className="px-14 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#002046' }} />
                                <span className="font-medium text-slate-700 hover:text-blue-900">{project.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5"><span className={cn('px-2 py-0.5 rounded-full font-medium', ps.cls)}>{ps.label}</span></td>
                            <td className="px-3 py-2.5 text-slate-500">{formatDateRange(project.start_date, project.end_date)}</td>
                            <td className="px-3 py-2.5 text-slate-600">{project.owner||'—'}</td>
                            <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>onEditItem(project,'project')} className="p-1 text-slate-300 hover:text-slate-500 rounded"><Settings className="w-3 h-3" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </>
      )
    },
    timeline: {
      title: 'Portfolio Timeline',
      content: (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <QuarterlyRoadmap programs={portfolioPrograms} projects={allPortfolioProjects} />
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
            <TopRisks risks={openRisks} projects={allPortfolioProjects} onNavigateToRiskLog={() => { window.location.href = '/RiskLog'; }} />
          </div>
          <div>
            <div className="px-5 py-2 bg-red-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Open Issues</span>
            </div>
            <TopIssues issues={openPortfolioIssues} projects={allPortfolioProjects} onNavigateToIssueLog={() => { window.location.href = '/IssueLog'; }} />
          </div>
        </div>
      )
    },
    issues: null,
    utilization: {
      title: 'Resource Utilization',
      content: <ResourceUtilizationTable projectIds={allPortfolioProjects.map(p => p.id)} scopeLabel="Portfolio" />
    },
    budget: {
      title: 'Budget & Forecast',
      content: <BudgetForecast totalBudget={portfolioPrograms.reduce((s, p) => s + (Number(p.budget) || 0), 0) + allPortfolioProjects.reduce((s, p) => s + (Number(p.budget) || 0), 0)} projectIds={allPortfolioProjects.map(p => p.id)} />
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
              {renamingPortfolio ? (
                <div className="flex items-center gap-2">
                  <Input value={renameText} onChange={e => setRenameText(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') handleSaveRename(); if (e.key==='Escape') setRenamingPortfolio(false); }}
                    className="text-2xl font-bold bg-[#002046]/5 border-[#002046]/30 text-[#002046] h-10 max-w-sm" autoFocus />
                  <button onClick={handleSaveRename} className="p-1.5 bg-emerald-500/80 hover:bg-emerald-500 rounded"><Check className="w-4 h-4 text-white" /></button>
                  <button onClick={() => setRenamingPortfolio(false)} className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded"><X className="w-4 h-4 text-[#002046]" /></button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-[#002046]"><span className="font-normal text-[#002046]/60">Portfolio:</span> {portfolio.name}</h1>
                  <button onClick={() => { setRenameText(portfolio.name); setRenamingPortfolio(true); }}
                    className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded-lg"><Edit2 className="w-4 h-4 text-[#002046]/70" /></button>
                  <StarButton type="portfolio" id={portfolio.id} name={portfolio.name} color={portfolio.color} className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded-lg" iconClassName="w-4 h-4" />
                </>
              )}
            </div>
            {portfolio.description && <p className="text-[#002046]/70 text-sm mt-1">{portfolio.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm" className="border-[#002046]/30 text-[#002046] hover:bg-[#002046]/10 bg-transparent text-xs h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
            <div className="[&_button]:border-[#002046]/30 [&_button]:text-[#002046] [&_button]:hover:bg-[#002046]/10 [&_button]:bg-transparent [&_button]:h-8">
              <ReportGenerator scope="portfolio" portfolio={portfolio} />
            </div>
            <button onClick={() => onEditItem && onEditItem(portfolio, 'portfolio')}
              className="p-1.5 bg-[#002046]/10 hover:bg-[#002046]/20 rounded-lg"><Settings className="w-4 h-4 text-[#002046]" /></button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Status',   value: statusLabel },
            { label: 'Health',   value: healthLabel, isHealth: true },
            { label: 'Programs', value: summaryProgramCount },
            { label: 'Projects', value: summaryProjectCount },
          ].map(({ label, value, isHealth }) => (
            <div key={label} className={`bg-slate-100 rounded-xl p-4${isHealth ? ' relative group cursor-default' : ''}`}>
              {isHealth ? (
                <>
                  <div className="flex flex-col items-start">
                    <span className="w-4 h-4 rounded-full mb-1.5 flex-shrink-0" style={{ backgroundColor: healthIconColor }} />
                    <p className="text-lg font-bold text-[#002046]">{value}</p>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                      {healthTooltip}
                    </div>
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
        {allPortfolioProjects.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#002046]/70 font-medium">Overall Completion</span>
              <span className="text-sm font-bold text-[#002046]">{pct}%</span>
            </div>
            <div className="h-2.5 bg-[#002046]/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#c87b14' }} />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          {onBackToDirectory && (
            <button onClick={onBackToDirectory} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-xs transition-colors group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Portfolio Directory
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