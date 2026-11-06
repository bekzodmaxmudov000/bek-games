import { motion } from 'framer-motion';
import { levelInfo } from '../progress/logic';

export default function LevelBar({ xp }: { xp: number }) {
  const { level, into, need, pct } = levelInfo(xp);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-display font-semibold">Level {level}</span>
        <span className="tabular-nums text-muted">{into} / {need} XP</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="XP to next level"
        aria-valuemin={0} aria-valuemax={need} aria-valuenow={into}>
        <motion.div className="h-full rounded-full bg-gradient-to-r from-violet via-neon to-electric shadow-neon"
          initial={false} animate={{ width: `${Math.max(2, pct * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}
