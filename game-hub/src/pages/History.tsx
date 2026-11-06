import { useState } from 'react';
import { games } from '../games/registry';
import { RESULT_LABEL, type Result } from '../progress/logic';
import { useProgress } from '../progress/useProgress';
import EmptyState from '../components/EmptyState';

const TONE: Record<Result, string> = {
  win: 'bg-emerald-400/15 text-emerald-300', loss: 'bg-rose-400/15 text-rose-300',
  draw: 'bg-sky-400/15 text-sky-300', played: 'bg-white/10 text-muted',
};
const RESULTS: (Result | 'all')[] = ['all', 'win', 'loss', 'draw', 'played'];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function History() {
  const { matches } = useProgress();
  const [gameId, setGameId] = useState('all');
  const [result, setResult] = useState<Result | 'all'>('all');
  const rows = [...matches].reverse().filter((m) => (gameId === 'all' || m.gameId === gameId) && (result === 'all' || m.result === result));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Game history</h1>
      <p className="mb-6 mt-2 text-muted">Every finished match on this device.</p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={gameId} onChange={(e) => setGameId(e.target.value)} aria-label="Filter by game"
          className="glass rounded-full bg-panel py-2 pl-4 pr-8 text-sm focus:border-neon/50">
          <option value="all" className="bg-panel">All games</option>
          {games.map((g) => <option key={g.id} value={g.id} className="bg-panel">{g.title}</option>)}
        </select>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by result">
          {RESULTS.map((r) => (
            <button key={r} onClick={() => setResult(r)} aria-pressed={result === r}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${result === r ? 'border-neon/60 bg-neon/20 shadow-neon' : 'border-white/10 text-muted hover:text-fg'}`}>
              {r === 'all' ? 'All results' : RESULT_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="glass grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded-2xl p-4 sm:grid-cols-[1.4fr_1.2fr_.8fr_1fr_.6fr_.6fr]">
              <span className="font-display font-semibold">{m.title}</span>
              <span className="text-right text-sm text-muted sm:text-left">{new Date(m.playedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span><span className={`rounded-full px-2.5 py-1 text-xs ${TONE[m.result]}`}>{RESULT_LABEL[m.result]}</span></span>
              <span className="text-right text-sm sm:text-left">{m.score || '–'}</span>
              <span className="text-sm tabular-nums text-muted">{clock(m.durationSec)}</span>
              <span className="text-right text-sm font-semibold tabular-nums text-neon sm:text-left">+{m.xp} XP</span>
            </li>
          ))}
        </ul>
      ) : matches.length ? (
        <EmptyState title="No matches found" text="Try a different game or result filter." />
      ) : (
        <EmptyState title="No games played yet" text="Finish a game and it will show up here." action={{ label: 'Browse games', href: '#/explore' }} />
      )}
    </div>
  );
}
