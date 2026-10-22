import React from 'react';
import { useScrollGutter } from '@/hooks/useScrollGutter';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Building2, FolderTree, Folder, ClipboardList, ClipboardCheck, Package, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFavorites } from '@/lib/favorites';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import DashboardCard, { TEXT, MUTED, BLUE } from '@/components/home/DashboardCard';

const HIERARCHY_TYPES = ['portfolio', 'program', 'project'];

const TYPE_META = {
  portfolio: { label: 'Portfolio', icon: Building2, link: (id) => `/portfolios/${id}` },
  program: { label: 'Program', icon: FolderTree, link: (id) => `/programs/${id}` },
  project: { label: 'Project', icon: Folder, link: (id) => `/projects/${id}/sheet` },
  requirement: { label: 'Requirement', icon: ClipboardList, link: (id) => `/Requirements?reqId=${id}` },
  testcase: { label: 'Test Case', icon: ClipboardCheck, link: (id) => `/Testing?tcId=${id}` },
  sprint: { label: 'Sprint', icon: Package, link: (id) => `/SprintManagement?focusSprint=${id}` },
};

export default function HomeFavorites({ query = '' }) {
  const { favorites: starred, toggle } = useFavorites();
  const { portfolios, programs, projects, isLoading } = useAccountHierarchy();
  const navigate = useNavigate();

  // Portfolios, programs and projects take their current name from the hierarchy; ones that no longer exist drop out.
  const live = new Map([
    ...portfolios.map(p => [`portfolio:${p.id}`, p]),
    ...programs.map(p => [`program:${p.id}`, p]),
    ...projects.map(p => [`project:${p.id}`, p]),
  ]);
  const favorites = starred
    .map(f => {
      if (!HIERARCHY_TYPES.includes(f.type)) return f;
      const item = live.get(`${f.type}:${f.id}`);
      if (!item) return isLoading ? f : null;
      return { ...f, name: item.name };
    })
    .filter(Boolean);

  const q = query.trim().toLowerCase();
  const shown = q ? favorites.filter(f => (f.name || '').toLowerCase().includes(q)) : favorites;
  const [scrollRef, scrolls] = useScrollGutter(shown);

  return (
    <DashboardCard
      title="Favorites"
      subtitle="Quick access to your starred projects and work items"
      heightClass="lg:h-[218px]"
    >
      {shown.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: MUTED }}>
          {favorites.length === 0
            ? "Star items anywhere in the app and they'll appear here."
            : 'No starred items match your search.'}
        </p>
      ) : (
        <div ref={scrollRef} className={cn('flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-x-4 content-start mt-2', scrolls && 'pr-3')}>
          {shown.map(fav => {
            const meta = TYPE_META[fav.type];
            const Icon = meta?.icon || Star;
            const link = meta?.link(fav.id) || '/Projects';
            return (
              <div key={`${fav.type}-${fav.id}`} className="group flex items-center gap-2 h-[40px] min-w-0">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BLUE }} />
                <Link to={link} className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-xs font-medium truncate" style={{ color: TEXT }}>{fav.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#F0F4F9', color: MUTED }}>
                    {meta?.label || 'Item'}
                  </span>
                </Link>
                <button
                  onClick={() => toggle({ id: fav.id, type: fav.type, name: fav.name, color: fav.color })}
                  title="Remove from favorites"
                  className="p-0.5 rounded flex-shrink-0"
                >
                  <Star className="w-3.5 h-3.5" fill="currentColor" style={{ color: '#FF8A00' }} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button title="More" className="p-0.5 rounded flex-shrink-0">
                      <MoreVertical className="w-3.5 h-3.5" style={{ color: '#A8BAD2' }} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(link)}>Open</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggle({ id: fav.id, type: fav.type, name: fav.name, color: fav.color })}>
                      Remove from favorites
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}