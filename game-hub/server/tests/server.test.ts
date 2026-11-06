import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, BIG_LIMITS, sleep, startServer, startedMatch } from './helpers';

async function withServer(fn: (s: Awaited<ReturnType<typeof startServer>>) => Promise<void>, opts = {}) {
  const s = await startServer(opts);
  try { await fn(s); } finally { await s.app.close(); }
}
const ok = (r: { status: number }) => assert.equal(r.status, 200, JSON.stringify(r));

test('sign-in issues a signed token; forged, foreign and missing tokens are rejected', () => withServer(async ({ base }) => {
  const a = await Client.create(base, 'Ann');
  ok(await a.post('/api/rooms', { game: 'tic-tac-toe' }));
  const forged = new Client(base, 'x'); forged.token = a.token.slice(0, -2) + (a.token.endsWith('AA') ? 'BB' : 'AA');
  assert.equal((await forged.post('/api/rooms', { game: 'tic-tac-toe' })).status, 401);
  const noToken = new Client(base, 'y');
  assert.equal((await noToken.post('/api/rooms', { game: 'tic-tac-toe' })).status, 401);
  await withServer(async (other) => {
    const foreign = new Client(other.base, 'z'); foreign.token = a.token; // signed by a different server secret
    assert.equal((await foreign.post('/api/rooms', { game: 'tic-tac-toe' })).status, 401);
  });
  const res = await fetch(base + '/api/stream');
  assert.equal(res.status, 401);
}));

test('names and avatars are sanitised; signing in again keeps the same player', () => withServer(async ({ base }) => {
  const c = new Client(base, 'c');
  const r = await c.post('/api/auth/guest', { username: '<b>Hi</b>\n  there ' + 'x'.repeat(40), avatar: '💥' }, false);
  assert.ok(!/[<>\n]/.test(r.body.player.username) && r.body.player.username.length <= 20, r.body.player.username);
  assert.equal(r.body.player.avatar, '🚀');
  assert.equal((await c.post('/api/auth/guest', { username: '   ' }, false)).body.player.username, 'Player');
  c.token = r.body.token;
  const again = await c.post('/api/auth/guest', { username: 'Zed', avatar: '🦊' });
  assert.equal(again.body.player.id, r.body.player.id);
  assert.equal(again.body.token, r.body.token);
  assert.equal(again.body.player.username, 'Zed');
}));

test('rooms: unique codes, join rules, host-only start, full rooms, unknown games and codes', () => withServer(async ({ base }) => {
  const a = await Client.create(base, 'Ann'); const b = await Client.create(base, 'Bob'); const c = await Client.create(base, 'Cy');
  const made = await a.post('/api/rooms', { game: 'tic-tac-toe' });
  ok(made);
  const code: string = made.body.room.code;
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(made.body.room.status, 'waiting');
  assert.equal(made.body.room.players.length, 1);
  assert.equal((await a.post('/api/rooms', { game: 'tic-tac-toe' })).body.error.code, 'already_in_room');
  assert.equal((await b.post('/api/rooms/join', { code: 'ZZZZZZ' })).body.error.code, 'room_not_found');
  assert.equal((await b.post('/api/rooms', { game: 'chess' })).body.error.code, 'unknown_game');
  assert.equal((await b.post('/api/rooms', { game: '__proto__' })).body.error.code, 'unknown_game');
  const joined = await b.post('/api/rooms/join', { code: ` ${code.toLowerCase()} ` });
  ok(joined);
  assert.equal(joined.body.room.players.length, 2);
  assert.equal(joined.body.room.you, 1);
  ok(await b.post('/api/rooms/join', { code })); // joining the same room twice is harmless
  assert.equal((await c.post('/api/rooms/join', { code })).body.error.code, 'room_full');
  assert.equal((await b.post('/api/rooms/start')).body.error.code, 'not_host');
  assert.equal((await a.post('/api/rooms/start')).body.error.code, 'opponent_offline'); // nobody is connected yet
  const solo = await c.post('/api/rooms', { game: 'tic-tac-toe' });
  assert.equal((await c.post('/api/rooms/start')).body.error.code, 'need_opponent');
  assert.notEqual(solo.body.room.code, code);
}));

test('200 rooms get 200 different codes', () => withServer(async ({ base }) => {
  const codes = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = await Client.create(base, `P${i}`);
    codes.add((await p.post('/api/rooms', { game: 'tic-tac-toe' })).body.room.code);
  }
  assert.equal(codes.size, 200);
}));

test('a full Tic-Tac-Toe game over the server keeps both players in sync', () => withServer(async ({ base }) => {
  const { a, b, started } = await startedMatch(base);
  const r = started.body.room;
  assert.equal(r.status, 'playing'); assert.equal(r.round, 1); assert.equal(r.turnSeat, 0); assert.equal(r.you, 0);
  assert.match(r.gameId, /^[A-Z2-9]{6}-1$/);
  const bStart = await b.room((x) => x.status === 'playing');
  assert.equal(bStart.you, 1);
  assert.deepEqual(bStart.players.map((p: any) => [p.username, p.avatar, p.connected]), [['Ann', '🦊', true], ['Bob', '🐼', true]]);

  // illegal moves are refused by the server, nothing changes
  assert.equal((await b.post('/api/rooms/move', { move: { cell: 0 } })).body.error.code, 'not_your_turn');
  for (const bad of [{ cell: 9 }, { cell: -1 }, { cell: 1.5 }, { cell: '4' }, { cell: null }, {}, null, 'x', [4]]) {
    const res = await a.post('/api/rooms/move', { move: bad });
    assert.equal(res.status, 422, JSON.stringify(bad)); assert.equal(res.body.error.code, 'bad_move');
  }
  ok(await a.post('/api/rooms/move', { move: { cell: 4 } }));
  const seen = await b.room((x) => x.state?.board?.[4] === 'X');
  assert.equal(seen.turnSeat, 1);
  assert.equal((await a.post('/api/rooms/move', { move: { cell: 0 } })).body.error.code, 'not_your_turn');
  assert.equal((await b.post('/api/rooms/move', { move: { cell: 4 } })).body.error.code, 'cell_taken');
  ok(await b.post('/api/rooms/move', { move: { cell: 0 } }));
  ok(await a.post('/api/rooms/move', { move: { cell: 2 } }));
  ok(await b.post('/api/rooms/move', { move: { cell: 1 } }));
  ok(await a.post('/api/rooms/move', { move: { cell: 6 } })); // X takes 2-4-6
  for (const c of [a, b]) {
    const done = await c.room((x) => x.status === 'finished');
    assert.deepEqual(done.result, { winnerSeat: 0, reason: 'win' });
    assert.equal(done.turnSeat, null);
    assert.deepEqual(done.state.board, ['O', 'O', 'X', null, 'X', null, 'X', null, null]);
  }
  assert.equal((await b.post('/api/rooms/move', { move: { cell: 3 } })).body.error.code, 'not_playing');
  a.close(); b.close();
}));

test('a drawn game is detected', () => withServer(async ({ base }) => {
  const { a, b } = await startedMatch(base);
  const order: [Client, number][] = [[a, 0], [b, 1], [a, 2], [b, 4], [a, 3], [b, 5], [a, 7], [b, 6], [a, 8]];
  for (const [who, cell] of order) ok(await who.post('/api/rooms/move', { move: { cell } }));
  const done = await a.room((x) => x.status === 'finished');
  assert.deepEqual(done.result, { winnerSeat: null, reason: 'draw' });
  a.close(); b.close();
}));

test('clients cannot inject state or skip the rules', () => withServer(async ({ base }) => {
  const { a, b } = await startedMatch(base);
  const res = await a.post('/api/rooms/move', { move: { cell: 3, state: { board: ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'], next: 0 } }, state: { next: 1 }, status: 'finished', result: { winnerSeat: 0 } });
  ok(res);
  assert.deepEqual(res.body.room.state.board, [null, null, null, 'X', null, null, null, null, null]);
  assert.equal(res.body.room.status, 'playing');
  assert.equal((await a.post('/api/rooms/move', { move: { cell: 5 } })).body.error.code, 'not_your_turn');
  a.close(); b.close();
}));

test('rematch swaps seats and gives a new unique game id', () => withServer(async ({ base }) => {
  const { a, b, code } = await startedMatch(base);
  const ids = new Set<string>([`${code}-1`]);
  for (const [who, cell] of [[a, 4], [b, 0], [a, 2], [b, 1], [a, 6]] as [Client, number][]) ok(await who.post('/api/rooms/move', { move: { cell } }));
  assert.equal((await b.post('/api/rooms/start')).body.error.code, 'not_host');
  const second = await a.post('/api/rooms/start');
  ok(second);
  assert.equal(second.body.room.round, 2); assert.equal(second.body.room.you, 1); assert.equal(second.body.room.turnSeat, 0);
  ids.add(second.body.room.gameId);
  assert.equal(ids.size, 2);
  const bNow = await b.room((x) => x.round === 2 && x.status === 'playing');
  assert.equal(bNow.you, 0);
  ok(await b.post('/api/rooms/move', { move: { cell: 4 } })); // Bob starts the second game
  assert.equal((await a.post('/api/rooms/move', { move: { cell: 0 } })).status, 200);
  a.close(); b.close();
}));

test('leaving or resigning mid-game forfeits; the host passes to the other player; empty rooms vanish', () => withServer(async ({ base }) => {
  const { a, b } = await startedMatch(base);
  const left = await b.post('/api/rooms/leave');
  ok(left); assert.equal(left.body.room, null);
  const aView = await a.room((x) => x.status === 'finished');
  assert.deepEqual(aView.result, { winnerSeat: 0, reason: 'left' });
  assert.equal(aView.players.length, 1);
  await b.until((e) => e.event === 'room' && e.data === null);
  ok(await a.post('/api/rooms/leave'));
  assert.equal(((await (await fetch(base + '/api/health')).json()) as { rooms: number }).rooms, 0); // last player gone: room removed

  const m2 = await startedMatch(base);
  ok(await m2.b.post('/api/rooms/resign'));
  const done = await m2.a.room((x) => x.status === 'finished');
  assert.deepEqual(done.result, { winnerSeat: 0, reason: 'resigned' });
  // host leaves a finished room: the other player becomes host and can wait for a new opponent
  ok(await m2.a.post('/api/rooms/leave'));
  const bView = await m2.b.room((x) => x.players.length === 1);
  assert.equal(bView.hostId, m2.b.id);
  for (const c of [a, b, m2.a, m2.b]) c.close();
}));

test('outsiders cannot move in, see or end somebody else\'s game', () => withServer(async ({ base }) => {
  const { a, b, code } = await startedMatch(base);
  const c = await Client.create(base, 'Cy'); await c.open();
  assert.equal((await c.post('/api/rooms/move', { move: { cell: 1 } })).body.error.code, 'not_in_room');
  assert.equal((await c.post('/api/rooms/resign')).body.error.code, 'not_in_room');
  assert.equal((await c.post('/api/rooms/start')).body.error.code, 'not_in_room');
  assert.equal((await c.post('/api/rooms/join', { code })).body.error.code, 'room_full');
  assert.equal(c.events.find((e) => e.event === 'hello')!.data.room, null);
  ok(await c.post('/api/rooms/leave')); // leaving when in no room is harmless
  assert.equal((await a.post('/api/rooms/move', { move: { cell: 4 } })).status, 200);
  a.close(); b.close(); c.close();
}));

test('bad requests: oversized body, broken JSON, unknown routes, wrong method', () => withServer(async ({ base }) => {
  const a = await Client.create(base, 'Ann');
  const big = await a.post('/api/rooms', { game: 'tic-tac-toe', junk: 'x'.repeat(10000) });
  assert.equal(big.status, 413);
  const raw = await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.token}` }, body: '{oops' });
  assert.equal(raw.status, 400);
  const arr = await fetch(base + '/api/rooms', { method: 'POST', headers: { Authorization: `Bearer ${a.token}` }, body: '[1]' });
  assert.equal(arr.status, 400);
  assert.equal((await a.post('/api/nope')).status, 404);
  assert.equal((await fetch(base + '/api/rooms')).status, 404);
  ok(await a.post('/api/rooms', { game: 'tic-tac-toe' })); // the server is still healthy afterwards
}));

test('disconnects: the opponent sees it and a quick reconnect is forgiven', () => withServer(async ({ base, app }) => {
  const { a, b } = await startedMatch(base);
  b.close();
  const view = await a.room((x) => x.players.some((p: any) => !p.connected));
  assert.equal(view.players.find((p: any) => p.id === b.id).connected, false);
  app.manager.sweep(); // still inside the grace period: nothing happens
  assert.equal(app.manager.roomOf(a.id)!.status, 'playing');
  await b.open();
  await a.room((x) => x.players.every((p: any) => p.connected));
  assert.equal(app.manager.roomOf(a.id)!.status, 'playing');
  a.close(); b.close();
}, { graceMs: 60_000 }));

test('a player who stays offline past the grace period loses; both offline is a draw', async () => {
  let t = 5_000_000;
  const s = await startServer({ now: () => t, graceMs: 30_000 });
  try {
    const { a, b } = await startedMatch(s.base);
    b.close();
    await a.room((x) => x.players.some((p: any) => !p.connected));
    t += 29_000; s.app.manager.sweep();
    assert.equal(s.app.manager.roomOf(a.id)!.status, 'playing');
    t += 2_000; s.app.manager.sweep();
    const done = await a.room((x) => x.status === 'finished');
    assert.deepEqual(done.result, { winnerSeat: 0, reason: 'disconnected' });
    a.close();

    const m = await startedMatch(s.base);
    m.a.close(); m.b.close();
    await sleep(80);
    t += 31_000; s.app.manager.sweep();
    assert.deepEqual(s.app.manager.roomOf(m.a.id)!.result, { winnerSeat: null, reason: 'disconnected' });
  } finally { await s.app.close(); }
});

test('matchmaking pairs two searching players into a running game; searching can be cancelled', () => withServer(async ({ base }) => {
  const a = await Client.create(base, 'Ann'); const b = await Client.create(base, 'Bob'); const c = await Client.create(base, 'Cy');
  for (const p of [a, b, c]) await p.open();
  const first = await a.post('/api/queue/join', { game: 'tic-tac-toe' });
  ok(first); assert.equal(first.body.room, null); assert.equal(first.body.queue, 'tic-tac-toe');
  await a.until((e) => e.event === 'queue' && e.data.game === 'tic-tac-toe');
  ok(await a.post('/api/queue/join', { game: 'tic-tac-toe' })); // same request twice: still one entry
  const second = await b.post('/api/queue/join', { game: 'tic-tac-toe' });
  ok(second);
  assert.equal(second.body.room.status, 'playing'); assert.equal(second.body.room.round, 1);
  assert.deepEqual([second.body.room.you, second.body.room.players.length], [1, 2]);
  const aRoom = await a.room((x) => x.status === 'playing');
  assert.equal(aRoom.you, 0); assert.equal(aRoom.code, second.body.room.code);
  await a.until((e) => e.event === 'queue' && e.data.game === null);
  assert.equal((await a.post('/api/queue/join', { game: 'tic-tac-toe' })).body.error.code, 'already_in_room');
  ok(await a.post('/api/rooms/move', { move: { cell: 4 } }));
  await b.room((x) => x.state?.board?.[4] === 'X');
  // cancelling
  ok(await c.post('/api/queue/join', { game: 'tic-tac-toe' }));
  const cancel = await c.post('/api/queue/leave');
  ok(cancel); assert.equal(cancel.body.queue, null);
  await c.until((e) => e.event === 'queue' && e.data.game === null);
  assert.equal((await c.post('/api/queue/join', { game: 'bogus' })).body.error.code, 'unknown_game');
  for (const p of [a, b, c]) p.close();
}));

test('matchmaking never pairs you with somebody who went offline', () => withServer(async ({ base }) => {
  const a = await Client.create(base, 'Ann'); const b = await Client.create(base, 'Bob');
  await a.open(); await b.open();
  ok(await a.post('/api/queue/join', { game: 'tic-tac-toe' }));
  a.close();
  await sleep(120); // server notices the closed stream and drops the search
  const res = await b.post('/api/queue/join', { game: 'tic-tac-toe' });
  ok(res); assert.equal(res.body.room, null); assert.equal(res.body.queue, 'tic-tac-toe');
  b.close();
}));

test('cleanup removes idle, finished and abandoned rooms', async () => {
  let t = 9_000_000;
  const s = await startServer({ now: () => t, idleMs: 10 * 60_000, finishedMs: 15 * 60_000, waitingMs: 30 * 60_000 });
  try {
    const lone = await Client.create(s.base, 'Lone');
    const code = (await lone.post('/api/rooms', { game: 'tic-tac-toe' })).body.room.code;
    t += 9 * 60_000; s.app.manager.sweep();
    assert.ok(s.app.manager.rooms.has(code));
    t += 2 * 60_000; s.app.manager.sweep(); // nobody connected for over 10 minutes
    assert.ok(!s.app.manager.rooms.has(code));
    assert.equal((await lone.post('/api/rooms/join', { code })).body.error.code, 'room_not_found');
    ok(await lone.post('/api/rooms', { game: 'tic-tac-toe' })); // free to create again

    const { a, b, code: c2 } = await startedMatch(s.base);
    for (const [who, cell] of [[a, 4], [b, 0], [a, 2], [b, 1], [a, 6]] as [Client, number][]) ok(await who.post('/api/rooms/move', { move: { cell } }));
    t += 16 * 60_000; s.app.manager.sweep(); // finished and old, even though both are connected
    assert.ok(!s.app.manager.rooms.has(c2));
    await a.until((e) => e.event === 'room' && e.data === null);
    a.close(); b.close();

    const w = await Client.create(s.base, 'Waiter'); await w.open();
    const code3 = (await w.post('/api/rooms', { game: 'tic-tac-toe' })).body.room.code;
    t += 31 * 60_000; s.app.manager.sweep();
    assert.ok(!s.app.manager.rooms.has(code3));
    w.close();
  } finally { await s.app.close(); }
});

test('rooms, players and tokens survive a server restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bek-'));
  try {
    const s1 = await startServer({ dataDir: dir });
    const { a, b, code } = await startedMatch(s1.base);
    ok(await a.post('/api/rooms/move', { move: { cell: 4 } }));
    const tokenA = a.token, tokenB = b.token;
    a.close(); b.close();
    await s1.app.close();
    assert.ok(existsSync(join(dir, 'state.json')) && existsSync(join(dir, 'secret.key')));
    assert.ok(!readFileSync(join(dir, 'state.json'), 'utf8').includes(readFileSync(join(dir, 'secret.key'), 'utf8').trim()), 'secret must not be in the snapshot');

    const s2 = await startServer({ dataDir: dir });
    const a2 = new Client(s2.base, 'Ann'); a2.token = tokenA; a2.id = a.id;
    const b2 = new Client(s2.base, 'Bob'); b2.token = tokenB; b2.id = b.id;
    await a2.open();
    const hello = a2.events.find((e) => e.event === 'hello')!.data;
    assert.equal(hello.room.code, code); assert.equal(hello.room.state.board[4], 'X'); assert.equal(hello.room.turnSeat, 1);
    assert.equal(hello.room.players.find((p: any) => p.id === b.id).connected, false);
    await b2.open();
    ok(await b2.post('/api/rooms/move', { move: { cell: 0 } })); // the game continues
    assert.equal((await a2.room((x) => x.state?.board?.[0] === 'O')).turnSeat, 0);
    a2.close(); b2.close();
    await s2.app.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('rate limiting answers 429 instead of melting down', () => withServer(async ({ base }) => {
  const codes: number[] = [];
  for (let i = 0; i < 6; i++) codes.push((await new Client(base, 'x').post('/api/auth/guest', { username: 'x' }, false)).status);
  assert.deepEqual(codes, [200, 200, 200, 429, 429, 429]);
}, { rateLimit: { general: 100, auth: 3 } }));

test('CORS: only allowed origins are echoed; preflight works; health is open', async () => {
  const s = await startServer({ allowedOrigins: ['https://bekgames.example'] });
  try {
    const good = await fetch(s.base + '/api/health', { headers: { Origin: 'https://bekgames.example' } });
    assert.equal(good.headers.get('access-control-allow-origin'), 'https://bekgames.example');
    const bad = await fetch(s.base + '/api/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
    const pre = await fetch(s.base + '/api/rooms', { method: 'OPTIONS', headers: { Origin: 'https://bekgames.example' } });
    assert.equal(pre.status, 204);
    assert.deepEqual(await good.json(), { ok: true, rooms: 0, players: 0 });
  } finally { await s.app.close(); }
});

const winSequence = (a: Client, b: Client): [Client, number][] => [[a, 4], [b, 0], [a, 2], [b, 1], [a, 6]];

test('the winning line and a growing version number are part of the server state', () => withServer(async ({ base }) => {
  const { a, b } = await startedMatch(base);
  let last = a.lastRoom().version;
  for (const [who, cell] of winSequence(a, b)) {
    const r = await who.post('/api/rooms/move', { move: { cell } });
    ok(r);
    assert.ok(r.body.room.version > last, 'version must grow'); last = r.body.room.version;
  }
  const done = await b.room((x) => x.status === 'finished');
  assert.deepEqual(done.state.line, [2, 4, 6]);
  const versions = a.events.filter((e) => e.event === 'room' && e.data).map((e) => e.data.version);
  assert.deepEqual(versions, [...versions].sort((x, y) => x - y)); // pushes arrive in order
  a.close(); b.close();
}));

test('rematch needs both players, then swaps seats with a new game id', () => withServer(async ({ base }) => {
  const { a, b, code } = await startedMatch(base);
  assert.equal((await a.post('/api/rooms/rematch')).body.error.code, 'not_finished');
  for (const [who, cell] of winSequence(a, b)) ok(await who.post('/api/rooms/move', { move: { cell } }));
  const first = await b.post('/api/rooms/rematch'); // the guest asks first: no host needed
  ok(first); assert.equal(first.body.room.status, 'finished'); assert.deepEqual(first.body.room.rematch, [b.id]);
  assert.deepEqual((await a.room((x) => x.rematch.length === 1)).rematch, [b.id]); // Ann sees the request
  ok(await b.post('/api/rooms/rematch')); // asking twice changes nothing
  assert.equal(a.lastRoom().status, 'finished');
  const second = await a.post('/api/rooms/rematch');
  ok(second);
  assert.equal(second.body.room.status, 'playing'); assert.equal(second.body.room.round, 2);
  assert.equal(second.body.room.gameId, `${code}-2`); assert.deepEqual(second.body.room.rematch, []);
  assert.equal(second.body.room.you, 1); assert.equal(second.body.room.turnSeat, 0);
  assert.equal((await b.room((x) => x.round === 2 && x.status === 'playing')).you, 0);
  assert.deepEqual(second.body.room.state.board, Array(9).fill(null));
  a.close(); b.close();
}));

test('rematch is refused when the opponent left or is offline', () => withServer(async ({ base }) => {
  const m = await startedMatch(base);
  for (const [who, cell] of winSequence(m.a, m.b)) ok(await who.post('/api/rooms/move', { move: { cell } }));
  ok(await m.a.post('/api/rooms/rematch'));
  m.b.close();
  await m.a.room((x) => x.players.some((p: any) => !p.connected));
  assert.equal((await m.b.post('/api/rooms/rematch')).body.error.code, 'opponent_offline');
  await m.b.open();
  ok(await m.b.post('/api/rooms/leave'));
  assert.equal((await m.a.post('/api/rooms/rematch')).body.error.code, 'need_opponent');
  assert.deepEqual((await m.a.room((x) => x.players.length === 1)).rematch, []); // the leaver's request is gone
  m.a.close(); m.b.close();
}));

test('the opponent sees how long a player has been offline, and the countdown limit', async () => {
  let t = 7_000_000;
  const s = await startServer({ now: () => t, graceMs: 30_000 });
  try {
    const { a, b } = await startedMatch(s.base);
    b.close();
    const dropped = await a.room((x) => x.players.some((p: any) => !p.connected));
    assert.equal(dropped.graceMs, 30_000);
    assert.equal(dropped.players.find((p: any) => p.id === b.id).offlineForMs, 0);
    t += 12_000;
    ok(await a.post('/api/rooms/move', { move: { cell: 4 } })); // any push carries the fresh offline time
    const pushed = await a.room((x) => x.state?.board?.[4] === 'X');
    assert.equal(pushed.players.find((p: any) => p.id === b.id).offlineForMs, 12_000);
    assert.equal(pushed.players.find((p: any) => p.id === a.id).offlineForMs, null);
    await b.open(); // comes back in time: the game goes on and the timer is gone
    const back = await a.room((x) => x.state?.board?.[4] === 'X' && x.players.every((p: any) => p.connected));
    assert.equal(back.status, 'playing'); assert.equal(back.players.find((p: any) => p.id === b.id).offlineForMs, null);
    assert.equal([...b.events].reverse().find((e) => e.event === 'hello')!.data.room.state.board[4], 'X'); // and sees the current board
    a.close(); b.close();
  } finally { await s.app.close(); }
});
