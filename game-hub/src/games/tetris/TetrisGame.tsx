import { memo, useEffect, useRef, useState } from 'react';
import { sfx, type Sfx } from '../../audio/engine';
import { GhostButton, Overlay, PadButton, PrimaryButton, Stat } from '../../components/GameKit';
import { useKeys } from '../../lib/input';
import { useMatch } from '../../progress/useMatch';
import { useBestScore } from '../../lib/storage';
import {
  W, cellsOf, ghostY, gravityMs, hardDrop, move, newGame, nextKind, rotate, shape, softDrop, tick,
  type Kind, type State,
} from './logic';

const COLORS: Record<Kind, string> = { I: '#38bdf8', O: '#fde047', T: '#c084fc', S: '#4ade80', Z: '#fb7185', J: '#60a5fa', L: '#fb923c' };
const WIN_SCORE = 1000;
type Phase = 'ready' | 'playing' | 'paused' | 'over';

const Cell = memo(function Cell({ kind, ghost }: { kind: Kind | null; ghost: boolean }) {
  return <div className={`rounded-[3px] ${kind ? '' : ghost ? 'border border-white/25' : 'bg-white/[0.03]'}`} style={kind ? block(kind) : undefined} />;
});

const block = (kind: Kind) => ({ background: COLORS[kind], boxShadow: `inset 0 0 6px rgba(255,255,255,.55), 0 0 8px ${COLORS[kind]}88` });

export default function TetrisGame() {
  const [g, setG] = useState(newGame);
  const [phase, setPhase] = useState<Phase>('ready');
  const [best, submit] = useBestScore('tetris');
  const match = useMatch('tetris');

  const prev = useRef({ lines: 0, level: 1 });
  const act = (fn: (s: State) => State, snd?: Sfx) => { if (phase === 'playing') { setG(fn); if (snd) sfx(snd); } };
  const toggle = () => setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' || p === 'ready' ? 'playing' : p));
  const restart = () => { match.next(); setG(newGame()); setPhase('playing'); };

  useKeys((e) => {
    const k = e.key;
    if (k === 'p' || k === 'P' || k === 'Escape') { toggle(); return true; }
    if (k === ' ') {
      if (phase === 'ready' || phase === 'paused') toggle();
      else act(hardDrop, 'drop');
      return true;
    }
    if (phase !== 'playing') return false;
    if (k === 'ArrowLeft') act((s) => move(s, -1, 0), 'tick');
    else if (k === 'ArrowRight') act((s) => move(s, 1, 0), 'tick');
    else if (k === 'ArrowDown') act(softDrop);
    else if (k === 'ArrowUp' || k === 'x' || k === 'X') act((s) => rotate(s, 1), 'rotate');
    else if (k === 'z' || k === 'Z') act((s) => rotate(s, -1), 'rotate');
    else return false;
    return true;
  });

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setG(tick), gravityMs(g.level));
    return () => clearInterval(id);
  }, [phase, g.level]);

  useEffect(() => {
    submit(g.score);
    if (g.over) {
      setPhase('over');
      sfx(g.score >= WIN_SCORE ? 'win' : 'lose');
      match.finish({ result: g.score >= WIN_SCORE ? 'win' : 'played', score: String(g.score) });
    }
  }, [g.over, g.score, submit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (g.lines > prev.current.lines) sfx(g.level > prev.current.level ? 'levelup' : 'line');
    prev.current = { lines: g.lines, level: g.level };
  }, [g.lines, g.level]);

  // Pause automatically when the tab is hidden so the game never runs unseen.
  useEffect(() => {
    const onHide = () => { if (document.hidden) setPhase((p) => (p === 'playing' ? 'paused' : p)); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const live = new Map(cellsOf(g.piece).map(([x, y]) => [y * W + x, g.piece.kind] as const));
  const ghost = new Set(cellsOf({ ...g.piece, y: ghostY(g) }).map(([x, y]) => y * W + x));
  const preview = shape(nextKind(g), 0);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <div className="flex w-full gap-3">
        <Stat label="Score" value={g.score} tone="text-neon" />
        <Stat label="Best" value={best} tone="text-electric" />
        <Stat label="Level" value={g.level} />
        <Stat label="Lines" value={g.lines} />
      </div>

      <div className="flex w-full items-start justify-center gap-4">
        <div className="relative aspect-[1/2] w-[62%] max-w-[19rem] overflow-hidden rounded-2xl border border-white/10 bg-navy/80 p-1 shadow-neon">
          <div className="grid h-full w-full grid-cols-10 grid-rows-[repeat(20,minmax(0,1fr))] gap-px">
            {g.board.flatMap((row, y) =>
              row.map((cell, x) => {
                const i = y * W + x;
                const kind = live.get(i) ?? cell;
                const isGhost = !kind && phase === 'playing' && ghost.has(i);
                return <Cell key={i} kind={kind} ghost={isGhost} />;
              }),
            )}
          </div>
          {phase === 'ready' && (
            <Overlay title="Ready?" text="Reach 1000 points to win. ↑ rotates, Space drops.">
              <PrimaryButton onClick={() => setPhase('playing')}>Start</PrimaryButton>
            </Overlay>
          )}
          {phase === 'paused' && <Overlay title="Paused"><PrimaryButton onClick={toggle}>Resume</PrimaryButton></Overlay>}
          {phase === 'over' && (
            <Overlay title="Game over" text={`${g.score} points, ${g.lines} lines.`}>
              <PrimaryButton onClick={restart}>Play again</PrimaryButton>
            </Overlay>
          )}
        </div>

        <div className="flex w-[30%] max-w-[8rem] flex-col gap-3">
          <div className="glass rounded-2xl p-3">
            <p className="mb-2 text-xs text-muted">Next</p>
            <div className="grid aspect-square place-content-center gap-px" style={{ gridTemplateColumns: `repeat(${preview.length}, 1fr)` }}>
              {preview.flat().map((v, i) => (
                <div key={i} className="aspect-square rounded-[3px]" style={v ? block(nextKind(g)) : undefined} />
              ))}
            </div>
          </div>
          <GhostButton onClick={toggle} disabled={phase === 'ready' || phase === 'over'}>{phase === 'paused' ? 'Resume' : 'Pause'}</GhostButton>
          <PrimaryButton onClick={restart}>Restart</PrimaryButton>
        </div>
      </div>

      <div className="flex gap-2 md:[@media(pointer:fine)]:hidden">
        <PadButton label="Move left" repeat onPress={() => act((s) => move(s, -1, 0), 'tick')}>◀</PadButton>
        <PadButton label="Move right" repeat onPress={() => act((s) => move(s, 1, 0), 'tick')}>▶</PadButton>
        <PadButton label="Rotate" onPress={() => act((s) => rotate(s, 1), 'rotate')}>↻</PadButton>
        <PadButton label="Soft drop" repeat onPress={() => act(softDrop)}>▼</PadButton>
        <PadButton label="Hard drop" onPress={() => act(hardDrop, 'drop')}>⤓</PadButton>
      </div>
    </div>
  );
}
