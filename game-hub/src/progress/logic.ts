import type { Level } from '../games/types';

export type Result = 'win' | 'loss' | 'draw' | 'played';

export interface MatchRecord {
  id: string;
  gameId: string;
  title: string;
  playedAt: string; // ISO
  result: Result;
  score: string;
  durationSec: number;
  xp: number;
  level?: Level;
}

export const AVATARS = ['🚀', '🪐', '👾', '🦊', '🐼', '🐙', '🦄', '🐲', '🤖', '🎧', '🧠', '⚡'];

export const RESULT_LABEL: Record<Result, string> = { win: 'Win', loss: 'Loss', draw: 'Draw', played: 'Finished' };

/** XP for one finished match: 10 for playing, plus a bonus by result and difficulty. */
export function xpForMatch(result: Result, level?: Level): number {
  const bonus =
    result === 'win' ? 40 + (level === 'hard' ? 25 : level === 'medium' ? 10 : 0)
    : result === 'draw' ? 15
    : result === 'played' ? 5
    : 0;
  return 10 + bonus;
}

export const needFor = (level: number) => 100 + 50 * (level - 1);

export function levelInfo(xp: number) {
  let level = 1;
  let rest = xp;
  while (rest >= needFor(level)) { rest -= needFor(level); level++; }
  const need = needFor(level);
  return { level, into: rest, need, pct: rest / need };
}

export const totalXp = (matches: MatchRecord[]) => matches.reduce((s, m) => s + m.xp, 0);

export interface GameTally { title: string; plays: number; wins: number; xp: number }

export function summarize(matches: MatchRecord[]) {
  const byGame: Record<string, GameTally> = {};
  let wins = 0, losses = 0, draws = 0;
  for (const m of matches) {
    if (m.result === 'win') wins++;
    else if (m.result === 'loss') losses++;
    else if (m.result === 'draw') draws++;
    const t = (byGame[m.gameId] ??= { title: m.title, plays: 0, wins: 0, xp: 0 });
    t.plays++;
    t.xp += m.xp;
    if (m.result === 'win') t.wins++;
  }
  const decided = wins + losses + draws;
  return { games: matches.length, wins, losses, draws, xp: totalXp(matches), winRate: decided ? Math.round((wins / decided) * 100) : 0, byGame };
}

/** Longest run of wins; finished-only score games don't break or extend a run. */
export function longestWinStreak(matches: MatchRecord[]): number {
  let cur = 0, best = 0;
  for (const m of [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt))) {
    if (m.result === 'played') continue;
    cur = m.result === 'win' ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

// ---------- achievements ----------
export interface AchievementCtx { matches: MatchRecord[]; arcadeIds: string[] }
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: (c: AchievementCtx) => number;
  progress: (c: AchievementCtx) => number;
}

const winsOf = (c: AchievementCtx, gameId?: string) =>
  c.matches.filter((m) => m.result === 'win' && (!gameId || m.gameId === gameId)).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-victory', title: 'First Victory', icon: '🏅', description: 'Win any game.', target: () => 1, progress: (c) => winsOf(c) },
  { id: 'ten-games', title: '10 Games Played', icon: '🎮', description: 'Finish 10 games.', target: () => 10, progress: (c) => c.matches.length },
  { id: 'ten-victories', title: '10 Victories', icon: '🏆', description: 'Win 10 games.', target: () => 10, progress: (c) => winsOf(c) },
  { id: 'chess-master', title: 'Chess Master', icon: '♞', description: 'Win 3 chess games.', target: () => 3, progress: (c) => winsOf(c, 'chess') },
  {
    id: 'arcade-champion', title: 'Arcade Champion', icon: '👾',
    description: 'Win every Arcade game: reach 100 points in Snake and 1000 in Tetris.',
    target: (c) => c.arcadeIds.length,
    progress: (c) => c.arcadeIds.filter((id) => winsOf(c, id) > 0).length,
  },
  { id: 'unbeaten', title: 'Unbeaten', icon: '🔥', description: 'Win 5 games in a row.', target: () => 5, progress: (c) => longestWinStreak(c.matches) },
  { id: 'explorer', title: 'Game Explorer', icon: '🧭', description: 'Play 5 different games.', target: () => 5, progress: (c) => new Set(c.matches.map((m) => m.gameId)).size },
];

export const isDone = (a: Achievement, c: AchievementCtx) => {
  const t = a.target(c);
  return t > 0 && a.progress(c) >= t;
};

export function newlyUnlocked(c: AchievementCtx, unlocked: Record<string, string>): string[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && isDone(a, c)).map((a) => a.id);
}
