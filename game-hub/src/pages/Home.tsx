import { featuredGame, games, gameRoute, recentGames } from '../games/registry';
import CategoryGrid from '../components/CategoryGrid';
import GameCard from '../components/GameCard';
import SectionHeader from '../components/SectionHeader';

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-5';

export default function Home() {
  const f = featuredGame;
  return (
    <div className="space-y-9">
      {f && (
        <section aria-label="Featured game" className="relative overflow-hidden rounded-[2rem] border border-white/10 p-7 md:p-10"
          style={{ background: `linear-gradient(120deg, ${f.hue[0]}55, ${f.hue[1]}22 70%, transparent)` }}>
          <f.Icon className="absolute -right-6 top-1/2 h-60 w-60 -translate-y-1/2 text-white/20 md:right-10 md:h-64 md:w-64" />
          <p className="text-sm text-muted">Featured game</p>
          <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{f.title}</h1>
          <p className="mt-3 max-w-md text-fg/80">{f.tagline}</p>
          <a href={gameRoute(f)} className="mt-6 inline-block rounded-full bg-gradient-to-r from-violet to-neon px-8 py-3 font-medium shadow-neon-lg transition-transform hover:-translate-y-0.5">
            Play now
          </a>
        </section>
      )}
      <section>
        <SectionHeader title="Popular games" href="#/explore" />
        <div className={GRID}>{games.slice(0, 4).map((g) => <GameCard key={g.id} game={g} />)}</div>
      </section>
      <section>
        <SectionHeader title="Browse categories" href="#/categories" link="All categories" />
        <CategoryGrid />
      </section>
      <section>
        <SectionHeader title="Recently added" href="#/explore" />
        <div className={GRID}>{recentGames.slice(0, 4).map((g) => <GameCard key={g.id} game={g} />)}</div>
      </section>
    </div>
  );
}
