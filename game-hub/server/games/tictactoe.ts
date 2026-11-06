import { isFull, winnerOf, type Board } from '../../src/games/tic-tac-toe/logic';
import type { GameRules, Outcome, Seat } from './types';

interface State { board: Board; next: Seat; line: number[] | null }

function outcome(raw: unknown): Outcome | null {
  const s = raw as State;
  const w = winnerOf(s.board);
  if (w) return { winnerSeat: w.winner === 'X' ? 0 : 1, reason: 'win' };
  return isFull(s.board) ? { winnerSeat: null, reason: 'draw' } : null;
}

export const ticTacToe: GameRules = {
  kind: 'tic-tac-toe',
  title: 'Tic-Tac-Toe',
  init: (): State => ({ board: Array(9).fill(null), next: 0, line: null }), // seat 0 plays X and starts
  turn: (raw) => (outcome(raw) ? null : (raw as State).next),
  outcome,
  apply(raw, seat, move) {
    const s = raw as State;
    if (outcome(s)) return { error: 'game_over' };
    const cell = typeof move === 'object' && move !== null ? (move as { cell?: unknown }).cell : undefined;
    if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell > 8) return { error: 'bad_move' };
    if (seat !== s.next) return { error: 'not_your_turn' };
    if (s.board[cell] !== null) return { error: 'cell_taken' };
    const board = [...s.board];
    board[cell] = seat === 0 ? 'X' : 'O';
    const won = winnerOf(board);
    return { state: { board, next: seat === 0 ? 1 : 0, line: won ? won.line : null } satisfies State };
  },
};
