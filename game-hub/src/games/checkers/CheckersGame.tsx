import { useEffect, useMemo, useState } from 'react';
import type { Level } from '../types';
import { sfx } from '../../audio/engine';
import { LevelSelect, PrimaryButton, ResultPanel } from '../../components/GameKit';
import { useMatch } from '../../progress/useMatch';
import { computerMove, counts, legalMoves, newPosition, outcome, play, type Move } from './logic';

export default function CheckersGame() {
  const [pos, setPos] = useState(newPosition);
  const [level, setLevel] = useState<Level>('medium');
  const [selected, setSelected] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [seen, setSeen] = useState(false);
  const match = useMatch('checkers');

  const result = outcome(pos);
  const thinking = pos.turn === 'b' && !result;
  const moves = useMemo(() => (result ? [] : legalMoves(pos.board, pos.turn)), [pos, result]);
  const mustCapture = pos.turn === 'w' && moves.some((m) => m.captured.length);
  const movable = new Set(pos.turn === 'w' ? moves.map((m) => m.from) : []);
  const targets = selected === null ? [] : moves.filter((m) => m.from === selected);
  const n = counts(pos.board);

  const commit = (m: Move) => { setPos((p) => play(p, m)); setLastMove(m); setSelected(null); sfx(m.captured.length ? 'capture' : 'move'); };

  useEffect(() => {
    if (!result) return;
    match.finish({ result: result === 'w' ? 'win' : result === 'b' ? 'loss' : 'draw', score: `${n.w}–${n.b}`, level });
    sfx(result === 'w' ? 'win' : result === 'b' ? 'lose' : 'draw');
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!thinking) return;
    const t = setTimeout(() => commit(computerMove(pos, level)), 550);
    return () => clearTimeout(t);
  }, [thinking, pos, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSquare = (i: number) => {
    if (result || thinking) return;
    const m = targets.find((t) => t.path[t.path.length - 1] === i);
    if (m) return commit(m);
    setSelected(movable.has(i) ? i : null);
  };

  const restart = () => { match.next(); setSeen(false); setPos(newPosition()); setSelected(null); setLastMove(null); };

  const status = result === 'w' ? 'You won!' : result === 'b' ? 'The computer won.' : result === 'draw' ? 'It’s a draw.'
    : thinking ? 'Computer is thinking…' : mustCapture ? 'Your move. You must capture.' : 'Your move';

  const Count = ({ label, v, tone }: { label: string; v: number; tone: string }) => (
    <div className="glass flex-1 rounded-2xl py-3 text-center">
      <div className={`font-display text-2xl font-semibold ${tone}`}>{v}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-5">
      <div className="flex w-full gap-3">
        <Count label="Your pieces" v={n.w} tone="text-neon" />
        <Count label="Computer pieces" v={n.b} tone="text-electric" />
      </div>
      <LevelSelect level={level} onChange={setLevel} />
      <p aria-live="polite" className={`font-display text-lg ${result ? 'text-neon' : ''}`}>{status}</p>

      <div className="relative grid aspect-square w-full grid-cols-8 overflow-hidden rounded-2xl border border-white/10 shadow-neon">
        {pos.board.map((p, i) => {
          const dark = ((i >> 3) + (i & 7)) % 2 === 1;
          const target = targets.some((t) => t.path[t.path.length - 1] === i);
          const trail = lastMove && (lastMove.from === i || lastMove.path.includes(i));
          return (
            <button key={i} onClick={() => dark && onSquare(i)} tabIndex={dark ? 0 : -1} aria-disabled={!dark}
              aria-label={p ? `${p.color === 'w' ? 'Your' : 'Computer'} ${p.king ? 'king' : 'piece'}` : target ? 'Move here' : 'Empty square'}
              className={`relative grid place-items-center ${dark ? 'bg-[#2b2352]' : 'bg-[#4a3f7a]'} ${dark ? '' : 'cursor-default'} ${
                trail ? 'after:absolute after:inset-0 after:bg-electric/20' : ''
              }`}>
              {p && (
                <span className={`relative grid h-[76%] w-[76%] place-items-center rounded-full border-2 text-[clamp(.8rem,3.6vw,1.5rem)] leading-none transition-transform ${
                  p.color === 'w'
                    ? 'border-white/70 bg-gradient-to-br from-white to-violet-200 text-violet shadow-[0_0_14px_rgba(255,255,255,.35)]'
                    : 'border-electric/60 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-electric shadow-[0_0_14px_rgba(56,189,248,.35)]'
                } ${selected === i ? 'scale-110 ring-2 ring-neon' : ''} ${movable.has(i) && selected !== i ? 'ring-2 ring-neon/50' : ''}`}>
                  {p.king && <span aria-hidden>♛&#xFE0E;</span>}
                </span>
              )}
              {target && <span className="absolute h-1/4 w-1/4 rounded-full bg-neon/80" />}
            </button>
          );
        })}
        {result && !seen && (
          <ResultPanel outcome={result === 'w' ? 'win' : result === 'b' ? 'loss' : 'draw'} onAgain={restart} onView={() => setSeen(true)}
            detail={result === 'draw' ? 'No progress or a repeated position.' : `Pieces left: ${n.w} against ${n.b}.`} />
        )}
      </div>

      <PrimaryButton onClick={restart}>{result ? 'Play again' : 'Restart'}</PrimaryButton>
      <p className="text-center text-xs text-muted">Russian draughts rules: capturing is mandatory, kings move any distance.</p>
    </div>
  );
}
