import { motion } from 'framer-motion';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LEVELS, type Level } from '../games/types';

/** Difficulty selector shared by every game. `labels` renames the levels (e.g. speed). */
export function LevelSelect({ level, onChange, labels }: { level: Level; onChange: (l: Level) => void; labels?: Record<Level, string> }) {
  return (
    <div role="group" aria-label="Difficulty" className="glass flex rounded-full p-1">
      {LEVELS.map((l) => (
        <button key={l} onClick={() => onChange(l)} aria-pressed={level === l}
          className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${level === l ? 'bg-neon/25 text-fg' : 'text-muted hover:text-fg'}`}>
          {labels?.[l] ?? l}
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
      className="rounded-full bg-gradient-to-r from-violet to-neon px-7 py-2.5 font-medium shadow-neon transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40" />
  );
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
      className="glass rounded-full px-6 py-2.5 text-sm transition-colors hover:border-neon/50 disabled:opacity-40 disabled:hover:border-white/10" />
  );
}

/** Score / best / level tile. */
export function Stat({ label, value, tone = 'text-fg' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="glass flex-1 rounded-2xl px-3 py-2.5 text-center">
      <div className={`font-display text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

/** Dimmed panel on top of a board (start, pause, game over, win). Parent must be `relative`. */
export function Overlay({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-ink/80 p-4 text-center backdrop-blur-sm">
      <div>
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}

/** Round on-screen control for touch devices. Fires on press; `repeat` keeps firing while held. */
export function PadButton({ label, onPress, repeat = false, children }: { label: string; onPress: () => void; repeat?: boolean; children: ReactNode }) {
  const latest = useRef(onPress);
  latest.current = onPress;
  const timers = useRef<{ delay?: number; every?: number }>({});
  const stop = () => { window.clearTimeout(timers.current.delay); window.clearInterval(timers.current.every); };
  useEffect(() => stop, []);
  return (
    <button aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        latest.current();
        if (!repeat) return;
        stop();
        timers.current.delay = window.setTimeout(() => { timers.current.every = window.setInterval(() => latest.current(), 90); }, 260);
      }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      className="glass grid h-14 w-14 touch-manipulation select-none place-items-center rounded-2xl text-xl active:bg-neon/30">
      {children}
    </button>
  );
}

const OUTCOME = {
  win: { icon: '🏆', title: 'You win!', tone: 'text-neon' },
  loss: { icon: '💔', title: 'You lost', tone: 'text-rose-300' },
  draw: { icon: '🤝', title: 'It’s a draw', tone: 'text-sky-300' },
} as const;

/** End-of-game screen shared by the board games. Parent must be `relative`. */
export function ResultPanel({ outcome, detail, onAgain, onView }: { outcome: keyof typeof OUTCOME; detail?: string; onAgain: () => void; onView?: () => void }) {
  const o = OUTCOME[outcome];
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-ink/80 p-4 text-center backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
        <div className="text-5xl" aria-hidden>{o.icon}</div>
        <h3 className={`mt-2 font-display text-3xl font-bold ${o.tone}`}>{o.title}</h3>
        {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <PrimaryButton onClick={onAgain}>Play again</PrimaryButton>
          {onView && <GhostButton onClick={onView}>View board</GhostButton>}
          <a href="#/explore" className="glass rounded-full px-6 py-2.5 text-sm transition-colors hover:border-neon/50">Exit</a>
        </div>
      </motion.div>
    </div>
  );
}
