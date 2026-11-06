import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../../audio/engine';
import { GhostButton, Overlay, PrimaryButton, Stat } from '../../components/GameKit';
import { useMatch } from '../../progress/useMatch';
import { useKeys, useSwipe, type Dir } from '../../lib/input';
import { useBestScore } from '../../lib/storage';
import { canMove, move, newBoard, spawn, type Board } from './logic';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
};
const COLORS: Record<number, string> = {
  2: '#312e81', 4: '#3730a3', 8: '#5b21b6', 16: '#7c3aed', 32: '#9333ea', 64: '#a855f7',
  128: '#c026d3', 256: '#0e7490', 512: '#0284c7', 1024: '#38bdf8', 2048: '#fbbf24',
};

interface Snapshot { board: Board; score: number }
interface State extends Snapshot { history: Snapshot[]; won: boolean; keep: boolean; moves: number }
const fresh = (): State => ({ board: newBoard(), score: 0, history: [], won: false, keep: false, moves: 0 });

export default function Game2048() {
  const [st, setSt] = useState(fresh);
  const [best, submit] = useBestScore('2048');
  const boardRef = useRef<HTMLDivElement>(null);
  const over = !canMove(st.board);
  const paused = st.won && !st.keep;
  const match = useMatch('2048');
  const newGame = () => { match.next(); setSt(fresh); };
  useEffect(() => { if (st.won) { match.finish({ result: 'win', score: String(st.score) }); sfx('win'); } }, [st.won]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (over) { match.finish({ result: st.won ? 'win' : 'played', score: String(st.score) }); if (!st.won) sfx('lose'); } }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const slide = (d: Dir) =>
    setSt((s) => {
      if ((s.won && !s.keep) || !canMove(s.board)) return s;
      const r = move(s.board, d);
      if (!r.moved) return s;
      const board = spawn(r.board);
      return {
        ...s, board, score: s.score + r.gained,
        history: [...s.history.slice(-29), { board: s.board, score: s.score }],
        moves: s.moves + 1,
        won: s.won || (!s.keep && board.includes(2048)),
      };
    });

  const undo = () =>
    setSt((s) => {
      const prev = s.history[s.history.length - 1];
      return prev ? { ...s, board: prev.board, score: prev.score, history: s.history.slice(0, -1), won: false, moves: s.moves - 1 } : s;
    });

  useKeys((e) => {
    const d = KEYS[e.key];
    if (!d) return false;
    slide(d);
    return true;
  });
  useSwipe(boardRef, slide);
  useEffect(() => submit(st.score), [st.score, submit]);

  const prev = useRef({ moves: 0, score: 0 });
  useEffect(() => {
    if (st.moves > prev.current.moves) sfx(st.score > prev.current.score ? 'merge' : 'move');
    else if (st.moves < prev.current.moves) sfx('undo');
    prev.current = { moves: st.moves, score: st.score };
  }, [st.moves, st.score]);

  return (
    <div className="mx-auto flex max-w-[26rem] flex-col items-center gap-4">
      <div className="flex w-full gap-3">
        <Stat label="Score" value={st.score} tone="text-neon" />
        <Stat label="Best" value={best} tone="text-electric" />
      </div>

      <div ref={boardRef} className="relative grid aspect-square w-full touch-none grid-cols-4 gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 shadow-neon">
        {st.board.map((v, i) => (
          <div key={i} className="relative rounded-xl bg-white/[0.05]">
            {v > 0 && (
              <motion.div key={`${i}-${v}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className={`absolute inset-0 grid place-items-center rounded-xl font-display font-bold ${v >= 1000 ? 'text-[clamp(.9rem,4.8vw,1.6rem)]' : 'text-[clamp(1.1rem,6.4vw,2rem)]'}`}
                style={{ background: COLORS[v] ?? '#f0abfc', color: v === 2048 ? '#1b1033' : '#fff', boxShadow: v >= 128 ? `0 0 16px ${COLORS[v] ?? '#f0abfc'}99` : undefined }}>
                {v}
              </motion.div>
            )}
          </div>
        ))}
        {paused && (
          <Overlay title="You made 2048!" text="Keep going for a higher score, or start over.">
            <PrimaryButton onClick={() => setSt((s) => ({ ...s, keep: true }))}>Keep playing</PrimaryButton>
            <GhostButton onClick={newGame}>New game</GhostButton>
          </Overlay>
        )}
        {over && !paused && (
          <Overlay title="Game over" text={`No moves left. Score ${st.score}.`}>
            <GhostButton onClick={undo} disabled={!st.history.length}>Undo</GhostButton>
            <PrimaryButton onClick={newGame}>New game</PrimaryButton>
          </Overlay>
        )}
      </div>

      <div className="flex gap-3">
        <GhostButton onClick={undo} disabled={!st.history.length}>Undo</GhostButton>
        <PrimaryButton onClick={newGame}>New game</PrimaryButton>
      </div>
      <p className="text-center text-xs text-muted">Arrow keys, WASD or swipe. Equal tiles merge.</p>
    </div>
  );
}
