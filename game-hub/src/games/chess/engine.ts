import { Chess, type Move } from 'chess.js';
import type { Level } from '../types';

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

/** Static evaluation from the point of view of the side to move. */
function evaluate(c: Chess): number {
  let score = 0;
  c.board().forEach((row, r) =>
    row.forEach((sq, f) => {
      if (!sq) return;
      const centre = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(f - 3.5));
      const bonus = sq.type === 'k' || sq.type === 'r' || sq.type === 'q' ? 0 : centre * 6;
      const advance = sq.type === 'p' ? (sq.color === 'w' ? 7 - r : r) * 4 : 0;
      const v = VALUE[sq.type] + bonus + advance;
      score += sq.color === 'w' ? v : -v;
    }),
  );
  return c.turn() === 'w' ? score : -score;
}

const order = (moves: Move[]) =>
  moves.sort((a, b) => Number(Boolean(b.captured)) - Number(Boolean(a.captured)) || Number(Boolean(b.promotion)) - Number(Boolean(a.promotion)));

function negamax(c: Chess, depth: number, alpha: number, beta: number, ply: number): number {
  if (c.isCheckmate()) return -MATE + ply;
  if (c.isDraw()) return 0;
  if (depth === 0) return evaluate(c);
  let best = -Infinity;
  for (const m of order(c.moves({ verbose: true }))) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion });
    const s = -negamax(c, depth - 1, -beta, -alpha, ply + 1);
    c.undo();
    if (s > best) best = s;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const DEPTH: Record<Level, number> = { easy: 1, medium: 2, hard: 3 };

/** Picks a legal move for the side to move. Works on a copy, the game itself is untouched. */
export function pickMove(game: Chess, level: Level): Move {
  const c = new Chess(game.fen());
  const moves = c.moves({ verbose: true }).sort(() => Math.random() - 0.5);
  if (level === 'easy' && Math.random() < 0.4) return moves[0];
  let best = moves[0], bestScore = -Infinity, alpha = -Infinity;
  for (const m of order(moves)) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion });
    const s = -negamax(c, DEPTH[level] - 1, -Infinity, -alpha, 1);
    c.undo();
    if (s > bestScore) { bestScore = s; best = m; }
    if (s > alpha) alpha = s;
  }
  return best;
}
