import { useMemo, useState } from 'react';
import { games, getGame } from '../games/registry';
import type { GameModule } from '../games/types';
import { ACHIEVEMENTS, AVATARS, summarize } from '../progress/logic';
import { setProfile } from '../progress/store';
import { useProgress } from '../progress/useProgress';
import AchievementCard from '../components/AchievementCard';
import GameCard from '../components/GameCard';
import { GhostButton, PrimaryButton, Stat } from '../components/GameKit';
import LevelBar from '../components/LevelBar';

export default function Profile() {
  const { profile, matches, favorites, unlocked } = useProgress();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const sum = useMemo(() => summarize(matches), [matches]);
  const ctx = { matches, arcadeIds: games.filter((g) => g.categories.includes('Arcade')).map((g) => g.id) };
  const favGames = favorites.map(getGame).filter((g): g is GameModule => Boolean(g));
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  const startEdit = () => { setName(profile.username); setAvatar(profile.avatar); setEditing(true); };
  const save = () => { setProfile({ username: name, avatar }); setEditing(false); };

  return (
    <div className="space-y-9">
      <section className="glass rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-violet to-electric text-5xl shadow-neon ring-2 ring-neon/40">
            {editing ? avatar : profile.avatar}
          </span>
          <div className="min-w-0 flex-1">
            {editing ? (
              <label className="block">
                <span className="text-sm text-muted">Username</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                  className="glass mt-1 w-full max-w-xs rounded-xl px-4 py-2 focus:border-neon/50" />
              </label>
            ) : (
              <h1 className="truncate font-display text-3xl font-bold">{profile.username}</h1>
            )}
          </div>
          {!editing && <GhostButton onClick={startEdit}>Edit profile</GhostButton>}
        </div>

        {editing && (
          <div className="mt-6">
            <p className="mb-2 text-sm text-muted">Avatar</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">
              {AVATARS.map((a) => (
                <button key={a} role="radio" aria-checked={avatar === a} aria-label={`Avatar ${a}`} onClick={() => setAvatar(a)}
                  className={`grid h-12 w-12 place-items-center rounded-xl border text-2xl transition-colors ${avatar === a ? 'border-neon bg-neon/20 shadow-neon' : 'border-white/10 hover:border-white/30'}`}>
                  {a}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <PrimaryButton onClick={save}>Save</PrimaryButton>
              <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
            </div>
          </div>
        )}

        <div className="mt-6"><LevelBar xp={sum.xp} /></div>
        <p className="mt-2 text-sm text-muted">{sum.xp} XP in total</p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold md:text-2xl">Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Games played" value={sum.games} />
          <Stat label="Wins" value={sum.wins} tone="text-emerald-300" />
          <Stat label="Losses" value={sum.losses} tone="text-rose-300" />
          <Stat label="Draws" value={sum.draws} tone="text-sky-300" />
          <Stat label="Win rate" value={`${sum.winRate}%`} tone="text-neon" />
        </div>
        <div className="mt-3 flex gap-5 text-sm">
          <a href="#/history" className="text-neon hover:text-fg">View game history</a>
          <a href="#/leaderboard" className="text-neon hover:text-fg">Leaderboard</a>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold md:text-2xl">Favorite games</h2>
          <a href="#/favorites" className="text-sm text-neon hover:text-fg">All favorites</a>
        </div>
        {favGames.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-5">{favGames.slice(0, 3).map((g) => <GameCard key={g.id} game={g} />)}</div>
        ) : (
          <p className="glass rounded-2xl p-5 text-sm text-muted">No favorites yet. Tap the heart on a game to add it.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold md:text-2xl">Achievements <span className="text-base font-normal text-muted">{unlockedCount} / {ACHIEVEMENTS.length}</span></h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
          {ACHIEVEMENTS.map((a) => <AchievementCard key={a.id} a={a} ctx={ctx} unlockedAt={unlocked[a.id]} />)}
        </div>
      </section>
    </div>
  );
}
