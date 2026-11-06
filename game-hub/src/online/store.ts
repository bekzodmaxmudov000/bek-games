// Client side of online play: identity, live connection and room state. No React in here,
// so it runs in the browser and in Node tests alike.
import { readSse } from './sse';
import type { GameInfo, Me, OnlineRoom } from './types';

export interface KeyValue { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface OnlineOptions {
  baseUrl: string;
  storage: KeyValue;
  profile: () => { username: string; avatar: string };
  fetchFn?: typeof fetch;
  /** Reconnect delays in ms. The last value repeats. */
  retryMs?: number[];
}

export type Connection = 'idle' | 'connecting' | 'online' | 'offline';
export interface OnlineState {
  connection: Connection;
  me: Me | null;
  games: GameInfo[];
  room: OnlineRoom | null;
  /** When (Date.now) the shown room was last updated; used for countdowns. */
  roomAt: number;
  /** Game kind we are searching an opponent for, if any. */
  queue: string | null;
  error: string | null;
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

const KEY = 'bekgames:online:v1';

/** Keeps whichever room update is newer, so a slow reply can never roll the screen back. */
export function newerRoom(current: OnlineRoom | null, next: OnlineRoom | null): OnlineRoom | null {
  if (!next) return null;
  return current && current.code === next.code && next.version < current.version ? current : next;
}

export function createOnlineStore(opts: OnlineOptions) {
  const doFetch: typeof fetch = opts.fetchFn ?? ((...a) => fetch(...a));
  const retry = opts.retryMs ?? [500, 1000, 2000, 4000, 8000];
  let state: OnlineState = { connection: 'idle', me: null, games: [], room: null, roomAt: 0, queue: null, error: null };
  const listeners = new Set<() => void>();
  let token: string | null = null;
  try { token = (JSON.parse(opts.storage.getItem(KEY) ?? 'null') as { token?: string } | null)?.token ?? null; } catch { token = null; }
  let running = false;
  let abort: AbortController | null = null;
  let wake: (() => void) | null = null;

  const set = (patch: Partial<OnlineState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
  const saveToken = (t: string | null) => {
    token = t;
    try { if (t) opts.storage.setItem(KEY, JSON.stringify({ token: t })); else opts.storage.removeItem(KEY); } catch { /* storage unavailable */ }
  };

  async function api<T>(path: string, body?: unknown): Promise<T> {
    const res = await doFetch(opts.baseUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { code: string; message: string } };
    if (!res.ok) throw new ApiError(data.error?.code ?? 'error', data.error?.message ?? 'Request failed.', res.status);
    return data as T;
  }

  async function register() {
    const p = opts.profile();
    const r = await api<{ token: string; player: Me }>('/api/auth/guest', { username: p.username, avatar: p.avatar });
    saveToken(r.token);
    set({ me: r.player });
  }

  function onMessage(event: string, raw: string) {
    let data: any;
    try { data = JSON.parse(raw); } catch { return; }
    if (event === 'hello') set({ connection: 'online', me: data.player, games: data.games, room: data.room, roomAt: Date.now(), queue: data.queue });
    else if (event === 'room') setRoom(data);
    else if (event === 'queue') set({ queue: data.game });
  }

  function setRoom(next: OnlineRoom | null) {
    const room = newerRoom(state.room, next);
    set(room === state.room ? {} : { room, roomAt: Date.now() });
  }

  /** Waits `ms`, or less if `retryNow` is called. */
  const pause = (ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); wake = null; resolve(); }
    wake = done;
  });

  async function loop() {
    let attempt = 0;
    while (running) {
      try {
        set({ connection: 'connecting' });
        if (!token) await register();
        abort = new AbortController();
        const res = await doFetch(opts.baseUrl + '/api/stream', { headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: abort.signal });
        if (res.status === 401) { saveToken(null); set({ me: null }); continue; } // identity expired: sign in again
        if (!res.ok || !res.body) throw new Error('stream failed');
        attempt = 0;
        await readSse(res, (m) => onMessage(m.event, m.data));
      } catch { /* network problem or aborted: fall through to retry */ }
      if (!running) return;
      set({ connection: 'offline' });
      await pause(retry[Math.min(attempt++, retry.length - 1)]);
    }
  }

  async function act<T>(fn: () => Promise<T>): Promise<T | null> {
    try { set({ error: null }); return await fn(); }
    catch (e) { set({ error: e instanceof ApiError ? e.message : 'Cannot reach the server.' }); return null; }
  }
  const applyRoom = (r: { room: OnlineRoom | null; queue: string | null } | null) => { if (r) { setRoom(r.room); set({ queue: r.queue }); } };

  return {
    getState: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    connect() { if (running) return; running = true; void loop(); },
    disconnect() { running = false; abort?.abort(); set({ connection: 'idle' }); },
    clearError() { set({ error: null }); },
    /** Skips the wait before the next reconnect attempt. */
    retryNow() { wake?.(); },
    /** Sends the current username/avatar to the server (call after editing the profile). */
    async syncProfile() { await act(register); },
    createRoom: (game: string) => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/rooms', { game })).then(applyRoom),
    joinRoom: (code: string) => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/rooms/join', { code })).then(applyRoom),
    leaveRoom: () => act(() => api<{ room: null; queue: null }>('/api/rooms/leave')).then(applyRoom),
    startGame: () => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/rooms/start')).then(applyRoom),
    move: (move: unknown) => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/rooms/move', { move })).then(applyRoom),
    rematch: () => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/rooms/rematch')).then(applyRoom),
    resign: () => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/rooms/resign')).then(applyRoom),
    queueJoin: (game: string) => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/queue/join', { game })).then(applyRoom),
    queueLeave: () => act(() => api<{ room: OnlineRoom | null; queue: string | null }>('/api/queue/leave')).then(applyRoom),
  };
}
export type OnlineStore = ReturnType<typeof createOnlineStore>;
