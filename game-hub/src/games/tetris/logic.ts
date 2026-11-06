import { shuffle } from '../../lib/random';

export const W = 10;
export const H = 20;
export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
export type Cell = Kind | null;
export type Board = Cell[][];
export interface Piece { kind: Kind; rot: number; x: number; y: number }
export interface State { board: Board; piece: Piece; queue: Kind[]; score: number; lines: number; level: number; over: boolean }

const BASE: Record<Kind, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

const rotateCW = (m: number[][]) => m[0].map((_, c) => m.map((row) => row[c]).reverse());

export function shape(kind: Kind, rot: number): number[][] {
  let m = BASE[kind];
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) m = rotateCW(m);
  return m;
}

export function cellsOf(p: Piece): [number, number][] {
  const out: [number, number][] = [];
  shape(p.kind, p.rot).forEach((row, r) => row.forEach((v, c) => { if (v) out.push([p.x + c, p.y + r]); }));
  return out;
}

export const collides = (board: Board, p: Piece) =>
  cellsOf(p).some(([x, y]) => x < 0 || x >= W || y >= H || (y >= 0 && board[y][x] !== null));

const spawn = (kind: Kind): Piece => ({ kind, rot: 0, x: Math.floor((W - BASE[kind].length) / 2), y: 0 });
const emptyBoard = (): Board => Array.from({ length: H }, () => Array<Cell>(W).fill(null));

export function newGame(): State {
  const queue = [...shuffle(KINDS), ...shuffle(KINDS)];
  const first = queue.shift()!;
  return { board: emptyBoard(), piece: spawn(first), queue, score: 0, lines: 0, level: 1, over: false };
}

export const nextKind = (s: State) => s.queue[0];

export function move(s: State, dx: number, dy: number): State {
  if (s.over) return s;
  const p = { ...s.piece, x: s.piece.x + dx, y: s.piece.y + dy };
  return collides(s.board, p) ? s : { ...s, piece: p };
}

export function rotate(s: State, dir: 1 | -1): State {
  if (s.over) return s;
  const rot = (s.piece.rot + dir + 4) % 4;
  for (const kick of [0, -1, 1, -2, 2]) {
    const p = { ...s.piece, rot, x: s.piece.x + kick };
    if (!collides(s.board, p)) return { ...s, piece: p };
  }
  return s;
}

const LINE_POINTS = [0, 100, 300, 500, 800];

/** Fixes the piece on the board, clears full rows and brings in the next piece. */
export function lock(s: State): State {
  const board = s.board.map((row) => [...row]);
  cellsOf(s.piece).forEach(([x, y]) => { if (y >= 0) board[y][x] = s.piece.kind; });
  const kept = board.filter((row) => row.some((c) => c === null));
  const cleared = H - kept.length;
  const rows = [...Array.from({ length: cleared }, () => Array<Cell>(W).fill(null)), ...kept];
  const lines = s.lines + cleared;
  const queue = [...s.queue];
  const piece = spawn(queue.shift()!);
  if (queue.length < 7) queue.push(...shuffle(KINDS));
  return {
    board: rows, piece, queue, lines,
    level: Math.floor(lines / 10) + 1,
    score: s.score + LINE_POINTS[cleared] * s.level,
    over: collides(rows, piece),
  };
}

export function tick(s: State): State {
  if (s.over) return s;
  const m = move(s, 0, 1);
  return m !== s ? m : lock(s);
}

export function softDrop(s: State): State {
  if (s.over) return s;
  const m = move(s, 0, 1);
  return m !== s ? { ...m, score: m.score + 1 } : lock(s);
}

export function ghostY(s: State): number {
  let y = s.piece.y;
  while (!collides(s.board, { ...s.piece, y: y + 1 })) y++;
  return y;
}

export function hardDrop(s: State): State {
  if (s.over) return s;
  const y = ghostY(s);
  return lock({ ...s, piece: { ...s.piece, y }, score: s.score + 2 * (y - s.piece.y) });
}

export const gravityMs = (level: number) => Math.max(90, 800 - (level - 1) * 70);
