import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { FolderTree, ChevronRight, LayoutGrid, List, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const STATUS_COLOR = {
  planning: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  on_hold: { bg: 'bg-amber-100', text: 'text-amber-700' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

export default function ProgramsSummary({ programs, projects, tasks, onSelectProgram }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('tile');

  const getProgramProjects = (pid) => projects.filter(p => p.program_id === pid);
  const getTaskStats = (projectIds) => {
    const relevant = tasks.filter(t => projectIds.includes(t.project_id));
    return { total: relevant.length, done: relevant.filter(t => t.status === 'done').length, progress: relevant.length ? Math.round(relevant.filter(t => t.status === 'done').length / relevant.length * 100) : 0 };
  };

  const filtered = programs.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Programs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{programs.length} program{programs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs..." className="h-8 text-sm pl-8 w-52" />
          </div>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('tile')} className={cn('p-1.5 transition-colors', viewMode === 'tile' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'No programs match your search.' : 'No programs yet.'}</p>
        </div>
      )}

      {viewMode === 'tile' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(program => {
            const progProjects = getProgramProjects(program.id);
            const stats = getTaskStats(progProjects.map(p => p.id));
            const st = STATUS_COLOR[program.status] || STATUS_COLOR.planning;
            return (
              <div key={program.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md cursor-pointer transition-all group" onClick={() => onSelectProgram(program)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                      <FolderTree className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{program.name}</h3>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', st.bg, st.text)}>{program.status}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
                {program.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{program.description}</p>}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-slate-700">{progProjects.length}</p><p className="text-[10px] text-slate-400">Projects</p></div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-slate-700">{stats.done}/{stats.total}</p><p className="text-[10px] text-slate-400">Tasks done</p></div>
                </div>
                {stats.total > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Progress</span><span>{stats.progress}%</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${stats.progress}%` }} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name', 'Status', 'Projects', 'Tasks Done', 'Progress', ''].map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(program => {
                const progProjects = getProgramProjects(program.id);
                const stats = getTaskStats(progProjects.map(p => p.id));
                const st = STATUS_COLOR[program.status] || STATUS_COLOR.planning;
                return (
                  <tr key={program.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => onSelectProgram(program)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{program.name}</td>
                    <td className="px-4 py-3"><span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', st.bg, st.text)}>{program.status}</span></td>
                    <td className="px-4 py-3 text-slate-600">{progProjects.length}</td>
                    <td className="px-4 py-3 text-slate-600">{stats.done}/{stats.total}</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${stats.progress}%` }} /></div><span className="text-xs text-slate-500 w-8">{stats.progress}%</span></div>
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}