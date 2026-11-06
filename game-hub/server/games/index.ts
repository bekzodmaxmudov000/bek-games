import { ticTacToe } from './tictactoe';
import type { GameRules } from './types';

/** Register new games here (chess and checkers come next). */
export const GAMES: Record<string, GameRules> = { [ticTacToe.kind]: ticTacToe };

export const rulesFor = (kind: unknown): GameRules | null =>
  typeof kind === 'string' && Object.hasOwn(GAMES, kind) ? GAMES[kind] : null;

export const listGames = () => Object.values(GAMES).map((g) => ({ kind: g.kind, title: g.title }));
