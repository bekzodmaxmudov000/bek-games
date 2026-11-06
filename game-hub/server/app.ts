import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanAvatar, cleanName, newPlayerId, newSecret, signToken, verifyToken, type Identity } from './auth';
import { listGames } from './games';
import { RateLimiter } from './ratelimit';
import { RoomError, RoomManager, type ManagerEvent, type Room } from './rooms';
import { publicRoom } from './views';

export interface AppOptions {
  /** HMAC secret for player tokens. Falls back to BEK_SERVER_SECRET, then a file in dataDir, then a random one. */
  secret?: string;
  /** Where rooms, players and the secret are saved. No dataDir means memory only. */
  dataDir?: string;
  /** Allowed browser origins: '*' or a list. Set this in production. */
  allowedOrigins?: string[] | '*';
  graceMs?: number;
  idleMs?: number;
  finishedMs?: number;
  waitingMs?: number;
  now?: () => number;
  sweepEveryMs?: number;
  trustProxy?: boolean;
  rateLimit?: { general: number; auth: number };
}

export interface App {
  server: Server;
  manager: RoomManager;
  listen(port?: number, host?: string): Promise<number>;
  close(): Promise<void>;
  flush(): void;
}

type Player = Identity & { lastSeen: number };
const MAX_BODY = 4096;
const MAX_STREAMS_PER_PLAYER = 5;
const PLAYER_TTL_MS = 24 * 60 * 60_000;

export function createApp(opts: AppOptions = {}): App {
  const now = opts.now ?? Date.now;
  const dataDir = opts.dataDir;
  if (dataDir) mkdirSync(dataDir, { recursive: true });

  const secretFile = dataDir ? join(dataDir, 'secret.key') : '';
  let secret = opts.secret ?? process.env.BEK_SERVER_SECRET ?? '';
  if (!secret) {
    if (secretFile && existsSync(secretFile)) secret = readFileSync(secretFile, 'utf8').trim();
    if (!secret) {
      secret = newSecret();
      if (secretFile) writeFileSync(secretFile, secret, { mode: 0o600 });
    }
  }

  const players = new Map<string, Player>();
  const streams = new Map<string, Set<ServerResponse>>();
  const general = new RateLimiter(opts.rateLimit?.general ?? 300, 60_000, now);
  const authLimit = new RateLimiter(opts.rateLimit?.auth ?? 30, 60_000, now);
  let eventId = 0;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const manager = new RoomManager({
    now, graceMs: opts.graceMs, idleMs: opts.idleMs, finishedMs: opts.finishedMs, waitingMs: opts.waitingMs, emit: deliver,
  });

  // ---------- persistence ----------
  const stateFile = dataDir ? join(dataDir, 'state.json') : '';
  if (stateFile && existsSync(stateFile)) {
    try {
      const saved = JSON.parse(readFileSync(stateFile, 'utf8')) as { players?: Identity[]; rooms?: Room[] };
      for (const p of saved.players ?? []) {
        if (p && typeof p.id === 'string') players.set(p.id, { id: p.id, username: cleanName(p.username), avatar: cleanAvatar(p.avatar), lastSeen: now() });
      }
      manager.restore((saved.rooms ?? []).filter((r) => r && Array.isArray(r.players) && r.players.every((p) => players.has(p.id))));
    } catch { /* unreadable snapshot: start clean */ }
  }

  function flush() {
    if (!stateFile) return;
    const data = { players: [...players.values()].map(({ id, username, avatar }) => ({ id, username, avatar })), rooms: manager.snapshot() };
    const tmp = `${stateFile}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, stateFile);
  }
  function scheduleSave() {
    if (!stateFile || saveTimer || closed) return;
    saveTimer = setTimeout(() => { saveTimer = undefined; try { flush(); } catch { /* disk problem: keep serving */ } }, 500);
    saveTimer.unref?.();
  }

  // ---------- push to clients ----------
  const lookup = (id: string): Identity | undefined => players.get(id);
  const view = () => ({ now: now(), graceMs: manager.graceMs });
  const viewOf = (playerId: string) => { const r = manager.roomOf(playerId); return r ? publicRoom(r, lookup, playerId, view()) : null; };

  function write(res: ServerResponse, type: string, data: unknown) {
    try { res.write(`id: ${++eventId}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* socket already closed */ }
  }
  function push(playerId: string, type: string, data: unknown) {
    streams.get(playerId)?.forEach((res) => write(res, type, data));
  }
  function deliver(e: ManagerEvent) {
    if (e.type === 'room') e.to.forEach((id) => push(id, 'room', publicRoom(e.room, lookup, id, view())));
    else if (e.type === 'noroom') e.to.forEach((id) => push(id, 'room', null));
    else e.to.forEach((id) => push(id, 'queue', { game: e.game }));
    scheduleSave();
  }

  // ---------- http helpers ----------
  const origins = opts.allowedOrigins ?? '*';
  function cors(req: IncomingMessage, res: ServerResponse) {
    const origin = req.headers.origin;
    if (origins === '*') res.setHeader('Access-Control-Allow-Origin', '*');
    else if (origin && origins.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  function json(res: ServerResponse, status: number, body: unknown, close = false) {
    const text = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(close ? { Connection: 'close' } : {}) });
    res.end(text);
  }
  function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let size = 0;
      let failed = false;
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => {
        if (failed) return;
        size += c.length;
        if (size > MAX_BODY) { failed = true; reject(new RoomError('too_large', 'Request is too large.', 413)); return; }
        chunks.push(c);
      });
      req.on('end', () => {
        if (failed) return;
        if (!chunks.length) return resolve({});
        try {
          const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (v && typeof v === 'object' && !Array.isArray(v)) resolve(v as Record<string, unknown>);
          else reject(new RoomError('bad_json', 'Body must be a JSON object.'));
        } catch { reject(new RoomError('bad_json', 'Invalid JSON.')); }
      });
      req.on('error', reject);
    });
  }
  const clientIp = (req: IncomingMessage) =>
    (opts.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown';

  function tryAuth(req: IncomingMessage): Player | null {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const id = m ? verifyToken(secret, m[1]) : null;
    const p = id ? players.get(id) : undefined;
    if (p) p.lastSeen = now();
    return p ?? null;
  }
  function authed(req: IncomingMessage): Player {
    const p = tryAuth(req);
    if (!p) throw new RoomError('unauthorized', 'Please sign in again.', 401);
    return p;
  }
  const pub = (p: Player): Identity => ({ id: p.id, username: p.username, avatar: p.avatar });

  // ---------- routes ----------
  function openStream(req: IncomingMessage, res: ServerResponse) {
    const p = authed(req);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
    });
    res.write('retry: 2000\n\n');
    let set = streams.get(p.id);
    if (!set) { set = new Set(); streams.set(p.id, set); }
    while (set.size >= MAX_STREAMS_PER_PLAYER) { const oldest = set.values().next().value as ServerResponse; set.delete(oldest); oldest.end(); }
    set.add(res);
    write(res, 'hello', { player: pub(p), games: listGames(), room: viewOf(p.id), queue: manager.queueOf(p.id) });
    manager.setConnected(p.id, true);
    const heartbeat = setInterval(() => { try { res.write(':hb\n\n'); } catch { /* closed */ } }, 15_000);
    heartbeat.unref?.();
    const mine = set;
    req.on('close', () => {
      clearInterval(heartbeat);
      mine.delete(res);
      if (!mine.size && streams.get(p.id) === mine) { streams.delete(p.id); manager.setConnected(p.id, false); }
    });
  }

  async function route(req: IncomingMessage, res: ServerResponse) {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (path === '/api/health' && method === 'GET') return json(res, 200, { ok: true, rooms: manager.rooms.size, players: players.size });
    if (path === '/api/games' && method === 'GET') return json(res, 200, { games: listGames() });
    if (path === '/api/stream' && method === 'GET') return openStream(req, res);

    if (method !== 'POST') throw new RoomError('not_found', 'Not found.', 404);
    const ip = clientIp(req);
    if (!general.hit(ip)) throw new RoomError('rate_limited', 'Too many requests. Slow down.', 429);

    if (path === '/api/auth/guest') {
      if (!authLimit.hit(ip)) throw new RoomError('rate_limited', 'Too many sign-ins. Try again soon.', 429);
      const body = await readJson(req);
      const username = cleanName(body.username);
      const avatar = cleanAvatar(body.avatar);
      let p = tryAuth(req);
      if (p) { p.username = username; p.avatar = avatar; }
      else { p = { id: newPlayerId(), username, avatar, lastSeen: now() }; players.set(p.id, p); }
      manager.republish(p.id);
      scheduleSave();
      return json(res, 200, { token: signToken(secret, p.id), player: pub(p) });
    }

    const p = authed(req);
    const body = await readJson(req);
    const reply = (room: Room | null) => json(res, 200, { room: room ? publicRoom(room, lookup, p.id, view()) : null, queue: manager.queueOf(p.id) });
    switch (path) {
      case '/api/rooms': return reply(manager.createRoom(p.id, body.game));
      case '/api/rooms/join': return reply(manager.joinRoom(p.id, body.code));
      case '/api/rooms/leave': manager.leaveRoom(p.id); return reply(null);
      case '/api/rooms/start': return reply(manager.startGame(p.id));
      case '/api/rooms/move': return reply(manager.move(p.id, body.move));
      case '/api/rooms/resign': return reply(manager.resign(p.id));
      case '/api/rooms/rematch': return reply(manager.rematch(p.id));
      case '/api/queue/join': return reply(manager.queueJoin(p.id, body.game) ?? manager.roomOf(p.id));
      case '/api/queue/leave': manager.queueLeave(p.id); return reply(manager.roomOf(p.id));
      default: throw new RoomError('not_found', 'Not found.', 404);
    }
  }

  const server = createServer((req, res) => {
    cors(req, res);
    route(req, res).catch((err: unknown) => {
      if (res.headersSent) { res.end(); return; }
      if (err instanceof RoomError) return json(res, err.status, { error: { code: err.code, message: err.message } }, err.status === 413);
      console.error(err);
      json(res, 500, { error: { code: 'server_error', message: 'Something went wrong.' } });
    });
  });

  // ---------- housekeeping ----------
  const sweeper = setInterval(() => {
    manager.sweep();
    general.prune();
    authLimit.prune();
    const t = now();
    for (const [id, p] of players) {
      if (t - p.lastSeen > PLAYER_TTL_MS && !streams.has(id) && !manager.roomOf(id)) players.delete(id);
    }
  }, opts.sweepEveryMs ?? 5_000);
  sweeper.unref?.();

  return {
    server, manager, flush,
    listen: (port = 8787, host = '127.0.0.1') =>
      new Promise<number>((resolve) => server.listen(port, host, () => resolve((server.address() as AddressInfo).port))),
    async close() {
      closed = true;
      clearInterval(sweeper);
      if (saveTimer) clearTimeout(saveTimer);
      streams.forEach((set) => set.forEach((res) => res.end()));
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try { flush(); } catch { /* ignore */ }
    },
  };
}
