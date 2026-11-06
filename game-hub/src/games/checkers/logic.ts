// Russian draughts (shashka): flying kings, men capture backwards, capture is mandatory.
import type { Level } from '../types';

export type Color = 'w' | 'b';
export interface Piece { color: Color; king: boolean }
export type Board = (Piece | null)[]; // index = row * 8 + col, row 0 is the top (black side)
export interface Move { from: number; path: number[]; captured: number[] }
export interface Position { board: Board; turn: Color; idle: number; seen: Record<string, number> }

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const lastRow = (color: Color) => (color === 'w' ? 0 : 7);
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function initialBoard(): Board {
  const b: Board = Array(64).fill(null);
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0) continue;
      if (r < 3) b[r * 8 + c] = { color: 'b', king: false };
      if (r > 4) b[r * 8 + c] = { color: 'w', king: false };
    }
  return b;
}

const key = (b: Board, t: Color) => t + b.map((p) => (p ? (p.color === 'w' ? (p.king ? 'W' : 'w') : p.king ? 'B' : 'b') : '.')).join('');

export function newPosition(): Position {
  const board = initialBoard();
  return { board, turn: 'w', idle: 0, seen: { [key(board, 'w')]: 1 } };
}

interface Seq { path: number[]; captured: number[] }

/** Capture continuations from `pos`. The mover's origin square must already be empty on `b`. */
function jumps(b: Board, pos: number, piece: Piece, taken: number[]): Seq[] {
  const out: Seq[] = [];
  const r = pos >> 3, c = pos & 7;
  for (const [dr, dc] of DIRS) {
    let rr = r + dr, cc = c + dc;
    if (piece.king) while (inside(rr, cc) && !b[rr * 8 + cc]) { rr += dr; cc += dc; }
    if (!inside(rr, cc)) continue;
    const eq = rr * 8 + cc;
    const enemy = b[eq];
    if (!enemy || enemy.color === piece.color || taken.includes(eq)) continue;
    const landings: number[] = [];
    let lr = rr + dr, lc = cc + dc;
    while (inside(lr, lc) && !b[lr * 8 + lc]) {
      landings.push(lr * 8 + lc);
      if (!piece.king) break;
      lr += dr; lc += dc;
    }
    const opts = landings.map((l) => {
      const promoted = piece.king || lastRow(piece.color) === l >> 3;
      const nt = [...taken, eq];
      return { l, cont: jumps(b, l, promoted ? { color: piece.color, king: true } : piece, nt) };
    });
    const withCont = opts.filter((o) => o.cont.length);
    for (const o of withCont.length ? withCont : opts) {
      if (o.cont.length) for (const s of o.cont) out.push({ path: [o.l, ...s.path], captured: [eq, ...s.captured] });
      else out.push({ path: [o.l], captured: [eq] });
    }
  }
  return out;
}

export function legalMoves(board: Board, color: Color): Move[] {
  const captures: Move[] = [];
  const steps: Move[] = [];
  board.forEach((piece, from) => {
    if (!piece || piece.color !== color) return;
    const b2 = [...board];
    b2[from] = null;
    for (const s of jumps(b2, from, piece, [])) captures.push({ from, ...s });
    const r = from >> 3, c = from & 7;
    for (const [dr, dc] of DIRS) {
      if (!piece.king && dr !== (color === 'w' ? -1 : 1)) continue;
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc) && !board[rr * 8 + cc]) {
        steps.push({ from, path: [rr * 8 + cc], captured: [] });
        if (!piece.king) break;
        rr += dr; cc += dc;
      }
    }
  });
  return captures.length ? captures : steps;
}

export function applyMove(board: Board, m: Move): Board {
  const b = [...board];
  const piece = b[m.from]!;
  b[m.from] = null;
  m.captured.forEach((sq) => (b[sq] = null));
  const promoted = piece.king || m.path.some((sq) => sq >> 3 === lastRow(piece.color));
  b[m.path[m.path.length - 1]] = { color: piece.color, king: promoted };
  return b;
}

export function play(pos: Position, m: Move): Position {
  const piece = pos.board[m.from]!;
  const board = applyMove(pos.board, m);
  const turn = other(pos.turn);
  const idle = m.captured.length || !piece.king ? 0 : pos.idle + 1;
  const k = key(board, turn);
  return { board, turn, idle, seen: { ...pos.seen, [k]: (pos.seen[k] ?? 0) + 1 } };
}

/** 'w' / 'b' = that colour has won, 'draw', or null while the game goes on. */
export function outcome(pos: Position): Color | 'draw' | null {
  if (!legalMoves(pos.board, pos.turn).length) return other(pos.turn);
  if (pos.idle >= 30 || (pos.seen[key(pos.board, pos.turn)] ?? 0) >= 3) return 'draw';
  return null;
}

export function counts(board: Board) {
  const n = { w: 0, b: 0 };
  board.forEach((p) => p && n[p.color]++);
  return n;
}

// ---------- computer player ----------
const MATE = 100000;

function evaluate(b: Board, color: Color): number {
  let s = 0;
  b.forEach((p, i) => {
    if (!p) return;
    const r = i >> 3, c = i & 7;
    const advance = p.color === 'w' ? 7 - r : r;
    const centre = 3 - Math.abs(c - 3.5) + 0.5;
    const v = p.king ? 320 + centre * 3 : 100 + advance * 6 + centre * 2;
    s += p.color === color ? v : -v;
  });
  return s;
}

// Search budget per level: depth grows until it is reached or the time is up, so slow computers never stall.
const BUDGET_MS: Record<Level, number> = { easy: 120, medium: 250, hard: 450 };
const DEPTH: Record<Level, number> = { easy: 1, medium: 3, hard: 6 };
let deadline = Infinity;
let expired = false;
let nodes = 0;

function search(b: Board, color: Color, depth: number, alpha: number, beta: number, ply: number): number {
  if ((++nodes & 255) === 0 && Date.now() > deadline) expired = true;
  if (expired) return 0;
  const moves = legalMoves(b, color);
  if (!moves.length) return -MATE + ply;
  if (depth === 0) return evaluate(b, color);
  let best = -Infinity;
  for (const m of moves) {
    const s = -search(applyMove(b, m), other(color), depth - 1, -beta, -alpha, ply + 1);
    if (expired) return 0;
    if (s > best) best = s;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function computerMove(pos: Position, level: Level): Move {
  const moves = legalMoves(pos.board, pos.turn).sort(() => Math.random() - 0.5);
  if (moves.length === 1 || (level === 'easy' && Math.random() < 0.35)) return moves[0];
  let best = moves[0];
  deadline = Date.now() + BUDGET_MS[level];
  nodes = 0;
  for (let depth = 1; depth <= DEPTH[level]; depth++) {
    expired = false;
    let bestHere = moves[0], bestScore = -Infinity;
    for (const m of moves) {
      const s = -search(applyMove(pos.board, m), other(pos.turn), depth - 1, -Infinity, Infinity, 1);
      if (expired) break;
      if (s > bestScore) { bestScore = s; bestHere = m; }
    }
    if (expired) break;
    best = bestHere;
    moves.sort((a, b) => Number(b === best) - Number(a === best)); // search the best move first next time
  }
  deadline = Infinity;
  expired = false;
  return best;
}
