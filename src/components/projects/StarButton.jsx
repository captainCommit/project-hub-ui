import { Star } from 'lucide-react';
import { useFavorites } from '@/lib/favorites';
import { cn } from '@/lib/utils';

export default function StarButton({ type, id, name, color, className }) {
  const { isFav, toggle } = useFavorites();
  const active = isFav(type, id);
  return (
    <button
      type="button"
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle({ id, name, type, color }); }}
      className={cn('p-1 rounded transition-colors hover:bg-amber-50', className)}
      style={{ color: active ? '#f59e0b' : '#cbd5e1' }}
    >
      <Star className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}