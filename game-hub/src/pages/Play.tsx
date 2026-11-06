import { Suspense } from 'react';
import { getGame } from '../games/registry';
import EmptyState from '../components/EmptyState';
import FavButton from '../components/FavButton';
import LoadingState from '../components/LoadingState';
import SoundToggle from '../components/SoundToggle';

export default function Play({ id }: { id: string }) {
  const game = getGame(id);
  if (!game) {
    return <EmptyState title="Game not found" text="This game doesn’t exist or isn’t ready yet." action={{ label: 'Browse games', href: '#/explore' }} />;
  }
  const { Component } = game;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <a href="#/explore" className="glass inline-flex items-center rounded-full px-5 py-2 text-sm transition-colors hover:border-neon/50">Exit</a>
        <SoundToggle />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{game.title}</h1>
        <FavButton id={game.id} />
      </div>
      <p className="mb-8 mt-2 text-muted">{game.tagline}</p>
      <div className="glass rounded-3xl p-5 md:p-8">
        <Suspense fallback={<LoadingState label="Loading game…" />}>
          <Component />
        </Suspense>
      </div>
    </div>
  );
}
