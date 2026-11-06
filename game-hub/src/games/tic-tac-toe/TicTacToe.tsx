import { useEffect, useState } from 'react';
import type { Level } from '../types';
import { sfx } from '../../audio/engine';
import { LevelSelect, PrimaryButton, ResultPanel } from '../../components/GameKit';
import { useMatch } from '../../progress/useMatch';
import { MarkShape } from './MarkShape';
import { computerMove, isFull, winnerOf, type Board, type Mark } from './logic';

const blank = (): Board => Array(9).fill(null);

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(blank);
  const [turn, setTurn] = useState<Mark>('X');
  const [starter, setStarter] = useState<Mark>('X');
  const [level, setLevel] = useState<Level>('medium');
  const [score, setScore] = useState({ win: 0, loss: 0, draw: 0 });
  const [seen, setSeen] = useState(false);
  const match = useMatch('tic-tac-toe');

  const result = winnerOf(board);
  const draw = !result && isFull(board);
  const over = Boolean(result) || draw;

  const place = (i: number) => {
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    const w = winnerOf(next);
    if (w) {
      setScore((s) => (w.winner === 'X' ? { ...s, win: s.win + 1 } : { ...s, loss: s.loss + 1 }));
      match.finish({ result: w.winner === 'X' ? 'win' : 'loss', score: w.winner === 'X' ? '1–0' : '0–1', level });
      sfx(w.winner === 'X' ? 'win' : 'lose');
    } else if (isFull(next)) {
      setScore((s) => ({ ...s, draw: s.draw + 1 }));
      match.finish({ result: 'draw', score: '½–½', level });
      sfx('draw');
    } else {
      setTurn(turn === 'X' ? 'O' : 'X');
      sfx('move');
    }
  };

  useEffect(() => {
    if (turn !== 'O' || over) return;
    const t = setTimeout(() => place(computerMove(board, level)), 550);
    return () => clearTimeout(t);
  }, [turn, over, board, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => {
    match.next();
    setSeen(false);
    const next: Mark = starter === 'X' ? 'O' : 'X';
    setStarter(next);
    setBoard(blank());
    setTurn(next);
  };

  const status = result
    ? result.winner === 'X' ? 'You won this round' : 'The computer won this round'
    : draw ? 'It’s a draw' : turn === 'X' ? 'Your move' : 'Computer is thinking…';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        {([['You', score.win, 'text-neon'], ['Draws', score.draw, 'text-muted'], ['Computer', score.loss, 'text-electric']] as const).map(([label, n, tone]) => (
          <div key={label} className="glass rounded-2xl py-3">
            <div className={`font-display text-2xl font-semibold ${tone}`}>{n}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <LevelSelect level={level} onChange={setLevel} />

      <p aria-live="polite" className="font-display text-lg">{status}</p>

      <div className="relative grid aspect-square w-full grid-cols-3 gap-3 rounded-2xl">
        {board.map((cell, i) => {
          const win = result?.line.includes(i);
          const playable = !cell && !over && turn === 'X';
          return (
            <button key={i} onClick={() => playable && place(i)} aria-disabled={!playable}
              aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
              className={`glass flex items-center justify-center rounded-2xl transition-all duration-200 ${
                win ? 'border-neon/70 bg-neon/15 shadow-neon' : ''
              } ${playable ? 'hover:border-neon/50 hover:bg-white/[0.08]' : 'cursor-default'}`}>
              {cell && <MarkShape who={cell} />}
            </button>
          );
        })}
        {over && !seen && (
          <ResultPanel outcome={result ? (result.winner === 'X' ? 'win' : 'loss') : 'draw'} onAgain={restart} onView={() => setSeen(true)}
            detail={result ? (result.winner === 'X' ? 'Three in a row. Nicely played.' : 'The computer got three in a row.') : 'The board is full.'} />
        )}
      </div>

      <PrimaryButton onClick={restart}>{over ? 'Play again' : 'Restart'}</PrimaryButton>
    </div>
  );
}
