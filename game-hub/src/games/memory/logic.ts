import { shuffle } from '../../lib/random';
import type { Level } from '../types';

export const SYMBOLS = ['🚀', '🪐', '⚡', '🎮', '🔮', '🧩', '🎯', '💎', '🌙', '🔥', '🎲', '🛸'];
export const LAYOUT: Record<Level, { pairs: number; cols: number }> = {
  easy: { pairs: 6, cols: 4 },
  medium: { pairs: 8, cols: 4 },
  hard: { pairs: 12, cols: 6 },
};

export interface Card { id: number; symbol: string; matched: boolean }

export function deal(level: Level, rand: () => number = Math.random): Card[] {
  const symbols = SYMBOLS.slice(0, LAYOUT[level].pairs);
  return shuffle([...symbols, ...symbols], rand).map((symbol, id) => ({ id, symbol, matched: false }));
}

export const isMatch = (cards: Card[], a: number, b: number) => a !== b && cards[a].symbol === cards[b].symbol;
export const isWon = (cards: Card[]) => cards.every((c) => c.matched);
