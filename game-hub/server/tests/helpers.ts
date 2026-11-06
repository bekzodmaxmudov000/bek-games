import { createApp, type AppOptions } from '../app';
import { readSse } from '../../src/online/sse';

export const BIG_LIMITS = { general: 100000, auth: 100000 };

export async function startServer(opts: AppOptions = {}) {
  const app = createApp({ sweepEveryMs: 1e9, rateLimit: BIG_LIMITS, ...opts });
  const port = await app.listen(0, '127.0.0.1');
  return { app, port, base: `http://127.0.0.1:${port}` };
}

export interface Reply { status: number; body: any }
export interface Ev { event: string; data: any }
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A real HTTP + SSE player, like the browser app. */
export class Client {
  token = '';
  id = '';
  events: Ev[] = [];
  private ac?: AbortController;
  constructor(public base: string, public name: string) {}

  static async create(base: string, name: string, avatar = '🚀') {
    const c = new Client(base, name);
    const r = await c.post('/api/auth/guest', { username: name, avatar }, false);
    c.token = r.body.token;
    c.id = r.body.player.id;
    return c;
  }
  async post(path: string, body: unknown = {}, auth = true): Promise<Reply> {
    const res = await fetch(this.base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth && this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  }
  async open(): Promise<void> {
    this.ac = new AbortController();
    const res = await fetch(this.base + '/api/stream', { headers: { Authorization: `Bearer ${this.token}` }, signal: this.ac.signal });
    if (!res.ok) throw new Error(`stream ${res.status}`);
    void readSse(res, (m) => this.events.push({ event: m.event, data: JSON.parse(m.data) })).catch(() => undefined);
    await this.until((e) => e.event === 'hello');
  }
  close() { this.ac?.abort(); this.ac = undefined; }
  async until(pred: (e: Ev) => boolean, ms = 2000): Promise<Ev> {
    const end = Date.now() + ms;
    let seen = 0;
    for (;;) {
      for (; seen < this.events.length; seen++) if (pred(this.events[seen])) return this.events[seen];
      if (Date.now() > end) throw new Error(`${this.name}: timed out. Events: ${JSON.stringify(this.events.slice(-4))}`);
      await sleep(8);
    }
  }
  /** Waits for a room update matching `pred` that arrives from now on or is already newer than `from`. */
  room(pred: (r: any) => boolean = () => true, ms = 2000) {
    return this.until((e) => e.event === 'room' && e.data !== null && pred(e.data), ms).then((e) => e.data);
  }
  lastRoom(): any { return [...this.events].reverse().find((e) => e.event === 'room')?.data ?? null; }
  /** Forget what was received so far, so the next `until` only sees fresh events. */
  forget() { this.events.length = 0; }
}

/** Creates two signed-in players with open streams, in one room, game running. */
export async function startedMatch(base: string) {
  const a = await Client.create(base, 'Ann', '🦊');
  const b = await Client.create(base, 'Bob', '🐼');
  await a.open(); await b.open();
  const created = await a.post('/api/rooms', { game: 'tic-tac-toe' });
  await b.post('/api/rooms/join', { code: created.body.room.code });
  const started = await a.post('/api/rooms/start');
  return { a, b, code: created.body.room.code as string, started };
}
