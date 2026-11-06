// Central audio: every sound is synthesised with the Web Audio API, so there are no audio files
// and no copyrighted material. Everything respects the saved settings.
import { getSettings, subscribeSettings } from '../settings/store';

type Note = [freq: number, at: number, dur: number, type?: OscillatorType, vol?: number];

export type Sfx =
  | 'click' | 'tick' | 'move' | 'capture' | 'check' | 'eat' | 'rotate' | 'drop' | 'line' | 'flip' | 'match' | 'miss'
  | 'merge' | 'undo' | 'win' | 'lose' | 'draw' | 'xp' | 'levelup' | 'achievement';

const PATTERNS: Record<Sfx, Note[]> = {
  click: [[520, 0, 0.05, 'triangle']],
  tick: [[300, 0, 0.03, 'triangle', 0.2]],
  move: [[330, 0, 0.06], [440, 0.05, 0.07]],
  capture: [[220, 0, 0.08, 'square', 0.22], [165, 0.07, 0.1, 'square', 0.22]],
  check: [[660, 0, 0.08], [880, 0.09, 0.12]],
  eat: [[660, 0, 0.06, 'square', 0.2], [990, 0.05, 0.08, 'square', 0.2]],
  rotate: [[480, 0, 0.04, 'triangle']],
  drop: [[140, 0, 0.12, 'sine', 0.55]],
  line: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.14]],
  flip: [[420, 0, 0.05, 'triangle']],
  match: [[600, 0, 0.08], [900, 0.08, 0.12]],
  miss: [[200, 0, 0.12, 'sawtooth', 0.15]],
  merge: [[500, 0, 0.05], [750, 0.05, 0.08]],
  undo: [[400, 0, 0.06], [300, 0.05, 0.07]],
  win: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.3]],
  lose: [[392, 0, 0.18, 'sawtooth', 0.2], [330, 0.18, 0.18, 'sawtooth', 0.2], [262, 0.36, 0.3, 'sawtooth', 0.2]],
  draw: [[440, 0, 0.14], [440, 0.18, 0.14]],
  xp: [[740, 0, 0.07], [988, 0.07, 0.09]],
  levelup: [[392, 0, 0.1], [523, 0.1, 0.1], [659, 0.2, 0.1], [784, 0.3, 0.1], [1047, 0.4, 0.35]],
  achievement: [[880, 0, 0.1], [1175, 0.1, 0.2]],
};

// Soft pad chords for the ambient background music (generated, not a recording).
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 196, 246.94]];

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | undefined;
let chord = 0;
let started = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  sfxGain = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain.connect(ctx.destination);
  musicGain.connect(ctx.destination);
  applyGains();
  return ctx;
}

function applyGains() {
  const s = getSettings();
  if (sfxGain) sfxGain.gain.value = s.sfx ? s.sfxVolume : 0;
  if (musicGain) musicGain.gain.value = s.music ? s.musicVolume * 0.5 : 0;
}

function tone(c: AudioContext, out: AudioNode, freq: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime + at;
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Plays a short effect. Does nothing when sound effects are off. */
export function sfx(name: Sfx) {
  const s = getSettings();
  if (!s.sfx || s.sfxVolume <= 0) return;
  const c = ensure();
  if (!c || !sfxGain) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  for (const [freq, at, dur, type = 'sine', vol = 0.35] of PATTERNS[name]) tone(c, sfxGain, freq, at, dur, type, vol);
}

function playChord() {
  const c = ctx;
  if (!c || !musicGain || c.state !== 'running') return;
  CHORDS[chord++ % CHORDS.length].forEach((freq, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + i * 0.18;
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
    osc.connect(g);
    g.connect(musicGain!);
    osc.start(t);
    osc.stop(t + 3.7);
  });
}

function stopMusic() {
  if (musicTimer !== undefined) { window.clearInterval(musicTimer); musicTimer = undefined; }
}

function armResume() {
  const resume = () => {
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    void ctx?.resume().then(syncMusic).catch(() => undefined);
  };
  window.addEventListener('pointerdown', resume, { once: true });
  window.addEventListener('keydown', resume, { once: true });
}

/** Starts or stops the background music to match the settings and tab visibility. */
function syncMusic() {
  const s = getSettings();
  const want = s.music && s.musicVolume > 0 && !document.hidden;
  if (!want) return stopMusic();
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') { void c.resume().catch(() => undefined); armResume(); }
  if (musicTimer === undefined) {
    playChord();
    musicTimer = window.setInterval(playChord, 3200);
  }
}

/** Call once at startup. Keeps volumes and music in sync with the settings. */
export function initAudio() {
  if (started || typeof window === 'undefined') return;
  started = true;
  subscribeSettings(() => { applyGains(); syncMusic(); });
  document.addEventListener('visibilitychange', syncMusic);
  syncMusic();
}
