import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <text x="50" y="80" textAnchor="middle" fontSize="86" fill="currentColor">♞&#xFE0E;</text>
  </svg>
);

const game: GameModule = {
  id: 'chess',
  title: 'Chess',
  tagline: 'The classic duel of strategy. Outplay the computer.',
  categories: ['Classic', 'Strategy'],
  status: 'ready',
  hue: ['#4c1d95', '#a855f7'],
  Icon,
  Component: lazy(() => import('./ChessGame')),
  popularity: 95,
  addedAt: '2026-11-04',
};

export default game;
