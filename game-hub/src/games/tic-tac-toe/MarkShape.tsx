import { motion } from 'framer-motion';
import type { Mark } from './logic';

/** The animated X and O drawn on the board (local and online games). */
export function MarkShape({ who }: { who: Mark }) {
  const t = { duration: 0.28 };
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" fill="none" strokeWidth="9" strokeLinecap="round">
      {who === 'X' ? (
        <g style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,.8))' }}>
          <motion.path d="M24 24L76 76" stroke="#c084fc" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={t} />
          <motion.path d="M76 24L24 76" stroke="#c084fc" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: 0.12 }} />
        </g>
      ) : (
        <motion.circle cx="50" cy="50" r="28" stroke="#38bdf8" style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,.8))' }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={t} />
      )}
    </svg>
  );
}
