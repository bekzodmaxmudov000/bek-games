import type { Seat } from '../../src/online/types';

export type { Seat };
export interface Outcome { winnerSeat: Seat | null; reason: 'win' | 'draw' }

/** A game the server can referee. The server owns the state; clients only send moves. */
export interface GameRules {
  kind: string;
  title: string;
  init(): unknown;
  /** Whose turn it is, or null when the game is over. */
  turn(state: unknown): Seat | null;
  /** Validates a move from `seat` and returns the next state, or an error code. */
  apply(state: unknown, seat: Seat, move: unknown): { state: unknown } | { error: string };
  outcome(state: unknown): Outcome | null;
}
