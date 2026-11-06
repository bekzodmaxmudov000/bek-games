import { toggleFavorite } from '../progress/store';
import { useProgressSelector } from '../progress/useProgress';
import { HeartIcon } from './Icons';

export default function FavButton({ id, className = '' }: { id: string; className?: string }) {
  const on = useProgressSelector((s) => s.favorites.includes(id));
  return (
    <button type="button" aria-pressed={on} aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(id); }}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-ink/50 backdrop-blur transition-colors ${on ? 'text-neon' : 'text-white/80 hover:text-white'} ${className}`}>
      <HeartIcon width={18} height={18} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
