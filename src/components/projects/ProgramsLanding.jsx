import React, { useState } from 'react';
import { FolderTree, Plus, ChevronRight, Star, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/lib/favorites';

const STATUS_MAP = {
  planning:  { label: 'Not Started', cls: 'bg-slate-100 text-slate-600' },
  active:    { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  on_hold:   { label: 'On Hold',     cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700' },
};

const RAG = {
  red:   { label: 'Red',   dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  amber: { label: 'Amber', dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  green: { label: 'Green', dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700' },
  grey:  { label: '—',     dot: 'bg-slate-300',  badge: 'bg-slate-100 text-slate-500' },
};

function getRag(critHighRisks, critHighIssues, pct, projCount) {
  if (critHighIssues > 0 || critHighRisks > 3) return RAG.red;
  if (critHighRisks > 0) return RAG.amber;
  if (projCount === 0) return RAG.grey;
  return RAG.green;
}

function getNextMilestone(projects) {
  const today = new Date().toISOString().slice(0, 10);
  const future = projects
    .filter(p => p.end_date && p.end_date >= today && p.status !== 'completed')
    .sort((a, b) => a.end_date.localeCompare(b.end_date));
  if (!future.length) return null;
  return { name: future[0].name, date: future[0].end_date };
}

function getCurrentMilestone(projects) {
  const today = new Date().toISOString().slice(0, 10);
  // If all projects are completed, return "Project Complete"
  if (projects.length > 0 && projects.every(p => p.status === 'completed')) {
    return { name: 'Project Complete', date: null };
  }
  // Most recent project that started but hasn't ended yet (in progress)
  const active = projects
    .filter(p => p.start_date && p.start_date <= today && (!p.end_date || p.end_date >= today) && p.status !== 'completed')
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  if (!active.length) return null;
  return { name: active[0].name, date: active[0].end_date };
}

export default function ProgramsLanding({ programs = [], projects = [], portfolios = [], risks = [], issues = [], onNewProgram, onSelectProgram }) {
  const [search, setSearch] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState('');
  const { isFav: isFavFn, toggle: toggleFavItem } = useFavorites();
  const isFav = (id) => isFavFn('program', id);
  const toggleFav = (e, prog) => { e.stopPropagation(); toggleFavItem({ id: prog.id, name: prog.name, type: 'program', color: prog.color }); };

  const rows = programs.map(prog => {
    const progProjects = projects.filter(p => p.program_id === prog.id);
    const completed = progProjects.filter(p => p.status === 'completed').length;
    const pct = progProjects.length > 0 ? Math.round(completed / progProjects.length * 100) : 0;

    const critHighRisks = risks.filter(r =>
      progProjects.some(pr => pr.id === r.project_id) &&
      ['critical','high'].includes(r.priority) &&
      !['closed','mitigated'].includes(r.status)
    );
    const critHighIssues = issues.filter(i =>
      progProjects.some(pr => pr.id === i.project_id) &&
      ['critical','high'].includes(i.priority) &&
      !['closed','resolved'].includes(i.status)
    );
    const rag = getRag(critHighRisks.length, critHighIssues.length, pct, progProjects.length);
    const portfolio = portfolios.find(pf => pf.id === prog.portfolio_id);
    const milestone = getNextMilestone(progProjects);
    const currentMilestone = getCurrentMilestone(progProjects);
    const si = STATUS_MAP[prog.status] || { label: prog.status, cls: 'bg-slate-100 text-slate-600' };
    return { prog, progProjects, pct, critHighRisks, critHighIssues, rag, portfolio, milestone, currentMilestone, si };
  });

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Header */}
      <div style={{ background: '#ffffff' }} className="px-8 py-8 text-[#002046] border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#002046]/10 flex items-center justify-center">
                <FolderTree className="w-5 h-5 text-[#c87b14]" />
              </div>
              <h1 className="text-2xl font-bold text-[#002046]">Program Directory</h1>
            </div>
            <p className="text-[#002046]/70 text-sm mt-1">
              All programs across all portfolios. Click a row to view the program detail.
            </p>
          </div>
          <Button onClick={onNewProgram} className="flex-shrink-0 text-white" style={{ backgroundColor: '#c87b14', border: 'none' }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Program
          </Button>
        </div>
        <div className="flex gap-6 mt-6">
          {[
            { label: 'Programs',   value: programs.length },
            { label: 'Projects',   value: projects.length },
            { label: 'Portfolios', value: portfolios.length },
            { label: 'Active',     value: programs.filter(p => p.status === 'active').length },
            { label: 'Completed',  value: programs.filter(p => p.status === 'completed').length },
          ].map(({ label, value }, i, arr) => (
            <React.Fragment key={label}>
              <div>
                <p className="text-2xl font-bold text-[#002046]">{value}</p>
                <p className="text-xs text-[#002046]/60 mt-0.5">{label}</p>
              </div>
              {i < arr.length - 1 && <div className="w-px bg-[#002046]/10 self-stretch" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-6">
        {programs.length > 0 && (
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative max-w-sm flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs..." className="pl-8 h-8 text-sm" />
            </div>
            {portfolios.length > 0 && (
              <select
                value={portfolioFilter}
                onChange={e => setPortfolioFilter(e.target.value)}
                className="h-8 text-sm border border-input rounded-md px-3 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Portfolios</option>
                {portfolios.map(pf => (
                  <option key={pf.id} value={pf.id}>{pf.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {programs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FolderTree className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">No programs yet</p>
            <p className="text-xs mb-4">Create your first program to start grouping projects.</p>
            <Button onClick={onNewProgram} style={{ backgroundColor: '#002046' }}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Program
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['', 'Program', 'Portfolio', 'Status', 'Completion', 'Health', 'Projects', 'Current Milestone', 'Next Milestone', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.filter(({ prog }) => {
                  const matchSearch = !search || prog.name.toLowerCase().includes(search.toLowerCase());
                  const matchPortfolio = !portfolioFilter || prog.portfolio_id === portfolioFilter;
                  return matchSearch && matchPortfolio;
                }).map(({ prog, progProjects, pct, rag, portfolio, milestone, currentMilestone, si }) => (
                 <tr key={prog.id} onClick={() => onSelectProgram(prog)}
                   className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group">
                   <td className="px-3 py-3 w-8">
                     <button onClick={e => toggleFav(e, prog)} className="p-1 rounded hover:bg-amber-50" style={{ color: isFav(prog.id) ? '#f59e0b' : '#cbd5e1' }}>
                       <Star className="w-3.5 h-3.5" fill={isFav(prog.id) ? 'currentColor' : 'none'} />
                     </button>
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex items-center gap-2.5">
                       <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: prog.color || '#8b5cf6' }} />
                       <span className="font-semibold text-slate-800 group-hover:text-blue-900">{prog.name}</span>
                       </div>
                       </td>
                       <td className="px-4 py-3 text-xs text-amber-600">{portfolio?.name || '—'}</td>
                       <td className="px-4 py-3"><span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', si.cls)}>{si.label}</span></td>
                   <td className="px-4 py-3 w-36">
                     {progProjects.length > 0 ? (
                       <div className="flex items-center gap-2">
                         <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
                         </div>
                         <span className="text-xs text-slate-500 w-8 flex-shrink-0">{pct}%</span>
                       </div>
                     ) : <span className="text-xs text-slate-400">—</span>}
                   </td>
                   <td className="px-4 py-3">
                     <span className={cn('w-3 h-3 rounded-full inline-block', rag.dot)} title={rag.label} />
                   </td>
                   <td className="px-4 py-3 text-slate-700">{progProjects.length}</td>
                   <td className="px-4 py-3 text-xs">
                      {currentMilestone ? (
                        <div>
                          <p className="text-slate-700 font-medium truncate max-w-[140px]">{currentMilestone.name}</p>
                          {currentMilestone.date && <p className="text-slate-400">{currentMilestone.date}</p>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                   <td className="px-4 py-3 text-xs">
                      {milestone ? (
                        <div>
                          <p className="text-slate-700 font-medium truncate max-w-[140px]">{milestone.name}</p>
                          <p className="text-slate-400">{milestone.date}</p>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                   <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" /></td>
                 </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}