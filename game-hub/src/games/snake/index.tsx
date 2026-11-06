import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 72h40a14 14 0 000-28H40a10 10 0 010-20h38" stroke="#e9d5ff" strokeWidth="11" />
    <path d="M20 72h40a14 14 0 000-28H40a10 10 0 010-20h38" stroke="#a855f7" strokeWidth="5" opacity=".7" />
    <circle cx="82" cy="24" r="5" fill="#f0abfc" stroke="none" />
  </svg>
);

const game: GameModule = {
  id: 'snake',
  title: 'Snake',
  tagline: 'Eat, grow, and don’t bite your own tail.',
  categories: ['Arcade'],
  status: 'ready',
  hue: ['#0891b2', '#7c3aed'],
  Icon,
  Component: lazy(() => import('./SnakeGame')),
  popularity: 85,
  addedAt: '2026-11-04T12:00',
};

export default game;
