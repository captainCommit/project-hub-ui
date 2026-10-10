import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Building2, FolderTree, Folder, CheckCircle, ChevronRight, ChevronDown, LayoutGrid, List, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const STATUS_COLOR = {
  planning: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  on_hold: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const PORTFOLIO_GRADIENTS = [
  'from-violet-600 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-pink-500 to-rose-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];

export default function PortfolioOverview({ portfolios, programs, projects, tasks, onSelectPortfolio, onSelectProgram, onSelectProject }) {
  const [search, setSearch] = useState('');
  const [expandedPrograms, setExpandedPrograms] = useState({});  // { [portfolioId_programId]: bool }
  const toggleProgramExpand = (key) => setExpandedPrograms(prev => ({ ...prev, [key]: !prev[key] }));
  const [viewMode, setViewMode] = useState('tile');

  const getPortfolioPrograms = (pid) => programs.filter(p => p.portfolio_id === pid);
  const getProgramProjects = (pid) => projects.filter(p => p.program_id === pid);
  const getPortfolioProjects = (pid) => {
    const programIds = getPortfolioPrograms(pid).map(p => p.id);
    return projects.filter(p => p.portfolio_id === pid || programIds.includes(p.program_id));
  };

  const getTaskStats = (projectIds) => {
    const relevant = tasks.filter(t => projectIds.includes(t.project_id));
    return {
      total: relevant.length,
      done: relevant.filter(t => t.status === 'done').length,
      progress: relevant.length ? Math.round(relevant.filter(t => t.status === 'done').length / relevant.length * 100) : 0,
    };
  };

  const filtered = portfolios.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">All Portfolios</h1>
            <p className="text-sm text-slate-500 mt-0.5">{portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search portfolios..." className="h-8 text-sm pl-8 w-52" />
            </div>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('tile')} className={cn('p-1.5 transition-colors', viewMode === 'tile' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search ? 'No portfolios match your search.' : 'No portfolios yet. Create one to organize your programs and projects.'}</p>
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && filtered.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Name', 'Status', 'Programs', 'Projects', 'Tasks Done', ''].map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(portfolio => {
                  const portfolioPrograms = getPortfolioPrograms(portfolio.id);
                  const portfolioProjects = getPortfolioProjects(portfolio.id);
                  const stats = getTaskStats(portfolioProjects.map(p => p.id));
                  const statusStyle = STATUS_COLOR[portfolio.status] || STATUS_COLOR.planning;
                  return (
                    <tr key={portfolio.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => onSelectPortfolio(portfolio)}>
                      <td className="px-4 py-3 font-medium text-slate-800">{portfolio.name}</td>
                      <td className="px-4 py-3"><span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusStyle.bg, statusStyle.text)}>{portfolio.status}</span></td>
                      <td className="px-4 py-3 text-slate-600">{portfolioPrograms.length}</td>
                      <td className="px-4 py-3 text-slate-600">{portfolioProjects.length}</td>
                      <td className="px-4 py-3 text-slate-600">{stats.done}/{stats.total}</td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tile view */}
        {viewMode === 'tile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((portfolio, idx) => {
              const portfolioPrograms = getPortfolioPrograms(portfolio.id);
              const portfolioProjects = getPortfolioProjects(portfolio.id);
              const allProjectIds = portfolioProjects.map(p => p.id);
              const stats = getTaskStats(allProjectIds);
              const gradient = PORTFOLIO_GRADIENTS[idx % PORTFOLIO_GRADIENTS.length];
              const statusStyle = STATUS_COLOR[portfolio.status] || STATUS_COLOR.planning;

              return (
                <div
                  key={portfolio.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onSelectPortfolio(portfolio)}
                >
                  <div className={cn('bg-gradient-to-r p-5 text-white', gradient)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg leading-tight">{portfolio.name}</h2>
                          {portfolio.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{portfolio.description}</p>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors mt-1" />
                    </div>
                    {stats.total > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/70 mb-1"><span>Overall Progress</span><span>{stats.progress}%</span></div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${stats.progress}%` }} /></div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    {[
                      { label: 'Programs', value: portfolioPrograms.length, icon: FolderTree },
                      { label: 'Projects', value: portfolioProjects.length, icon: Folder },
                      { label: 'Tasks Done', value: `${stats.done}/${stats.total}`, icon: CheckCircle },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="px-4 py-3 text-center">
                        <p className="text-lg font-bold text-slate-800">{value}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                      </div>
                    ))}
                  </div>

                  {portfolioPrograms.length > 0 && (
                    <div className="p-4 space-y-1">
                      {portfolioPrograms.map(program => {
                        const progProjects = getProgramProjects(program.id);
                        const progStats = getTaskStats(progProjects.map(p => p.id));
                        const st = STATUS_COLOR[program.status] || STATUS_COLOR.planning;
                        const expandKey = `${portfolio.id}_${program.id}`;
                        const isExpanded = !!expandedPrograms[expandKey];
                        return (
                          <div key={program.id}>
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                              <button onClick={e => { e.stopPropagation(); toggleProgramExpand(expandKey); }} className="p-0.5 text-slate-400 hover:text-slate-600">
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0"><FolderTree className="w-3 h-3 text-violet-600" /></div>
                              <div className="flex-1 min-w-0" onClick={e => { e.stopPropagation(); onSelectProgram(program); }}>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-700 truncate cursor-pointer hover:text-indigo-600">{program.name}</p>
                                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', st.bg, st.text)}>{program.status}</span>
                                </div>
                                <p className="text-[10px] text-slate-400">{progProjects.length} projects · {progStats.progress}% done</p>
                              </div>
                            </div>
                            {isExpanded && progProjects.length > 0 && (
                              <div className="ml-8 pl-3 border-l border-slate-100 space-y-0.5 mb-1">
                                {progProjects.map(proj => (
                                  <button key={proj.id} onClick={e => { e.stopPropagation(); onSelectProject(proj); }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-md text-left">
                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color || '#6366f1' }} />
                                    {proj.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {portfolioPrograms.length === 0 && portfolioProjects.length > 0 && (
                    <div className="p-4 flex flex-wrap gap-2">
                      {portfolioProjects.slice(0, 4).map(proj => (
                        <div key={proj.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors" onClick={e => { e.stopPropagation(); onSelectProject(proj); }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color || '#6366f1' }} />
                          <span className="text-xs text-slate-600">{proj.name}</span>
                        </div>
                      ))}
                      {portfolioProjects.length > 4 && <span className="text-xs text-slate-400 self-center">+{portfolioProjects.length - 4} more</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}