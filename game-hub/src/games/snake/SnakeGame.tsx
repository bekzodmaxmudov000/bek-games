import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/engine';
import type { Level } from '../types';
import { GhostButton, LevelSelect, Overlay, PadButton, PrimaryButton, Stat } from '../../components/GameKit';
import { useKeys, useSwipe, type Dir } from '../../lib/input';
import { useBestScore } from '../../lib/storage';
import { useMatch } from '../../progress/useMatch';
import { SIZE, canTurn, newGame, step } from './logic';

const SPEED: Record<Level, number> = { easy: 170, medium: 115, hard: 75 };
const LABELS: Record<Level, string> = { easy: 'slow', medium: 'normal', hard: 'fast' };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
};
const CELL = 24;
const WIN_SCORE = 100;
type Phase = 'ready' | 'playing' | 'paused' | 'over';

export default function SnakeGame() {
  const [game, setGame] = useState(newGame);
  const [phase, setPhase] = useState<Phase>('ready');
  const [level, setLevel] = useState<Level>('medium');
  const [best, submit] = useBestScore('snake');
  const match = useMatch('snake');
  const prevScore = useRef(0);
  const pending = useRef<Dir>('right');
  const gameRef = useRef(game);
  gameRef.current = game;
  const canvas = useRef<HTMLCanvasElement>(null);
  const board = useRef<HTMLDivElement>(null);

  const turn = useCallback((d: Dir) => {
    if (!canTurn(gameRef.current.dir, d)) return;
    pending.current = d;
    setPhase((p) => (p === 'ready' ? 'playing' : p));
  }, []);

  const toggle = () => setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' || p === 'ready' ? 'playing' : p));
  const restart = () => { match.next(); setGame(newGame()); pending.current = 'right'; setPhase('ready'); };

  useKeys((e) => {
    const d = KEYS[e.key];
    if (d) { turn(d); return true; }
    if (e.key === ' ' || e.key === 'p' || e.key === 'P') { toggle(); return true; }
    return false;
  });
  useSwipe(board, turn);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setGame((g) => step(g, pending.current)), SPEED[level]);
    return () => clearInterval(id);
  }, [phase, level]);

  useEffect(() => {
    submit(game.score);
    if (game.score > prevScore.current) sfx('eat');
    prevScore.current = game.score;
    if (game.over) {
      setPhase('over');
      sfx(game.score >= WIN_SCORE ? 'win' : 'lose');
      match.finish({ result: game.score >= WIN_SCORE ? 'win' : 'played', score: String(game.score), level });
    }
  }, [game.over, game.score, submit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause automatically when the tab is hidden so the game never runs unseen.
  useEffect(() => {
    const onHide = () => { if (document.hidden) setPhase((p) => (p === 'playing' ? 'paused' : p)); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const px = SIZE * CELL;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, px, px);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let i = 1; i < SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, px);
      ctx.moveTo(0, i * CELL); ctx.lineTo(px, i * CELL);
      ctx.stroke();
    }
    const f = game.food;
    if (f.x >= 0) {
      ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 16; ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.arc((f.x + 0.5) * CELL, (f.y + 0.5) * CELL, CELL * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    game.snake.forEach((p, i) => {
      const t = i / Math.max(1, game.snake.length - 1);
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = i === 0 ? 14 : 6;
      ctx.fillStyle = i === 0 ? '#e9d5ff' : `hsl(${270 - t * 55} 90% ${64 - t * 16}%)`;
      ctx.beginPath();
      ctx.roundRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4, 7);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, [game]);

  return (
    <div className="mx-auto flex max-w-[28rem] flex-col items-center gap-4">
      <div className="flex w-full gap-3">
        <Stat label="Score" value={game.score} tone="text-neon" />
        <Stat label="Best" value={best} tone="text-electric" />
      </div>
      <LevelSelect level={level} onChange={setLevel} labels={LABELS} />
      <div ref={board} className="relative aspect-square w-full touch-none overflow-hidden rounded-2xl border border-white/10 shadow-neon">
        <canvas ref={canvas} width={SIZE * CELL} height={SIZE * CELL} role="img" aria-label="Snake board" className="h-full w-full" />
        {phase === 'ready' && (
          <Overlay title="Ready?" text="Steer with arrows, WASD or swipe. Reach 100 points to win.">
            <PrimaryButton onClick={() => setPhase('playing')}>Start</PrimaryButton>
          </Overlay>
        )}
        {phase === 'paused' && <Overlay title="Paused"><PrimaryButton onClick={toggle}>Resume</PrimaryButton></Overlay>}
        {phase === 'over' && (
          <Overlay title="Game over" text={`You scored ${game.score}.`}>
            <PrimaryButton onClick={restart}>Play again</PrimaryButton>
          </Overlay>
        )}
      </div>
      <div className="flex gap-3">
        <GhostButton onClick={toggle} disabled={phase === 'ready' || phase === 'over'}>{phase === 'paused' ? 'Resume' : 'Pause'}</GhostButton>
        <PrimaryButton onClick={restart}>Restart</PrimaryButton>
      </div>
      <div className="grid grid-cols-3 gap-2 md:[@media(pointer:fine)]:hidden">
        <span /><PadButton label="Up" onPress={() => turn('up')}>▲</PadButton><span />
        <PadButton label="Left" onPress={() => turn('left')}>◀</PadButton><span /><PadButton label="Right" onPress={() => turn('right')}>▶</PadButton>
        <span /><PadButton label="Down" onPress={() => turn('down')}>▼</PadButton><span />
      </div>
    </div>
  );
}
