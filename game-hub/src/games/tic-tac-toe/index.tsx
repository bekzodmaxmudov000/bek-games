import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" strokeWidth="6" strokeLinecap="round">
    <path d="M38 12v76M62 12v76M12 38h76M12 62h76" stroke="currentColor" opacity=".4" />
    <path d="M18 18l14 14M32 18L18 32" stroke="#e9d5ff" />
    <circle cx="70" cy="70" r="9" stroke="#bae6fd" />
  </svg>
);

const game: GameModule = {
  id: 'tic-tac-toe',
  title: 'Tic-Tac-Toe',
  tagline: 'Get three in a row before the computer does.',
  categories: ['Classic', 'Strategy'],
  status: 'ready',
  hue: ['#7c3aed', '#38bdf8'],
  Icon,
  Component: lazy(() => import('./TicTacToe')),
  popularity: 100,
  featured: true,
  addedAt: '2026-11-01',
};

export default game;
