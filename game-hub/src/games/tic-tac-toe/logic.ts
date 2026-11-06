export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Board = Cell[];
import type { Level } from '../types';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winnerOf(b: Board): { winner: Mark; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a] as Mark, line };
  }
  return null;
}

export const isFull = (b: Board) => b.every(Boolean);
const emptyCells = (b: Board) => b.flatMap((c, i) => (c ? [] : [i]));

/** Minimax score from the computer's (O) point of view. */
function minimax(b: Board, turn: Mark, depth: number): number {
  const w = winnerOf(b);
  if (w) return w.winner === 'O' ? 10 - depth : depth - 10;
  if (isFull(b)) return 0;
  const scores = emptyCells(b).map((i) => {
    const next = [...b];
    next[i] = turn;
    return minimax(next, turn === 'O' ? 'X' : 'O', depth + 1);
  });
  return turn === 'O' ? Math.max(...scores) : Math.min(...scores);
}

function bestMove(b: Board): number {
  let best = -Infinity;
  let move = emptyCells(b)[0];
  for (const i of emptyCells(b)) {
    const next = [...b];
    next[i] = 'O';
    const s = minimax(next, 'X', 1);
    if (s > best) { best = s; move = i; }
  }
  return move;
}

const SMARTNESS: Record<Level, number> = { easy: 0.2, medium: 0.7, hard: 1 };

export function computerMove(b: Board, level: Level): number {
  const cells = emptyCells(b);
  return Math.random() < SMARTNESS[level]
    ? bestMove(b)
    : cells[Math.floor(Math.random() * cells.length)];
}
