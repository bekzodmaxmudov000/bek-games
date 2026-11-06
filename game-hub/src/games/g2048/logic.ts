import type { Dir } from '../../lib/input';

export const N = 4;
export type Board = number[]; // 16 cells, row-major, 0 = empty

function slide(line: number[]): { line: number[]; gained: number } {
  const tiles = line.filter(Boolean);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) { out.push(tiles[i] * 2); gained += tiles[i] * 2; i++; }
    else out.push(tiles[i]);
  }
  while (out.length < N) out.push(0);
  return { line: out, gained };
}

/** Cell indexes of line `i`, ordered from the wall the tiles slide towards. */
function lineIndexes(dir: Dir, i: number): number[] {
  const r = [0, 1, 2, 3];
  if (dir === 'left') return r.map((c) => i * N + c);
  if (dir === 'right') return r.map((c) => i * N + (N - 1 - c));
  if (dir === 'up') return r.map((row) => row * N + i);
  return r.map((row) => (N - 1 - row) * N + i);
}

export function move(b: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  const board = [...b];
  let gained = 0;
  for (let i = 0; i < N; i++) {
    const ids = lineIndexes(dir, i);
    const res = slide(ids.map((k) => b[k]));
    gained += res.gained;
    ids.forEach((k, j) => { board[k] = res.line[j]; });
  }
  return { board, gained, moved: board.some((v, i) => v !== b[i]) };
}

export function spawn(b: Board, rand: () => number = Math.random): Board {
  const empty = b.flatMap((v, i) => (v ? [] : [i]));
  if (!empty.length) return b;
  const board = [...b];
  board[empty[Math.floor(rand() * empty.length)]] = rand() < 0.9 ? 2 : 4;
  return board;
}

export const newBoard = (): Board => spawn(spawn(Array(N * N).fill(0)));
export const canMove = (b: Board) => (['up', 'down', 'left', 'right'] as Dir[]).some((d) => move(b, d).moved);
