import { categorySlug, gamesIn } from '../games/registry';
import { CATEGORIES } from '../games/types';

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((c) => {
        const n = gamesIn(c).length;
        return (
          <a key={c} href={`#/explore/${categorySlug(c)}`}
            className="glass rounded-2xl p-5 transition-colors hover:border-neon/50 hover:bg-white/[0.07]">
            <div className="font-display font-semibold">{c}</div>
            <div className="mt-1 text-sm text-muted">{n === 0 ? 'No games yet' : n === 1 ? '1 game' : `${n} games`}</div>
          </a>
        );
      })}
    </div>
  );
}
