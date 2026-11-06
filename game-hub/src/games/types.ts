import type { ComponentType } from 'react';

export const CATEGORIES = ['Classic', 'Arcade', 'Sports', 'Puzzle', 'Strategy'] as const;
export type Category = (typeof CATEGORIES)[number];
export type GameStatus = 'ready' | 'soon';
export type Level = 'easy' | 'medium' | 'hard';
export const LEVELS: Level[] = ['easy', 'medium', 'hard'];

/** Contract every game module must satisfy. */
export interface GameModule {
  id: string;
  title: string;
  tagline: string;
  categories: Category[];
  status: GameStatus;
  /** Gradient colours for the temporary cover. */
  hue: [string, string];
  Icon: ComponentType<{ className?: string }>;
  Component: ComponentType;
  popularity: number;
  /** ISO date, used for the Recently Added section. */
  addedAt: string;
  featured?: boolean;
}
