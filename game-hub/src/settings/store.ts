// App-wide settings (sound, music, motion) kept in localStorage.
export type Motion = 'system' | 'full' | 'reduced' | 'off';
export interface Settings { sfx: boolean; sfxVolume: number; music: boolean; musicVolume: number; motion: Motion }

const KEY = 'bekgames:settings:v1';
export const DEFAULT_SETTINGS: Settings = { sfx: true, sfxVolume: 0.7, music: false, musicVolume: 0.35, motion: 'system' };
const MOTIONS: Motion[] = ['system', 'full', 'reduced', 'off'];

const volume = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);

function load(): Settings {
  const d = DEFAULT_SETTINGS;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!p || typeof p !== 'object') return d;
    return {
      sfx: typeof p.sfx === 'boolean' ? p.sfx : d.sfx,
      sfxVolume: volume(p.sfxVolume, d.sfxVolume),
      music: typeof p.music === 'boolean' ? p.music : d.music,
      musicVolume: volume(p.musicVolume, d.musicVolume),
      motion: MOTIONS.includes(p.motion) ? p.motion : d.motion,
    };
  } catch {
    return d;
  }
}

let state: Settings = load();
const listeners = new Set<() => void>();

function commit(next: Settings) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}

export const getSettings = () => state;
export const subscribeSettings = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...state, ...patch };
  next.sfxVolume = volume(next.sfxVolume, state.sfxVolume);
  next.musicVolume = volume(next.musicVolume, state.musicVolume);
  if (!MOTIONS.includes(next.motion)) next.motion = state.motion;
  commit(next);
}

export const resetSettings = () => commit({ ...DEFAULT_SETTINGS });

/** What the page should actually do: "system" follows the OS reduced-motion preference. */
export const effectiveMotion = (m: Motion, prefersReduced: boolean): 'full' | 'reduced' | 'off' =>
  m === 'system' ? (prefersReduced ? 'reduced' : 'full') : m;
