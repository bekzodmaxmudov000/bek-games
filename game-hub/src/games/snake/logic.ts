import type { Dir } from '../../lib/input';

export const SIZE = 18;
export interface Pt { x: number; y: number }
export interface State { snake: Pt[]; dir: Dir; food: Pt; score: number; over: boolean }

const D: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const canTurn = (current: Dir, next: Dir) => OPPOSITE[current] !== next;

export function placeFood(snake: Pt[], rand: () => number = Math.random): Pt {
  const free: Pt[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y });
  return free.length ? free[Math.floor(rand() * free.length)] : { x: -1, y: -1 };
}

export function newGame(rand: () => number = Math.random): State {
  const snake = [{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }];
  return { snake, dir: 'right', food: placeFood(snake, rand), score: 0, over: false };
}

export function step(s: State, wanted: Dir, rand: () => number = Math.random): State {
  if (s.over) return s;
  const dir = canTurn(s.dir, wanted) ? wanted : s.dir;
  const head = { x: s.snake[0].x + D[dir].x, y: s.snake[0].y + D[dir].y };
  const ate = head.x === s.food.x && head.y === s.food.y;
  const body = ate ? s.snake : s.snake.slice(0, -1); // the tail moves away unless we grow
  const hit = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || body.some((p) => p.x === head.x && p.y === head.y);
  if (hit) return { ...s, dir, over: true };
  const snake = [head, ...body];
  return { snake, dir, food: ate ? placeFood(snake, rand) : s.food, score: s.score + (ate ? 10 : 0), over: false };
}
