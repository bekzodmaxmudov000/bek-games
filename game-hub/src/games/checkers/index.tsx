import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" strokeWidth="5">
    <circle cx="36" cy="38" r="20" fill="#e9d5ff" stroke="#fff" />
    <circle cx="64" cy="64" r="20" fill="#312e81" stroke="#7dd3fc" />
    <circle cx="36" cy="38" r="9" stroke="#a855f7" />
  </svg>
);

const game: GameModule = {
  id: 'checkers',
  title: 'Checkers',
  tagline: 'Jump, capture, crown a king. Shashka against the computer.',
  categories: ['Classic', 'Strategy'],
  status: 'ready',
  hue: ['#1d4ed8', '#a855f7'],
  Icon,
  Component: lazy(() => import('./CheckersGame')),
  popularity: 90,
  addedAt: '2026-11-04',
};

export default game;
