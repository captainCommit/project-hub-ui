import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, Building2, FolderTree, ClipboardList, ClipboardCheck, Package, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/lib/favorites';
import { base44 } from '@/api/base44Client';

const TYPE_META = {
  requirement: { label: 'Requirement', icon: ClipboardList, link: (id) => `/Requirements?reqId=${id}` },
  testcase: { label: 'Test Case', icon: ClipboardCheck, link: (id) => `/Testing?tcId=${id}` },
  sprint: { label: 'Sprint', icon: Package, link: (id) => `/SprintManagement?focusSprint=${id}` },
};

const NONE = '__none';

export default function FavoritesView() {
  const { favorites, toggle } = useFavorites();
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });
  const { data: requirements = [] } = useQuery({ queryKey: ['requirements'], queryFn: () => base44.entities.Requirement.list() });
  const { data: testCases = [] } = useQuery({ queryKey: ['test_cases'], queryFn: () => base44.entities.TestCase.list() });
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints_all'], queryFn: () => base44.entities.Sprint.list() });

  const projectById = Object.fromEntries(projects.map(p => [p.id, p]));
  const programById = Object.fromEntries(programs.map(p => [p.id, p]));
  const portfolioById = Object.fromEntries(portfolios.map(p => [p.id, p]));
  const reqById = Object.fromEntries(requirements.map(r => [r.id, r]));
  const tcById = Object.fromEntries(testCases.map(t => [t.id, t]));
  const sprintById = Object.fromEntries(sprints.map(s => [s.id, s]));

  const pidFor = (f) => {
    if (f.type === 'project') return f.id;
    if (f.type === 'requirement') return reqById[f.id]?.project_id;
    if (f.type === 'testcase') return tcById[f.id]?.project_id;
    if (f.type === 'sprint') return sprintById[f.id]?.project_id;
    return null;
  };

  const portfolioFavs = favorites.filter(f => f.type === 'portfolio');
  const programFavs = favorites.filter(f => f.type === 'program');
  const projectFavs = favorites.filter(f => f.type === 'project');
  const subFavs = favorites.filter(f => ['requirement', 'testcase', 'sprint'].includes(f.type));

  // Build hierarchy: portfolio -> program -> project -> [items]
  const tree = {};
  const ensurePortfolio = (pid) => { if (!tree[pid]) tree[pid] = { portfolio: portfolioById[pid], portfolioStarred: false, programs: {} }; return tree[pid]; };
  const ensureProgram = (poid, prid) => { const po = ensurePortfolio(poid); if (!po.programs[prid]) po.programs[prid] = { program: programById[prid], programStarred: false, projects: {} }; return po.programs[prid]; };
  const ensureProject = (poid, prid, projid) => { const pr = ensureProgram(poid, prid); if (!pr.projects[projid]) pr.projects[projid] = { project: projectById[projid], starred: false, items: [] }; return pr.projects[projid]; };

  const resolveLoc = (proj) => {
    const prid = proj?.program_id || NONE;
    const poid = proj?.portfolio_id || programById[prid]?.portfolio_id || NONE;
    return { poid, prid };
  };

  projectFavs.forEach(f => { const { poid, prid } = resolveLoc(projectById[f.id]); ensureProject(poid, prid, f.id).starred = true; });
  subFavs.forEach(f => { const pid = pidFor(f); if (!pid) return; const { poid, prid } = resolveLoc(projectById[pid]); ensureProject(poid, prid, pid).items.push(f); });
  programFavs.forEach(f => { const poid = programById[f.id]?.portfolio_id || NONE; ensureProgram(poid, f.id).programStarred = true; });
  portfolioFavs.forEach(f => { ensurePortfolio(f.id).portfolioStarred = true; });

  const projectCount = (pn) => (pn.starred ? 1 : 0) + pn.items.length;
  const programCount = (prn) => (prn.programStarred ? 1 : 0) + Object.values(prn.projects).reduce((s, pn) => s + projectCount(pn), 0);
  const portfolioCount = (pon) => (pon.portfolioStarred ? 1 : 0) + Object.values(pon.programs).reduce((s, prn) => s + programCount(prn), 0);

  const sortIds = (ids, nameOf) => ids.sort((a, b) => { if (a === NONE) return 1; if (b === NONE) return -1; return (nameOf(a) || '').localeCompare(nameOf(b) || ''); });

  const UnstarBtn = ({ fav, className }) => fav ? (
    <button onClick={() => toggle({ id: fav.id, type: fav.type, name: fav.name, color: fav.color })} className={cn('p-1 rounded hover:bg-amber-50 text-amber-400', className)} title="Remove from favorites"><Star className="w-3.5 h-3.5" fill="currentColor" /></button>
  ) : null;

  const renderItems = (pn, depth) => (
    <div className="divide-y divide-slate-50">
      {pn.items.map(f => {
        const M = TYPE_META[f.type];
        const Icon = M?.icon || Star;
        return (
          <div key={f.id} className="flex items-center gap-3 hover:bg-slate-50" style={{ paddingLeft: depth }}>
            <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400 w-24 flex-shrink-0">{M?.label}</span>
            <Link to={M.link(f.id)} className="flex-1 text-sm text-slate-700 hover:text-[#002046] truncate py-2.5">{f.name}</Link>
            <button onClick={() => toggle({ id: f.id, type: f.type, name: f.name, color: f.color })} className="p-1 mr-3 rounded hover:bg-amber-50 text-amber-400" title="Remove from favorites"><Star className="w-3.5 h-3.5" fill="currentColor" /></button>
          </div>
        );
      })}
      {pn.items.length === 0 && !pn.starred && <div className="text-xs text-slate-400 py-2" style={{ paddingLeft: depth }}>No starred items.</div>}
    </div>
  );

  const renderProject = (pn, depth) => {
    const proj = pn.project;
    const name = proj?.name || 'Unknown Project';
    const favObj = projectFavs.find(f => f.id === pn.project?.id);
    return (
      <div key={pn.project?.id || name} className="border-l-2 border-slate-100" style={{ marginLeft: depth - 20 }}>
        <div className="flex items-center gap-2 py-2 pr-3 hover:bg-slate-50" style={{ paddingLeft: 8 }}>
          <Folder className="w-4 h-4 text-[#c87b14] flex-shrink-0" />
          <Link to={`/Projects?view=project&id=${pn.project?.id}`} className="text-sm font-semibold text-slate-700 hover:text-[#002046] truncate flex-1">{name}</Link>
          <UnstarBtn fav={favObj} />
          <span className="text-xs text-slate-400">{projectCount(pn)}</span>
        </div>
        {renderItems(pn, depth + 16)}
      </div>
    );
  };

  const renderProgram = (prn, prid, depth) => {
    const isNone = prid === NONE;
    const name = isNone ? 'Standalone projects' : (prn.program?.name || 'Unknown Program');
    const favObj = isNone ? null : programFavs.find(f => f.id === prid);
    const projectIds = sortIds(Object.keys(prn.projects), (id) => prn.projects[id].project?.name);
    return (
      <div key={prid} className="border-l-2 border-amber-100" style={{ marginLeft: depth - 20 }}>
        <div className="flex items-center gap-2 py-2.5 pr-3 hover:bg-slate-50" style={{ paddingLeft: 8 }}>
          <FolderTree className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {isNone ? <span className="text-sm font-semibold text-slate-600 flex-1 truncate">{name}</span>
            : <Link to={`/Projects?view=program&id=${prid}`} className="text-sm font-semibold text-slate-700 hover:text-[#002046] flex-1 truncate">{name}</Link>}
          <UnstarBtn fav={favObj} />
          <span className="text-xs text-slate-400">{programCount(prn)}</span>
        </div>
        <div>{projectIds.map(pid => renderProject(prn.projects[pid], depth + 16))}</div>
      </div>
    );
  };

  const renderPortfolio = (poid) => {
    const pon = tree[poid];
    const isNone = poid === NONE;
    const name = isNone ? 'Unassigned (no portfolio)' : (pon.portfolio?.name || 'Unknown Portfolio');
    const favObj = isNone ? null : portfolioFavs.find(f => f.id === poid);
    const programIds = sortIds(Object.keys(pon.programs), (id) => pon.programs[id].program?.name);
    return (
      <div key={poid} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#c87b14]" />
          {isNone ? <span className="text-sm font-bold text-slate-800 flex-1 truncate">{name}</span>
            : <Link to={`/Projects?view=portfolio&id=${poid}`} className="text-sm font-bold text-slate-800 hover:text-[#002046] flex-1 truncate">{name}</Link>}
          <UnstarBtn fav={favObj} />
          <span className="text-xs text-slate-400">{portfolioCount(pon)}</span>
        </div>
        <div className="py-2 pr-2">{programIds.map(prid => renderProgram(pon.programs[prid], prid, 28))}</div>
      </div>
    );
  };

  const portfolioIds = sortIds(Object.keys(tree), (id) => tree[id].portfolio?.name);

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div style={{ background: '#002046' }} className="px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-[#c87b14]" fill="currentColor" />
          <h1 className="text-xl font-bold text-white">Favorites</h1>
          <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">{favorites.length} item{favorites.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          Star items across the app to pin them here. Items are organized by portfolio → program → project, with all associated requirements, test cases, and sprints grouped under their project.
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4"><Star className="w-8 h-8 text-amber-300" /></div>
          <p className="text-base font-semibold text-slate-700">Star items to add them here</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md">Star portfolios, programs, projects, requirements, test cases, or sprints across the app and they'll appear here, organized by portfolio, program, and project.</p>
        </div>
      ) : (
        <div className="p-6 space-y-4">{portfolioIds.map(renderPortfolio)}</div>
      )}
    </div>
  );
}