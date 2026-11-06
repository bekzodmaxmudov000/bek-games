import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { go } from '../lib/router';
import { GhostButton, PrimaryButton } from '../components/GameKit';
import LoadingState from '../components/LoadingState';
import { online } from '../online';
import { ONLINE_BOARDS } from '../online/boards';
import type { OnlineRoom } from '../online/types';
import { useOnline } from '../online/useOnline';
import { useProgressSelector } from '../progress/useProgress';

const DOT = { online: 'bg-emerald-400', connecting: 'bg-amber-400 animate-pulse', offline: 'bg-rose-400', idle: 'bg-white/30' } as const;
const LABEL = { online: 'Connected', connecting: 'Connecting…', offline: 'Offline, retrying…', idle: 'Not connected' } as const;

function describe(room: OnlineRoom, meId?: string): string {
  const r = room.result;
  if (!r) return '';
  if (r.winnerSeat === null) return r.reason === 'disconnected' ? 'Both players went offline. It is a draw.' : 'It is a draw.';
  const winner = room.players.find((p) => p.seat === r.winnerSeat);
  const who = winner?.id === meId ? 'You win' : `${winner?.username ?? 'Your opponent'} wins`;
  const why = r.reason === 'resigned' ? ' by resignation' : r.reason === 'left' ? ' because the opponent left' : r.reason === 'disconnected' ? ' because the opponent went offline' : '';
  return `${who}${why}.`;
}

function GameSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { games } = useOnline();
  return (
    <select value={value || games[0]?.kind || ''} onChange={(e) => onChange(e.target.value)} aria-label="Game"
      className="glass w-full rounded-xl bg-panel px-4 py-3 focus:border-neon/50">
      {games.map((g) => <option key={g.kind} value={g.kind} className="bg-panel">{g.title}</option>)}
    </select>
  );
}

function Card({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="glass flex flex-col gap-4 rounded-3xl p-5 md:p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      <div className="mt-auto flex flex-col gap-3">{children}</div>
    </section>
  );
}

function RoomPanel({ room, meId }: { room: OnlineRoom; meId?: string }) {
  const [copied, setCopied] = useState('');
  const host = room.hostId === meId;
  const link = `${location.origin}${location.pathname}#/online/${room.code}`;
  const everyoneHere = room.players.length === 2 && room.players.every((p) => p.connected);
  const Board = room.status !== 'waiting' ? ONLINE_BOARDS[room.game] : undefined;

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); window.setTimeout(() => setCopied(''), 1800); } catch { setCopied('Copy failed'); }
  };
  const share = () => {
    if (navigator.share) void navigator.share({ title: 'BEK GAMES', text: `Join my BEK GAMES room: ${room.code}`, url: link }).catch(() => undefined);
    else void copy(link, 'Link copied');
  };

  if (Board) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Room <span className="font-display tracking-widest text-fg">{room.code}</span></span>
          <span>Game {room.round}</span>
        </div>
        <Suspense fallback={<LoadingState label="Loading board…" />}><Board room={room} meId={meId} /></Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass rounded-3xl p-6 text-center md:p-8">
        <p className="text-sm text-muted">Room code</p>
        <p className="mt-1 pl-[0.25em] font-display text-5xl font-bold tracking-[0.25em] text-neon md:text-6xl" aria-label={`Room code ${room.code.split('').join(' ')}`}>{room.code}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <GhostButton onClick={() => copy(room.code, 'Code copied')}>Copy code</GhostButton>
          <PrimaryButton onClick={share}>Invite a friend</PrimaryButton>
        </div>
        <p className="mt-3 h-5 text-sm text-emerald-300" role="status">{copied}</p>
      </section>

      <section className="glass rounded-3xl p-5 md:p-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Players</h2>
        <ul className="space-y-3">
          {[0, 1].map((slot) => {
            const p = room.players[slot];
            return p ? (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet to-electric text-2xl">{p.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.username}{p.id === meId ? ' (you)' : ''}</span>
                  <span className="text-xs text-muted">{p.id === room.hostId ? 'Host' : 'Guest'}</span>
                </span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <span className={`h-2.5 w-2.5 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {p.connected ? 'Online' : 'Offline'}
                </span>
              </li>
            ) : (
              <li key={slot} className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 p-3 text-muted">
                <span className="grid h-11 w-11 animate-pulse place-items-center rounded-full bg-white/5">?</span>
                Waiting for a friend. Share the code.
              </li>
            );
          })}
        </ul>
      </section>

      {room.status === 'waiting' && (
        <div className="flex flex-wrap items-center gap-3">
          {host ? (
            <PrimaryButton onClick={() => void online.startGame()} disabled={!everyoneHere}>Start game</PrimaryButton>
          ) : (
            <p className="text-sm text-muted">Waiting for the host to start.</p>
          )}
          {host && !everyoneHere && <p className="text-sm text-muted">{room.players.length < 2 ? 'Start unlocks when a second player joins.' : 'A player is offline.'}</p>}
        </div>
      )}

      {room.status !== 'waiting' && (
        <section className="glass rounded-3xl p-5 md:p-6" role="status">
          <h2 className="font-display text-lg font-semibold">{room.status === 'playing' ? 'Match in progress' : 'Match finished'}</h2>
          <p className="mt-1 text-sm text-muted">
            {room.status === 'playing'
              ? 'The game is running on the server, but this game has no online board yet.'
              : describe(room, meId)}
          </p>
          {room.status === 'finished' && host && room.players.length === 2 && (
            <div className="mt-4"><PrimaryButton onClick={() => void online.startGame()} disabled={!everyoneHere}>Play again</PrimaryButton></div>
          )}
        </section>
      )}

      <GhostButton onClick={() => void online.leaveRoom()}>Leave room</GhostButton>
    </div>
  );
}

export default function Online({ code }: { code?: string }) {
  const s = useOnline();
  const profile = useProgressSelector((p) => p.profile);
  const [game, setGame] = useState('');
  const [joinCode, setJoinCode] = useState(code?.toUpperCase() ?? '');
  const ready = s.connection === 'online';

  useEffect(() => { online.connect(); }, []);
  useEffect(() => { if (code) setJoinCode(code.toUpperCase()); }, [code]);
  useEffect(() => {
    if (ready && s.me && (s.me.username !== profile.username || s.me.avatar !== profile.avatar)) void online.syncProfile();
  }, [ready, s.me?.username, s.me?.avatar, profile.username, profile.avatar]); // eslint-disable-line react-hooks/exhaustive-deps

  const kind = game || s.games[0]?.kind || '';
  const join = async (c: string) => { await online.joinRoom(c); if (online.getState().room) go('#/online'); };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Play online</h1>
          <p className="mt-2 text-muted">Play a friend or a random opponent in real time.</p>
        </div>
        <span className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm" role="status">
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[s.connection]}`} />{LABEL[s.connection]}
        </span>
      </header>

      {s.error && (
        <div role="alert" className="glass flex items-start justify-between gap-4 rounded-2xl border-rose-400/40 p-4 text-sm text-rose-200">
          <span>{s.error}</span>
          <button onClick={online.clearError} className="shrink-0 text-muted hover:text-fg">Dismiss</button>
        </div>
      )}

      {s.connection === 'offline' && !s.room && (
        <div className="glass rounded-2xl p-4 text-sm text-muted">
          The multiplayer server is not reachable. While developing, start it with <code className="text-fg">npm run server</code> in a second terminal.
          In production, set <code className="text-fg">VITE_API_URL</code> to your server address.
        </div>
      )}

      {s.room ? (
        <RoomPanel room={s.room} meId={s.me?.id} />
      ) : s.queue ? (
        <section className="glass grid place-items-center gap-5 rounded-3xl px-6 py-14 text-center" role="status">
          <span className="relative grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-neon/30" />
            <span className="absolute inset-3 animate-pulse rounded-full bg-neon/30" />
            <span className="relative text-3xl">🔎</span>
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">Looking for an opponent…</h2>
            <p className="mt-1 text-sm text-muted">You will be placed in a game as soon as someone joins.</p>
          </div>
          <GhostButton onClick={() => void online.queueLeave()}>Cancel search</GhostButton>
        </section>
      ) : (
        <>
          {code && (
            <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border-neon/40 p-4">
              <p className="text-sm">You were invited to room <span className="font-display font-semibold tracking-widest text-neon">{code.toUpperCase()}</span></p>
              <PrimaryButton onClick={() => void join(code)} disabled={!ready}>Join room</PrimaryButton>
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Create a room" text="Get a code and send it to a friend.">
              <GameSelect value={kind} onChange={setGame} />
              <PrimaryButton onClick={() => void online.createRoom(kind)} disabled={!ready || !kind}>Create room</PrimaryButton>
            </Card>
            <Card title="Join a room" text="Enter the 6-character code you received.">
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter' && ready && joinCode.length === 6) void join(joinCode); }}
                placeholder="ABC234" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label="Room code"
                className="glass w-full rounded-xl px-4 py-3 text-center font-display text-xl tracking-[0.3em] placeholder:text-muted/50 focus:border-neon/50" />
              <PrimaryButton onClick={() => void join(joinCode)} disabled={!ready || joinCode.length !== 6}>Join room</PrimaryButton>
            </Card>
            <Card title="Random match" text="We will pair you with another player who is searching.">
              <GameSelect value={kind} onChange={setGame} />
              <PrimaryButton onClick={() => void online.queueJoin(kind)} disabled={!ready || !kind}>Find opponent</PrimaryButton>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
