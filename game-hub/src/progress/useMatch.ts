import { useCallback, useRef } from 'react';
import { games, getGame } from '../games/registry';
import type { Level } from '../games/types';
import type { Result } from './logic';
import { recordMatch } from './store';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Reports one match per round. `finish` can be called more than once for the same round
 * (the store ignores repeats), `next` starts a new round with a fresh id.
 */
export function useMatch(gameId: string) {
  const round = useRef({ id: newId(), start: Date.now() });

  const finish = useCallback((o: { result: Result; score?: string; level?: Level }) => {
    recordMatch(
      {
        id: round.current.id,
        gameId,
        title: getGame(gameId)?.title ?? gameId,
        result: o.result,
        score: o.score ?? '',
        level: o.level,
        durationSec: Math.max(1, Math.round((Date.now() - round.current.start) / 1000)),
      },
      games.filter((g) => g.categories.includes('Arcade')).map((g) => g.id),
    );
  }, [gameId]);

  const next = useCallback(() => { round.current = { id: newId(), start: Date.now() }; }, []);
  return { finish, next };
}
