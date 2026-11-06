import { categoryFromSlug, categorySlug, games } from '../games/registry';
import { CATEGORIES } from '../games/types';
import { go } from '../lib/router';
import EmptyState from '../components/EmptyState';
import GameCard from '../components/GameCard';
import { SearchIcon } from '../components/Icons';

interface Props { categorySlugParam?: string; query: string; onQuery: (q: string) => void }

export default function Explore({ categorySlugParam, query, onQuery }: Props) {
  const active = categoryFromSlug(categorySlugParam);
  const q = query.trim().toLowerCase();
  const list = games.filter(
    (g) => (!active || g.categories.includes(active)) && (!q || `${g.title} ${g.tagline}`.toLowerCase().includes(q)),
  );
  const chip = (label: string, href: string, on: boolean) => (
    <button key={label} onClick={() => go(href)} aria-pressed={on}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
        on ? 'border-neon/60 bg-neon/20 text-fg shadow-neon' : 'border-white/10 text-muted hover:text-fg'
      }`}>
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-bold md:text-4xl">Explore games</h1>
      <p className="mt-2 text-muted">Quick games you can play right now, against the computer.</p>

      <div className="relative mt-8 max-w-md">
        <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search by name" aria-label="Search games"
          className="glass w-full rounded-full py-3 pl-11 pr-4 placeholder:text-muted focus:border-neon/50" />
      </div>

      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0" role="group" aria-label="Categories">
        {chip('All Games', '#/explore', !active)}
        {CATEGORIES.map((c) => chip(c, `#/explore/${categorySlug(c)}`, active === c))}
      </div>

      <div className="mt-8">
        {list.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((g) => <GameCard key={g.id} game={g} />)}</div>
        ) : q ? (
          <EmptyState title="No games found" text="Try a different search or pick another category." />
        ) : (
          <EmptyState title="No games here yet" text="New games are coming soon." action={{ label: 'See all games', href: '#/explore' }} />
        )}
      </div>
    </div>
  );
}
