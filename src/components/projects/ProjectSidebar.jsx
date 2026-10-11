import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/lib/AuthContext';
import { accountsApi } from '@/api/accounts';
import { useQuery } from '@tanstack/react-query';
import {
  FolderTree, Building2, ChevronRight, ChevronDown,
  FileText, Shield, Users, Package, AlertTriangle,
  Star, Folder, Compass, PanelLeftClose, PanelLeftOpen, LifeBuoy, LogOut
} from "lucide-react";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NotificationBell from '@/components/NotificationBell';

const NAVY = '#002046';
const ORANGE = '#d97706';
const EMPTY_SIDEBAR_HIERARCHY = { portfolios: [], programs: [], projects: [] };

/** @typedef {import('@/api/accounts').ProjectHubSidebarHierarchy} ProjectHubSidebarHierarchy */
/** @typedef {import('@/api/accounts').ProjectHubSidebarPortfolio} ProjectHubSidebarPortfolio */
/** @typedef {import('@/api/accounts').ProjectHubSidebarProgram} ProjectHubSidebarProgram */
/** @typedef {import('@/api/accounts').ProjectHubSidebarProject} ProjectHubSidebarProject */

const DEFAULT_EXPANDED_FOLDERS = ['favorites', 'raid', 'resource_mgmt', 'delivery', 'sprint_mgmt'];
const SCROLL_KEY = 'sidebar_scroll_top';

const hierarchyFolderIdsOf = (hierarchy) => [
  ...hierarchy.portfolios.map(portfolio => `portfolio:${portfolio.id}`),
  ...hierarchy.programs.map(program => `program:${program.id}`),
];

const readSavedScrollTop = () => {
  try {
    const saved = parseInt(localStorage.getItem(SCROLL_KEY) || '', 10);
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
};

export default function ProjectSidebar(/** @type {any} */ {
  projects, programs = [], portfolios = [], selectedItem, selectedType,
  onSelectItem, onNewProject, onNewProgram, onNewPortfolio, onRenameItem, onDeleteItem, onEditItem,
}) {
  const [expandedFolders, setExpandedFolders] = useState(DEFAULT_EXPANDED_FOLDERS);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const { user, selectedAccountId, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();

  const {
    data: sidebarHierarchy = EMPTY_SIDEBAR_HIERARCHY,
    isLoading: sidebarLoading,
    isError: sidebarHasError,
    refetch: refetchSidebarHierarchy,
  } = useQuery({
    queryKey: ['account-sidebar', selectedAccountId],
    queryFn: () => accountsApi.getSidebar(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  // Portfolios and programs start expanded. Done in a layout effect so a remount (every page renders its own
  // sidebar) paints the full-height list straight away and the saved scroll position below still fits.
  useLayoutEffect(() => {
    const hierarchyFolderIds = hierarchyFolderIdsOf(sidebarHierarchy);
    if (!hierarchyFolderIds.length) return;
    setExpandedFolders(prev => Array.from(new Set([...prev, ...hierarchyFolderIds])));
  }, [sidebarHierarchy]);

  const toggleCollapsed = () => {
    setCollapsed(p => {
      const next = !p;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sidebar_favorites') || '[]'); } catch { return []; }
  });

  // Keep the sidebar's scroll position across page changes. The saved position is only restored once the
  // hierarchy has loaded and expanded; until then the list is shorter, the browser would clamp the position,
  // and saving that clamped value would lose the real one.
  const pendingScrollTop = useRef(/** @type {number | null} */ (readSavedScrollTop()));
  const hierarchyExpanded = !sidebarLoading
    && hierarchyFolderIdsOf(sidebarHierarchy).every(id => expandedFolders.includes(id));

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || pendingScrollTop.current === null) return;
    el.scrollTop = pendingScrollTop.current;
    if (hierarchyExpanded || el.scrollTop === pendingScrollTop.current) pendingScrollTop.current = null;
  }, [hierarchyExpanded, collapsed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (pendingScrollTop.current !== null) return;
      try { localStorage.setItem(SCROLL_KEY, String(el.scrollTop)); } catch {}
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [collapsed]);

  const toggleFolder = (/** @type {string} */ folder) => {
    setExpandedFolders(prev => prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]);
  };

  const initials = (user?.full_name || 'U').split(' ').map((/** @type {string} */ s) => s[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Member';

  const activeBar = 'shadow-[inset_2px_0_0_0_#d97706]';

  const isPortfolioRouteActive = (/** @type {string} */ portfolioId) => pathname === `/portfolios/${portfolioId}`.toLowerCase();
  const isProgramRouteActive = (/** @type {string} */ programId) => pathname === `/programs/${programId}`.toLowerCase();
  const isProjectRouteActive = (/** @type {string} */ projectId) => {
    const projectPath = `/projects/${projectId}`.toLowerCase();
    return ['sheet', 'board', 'gantt', 'audit'].some(view => pathname === `${projectPath}/${view}`);
  };

  const isAnyPortfolioRouteActive = pathname.startsWith('/portfolios/');
  const isAnyProgramRouteActive = pathname.startsWith('/programs/');
  const isAnyProjectRouteActive = pathname.startsWith('/projects/');
  const directoryView = pathname === '/' || pathname === '/projects'
    ? new URLSearchParams(location.search).get('view') || selectedType
    : null;
  const portfoliosActive = isAnyPortfolioRouteActive || ['all_portfolios', 'portfolio'].includes(directoryView);
  const programsActive = isAnyProgramRouteActive || ['all_programs', 'program'].includes(directoryView);
  const projectsActive = isAnyProjectRouteActive || ['all_projects', 'project'].includes(directoryView);

  const IconNavLink = (/** @type {{ href: string, icon: any, label: string, sub?: string }} */ { href, icon, label, sub }) => {
    const NavIcon = icon;
    const pathKey = href.replace('/', '').toLowerCase();
    const isActive = pathname.includes(pathKey);
    return (
      <Link to={href}>
        <button className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs tracking-[0.1em] rounded-md',
          isActive ? cn('bg-white/10 text-white', activeBar) : 'text-white hover:bg-white/10')}>
          <NavIcon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-[#d97706]' : 'text-white/60')} />
          {sub ? (
            <span className="flex items-baseline gap-1">
              <span>{label}</span>
              <span className="text-[10px] italic text-white/50">{sub}</span>
            </span>
          ) : label}
        </button>
      </Link>
    );
  };

  const DotNavLink = (/** @type {{ href: string, label: string }} */ { href, label }) => {
    const pathKey = href.replace('/', '').toLowerCase();
    const isActive = pathname.includes(pathKey);
    return (
      <Link to={href}>
        <button className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs tracking-[0.1em] rounded-md',
          isActive ? cn('bg-white/10 text-white', activeBar) : 'text-white hover:bg-white/10')}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/60" />{label}
        </button>
      </Link>
    );
  };

  const HierarchyLink = (/** @type {{ href: string, label: string, active: boolean, className?: string, icon?: any }} */ { href, label, active, className = '', icon: Icon = Folder }) => (
    <Link to={href} className="block min-w-0">
      <div className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors min-w-0',
        active ? cn('bg-white/10 text-white', activeBar) : 'text-white/80 hover:bg-white/10',
        className)}>
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-[#d97706]' : 'text-white/50')} />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );

  const HierarchyState = () => {
    if (!selectedAccountId) {
      return <div className="px-2 py-2 text-[11px] leading-4 text-white/50">Select an account to load hierarchy.</div>;
    }

    if (sidebarLoading) {
      return <div className="px-2 py-2 text-[11px] leading-4 text-white/50">Loading hierarchy…</div>;
    }

    if (sidebarHasError) {
      return (
        <div className="px-2 py-2 text-[11px] leading-4 text-white/60">
          <p>We could not load your project hierarchy.</p>
          <button onClick={() => refetchSidebarHierarchy()} className="mt-1 text-[#d97706] hover:text-amber-400">Retry</button>
        </div>
      );
    }

    if (!sidebarHierarchy.portfolios.length && !sidebarHierarchy.programs.length && !sidebarHierarchy.projects.length) {
      return <div className="px-2 py-2 text-[11px] leading-4 text-white/50">No portfolios, programs, or projects yet.</div>;
    }

    return null;
  };

  const renderProject = (/** @type {ProjectHubSidebarProject} */ project) => (
    <HierarchyLink
      key={project.id}
      href={project.route}
      label={project.name}
      active={isProjectRouteActive(project.id)}
      icon={Folder}
      className="pl-2"
    />
  );

  const renderProgram = (/** @type {ProjectHubSidebarProgram} */ program) => {
    const folderId = `program:${program.id}`;
    const isExpanded = expandedFolders.includes(folderId);
    const isActive = isProgramRouteActive(program.id);

    return (
      <div key={program.id} className="mb-0.5">
        <div className="flex items-center rounded-md">
          <button onClick={() => toggleFolder(folderId)} className="p-1.5 flex-shrink-0" aria-label={`Toggle ${program.name}`}>
            {isExpanded ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
          </button>
          <HierarchyLink href={program.route} label={program.name} active={isActive} icon={FolderTree} className="flex-1" />
        </div>
        {isExpanded && program.projects.length > 0 && (
          <div className="ml-5 pl-2 border-l border-white/10 space-y-0.5">
            {program.projects.map(renderProject)}
          </div>
        )}
      </div>
    );
  };

  const renderPortfolio = (/** @type {ProjectHubSidebarPortfolio} */ portfolio) => {
    const folderId = `portfolio:${portfolio.id}`;
    const isExpanded = expandedFolders.includes(folderId);
    const isActive = isPortfolioRouteActive(portfolio.id);

    return (
      <div key={portfolio.id} className="mb-0.5">
        <div className="flex items-center rounded-md">
          <button onClick={() => toggleFolder(folderId)} className="p-1.5 flex-shrink-0" aria-label={`Toggle ${portfolio.name}`}>
            {isExpanded ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
          </button>
          <HierarchyLink href={portfolio.route} label={portfolio.name} active={isActive} icon={Building2} className="flex-1" />
        </div>
        {isExpanded && portfolio.programs.length > 0 && (
          <div className="ml-5 pl-2 border-l border-white/10 space-y-0.5">
            {portfolio.programs.map(renderProgram)}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r border-white/10 flex flex-col select-none transition-all" style={{ background: NAVY, fontFamily: 'Segoe UI, sans-serif' }}>
        <div className="px-2 py-4 border-b border-white/10 flex flex-col items-center gap-2">
          <button onClick={toggleCollapsed} className="p-1.5 hover:bg-white/10 rounded-lg" title="Expand sidebar">
            <PanelLeftOpen className="w-4 h-4 text-white/80" />
          </button>
          <NotificationBell compact />
        </div>
        <div className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
          <Link to="/Favorites" title="Favorites" className={cn('p-2 rounded-lg', pathname === '/favorites' ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-[#d97706]')}><Star className="w-4 h-4" fill="currentColor" /></Link>
          <Link to="/Projects?view=all_portfolios"
            title="Portfolios" className={cn('p-2 rounded-lg', portfoliosActive ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-white/60')}>
            <Building2 className="w-4 h-4" />
          </Link>
          <Link to="/Projects?view=all_programs"
            title="Programs" className={cn('p-2 rounded-lg', programsActive ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-white/60')}>
            <FolderTree className="w-4 h-4" />
          </Link>
          <Link to="/Projects?view=all_projects"
            title="Projects" className={cn('p-2 rounded-lg', projectsActive ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-white/60')}>
            <Folder className="w-4 h-4" />
          </Link>
          <div className="w-6 border-t border-white/10 my-1" />
          <Link to={createPageUrl('SprintManagement')} title="Delivery"><button className={cn('p-2 rounded-lg', typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('sprintmanagement') ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-white/60')}><Package className="w-4 h-4" /></button></Link>
          <Link to={createPageUrl('ResourceManagementHub')} title="Resource Management">
            <button className={cn('p-2 rounded-lg', typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('resourcemanagementhub') ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-white/60')}><Users className="w-4 h-4" /></button>
          </Link>
          <button
            title="Project Controls" className={cn('p-2 rounded-lg', selectedType === 'all_raid' ? 'bg-white/10 text-[#d97706]' : 'text-white/60')}>
            <Shield className="w-4 h-4" />
          </button>
          <Link to={createPageUrl('RiskLog')} title="RAID Log"><button className="p-2 rounded-lg hover:bg-white/10 text-white/60"><AlertTriangle className="w-4 h-4" /></button></Link>
          <Link to="/Projects?view=templates"
            title="Templates" className={cn('p-2 rounded-lg', directoryView === 'templates' ? 'bg-white/10 text-[#d97706]' : 'hover:bg-white/10 text-white/60')}>
            <FileText className="w-4 h-4" />
          </Link>
          <Link to="/AIAssistant" title="Compass (powered by AI)"><button className="p-2 rounded-lg hover:bg-white/10 text-white/60"><Compass className="w-4 h-4" /></button></Link>
          <div className="mt-auto space-y-1">
            <Link to="/LearnSupport" title="Help Center"><button className="p-2 rounded-lg hover:bg-white/10 text-white/60"><LifeBuoy className="w-4 h-4" /></button></Link>
            {user?.is_platform_admin && (
              <Link to="/admin" title="Platform Admin"><button className="p-2 rounded-lg hover:bg-white/10 text-white/60"><Shield className="w-4 h-4" /></button></Link>
            )}
            <Link to="/Account" title={user?.full_name || 'User'}><div className="w-8 h-8 rounded-full bg-white text-[#d97706] flex items-center justify-center text-xs font-bold mx-auto mt-2">{initials}</div></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-white/10 flex flex-col select-none transition-all" style={{ background: NAVY, fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Project Hub</h1>
          <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase mt-0.5">All-in-one Project Management</p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <NotificationBell />
          <button onClick={toggleCollapsed} className="p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0" title="Collapse sidebar">
            <PanelLeftClose className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 px-2 py-3 overflow-y-auto">

        {/* Favorites */}
        <Link to="/Favorites" className="block mb-1">
          <div className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
            pathname === '/favorites' ? cn('bg-white/10 text-white', activeBar) : 'text-white hover:bg-white/10')}>
            <Star className="w-3.5 h-3.5 text-[#d97706]" fill="currentColor" /> Favorites
          </div>
        </Link>

        {/* Portfolios */}
        <Link
          to="/Projects?view=all_portfolios"
          className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg mb-1 transition-colors',
            portfoliosActive ? cn('bg-white/10 text-white', activeBar) : 'text-white hover:bg-white/10')}>
          <Building2 className="w-3.5 h-3.5 text-[#d97706] flex-shrink-0" />
          <span className="flex-1 text-left">Portfolios</span>
        </Link>

        {/* Programs */}
        <Link
          to="/Projects?view=all_programs"
          className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg mb-1 transition-colors',
            programsActive ? cn('bg-white/10 text-white', activeBar) : 'text-white hover:bg-white/10')}>
          <FolderTree className="w-3.5 h-3.5 text-[#d97706] flex-shrink-0" />
          <span className="flex-1 text-left">Programs</span>
        </Link>

        {/* Projects */}
        <Link
          to="/Projects?view=all_projects"
          className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg mb-1 transition-colors',
            projectsActive ? cn('bg-white/10 text-white', activeBar) : 'text-white hover:bg-white/10')}>
          <Folder className="w-3.5 h-3.5 text-[#d97706] flex-shrink-0" />
          <span className="flex-1 text-left">Projects</span>
        </Link>

        <div className="ml-2 pl-3 border-l border-white/10 mb-2 space-y-0.5">
          <HierarchyState />
          {!sidebarLoading && !sidebarHasError && sidebarHierarchy.portfolios.map(renderPortfolio)}
        </div>

        <div className="border-t border-white/10 my-3" />

        {/* Delivery */}
        {localStorage.getItem('app_hide_delivery') !== 'true' && (
          <div className="mb-1">
            <div className="flex items-center rounded-lg">
              <button onClick={() => toggleFolder('delivery')} className="p-2 flex-shrink-0">
                {expandedFolders.includes('delivery') ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
              </button>
              <button className={cn('flex-1 flex items-center gap-2 py-1.5 pr-3 text-xs font-semibold uppercase tracking-wider text-white')}>
                <Package className="w-3.5 h-3.5 text-[#d97706]" />
                <span className="flex-1 text-left">Delivery</span>
              </button>
            </div>
            {expandedFolders.includes('delivery') && (
              <div className="ml-2 pl-3 border-l border-white/10">
                <DotNavLink href={createPageUrl('Requirements')} label="Requirements" />
                <DotNavLink href={createPageUrl('Testing')} label="Testing" />
                <DotNavLink href={createPageUrl('SprintManagement')} label="Sprint Management" />
              </div>
            )}
          </div>
        )}

        {/* RAID */}
        <div className="mb-1">
          <div className="flex items-center rounded-lg">
            <button onClick={() => toggleFolder('raid')} className="p-2 flex-shrink-0">
              {expandedFolders.includes('raid') ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
            </button>
            <button
              className={cn('flex-1 flex items-center gap-2 py-1.5 pr-3 text-xs font-semibold uppercase tracking-wider',
                selectedType === 'all_raid' ? 'text-white' : 'text-white')}>
              <Shield className="w-3.5 h-3.5 text-[#d97706]" />
              <span className="flex-1 text-left">Project Controls</span>
            </button>
          </div>
          {expandedFolders.includes('raid') && (
            <div className="ml-2 pl-3 border-l border-white/10">
              <DotNavLink href={createPageUrl('RiskLog')}            label="RAID Log" />
              <DotNavLink href={createPageUrl('ChangeRegisterHub')} label="Change Management" />
              <DotNavLink href={createPageUrl('ResourceManagementHub')} label="Resource Management" />
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="mb-1">
          <div className="flex items-center rounded-lg hover:bg-white/10">
            <div className="p-2"><FileText className="w-3.5 h-3.5 text-[#d97706]" /></div>
            <Link to="/Projects?view=templates"
              className={cn('flex-1 flex items-center gap-2 py-1.5 pr-3 text-xs font-semibold uppercase tracking-wider',
                selectedType === 'templates' ? 'text-white' : 'text-white')}>
              <span className="flex-1 text-left">Templates</span>
            </Link>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="mb-1">
          <IconNavLink href="/AIAssistant" icon={Compass} label="Compass" sub="powered by AI" />
        </div>

        {/* Help */}
        <div className="mb-1 space-y-0.5">
          <IconNavLink href="/LearnSupport" icon={LifeBuoy} label="Help Center" />
          {user?.is_platform_admin && <IconNavLink href="/admin" icon={Shield} label="Platform Admin" />}
        </div>

      </div>

      {/* User profile */}
      <div className="border-t border-white/10 px-3 py-3 flex items-center gap-1">
        <Link to="/Account" className="flex flex-1 min-w-0 items-center gap-2.5 rounded-lg hover:bg-white/10 px-1 py-1 -mx-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ color: ORANGE }}>{initials}</div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || 'User'}</p>
            <p className="text-[10px] text-white/80 truncate">{roleLabel}</p>
          </div>
        </Link>
        <button type="button" onClick={() => logout()} title="Sign out" aria-label="Sign out"
          className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}