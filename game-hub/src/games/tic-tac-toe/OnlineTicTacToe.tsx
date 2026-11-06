import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../../audio/engine';
import { GhostButton, PrimaryButton } from '../../components/GameKit';
import { online } from '../../online';
import type { BoardProps, OnlinePlayer, OnlineRoom } from '../../online/types';
import { useOnline } from '../../online/useOnline';
import { MarkShape } from './MarkShape';

// The board, whose turn it is and the result all come from the server. This component only draws
// them and sends the player's chosen cell; it never decides a move or a result itself.
interface ServerState { board: ('X' | 'O' | null)[]; next: 0 | 1; line: number[] | null }

const MARK = ['X', 'O'] as const;
const TONE = { X: 'text-neon', O: 'text-electric' } as const;

type Outcome = { kind: 'win' | 'loss' | 'draw'; title: string; detail: string };

function outcomeFor(room: OnlineRoom): Outcome | null {
  const r = room.result;
  if (!r) return null;
  if (r.winnerSeat === null) return { kind: 'draw', title: 'It is a draw', detail: r.reason === 'disconnected' ? 'Both players went offline.' : 'The board is full.' };
  const won = r.winnerSeat === room.you;
  const detail = {
    win: won ? 'Three in a row.' : 'Your opponent got three in a row.',
    resigned: won ? 'Your opponent resigned.' : 'You resigned.',
    left: won ? 'Your opponent left the game.' : 'You left the game.',
    disconnected: won ? 'Your opponent went offline.' : 'You were offline for too long.',
    draw: '',
  }[r.reason];
  return { kind: won ? 'win' : 'loss', title: won ? 'You won!' : 'You lost', detail };
}

function PlayerChip({ player, seat, active, mine, winner }: { player?: OnlinePlayer; seat: 0 | 1; active: boolean; mine: boolean; winner: boolean }) {
  const mark = MARK[seat];
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-3 transition-colors ${
      active ? 'border-neon/60 bg-neon/10 shadow-neon' : winner ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet to-electric text-2xl">
        {player?.avatar ?? '?'}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink ${player?.connected ? 'bg-emerald-400' : 'bg-rose-400'}`}
          title={player?.connected ? 'Online' : 'Offline'} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{player?.username ?? 'Waiting…'}{mine ? ' (you)' : ''}</span>
        <span className="flex items-center gap-2 text-sm">
          <span className={`font-display text-lg font-bold ${TONE[mark]}`}>{mark}</span>
          {active && <span className="rounded-full bg-neon/25 px-2 py-0.5 text-[11px]">Turn</span>}
          {winner && <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] text-emerald-200">Winner</span>}
        </span>
      </span>
    </div>
  );
}

function Confirm({ label, question, onYes }: { label: string; question: string; onYes: () => void }) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <span className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={question}>
      <span className="text-muted">{question}</span>
      <PrimaryButton onClick={() => { setAsking(false); onYes(); }}>Yes</PrimaryButton>
      <GhostButton onClick={() => setAsking(false)}>No</GhostButton>
    </span>
  ) : (
    <GhostButton onClick={() => setAsking(true)}>{label}</GhostButton>
  );
}

export default function OnlineTicTacToe({ room, meId }: BoardProps) {
  const { connection, roomAt } = useOnline();
  const state = room.state as ServerState;
  const [pending, setPending] = useState(false);
  const [, tick] = useState(0);

  const bySeat = (seat: 0 | 1) => room.players.find((p) => p.seat === seat);
  const me = room.players.find((p) => p.id === meId);
  const opp = room.players.find((p) => p.id !== meId);
  const playing = room.status === 'playing';
  const finished = room.status === 'finished';
  const myTurn = playing && room.you !== null && room.turnSeat === room.you && connection === 'online';
  const outcome = outcomeFor(room);
  const oppGone = playing && opp && !opp.connected ? opp : undefined;
  const filled = state.board.filter(Boolean).length;

  // sounds: only for changes seen while this board is open
  const prevFilled = useRef(filled);
  const prevStatus = useRef(room.status);
  useEffect(() => {
    if (filled > prevFilled.current) sfx('move');
    prevFilled.current = filled;
  }, [filled]);
  useEffect(() => {
    if (prevStatus.current === 'playing' && room.status === 'finished' && outcome) sfx(outcome.kind === 'win' ? 'win' : outcome.kind === 'loss' ? 'lose' : 'draw');
    prevStatus.current = room.status;
  }, [room.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // countdown while the opponent is away
  useEffect(() => {
    if (!oppGone) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [oppGone?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const secondsLeft = oppGone ? Math.max(0, Math.ceil((room.graceMs - (oppGone.offlineForMs ?? 0) - (Date.now() - roomAt)) / 1000)) : 0;

  const play = async (cell: number) => {
    if (!myTurn || pending || state.board[cell]) return;
    setPending(true);
    await online.move({ cell });
    setPending(false);
  };

  const banner = finished ? outcome?.title ?? ''
    : connection !== 'online' ? 'Reconnecting…'
    : myTurn ? `Your turn. Place your ${MARK[room.you!]}.`
    : `${opp?.username ?? 'Opponent'}'s turn…`;

  const iAsked = me ? room.rematch.includes(me.id) : false;
  const oppAsked = opp ? room.rematch.includes(opp.id) : false;
  const mySeatNext = room.you === null ? null : MARK[room.you === 0 ? 1 : 0];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex gap-3">
        <PlayerChip player={bySeat(0)} seat={0} mine={bySeat(0)?.id === meId} active={playing && room.turnSeat === 0} winner={finished && room.result?.winnerSeat === 0} />
        <PlayerChip player={bySeat(1)} seat={1} mine={bySeat(1)?.id === meId} active={playing && room.turnSeat === 1} winner={finished && room.result?.winnerSeat === 1} />
      </div>

      <p aria-live="polite" className={`text-center font-display text-xl ${myTurn ? 'text-neon' : ''}`}>{banner}</p>

      {connection !== 'online' && (
        <div role="alert" className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border-amber-400/40 p-4 text-sm">
          <span>You are offline. Reconnecting automatically{playing ? `. Your opponent wins if you stay away over ${Math.round(room.graceMs / 1000)} seconds.` : '.'}</span>
          <GhostButton onClick={online.retryNow}>Reconnect now</GhostButton>
        </div>
      )}
      {oppGone && connection === 'online' && (
        <div role="status" className="glass rounded-2xl border-amber-400/40 p-4 text-sm">
          <strong>{oppGone.username}</strong> lost connection. Waiting for them to come back ({secondsLeft}s). If they do not return, you win.
        </div>
      )}

      <div className={`grid aspect-square w-full grid-cols-3 gap-3 rounded-3xl p-1 transition-shadow ${myTurn ? 'shadow-neon ring-2 ring-neon/40' : ''}`}>
        {state.board.map((cell, i) => {
          const clickable = myTurn && !pending && !cell;
          const win = state.line?.includes(i);
          return (
            <button key={i} onClick={() => void play(i)} aria-disabled={!clickable} aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
              className={`glass flex items-center justify-center rounded-2xl transition-all duration-200 ${win ? 'border-neon/70 bg-neon/15 shadow-neon' : ''} ${
                clickable ? 'hover:border-neon/50 hover:bg-white/[0.08]' : 'cursor-default'}`}>
              {cell && <MarkShape who={cell} />}
            </button>
          );
        })}
      </div>

      {playing && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Confirm label="Resign" question="Resign this game?" onYes={() => void online.resign()} />
          <Confirm label="Leave game" question="Leaving counts as a loss. Leave?" onYes={() => void online.leaveRoom()} />
        </div>
      )}

      {finished && outcome && (
        <motion.section role="status" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className={`glass rounded-3xl p-6 text-center ${outcome.kind === 'win' ? 'border-neon/50 shadow-neon' : outcome.kind === 'draw' ? 'border-sky-400/40' : 'border-rose-400/40'}`}>
          <div className="text-5xl" aria-hidden>{outcome.kind === 'win' ? '🏆' : outcome.kind === 'draw' ? '🤝' : '💔'}</div>
          <h2 className={`mt-2 font-display text-3xl font-bold ${outcome.kind === 'win' ? 'text-neon' : outcome.kind === 'draw' ? 'text-sky-300' : 'text-rose-300'}`}>{outcome.title}</h2>
          <p className="mt-1 text-sm text-muted">{outcome.detail}</p>

          {room.players.length === 2 ? (
            <div className="mt-5 space-y-2">
              {oppAsked && !iAsked && <p className="text-sm">{opp?.username} wants a rematch.</p>}
              {iAsked ? (
                <p className="text-sm text-muted" role="status">Waiting for {opp?.username} to accept…</p>
              ) : (
                <PrimaryButton onClick={() => void online.rematch()}>{oppAsked ? 'Accept rematch' : 'Play again'}</PrimaryButton>
              )}
              {mySeatNext && <p className="text-xs text-muted">Seats swap: you will play {mySeatNext}.</p>}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Your opponent left the room. Share the room code to play again, or leave.</p>
          )}
          <div className="mt-4"><GhostButton onClick={() => void online.leaveRoom()}>Leave room</GhostButton></div>
        </motion.section>
      )}
    </div>
  );
}
