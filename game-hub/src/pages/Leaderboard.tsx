import { useMemo, useState } from 'react';
import { games } from '../games/registry';
import { summarize } from '../progress/logic';
import { useProgress } from '../progress/useProgress';

const TABS = [
  { id: 'xp', label: 'Highest XP', unit: 'XP' },
  { id: 'wins', label: 'Most wins', unit: 'wins' },
  { id: 'plays', label: 'Most played', unit: 'games' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function Leaderboard() {
  const { profile, matches } = useProgress();
  const [tab, setTab] = useState<Tab>('xp');
  const sum = useMemo(() => summarize(matches), [matches]);
  const total = tab === 'xp' ? sum.xp : tab === 'wins' ? sum.wins : sum.games;
  const unit = TABS.find((t) => t.id === tab)!.unit;

  const rows = games
    .map((g) => {
      const t = sum.byGame[g.id];
      return { game: g, value: t ? (tab === 'xp' ? t.xp : tab === 'wins' ? t.wins : t.plays) : 0 };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
      <p className="mb-6 mt-2 max-w-xl text-muted">
        Your personal stats on this device. Online rankings against other players will come with accounts.
      </p>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Ranking">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${tab === t.id ? 'border-neon/60 bg-neon/20 shadow-neon' : 'border-white/10 text-muted hover:text-fg'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass mb-6 flex items-center gap-4 rounded-3xl p-5">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet to-electric text-3xl ring-2 ring-neon/40">{profile.avatar}</span>
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">{profile.username}</p>
          <p className="text-sm text-muted">Your total</p>
        </div>
        <p className="font-display text-3xl font-bold text-neon">{total} <span className="text-sm font-normal text-muted">{unit}</span></p>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">Your best games</h2>
      <ol className="space-y-3">
        {rows.map(({ game, value }, i) => (
          <li key={game.id} className={`glass flex items-center gap-4 rounded-2xl p-3 pr-5 ${value === 0 ? 'opacity-50' : ''}`}>
            <span className="w-7 text-center font-display text-lg font-semibold text-muted">{i + 1}</span>
            <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `linear-gradient(135deg, ${game.hue[0]}cc, ${game.hue[1]}88)` }}>
              <game.Icon className="h-7 w-7 text-white" />
            </span>
            <a href={`#/play/${game.id}`} className="flex-1 font-medium hover:text-neon">{game.title}</a>
            <span className="tabular-nums">{value} <span className="text-sm text-muted">{unit}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
