// Local progression data (profile, matches, favorites, achievements) kept in localStorage.
import '../lib/legacy';
import { levelInfo, newlyUnlocked, totalXp, xpForMatch, type MatchRecord, type Result } from './logic';

const KEY = 'bekgames:progress:v1';

export interface Profile { username: string; avatar: string }
export interface RewardEvent { id: string; gameTitle: string; result: Result; xp: number; leveledUp: boolean; level: number; unlocked: string[] }
interface Persisted { profile: Profile; matches: MatchRecord[]; favorites: string[]; unlocked: Record<string, string> }
export interface ProgressState extends Persisted { event: RewardEvent | null }

const DEFAULTS: Persisted = { profile: { username: 'Player', avatar: '🚀' }, matches: [], favorites: [], unlocked: {} };
const RESULTS = ['win', 'loss', 'draw', 'played'];

const validMatch = (m: unknown): m is MatchRecord => {
  const r = m as MatchRecord;
  return !!r && typeof r.id === 'string' && typeof r.gameId === 'string' && typeof r.xp === 'number' && RESULTS.includes(r.result) && typeof r.playedAt === 'string';
};

function load(): Persisted {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!p || typeof p !== 'object') return DEFAULTS;
    return {
      profile: {
        username: typeof p.profile?.username === 'string' && p.profile.username ? p.profile.username : DEFAULTS.profile.username,
        avatar: typeof p.profile?.avatar === 'string' && p.profile.avatar ? p.profile.avatar : DEFAULTS.profile.avatar,
      },
      matches: Array.isArray(p.matches) ? p.matches.filter(validMatch) : [],
      favorites: Array.isArray(p.favorites) ? p.favorites.filter((x: unknown) => typeof x === 'string') : [],
      unlocked: p.unlocked && typeof p.unlocked === 'object' ? p.unlocked : {},
    };
  } catch {
    return DEFAULTS;
  }
}

let state: ProgressState = { ...load(), event: null };
const listeners = new Set<() => void>();

function commit(next: ProgressState) {
  state = next;
  const { event: _event, ...persisted } = next;
  try { localStorage.setItem(KEY, JSON.stringify(persisted)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = { ...load(), event: null };
    listeners.forEach((l) => l());
  });
}

export const getState = () => state;
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export type MatchInput = Omit<MatchRecord, 'xp' | 'playedAt'>;

/** Records a finished match. A match id is only ever rewarded once. */
export function recordMatch(input: MatchInput, arcadeIds: string[]) {
  if (state.matches.some((m) => m.id === input.id)) return;
  const record: MatchRecord = { ...input, xp: xpForMatch(input.result, input.level), playedAt: new Date().toISOString() };
  const matches = [...state.matches, record];
  const fresh = newlyUnlocked({ matches, arcadeIds }, state.unlocked);
  const unlocked = { ...state.unlocked };
  fresh.forEach((id) => { unlocked[id] = record.playedAt; });
  const before = levelInfo(totalXp(state.matches)).level;
  const after = levelInfo(totalXp(matches)).level;
  commit({
    ...state, matches, unlocked,
    event: { id: record.id, gameTitle: record.title, result: record.result, xp: record.xp, leveledUp: after > before, level: after, unlocked: fresh },
  });
}

export function setProfile(profile: Profile) {
  const username = profile.username.trim().slice(0, 20) || DEFAULTS.profile.username;
  commit({ ...state, profile: { username, avatar: profile.avatar }, event: null });
}

export function toggleFavorite(gameId: string) {
  const favorites = state.favorites.includes(gameId) ? state.favorites.filter((f) => f !== gameId) : [...state.favorites, gameId];
  commit({ ...state, favorites, event: null });
}
