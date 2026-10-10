import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Folder, ChevronRight, Calendar, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StarButton from '@/components/projects/StarButton';

const STATUS_COLOR = {
  planning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Not Started' },
  active:   { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'In Progress' },
  on_hold:  { bg: 'bg-amber-100', text: 'text-amber-700', label: 'On Hold' },
  completed:{ bg: 'bg-slate-100', text: 'text-slate-600', label: 'Completed' },
};

export default function ProjectsSummary({ projects = [], programs = [], portfolios = [], tasks = [], onSelectProject, onNewProject }) {
  const [search, setSearch] = useState('');
  const [filterPortfolio, setFilterPortfolio] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');

  const getProgram = (pid) => programs.find(p => p.id === pid);
  const getPortfolio = (prog) => prog ? portfolios.find(p => p.id === prog.portfolio_id) : null;

  const getTaskStats = (projectId) => {
    const relevant = tasks.filter(t => t.project_id === projectId);
    const done = relevant.filter(t => t.status === 'done').length;
    return { total: relevant.length, done, progress: relevant.length ? Math.round(done / relevant.length * 100) : 0 };
  };

  const programsForFilter = filterPortfolio === 'all' ? programs : programs.filter(p => p.portfolio_id === filterPortfolio);

  const owners = [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  const filtered = projects.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterOwner !== 'all' && p.owner !== filterOwner) return false;
    if (filterProgram !== 'all' && p.program_id !== filterProgram) return false;
    if (filterPortfolio !== 'all') {
      const prog = programs.find(pr => pr.id === p.program_id);
      if (!prog || prog.portfolio_id !== filterPortfolio) return false;
    }
    return true;
  });

  const statusCounts = { planning: 0, active: 0, on_hold: 0, completed: 0 };
  projects.forEach(p => { if (statusCounts[p.status] !== undefined) statusCounts[p.status]++; });

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Header banner */}
      <div style={{ background: '#ffffff' }} className="px-8 py-8 text-[#002046] border-b border-slate-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#002046]/10 flex items-center justify-center">
              <Folder className="w-5 h-5 text-[#c87b14]" />
            </div>
            <h1 className="text-2xl font-bold text-[#002046]">Project Directory</h1>
          </div>
          {onNewProject && (
            <Button onClick={onNewProject} style={{ backgroundColor: '#c87b14' }} className="hover:opacity-90 text-white text-sm h-9 border-0">
              <Plus className="w-4 h-4 mr-1.5" /> New Project
            </Button>
          )}
        </div>
        <p className="text-[#002046]/70 text-sm mb-6">Browse and navigate all projects across programs and portfolios.</p>
        <div className="flex gap-6">
          {Object.entries(statusCounts).map(([status, count], i, arr) => {
            const st = STATUS_COLOR[status];
            return (
              <React.Fragment key={status}>
                <div>
                  <p className="text-2xl font-bold text-[#002046]">{count}</p>
                  <p className="text-xs text-[#002046]/60 mt-0.5">{st?.label || status}</p>
                </div>
                {i < arr.length - 1 && <div className="w-px bg-[#002046]/10 self-stretch" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="h-8 text-sm pl-8 w-52" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Portfolio:</span>
          <Select value={filterPortfolio} onValueChange={v => { setFilterPortfolio(v); setFilterProgram('all'); }}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Program:</span>
          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programsForFilter.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Project Manager:</span>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PMs</SelectItem>
              {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="p-6">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search || filterPortfolio !== 'all' || filterProgram !== 'all' || filterOwner !== 'all' ? 'No projects match your filters.' : 'No projects yet.'}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['', 'Name', 'Program', 'Portfolio', 'Status', 'Tasks', 'Progress', 'Due Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(project => {
                const stats = getTaskStats(project.id);
                const st = STATUS_COLOR[project.status] || STATUS_COLOR.planning;
                const program = getProgram(project.program_id);
                const portfolio = getPortfolio(program);
                return (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => onSelectProject(project)}>
                    <td className="px-3 py-3 w-8"><StarButton type="project" id={project.id} name={project.name} color={project.color} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
                        <span className="font-medium text-slate-800">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-violet-600">{program?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-amber-600">{portfolio?.name || '—'}</td>
                    <td className="px-4 py-3"><span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', st.bg, st.text)}>{st.label}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{stats.done}/{stats.total}</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.progress}%`, backgroundColor: project.color || '#6366f1' }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{stats.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{project.end_date || '—'}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}