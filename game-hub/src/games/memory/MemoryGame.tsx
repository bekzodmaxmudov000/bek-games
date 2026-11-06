import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../../audio/engine';
import type { Level } from '../types';
import { LevelSelect, Overlay, PrimaryButton, Stat } from '../../components/GameKit';
import { useBestScore } from '../../lib/storage';
import { useMatch } from '../../progress/useMatch';
import { LAYOUT, deal, isMatch, isWon } from './logic';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function MemoryGame() {
  const [level, setLevel] = useState<Level>('medium');
  const [cards, setCards] = useState(() => deal('medium'));
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [best, submit] = useBestScore(`memory:${level}`, true);
  const timer = useRef<number>();
  const match = useMatch('memory-match');
  const won = isWon(cards);

  useEffect(() => {
    if (start === null || won) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [start, won]);

  useEffect(() => {
    if (!won) return;
    if (start !== null) setElapsed(Math.floor((Date.now() - start) / 1000));
    submit(moves);
    match.finish({ result: 'win', score: `${moves} moves`, level });
    sfx('win');
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reset = (l: Level) => {
    match.next();
    window.clearTimeout(timer.current);
    setCards(deal(l));
    setOpen([]); setMoves(0); setLocked(false); setStart(null); setElapsed(0);
  };

  const flip = (i: number) => {
    if (locked || won || open.includes(i) || cards[i].matched) return;
    if (start === null) setStart(Date.now());
    sfx('flip');
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next;
    if (isMatch(cards, a, b)) {
      setCards((cs) => cs.map((c, k) => (k === a || k === b ? { ...c, matched: true } : c)));
      setOpen([]);
      sfx('match');
    } else {
      setLocked(true);
      sfx('miss');
      timer.current = window.setTimeout(() => { setOpen([]); setLocked(false); }, 800);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
      <div className="flex w-full gap-3">
        <Stat label="Moves" value={moves} tone="text-neon" />
        <Stat label="Time" value={clock(elapsed)} />
        <Stat label="Best moves" value={best || '–'} tone="text-electric" />
      </div>
      <LevelSelect level={level} onChange={(l) => { setLevel(l); reset(l); }} />

      <div className="relative w-full rounded-2xl">
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${LAYOUT[level].cols}, minmax(0, 1fr))` }}>
          {cards.map((c, i) => {
            const up = c.matched || open.includes(i);
            return (
              <button key={c.id} onClick={() => flip(i)} aria-label={up ? c.symbol : 'Hidden card'}
                className="relative aspect-[3/4] [perspective:700px]">
                <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: up ? 180 : 0 }} transition={{ duration: 0.35 }}>
                  <div className="absolute inset-0 grid place-items-center rounded-xl border border-white/15 bg-gradient-to-br from-violet/60 to-electric/30 [backface-visibility:hidden]">
                    <span className="h-1/3 w-1/3 rounded-full border-2 border-white/30" />
                  </div>
                  <div style={{ transform: 'rotateY(180deg)' }}
                    className={`absolute inset-0 grid place-items-center rounded-xl border [backface-visibility:hidden] ${
                      c.matched ? 'border-neon bg-neon/20 shadow-neon' : 'border-white/20 bg-panel'
                    }`}>
                    <span className="text-[clamp(1.4rem,7vw,2.4rem)] leading-none">{c.symbol}</span>
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>

        {won && (
          <Overlay title="You win!" text={`${moves} moves in ${clock(elapsed)}.`}>
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return (
                <motion.span key={i} className="pointer-events-none absolute left-1/2 top-1/2 text-xl"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                  animate={{ x: Math.cos(a) * 140, y: Math.sin(a) * 140, opacity: 0, scale: 1.3 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}>
                  ✨
                </motion.span>
              );
            })}
            <PrimaryButton onClick={() => reset(level)}>Play again</PrimaryButton>
          </Overlay>
        )}
      </div>

      <PrimaryButton onClick={() => reset(level)}>Restart</PrimaryButton>
    </div>
  );
}
