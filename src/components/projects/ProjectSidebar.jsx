import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { cn } from "@/lib/utils";
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/lib/AuthContext';
import { accountsApi } from '@/api/accounts';
import { useQuery } from '@tanstack/react-query';
import {
  FolderTree, Building2, ChevronRight, ChevronDown,
  FileText, Shield, Users, Package, AlertTriangle,
  ClipboardList, ClipboardCheck, RefreshCw, Scale,
  Folder, Sparkles, PanelLeftClose, PanelLeftOpen, CircleHelp, LogOut, Clock, Home as HomeIcon
} from "lucide-react";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useFavorites } from '@/lib/favorites';
import { useRecentProjects } from '@/lib/userPrefs';

const TEXT = '#002046';
const MUTED = '#64748B';
const EMPTY_SIDEBAR_HIERARCHY = { portfolios: [], programs: [], projects: [] };

/** @typedef {import('@/api/accounts').ProjectHubSidebarHierarchy} ProjectHubSidebarHierarchy */
/** @typedef {import('@/api/accounts').ProjectHubSidebarPortfolio} ProjectHubSidebarPortfolio */
/** @typedef {import('@/api/accounts').ProjectHubSidebarProgram} ProjectHubSidebarProgram */
/** @typedef {import('@/api/accounts').ProjectHubSidebarProject} ProjectHubSidebarProject */

const DEFAULT_EXPANDED_FOLDERS = ['raid', 'resource_mgmt', 'delivery', 'sprint_mgmt'];
const SCROLL_KEY = 'sidebar_scroll_top';
// Portfolios and programs start collapsed; whatever the person opens is remembered across pages.
const EXPANDED_KEY = 'sidebar_expanded_folders';
const RECENT_LIMIT = 5;

const readSavedExpandedFolders = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(EXPANDED_KEY) || 'null');
    return Array.isArray(saved) ? saved : DEFAULT_EXPANDED_FOLDERS;
  } catch {
    return DEFAULT_EXPANDED_FOLDERS;
  }
};

const readSavedScrollTop = () => {
  try {
    const saved = parseInt(localStorage.getItem(SCROLL_KEY) || '', 10);
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
};

/** "Jane Doe" → "Jane D"; a single name is shown as is. */
const shortName = (/** @type {string} */ fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'User';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}`;
};

export default function ProjectSidebar(/** @type {any} */ {
  projects, programs = [], portfolios = [], selectedItem, selectedType,
  onSelectItem, onNewProject, onNewProgram, onNewPortfolio, onRenameItem, onDeleteItem, onEditItem,
}) {
  const [expandedFolders, setExpandedFolders] = useState(readSavedExpandedFolders);
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
  } = useQuery({
    queryKey: ['account-sidebar', selectedAccountId],
    queryFn: () => accountsApi.getSidebar(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  useEffect(() => {
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(expandedFolders)); } catch {}
  }, [expandedFolders]);

  const toggleCollapsed = () => {
    setCollapsed(p => {
      const next = !p;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const { favorites } = useFavorites();
  const recentProjects = useRecentProjects();

  // Keep the sidebar's scroll position across page changes. The saved position is only restored once the
  // hierarchy has loaded (and the active item's folders opened); until then the list is shorter, the browser would clamp the position,
  // and saving that clamped value would lose the real one.
  const pendingScrollTop = useRef(/** @type {number | null} */ (readSavedScrollTop()));
  const hierarchyReady = !sidebarLoading;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || pendingScrollTop.current === null) return;
    el.scrollTop = pendingScrollTop.current;
    if (hierarchyReady || el.scrollTop === pendingScrollTop.current) pendingScrollTop.current = null;
  }, [hierarchyReady, collapsed]);

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

  const fullName = user?.full_name || 'User';
  const initials = fullName.split(' ').map((/** @type {string} */ s) => s[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Member';

  // Selected items get a grey highlight, bold text and icon stroke, and an orange left border.
  const activeBar = 'bg-[#E2E8F0] font-bold nav-selected border-l-[3px] border-l-[#c87b14]';
  const navEdge = 'border-l-[3px] border-l-transparent';
  const itemClass = (/** @type {boolean} */ active) => cn(
    'w-full flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-colors text-[#002046]',
    active ? activeBar : cn(navEdge, 'hover:bg-slate-100'),
  );
  const collapsedClass = (/** @type {boolean} */ active) => cn('p-2 rounded-lg', active ? 'bg-[#E2E8F0] nav-selected text-[#64748B]' : 'hover:bg-slate-100 text-[#64748B]');

  const isProjectRouteActive = (/** @type {string} */ projectId) => {
    const projectPath = `/projects/${projectId}`.toLowerCase();
    return ['sheet', 'board', 'gantt', 'audit'].some(view => pathname === `${projectPath}/${view}`);
  };

  const isAnyPortfolioRouteActive = pathname.startsWith('/portfolios/');
  const isAnyProgramRouteActive = pathname.startsWith('/programs/');
  const isAnyProjectRouteActive = pathname.startsWith('/projects/');
  const directoryView = pathname === '/projects'
    ? new URLSearchParams(location.search).get('view') || selectedType
    : null;
  const portfoliosActive = isAnyPortfolioRouteActive || ['all_portfolios', 'portfolio'].includes(directoryView);
  const programsActive = isAnyProgramRouteActive || ['all_programs', 'program'].includes(directoryView);
  const projectsActive = isAnyProjectRouteActive || ['all_projects', 'project'].includes(directoryView);
  const isPageActive = (/** @type {string} */ href) => pathname.includes(href.replace('/', '').toLowerCase());

  const IconNavLink = (/** @type {{ href: string, icon: any, label: string }} */ { href, icon, label }) => {
    const NavIcon = icon;
    return (
      <Link to={href} className={itemClass(isPageActive(href))}>
        <NavIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />{label}
      </Link>
    );
  };

  const HierarchyLink = (/** @type {{ href: string, label: string, active: boolean, className?: string, icon?: any }} */ { href, label, active, className = '', icon: Icon = Folder }) => (
    <Link to={href} className="block min-w-0">
      <div className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors min-w-0 text-[#002046]',
        active ? activeBar : cn(navEdge, 'hover:bg-slate-100'),
        className)}>
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );

  // Recently opened projects (favorites live on the home page), with names and routes taken from the hierarchy
  // so renames show up. Once the hierarchy has loaded, projects no longer in it are left out.
  const hierarchyProjects = useMemo(
    () => new Map(sidebarHierarchy.projects.map(item => [item.id, item])),
    [sidebarHierarchy],
  );
  const hierarchyLoaded = !sidebarLoading && !sidebarHasError;
  const recentItems = recentProjects
    .filter(p => !favorites.some(f => f.type === 'project' && f.id === p.id))
    .map(p => {
      const live = hierarchyProjects.get(p.id);
      if (!live && hierarchyLoaded) return null;
      return { id: p.id, name: live?.name || p.name, route: live?.route || `/projects/${p.id}/sheet` };
    })
    .filter(Boolean)
    .slice(0, RECENT_LIMIT);

  const FolderHeader = (/** @type {{ id: string, icon: any, label: string }} */ { id, icon: Icon, label }) => (
    <div className="flex items-center rounded-lg">
      <button onClick={() => toggleFolder(id)} className="p-2 flex-shrink-0" aria-label={`Toggle ${label}`}>
        {expandedFolders.includes(id) ? <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: MUTED }} />}
      </button>
      <button onClick={() => toggleFolder(id)} className="flex-1 flex items-center gap-2 py-1.5 pr-3 text-[13px] font-medium" style={{ color: TEXT }}>
        <Icon className="w-3.5 h-3.5" style={{ color: MUTED }} />
        <span className="flex-1 text-left">{label}</span>
      </button>
    </div>
  );

  const CompassBadge = () => (
    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #c87b14)' }}>
      <Sparkles className="w-3 h-3 text-white" />
    </span>
  );

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-slate-200 flex flex-col select-none transition-all" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <div className="px-2 py-4 border-b border-slate-200 flex flex-col items-center gap-2">
          <Link to="/" title="Row"><BrandLogo className="w-8 h-8" /></Link>
          <button onClick={toggleCollapsed} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Expand sidebar">
            <PanelLeftOpen className="w-4 h-4" style={{ color: MUTED }} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
          <Link to="/" title="Home" className={collapsedClass(pathname === '/')}><HomeIcon className="w-4 h-4" /></Link>
          <Link to="/Projects?view=all_portfolios" title="Portfolios" className={collapsedClass(portfoliosActive)}><Building2 className="w-4 h-4" /></Link>
          <Link to="/Projects?view=all_programs" title="Programs" className={collapsedClass(programsActive)}><FolderTree className="w-4 h-4" /></Link>
          <Link to="/Projects?view=all_projects" title="Projects" className={collapsedClass(projectsActive)}><Folder className="w-4 h-4" /></Link>
          <div className="w-6 border-t border-slate-200 my-1" />
          <Link to={createPageUrl('SprintManagement')} title="Sprints" className={collapsedClass(isPageActive('/SprintManagement'))}><RefreshCw className="w-4 h-4" /></Link>
          <Link to={createPageUrl('RiskLog')} title="RAID" className={collapsedClass(isPageActive('/RiskLog'))}><AlertTriangle className="w-4 h-4" /></Link>
          <Link to={createPageUrl('ChangeRegisterHub')} title="Governance" className={collapsedClass(isPageActive('/ChangeRegisterHub'))}><Scale className="w-4 h-4" /></Link>
          <Link to={createPageUrl('ResourceManagementHub')} title="Resources" className={collapsedClass(isPageActive('/ResourceManagementHub'))}><Users className="w-4 h-4" /></Link>
          <Link to="/Projects?view=templates" title="Templates" className={collapsedClass(directoryView === 'templates')}><FileText className="w-4 h-4" /></Link>
          <Link to="/AIAssistant" title="Ask Compass (powered by AI)" className="p-2 rounded-lg hover:bg-slate-100"><CompassBadge /></Link>
          <div className="mt-auto flex flex-col items-center gap-1">
            <Link to="/LearnSupport" title="Help Center" className={collapsedClass(isPageActive('/LearnSupport'))}><CircleHelp className="w-4 h-4" /></Link>
            {user?.is_platform_admin && (
              <Link to="/admin" title="Platform Admin" className={collapsedClass(false)}><Shield className="w-4 h-4" /></Link>
            )}
            <Link to="/Account" title={fullName}><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto mt-2" style={{ background: TEXT, color: '#ffffff' }}>{initials}</div></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col select-none transition-all" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <BrandLogo className="w-11 h-11 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-none tracking-tight" style={{ color: TEXT }}>Row</h1>
            <p className="text-[11px] font-medium mt-1 truncate" style={{ color: MUTED }}>All-in-One Project Management</p>
          </div>
        </Link>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={toggleCollapsed} className="p-1.5 hover:bg-slate-100 rounded-lg flex-shrink-0" title="Collapse sidebar">
            <PanelLeftClose className="w-4 h-4" style={{ color: MUTED }} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 px-2 py-3 overflow-y-auto">

        {/* Home */}
        <Link to="/" className={cn(itemClass(pathname === '/'), 'mb-1 font-medium')}>
          <HomeIcon className="w-3.5 h-3.5" style={{ color: MUTED }} /> Home
        </Link>

        {/* Portfolios */}
        <Link to="/Projects?view=all_portfolios" className={cn(itemClass(portfoliosActive), 'mb-1 font-medium')}>
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
          <span className="flex-1 text-left">Portfolios</span>
        </Link>

        {/* Programs */}
        <Link to="/Projects?view=all_programs" className={cn(itemClass(programsActive), 'mb-1 font-medium')}>
          <FolderTree className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
          <span className="flex-1 text-left">Programs</span>
        </Link>

        {/* Projects */}
        <Link to="/Projects?view=all_projects" className={cn(itemClass(projectsActive), 'mb-1 font-medium')}>
          <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
          <span className="flex-1 text-left">Projects</span>
        </Link>

        {/* Recently opened projects */}
        {recentItems.length > 0 && (
          <>
            <div className="border-t border-slate-200 my-3" />
            <p className="px-2 pb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              <Clock className="w-3 h-3" /> Recent
            </p>
            <div className="mb-2 space-y-0.5">
              {recentItems.map(item => (
                <HierarchyLink key={item.id} href={item.route} label={item.name} active={isProjectRouteActive(item.id)} icon={Folder} />
              ))}
            </div>
          </>
        )}

        <div className="border-t border-slate-200 my-3" />

        {/* Delivery */}
        {localStorage.getItem('app_hide_delivery') !== 'true' && (
          <div className="mb-1">
            <FolderHeader id="delivery" icon={Package} label="Delivery" />
            {expandedFolders.includes('delivery') && (
              <div className="ml-2 pl-3 border-l border-slate-200">
                <IconNavLink href={createPageUrl('Requirements')} icon={ClipboardList} label="Requirements" />
                <IconNavLink href={createPageUrl('Testing')} icon={ClipboardCheck} label="Testing" />
                <IconNavLink href={createPageUrl('SprintManagement')} icon={RefreshCw} label="Sprints" />
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="mb-1">
          <FolderHeader id="raid" icon={Shield} label="Controls" />
          {expandedFolders.includes('raid') && (
            <div className="ml-2 pl-3 border-l border-slate-200">
              <IconNavLink href={createPageUrl('RiskLog')} icon={AlertTriangle} label="RAID" />
              <IconNavLink href={createPageUrl('ChangeRegisterHub')} icon={Scale} label="Governance" />
              <IconNavLink href={createPageUrl('ResourceManagementHub')} icon={Users} label="Resources" />
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="mb-1">
          <Link to="/Projects?view=templates" className={cn(itemClass(directoryView === 'templates'), 'font-medium')}>
            <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
            <span className="flex-1 text-left">Templates</span>
          </Link>
        </div>

        {/* AI Assistant */}
        <div className="mb-1">
          <Link to="/AIAssistant" className={itemClass(isPageActive('/AIAssistant'))}>
            <CompassBadge />
            <span className="flex flex-col leading-tight">
              <span>Ask Compass</span>
              <span className="text-[10px] italic font-normal" style={{ color: MUTED }}>powered by AI</span>
            </span>
          </Link>
        </div>

        {/* Help */}
        <div className="mb-1 space-y-0.5">
          <IconNavLink href="/LearnSupport" icon={CircleHelp} label="Help Center" />
          {user?.is_platform_admin && <IconNavLink href="/admin" icon={Shield} label="Platform Admin" />}
        </div>

      </div>

      {/* User profile */}
      <div className="border-t border-slate-200 px-3 py-3 flex items-center gap-1">
        <Link to="/Account" className="flex flex-1 min-w-0 items-center gap-2.5 rounded-lg hover:bg-slate-100 px-1 py-1 -mx-1 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: TEXT, color: '#ffffff' }}>{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: TEXT }} title={fullName}>{shortName(fullName)}</p>
            <p className="text-[10px] truncate" style={{ color: MUTED }}>{roleLabel}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
        </Link>
        <button type="button" onClick={() => logout()} title="Sign out" aria-label="Sign out"
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0" style={{ color: MUTED }}>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
