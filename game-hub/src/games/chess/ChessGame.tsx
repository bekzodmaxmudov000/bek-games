import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Move, type Square } from 'chess.js';
import type { Level } from '../types';
import { sfx } from '../../audio/engine';
import { GhostButton, LevelSelect, PrimaryButton, ResultPanel } from '../../components/GameKit';
import { useMatch } from '../../progress/useMatch';
import { requestMove } from './ai';

const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const WORTH: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PROMOTIONS = ['q', 'r', 'b', 'n'] as const;
const FILES = 'abcdefgh';

function Glyph({ type, color }: { type: string; color: 'w' | 'b' }) {
  return (
    <span aria-hidden className="select-none leading-none"
      style={color === 'w'
        ? { color: '#f5f3ff', textShadow: '0 0 1px #000, 0 2px 6px rgba(168,85,247,.55)' }
        : { color: '#1b1033', textShadow: '0 0 2px #c4b5fd, 0 0 1px #c4b5fd' }}>
      {GLYPH[type]}&#xFE0E;
    </span>
  );
}

export default function ChessGame() {
  const game = useRef(new Chess());
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [level, setLevel] = useState<Level>('medium');
  const [selected, setSelected] = useState<Square | null>(null);
  const [pending, setPending] = useState<Move[] | null>(null); // promotion choices
  const [seen, setSeen] = useState(false); // result screen dismissed
  const c = game.current;

  const over = c.isGameOver();
  const thinking = c.turn() === 'b' && !over;
  const history = c.history({ verbose: true });
  const last = history[history.length - 1];
  const targets = useMemo(
    () => (selected ? c.moves({ square: selected, verbose: true }) : []),
    [selected, history.length], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const play = (m: { from: string; to: string; promotion?: string }) => {
    const r = c.move(m);
    sfx(c.isCheckmate() ? 'move' : c.isCheck() ? 'check' : r.captured ? 'capture' : 'move');
  };

  useEffect(() => {
    if (!thinking) return;
    const fen = c.fen();
    const req = requestMove(fen, level);
    let live = true;
    req.promise.then((m) => {
      if (!live || c.fen() !== fen) return; // position changed while thinking (undo, restart, level)
      play(m);
      refresh();
    });
    return () => { live = false; req.cancel(); };
  }, [thinking, history.length, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const match = useMatch('chess');
  useEffect(() => {
    if (!over) return;
    const result = c.isCheckmate() ? (c.turn() === 'b' ? 'win' : 'loss') : 'draw';
    const mark = result === 'win' ? '1–0' : result === 'loss' ? '0–1' : '½–½';
    match.finish({ result, score: `${mark}, ${Math.ceil(history.length / 2)} moves`, level });
    sfx(result === 'loss' ? 'lose' : result);
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = c.isCheckmate()
    ? c.turn() === 'b' ? 'Checkmate. You won!' : 'Checkmate. The computer won.'
    : c.isStalemate() ? 'Stalemate. It’s a draw.'
    : c.isInsufficientMaterial() ? 'Draw by insufficient material.'
    : c.isThreefoldRepetition() ? 'Draw by repetition.'
    : c.isDraw() ? 'Draw by the fifty-move rule.'
    : thinking ? 'Computer is thinking…'
    : c.isCheck() ? 'Check! Your move.' : 'Your move';

  const move = (m: Move) => {
    play(m);
    setSelected(null);
    setPending(null);
    refresh();
  };

  const onSquare = (sq: Square) => {
    if (over || thinking) return;
    const choices = targets.filter((m) => m.to === sq);
    if (choices.length > 1) return setPending(choices); // promotion
    if (choices.length === 1) return move(choices[0]);
    const piece = c.get(sq);
    setSelected(piece && piece.color === 'w' ? sq : null);
  };

  const undo = () => {
    do c.undo(); while (c.turn() !== 'w' && c.history().length);
    sfx('undo');
    setSeen(false);
    setSelected(null);
    setPending(null);
    refresh();
  };

  const restart = () => { match.next(); setSeen(false); c.reset(); setSelected(null); setPending(null); refresh(); };

  const taken = { w: history.filter((m) => m.color === 'w' && m.captured), b: history.filter((m) => m.color === 'b' && m.captured) };
  const lead = taken.w.reduce((s, m) => s + WORTH[m.captured!], 0) - taken.b.reduce((s, m) => s + WORTH[m.captured!], 0);
  const kingSq = c.isCheck()
    ? c.board().flatMap((row) => row.filter((p) => p && p.type === 'k' && p.color === c.turn()))[0]?.square
    : undefined;

  const Captured = ({ list, color, plus }: { list: Move[]; color: 'w' | 'b'; plus: number }) => (
    <div className="flex min-h-7 items-center gap-0.5 text-xl">
      {list.map((m, i) => <Glyph key={i} type={m.captured!} color={color === 'w' ? 'b' : 'w'} />)}
      {plus > 0 && <span className="ml-2 text-xs text-muted">+{plus}</span>}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_1fr] lg:justify-center">
      <div className="mx-auto w-full max-w-[34rem] space-y-2">
        <Captured list={taken.b} color="b" plus={Math.max(0, -lead)} />
        <div className="relative grid aspect-square grid-cols-8 overflow-hidden rounded-2xl border border-white/10 shadow-neon">
          {c.board().flatMap((row, r) =>
            row.map((p, f) => {
              const sq = `${FILES[f]}${8 - r}` as Square;
              const dark = (r + f) % 2 === 1;
              const target = targets.find((m) => m.to === sq);
              const lastMove = last && (last.from === sq || last.to === sq);
              return (
                <button key={sq} onClick={() => onSquare(sq)} aria-label={`${sq}${p ? `, ${p.color === 'w' ? 'white' : 'black'} ${p.type}` : ''}`}
                  className={`relative grid place-items-center text-[clamp(1.7rem,7.4vw,3.1rem)] ${dark ? 'bg-[#2b2352]' : 'bg-[#4a3f7a]'} ${
                    lastMove ? 'after:absolute after:inset-0 after:bg-electric/25' : ''
                  } ${selected === sq ? 'ring-2 ring-inset ring-neon' : ''} ${kingSq === sq ? 'bg-red-500/50' : ''}`}>
                  {p && <Glyph type={p.type} color={p.color} />}
                  {target && (
                    <span className={`absolute rounded-full ${p ? 'inset-1 border-4 border-neon/70' : 'h-1/4 w-1/4 bg-neon/70'}`} />
                  )}
                </button>
              );
            }),
          )}
          {pending && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-ink/80 backdrop-blur-sm">
              <div className="glass rounded-2xl p-4 text-center">
                <p className="mb-3 text-sm text-muted">Promote pawn to</p>
                <div className="flex gap-2">
                  {PROMOTIONS.map((t) => (
                    <button key={t} onClick={() => move(pending.find((m) => m.promotion === t)!)}
                      aria-label={`Promote to ${t}`} className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 text-4xl hover:border-neon/60">
                      <Glyph type={t} color="w" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {over && !seen && (
            <ResultPanel outcome={c.isCheckmate() ? (c.turn() === 'b' ? 'win' : 'loss') : 'draw'} onAgain={restart} onView={() => setSeen(true)}
              detail={c.isCheckmate() ? `Checkmate after ${Math.ceil(history.length / 2)} moves.` : status} />
          )}
        </div>
        <Captured list={taken.w} color="w" plus={Math.max(0, lead)} />
      </div>

      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4 lg:mx-0 lg:max-w-sm">
        <p aria-live="polite" className={`font-display text-lg ${over ? 'text-neon' : ''}`}>{status}</p>
        <LevelSelect level={level} onChange={setLevel} />
        <div className="flex gap-3">
          <GhostButton onClick={undo} disabled={!history.length || thinking}>Undo</GhostButton>
          <PrimaryButton onClick={restart}>{over ? 'Play again' : 'Restart'}</PrimaryButton>
        </div>
        <div className="glass max-h-64 overflow-y-auto rounded-2xl p-4">
          <h3 className="mb-2 text-sm text-muted">Moves</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted">You play white. Move any piece to start.</p>
          ) : (
            <ol className="grid grid-cols-[2rem_1fr_1fr] gap-x-3 gap-y-1 text-sm">
              {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
                <li key={i} className="contents">
                  <span className="text-muted">{i + 1}.</span>
                  <span>{history[i * 2].san}</span>
                  <span>{history[i * 2 + 1]?.san}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
