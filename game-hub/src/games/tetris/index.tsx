import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} strokeWidth="3" stroke="#0b1020">
    <rect x="14" y="52" width="24" height="24" rx="4" fill="#c084fc" />
    <rect x="38" y="52" width="24" height="24" rx="4" fill="#c084fc" />
    <rect x="62" y="52" width="24" height="24" rx="4" fill="#c084fc" />
    <rect x="38" y="28" width="24" height="24" rx="4" fill="#e9d5ff" />
    <rect x="62" y="76" width="24" height="12" rx="4" fill="#38bdf8" />
  </svg>
);

const game: GameModule = {
  id: 'tetris',
  title: 'Tetris',
  tagline: 'Stack the blocks, clear the lines, chase the next level.',
  categories: ['Arcade', 'Puzzle'],
  status: 'ready',
  hue: ['#9333ea', '#db2777'],
  Icon,
  Component: lazy(() => import('./TetrisGame')),
  popularity: 88,
  addedAt: '2026-11-04T12:00',
};

export default game;
