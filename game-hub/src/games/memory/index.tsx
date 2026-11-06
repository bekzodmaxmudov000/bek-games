import { lazy } from 'react';
import type { GameModule } from '../types';

const Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="700">
    <rect x="12" y="22" width="36" height="52" rx="8" fill="#6d28d9" stroke="#e9d5ff" strokeWidth="3" transform="rotate(-8 30 48)" />
    <rect x="52" y="26" width="36" height="52" rx="8" fill="#0e7490" stroke="#a5f3fc" strokeWidth="3" transform="rotate(8 70 52)" />
    <text x="30" y="58" fontSize="28" fill="#e9d5ff" transform="rotate(-8 30 48)">?</text>
    <text x="70" y="62" fontSize="28" fill="#a5f3fc" transform="rotate(8 70 52)">?</text>
  </svg>
);

const game: GameModule = {
  id: 'memory-match',
  title: 'Memory Match',
  tagline: 'Flip two cards at a time and find every pair.',
  categories: ['Puzzle', 'Classic'],
  status: 'ready',
  hue: ['#7c3aed', '#0891b2'],
  Icon,
  Component: lazy(() => import('./MemoryGame')),
  popularity: 75,
  addedAt: '2026-11-04T12:00',
};

export default game;
