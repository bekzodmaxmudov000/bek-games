import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '../audio/engine';
import { ACHIEVEMENTS, RESULT_LABEL } from '../progress/logic';
import type { RewardEvent } from '../progress/store';
import { useProgress } from '../progress/useProgress';

export default function RewardToast() {
  const { event } = useProgress();
  const [shown, setShown] = useState<RewardEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    setShown(event);
    sfx(event.leveledUp ? 'levelup' : event.unlocked.length ? 'achievement' : 'xp');
    const t = window.setTimeout(() => setShown(null), event.leveledUp ? 4200 : 3200);
    return () => window.clearTimeout(t);
  }, [event]);

  return (
    <>
      <AnimatePresence>
        {shown && (
          <motion.div key={shown.id} role="status" onClick={() => setShown(null)}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-4 bottom-24 z-50 cursor-pointer md:inset-x-auto md:bottom-6 md:right-6 md:w-80">
            <div className="glass rounded-2xl bg-panel/90 p-4 shadow-neon-lg">
              <p className="text-sm text-muted">{shown.gameTitle}: {RESULT_LABEL[shown.result]}</p>
              <p className="font-display text-2xl font-semibold text-neon">+{shown.xp} XP</p>
              {shown.unlocked.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                return a && <p key={id} className="mt-2 text-sm">{a.icon} Achievement unlocked: <span className="font-medium">{a.title}</span></p>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown?.leveledUp && (
          <motion.div key={`lvl-${shown.id}`} className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-ink/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="relative text-center" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
              {Array.from({ length: 16 }, (_, i) => {
                const a = (i / 16) * Math.PI * 2;
                return (
                  <motion.span key={i} className="absolute left-1/2 top-1/2 text-xl" initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                    animate={{ x: Math.cos(a) * 170, y: Math.sin(a) * 170, opacity: 0, scale: 1.3 }} transition={{ duration: 1.3, ease: 'easeOut' }}>
                    ✨
                  </motion.span>
                );
              })}
              <p className="text-sm text-muted">Level up!</p>
              <p className="bg-gradient-to-r from-neon to-electric bg-clip-text font-display text-7xl font-bold text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,.7)]">
                {shown.level}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
