import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} textAnchor="middle" fontWeight="700" fontFamily="Sora, sans-serif">
    <rect x="12" y="14" width="34" height="34" rx="8" fill="#4338ca" />
    <rect x="54" y="14" width="34" height="34" rx="8" fill="#7c3aed" />
    <rect x="12" y="54" width="34" height="34" rx="8" fill="#a855f7" />
    <rect x="54" y="54" width="34" height="34" rx="8" fill="#fbbf24" />
    <text x="29" y="39" fontSize="20" fill="#fff">2</text>
    <text x="71" y="39" fontSize="20" fill="#fff">4</text>
    <text x="29" y="79" fontSize="20" fill="#fff">8</text>
    <text x="71" y="77" fontSize="15" fill="#1b1033">2048</text>
  </svg>
);

const game: GameModule = {
  id: '2048',
  title: '2048',
  tagline: 'Slide and merge tiles until you reach 2048.',
  categories: ['Puzzle'],
  status: 'ready',
  hue: ['#4f46e5', '#38bdf8'],
  Icon,
  Component: lazy(() => import('./Game2048')),
  popularity: 80,
  addedAt: '2026-11-04T12:00',
};

export default game;
