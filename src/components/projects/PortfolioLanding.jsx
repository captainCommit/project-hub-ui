import React, { useState } from 'react';
import { Building2, Plus, ChevronRight, FolderOpen, Star, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/lib/favorites';
import { RAG, HealthDot, HealthLegend } from './HealthIndicator';

function getRag(critHighRisks, critHighIssues, pct) {
  if (critHighIssues > 0 || critHighRisks > 3) return RAG.red;
  if (critHighRisks > 0) return RAG.amber;
  if (pct === 0) return RAG.grey;
  return RAG.green;
}

export default function PortfolioLanding({ portfolios = [], programs = [], projects = [], risks = [], issues = [], onNewPortfolio, onSelectPortfolio }) {
  const [search, setSearch] = useState('');
  const { isFav: isFavFn, toggle: toggleFavItem } = useFavorites();
  const isFav = (id) => isFavFn('portfolio', id);
  const toggleFav = (e, port) => { e.stopPropagation(); toggleFavItem({ id: port.id, name: port.name, type: 'portfolio', color: port.color }); };

  const rows = portfolios.map(port => {
    const portPrograms = programs.filter(p => p.portfolio_id === port.id);
    const portProjects = projects.filter(p => p.portfolio_id === port.id || portPrograms.some(pg => pg.id === p.program_id));
    const completed = portProjects.filter(p => p.status === 'completed').length;
    const pct = portProjects.length > 0 ? Math.round(completed / portProjects.length * 100) : 0;

    const critHighRisks = risks.filter(r =>
      (portProjects.some(pr => pr.id === r.project_id) || portPrograms.some(pg => pg.id === r.program_id)) &&
      ['critical','high'].includes(r.priority) &&
      !['closed','mitigated'].includes(r.status)
    );
    const critHighIssues = issues.filter(i =>
      (portProjects.some(pr => pr.id === i.project_id) || portPrograms.some(pg => pg.id === i.program_id)) &&
      ['critical','high'].includes(i.priority) &&
      !['closed','resolved'].includes(i.status)
    );
    const rag = getRag(critHighRisks.length, critHighIssues.length, pct);
    return { port, portPrograms, portProjects, pct, critHighRisks, critHighIssues, rag };
  });

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Header */}
      <div style={{ background: '#ffffff' }} className="px-8 py-8 text-[#002046] border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#002046]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-[#002046]">Portfolio Directory</h1>
            </div>
            <p className="text-[#002046]/70 text-sm mt-1">
              All portfolios across the organisation. Click a row to view the portfolio detail.
            </p>
          </div>
          <Button onClick={onNewPortfolio} className="flex-shrink-0 text-white" style={{ backgroundColor: '#c87b14', border: 'none' }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Portfolio
          </Button>
        </div>
        <div className="flex gap-6 mt-6">
          {[
            { label: 'Portfolios', value: portfolios.length },
            { label: 'Programs',   value: programs.length },
            { label: 'Projects',   value: projects.length },
            { label: 'Crit/High Risks',  value: risks.filter(r  => ['critical','high'].includes(r.priority)  && !['closed','mitigated'].includes(r.status)).length },
            { label: 'Crit/High Issues', value: issues.filter(i => ['critical','high'].includes(i.priority) && !['closed','resolved'].includes(i.status)).length },
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
        {portfolios.length > 0 && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search portfolios..." className="pl-8 h-8 text-sm" />
          </div>
        )}
        {portfolios.length > 0 && <HealthLegend greyDescription="No projects completed yet" className="mb-3" />}
        {portfolios.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FolderOpen className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">No portfolios yet</p>
            <p className="text-xs mb-4">Create your first portfolio to start organising programs and projects.</p>
            <Button onClick={onNewPortfolio} style={{ backgroundColor: '#002046' }}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Portfolio
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['', 'Portfolio', 'Completion', 'Health', 'Programs', 'Projects', 'Open Risks', 'Open Issues', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.filter(({ port }) => !search || port.name.toLowerCase().includes(search.toLowerCase())).map(({ port, portPrograms, portProjects, pct, critHighRisks, critHighIssues, rag }) => (
                 <tr key={port.id} onClick={() => onSelectPortfolio(port)}
                   className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group">
                   <td className="px-3 py-3 w-8">
                     <button onClick={e => toggleFav(e, port)} className="p-1 rounded hover:bg-amber-50" style={{ color: isFav(port.id) ? '#f59e0b' : '#94a3b8' }}>
                       <Star className="w-3.5 h-3.5" fill={isFav(port.id) ? 'currentColor' : 'none'} />
                     </button>
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex items-center gap-2.5">
                       <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: port.color || '#f59e0b' }} />
                       <span className="font-semibold text-slate-800 group-hover:text-blue-900">{port.name}</span>
                     </div>
                   </td>
                   <td className="px-4 py-3 w-40">
                     {portProjects.length > 0 ? (
                       <div className="flex items-center gap-2">
                         <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                         </div>
                         <span className="text-xs text-slate-500 w-8 flex-shrink-0">{pct}%</span>
                       </div>
                     ) : <span className="text-xs text-slate-400">—</span>}
                   </td>
                   <td className="px-4 py-3">
                     <HealthDot rag={rag} />
                   </td>
                   <td className="px-4 py-3 text-slate-700">{portPrograms.length}</td>
                   <td className="px-4 py-3 text-slate-700">{portProjects.length}</td>
                   <td className="px-4 py-3 text-xs text-slate-600">{critHighRisks.length > 0 ? critHighRisks.length : <span className="text-slate-400">—</span>}</td>
                   <td className="px-4 py-3 text-xs text-slate-600">{critHighIssues.length > 0 ? critHighIssues.length : <span className="text-slate-400">—</span>}</td>
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