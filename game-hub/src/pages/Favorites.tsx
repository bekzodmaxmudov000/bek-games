import { getGame } from '../games/registry';
import type { GameModule } from '../games/types';
import { useProgress } from '../progress/useProgress';
import EmptyState from '../components/EmptyState';
import GameCard from '../components/GameCard';

export default function Favorites() {
  const { favorites } = useProgress();
  const list = favorites.map(getGame).filter((g): g is GameModule => Boolean(g));
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Favorites</h1>
      <p className="mb-8 mt-2 text-muted">Games you saved with the heart button.</p>
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-5">{list.map((g) => <GameCard key={g.id} game={g} />)}</div>
      ) : (
        <EmptyState title="No favorites yet" text="Tap the heart on any game to keep it here." action={{ label: 'Browse games', href: '#/explore' }} />
      )}
    </div>
  );
}
