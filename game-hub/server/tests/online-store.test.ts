import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOnlineStore, type KeyValue, type OnlineState, type OnlineStore } from '../../src/online/store';
import { startServer } from './helpers';

const memory = (): KeyValue => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const make = (base: string, name: string, storage = memory()) =>
  ({ storage, store: createOnlineStore({ baseUrl: base, storage, profile: () => ({ username: name, avatar: '🦊' }), retryMs: [30, 60] }) });

function waitFor(store: OnlineStore, pred: (s: OnlineState) => boolean, ms = 3000): Promise<OnlineState> {
  return new Promise((resolve, reject) => {
    let off = () => {};
    const timer = setTimeout(() => { off(); reject(new Error('timeout, state: ' + JSON.stringify(store.getState()))); }, ms);
    const check = () => { if (pred(store.getState())) { off(); clearTimeout(timer); resolve(store.getState()); } };
    off = store.subscribe(check);
    check();
  });
}

test('two app clients: create, join, start and play a whole game, staying in sync', async () => {
  const s = await startServer();
  const A = make(s.base, 'Ann'), B = make(s.base, 'Bob');
  try {
    A.store.connect(); B.store.connect();
    await Promise.all([waitFor(A.store, (x) => x.connection === 'online'), waitFor(B.store, (x) => x.connection === 'online')]);
    assert.deepEqual(A.store.getState().games, [{ kind: 'tic-tac-toe', title: 'Tic-Tac-Toe' }]);
    assert.equal(A.store.getState().me?.username, 'Ann');

    await A.store.createRoom('tic-tac-toe');
    const code = A.store.getState().room!.code;
    await B.store.joinRoom(code.toLowerCase());
    await waitFor(A.store, (x) => x.room?.players.length === 2);
    await A.store.startGame();
    const b0 = await waitFor(B.store, (x) => x.room?.status === 'playing');
    assert.equal(b0.room!.you, 1);

    // an illegal move shows an error message and changes nothing
    await B.store.move({ cell: 0 });
    assert.equal(B.store.getState().error, 'It is not your turn.');
    assert.deepEqual((A.store.getState().room!.state as any).board, Array(9).fill(null));

    for (const [who, cell] of [[A, 4], [B, 0], [A, 2], [B, 1], [A, 6]] as const) {
      await who.store.move({ cell });
      const other = who === A ? B : A;
      await waitFor(other.store, (x) => (x.room?.state as any)?.board?.[cell] !== null && (x.room?.state as any)?.board?.[cell] !== undefined);
    }
    const doneB = await waitFor(B.store, (x) => x.room?.status === 'finished');
    assert.deepEqual(doneB.room!.result, { winnerSeat: 0, reason: 'win' });
    assert.equal((await waitFor(A.store, (x) => x.room?.status === 'finished')).room!.gameId, doneB.room!.gameId);

    await B.store.leaveRoom();
    assert.equal(B.store.getState().room, null);
    await waitFor(A.store, (x) => x.room?.players.length === 1);
  } finally { A.store.disconnect(); B.store.disconnect(); await s.app.close(); }
});

test('matchmaking from the app: search, get paired, cancel', async () => {
  const s = await startServer();
  const A = make(s.base, 'Ann'), B = make(s.base, 'Bob'), C = make(s.base, 'Cy');
  try {
    for (const p of [A, B, C]) { p.store.connect(); await waitFor(p.store, (x) => x.connection === 'online'); }
    await A.store.queueJoin('tic-tac-toe');
    assert.equal(A.store.getState().queue, 'tic-tac-toe');
    await B.store.queueJoin('tic-tac-toe');
    assert.equal(B.store.getState().room?.status, 'playing');
    const a = await waitFor(A.store, (x) => x.room?.status === 'playing' && x.queue === null);
    assert.equal(a.room!.you, 0);
    await C.store.queueJoin('tic-tac-toe');
    await C.store.queueLeave();
    assert.equal(C.store.getState().queue, null);
  } finally { [A, B, C].forEach((p) => p.store.disconnect()); await s.app.close(); }
});

test('identity is kept across app restarts and the server going away and coming back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bek-'));
  let s = await startServer({ dataDir: dir });
  const port = s.port;
  const A = make(s.base, 'Ann');
  try {
    A.store.connect();
    await waitFor(A.store, (x) => x.connection === 'online');
    const id = A.store.getState().me!.id;
    await A.store.createRoom('tic-tac-toe');
    const code = A.store.getState().room!.code;

    // server goes down: the app shows "offline", then recovers by itself
    await s.app.close();
    await waitFor(A.store, (x) => x.connection === 'offline');
    s = { ...(await (async () => { const { createApp } = await import('../app'); const app = createApp({ dataDir: dir, sweepEveryMs: 1e9 }); await app.listen(port, '127.0.0.1'); return { app, port, base: s.base }; })()) };
    const back = await waitFor(A.store, (x) => x.connection === 'online');
    assert.equal(back.me!.id, id);
    assert.equal(back.room!.code, code);

    // a brand new app instance with the same saved token is the same player
    const A2 = make(s.base, 'Ann', A.storage);
    A2.store.connect();
    const again = await waitFor(A2.store, (x) => x.connection === 'online');
    assert.equal(again.me!.id, id);
    assert.equal(again.room!.code, code);
    A2.store.disconnect();
  } finally { A.store.disconnect(); await s.app.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('an expired identity is replaced automatically', async () => {
  let s = await startServer();
  const A = make(s.base, 'Ann');
  try {
    A.store.connect();
    await waitFor(A.store, (x) => x.connection === 'online');
    const oldId = A.store.getState().me!.id;
    const port = s.port;
    await s.app.close(); // a new server without saved data does not know the old token
    const { createApp } = await import('../app');
    const app = createApp({ sweepEveryMs: 1e9 });
    await app.listen(port, '127.0.0.1');
    s = { ...s, app };
    const fresh = await waitFor(A.store, (x) => x.connection === 'online' && x.me !== null && x.me.id !== oldId);
    assert.equal(fresh.me!.username, 'Ann');
  } finally { A.store.disconnect(); await s.app.close(); }
});

test('the app reports a clear error when the server cannot be reached', async () => {
  const A = make('http://127.0.0.1:1', 'Ann');
  try {
    A.store.connect();
    await waitFor(A.store, (x) => x.connection === 'offline');
    await A.store.createRoom('tic-tac-toe');
    assert.equal(A.store.getState().error, 'Cannot reach the server.');
  } finally { A.store.disconnect(); }
});

import { newerRoom } from '../../src/online/store';

test('a late, older room update never rolls the screen back', () => {
  const room = (version: number, code = 'ABC234') => ({ code, version } as any);
  assert.equal(newerRoom(room(5), room(4)).version, 5); // stale reply ignored
  assert.equal(newerRoom(room(5), room(6)).version, 6);
  assert.equal(newerRoom(room(5), room(5)).version, 5);
  assert.equal(newerRoom(room(5), room(1, 'ZZZ999')).code, 'ZZZ999'); // another room: always accepted
  assert.equal(newerRoom(room(5), null), null);
  assert.equal(newerRoom(null, room(2)).version, 2);
});

test('both app clients end every game with the same result, then rematch together', async () => {
  const s = await startServer();
  const A = make(s.base, 'Ann'), B = make(s.base, 'Bob');
  try {
    A.store.connect(); B.store.connect();
    await Promise.all([waitFor(A.store, (x) => x.connection === 'online'), waitFor(B.store, (x) => x.connection === 'online')]);
    await A.store.createRoom('tic-tac-toe');
    await B.store.joinRoom(A.store.getState().room!.code);
    await waitFor(A.store, (x) => x.room?.players.length === 2);
    await A.store.startGame();
    await waitFor(B.store, (x) => x.room?.status === 'playing');
    for (const [who, cell] of [[A, 0], [B, 4], [A, 1], [B, 3], [A, 5], [B, 2], [A, 6], [B, 7], [A, 8]] as const) await who.store.move({ cell }); // draw
    const [a, b] = await Promise.all([waitFor(A.store, (x) => x.room?.status === 'finished'), waitFor(B.store, (x) => x.room?.status === 'finished')]);
    const strip = (r: any) => ({ ...r, you: null });
    assert.deepEqual(strip(a.room), strip(b.room)); // same board, result, round and ids on both screens
    assert.deepEqual(a.room!.result, { winnerSeat: null, reason: 'draw' });

    await B.store.rematch(); // guest asks first
    await waitFor(A.store, (x) => x.room?.rematch.length === 1);
    assert.equal(A.store.getState().room!.status, 'finished');
    await A.store.rematch();
    const [a2, b2] = await Promise.all([waitFor(A.store, (x) => x.room?.round === 2 && x.room.status === 'playing'), waitFor(B.store, (x) => x.room?.round === 2 && x.room.status === 'playing')]);
    assert.deepEqual([a2.room!.you, b2.room!.you], [1, 0]); // seats swapped
    assert.notEqual(a2.room!.gameId, a.room!.gameId);
    assert.deepEqual(strip(a2.room), strip(b2.room));
  } finally { A.store.disconnect(); B.store.disconnect(); await s.app.close(); }
});

test('a player who drops and reconnects keeps the game; the opponent sees both changes', async () => {
  const s = await startServer({ graceMs: 60_000 });
  const A = make(s.base, 'Ann'), B = make(s.base, 'Bob');
  try {
    A.store.connect(); B.store.connect();
    await Promise.all([waitFor(A.store, (x) => x.connection === 'online'), waitFor(B.store, (x) => x.connection === 'online')]);
    await A.store.createRoom('tic-tac-toe');
    await B.store.joinRoom(A.store.getState().room!.code);
    await waitFor(A.store, (x) => x.room?.players.length === 2);
    await A.store.startGame();
    await A.store.move({ cell: 4 });
    await waitFor(B.store, (x) => (x.room?.state as any)?.board?.[4] === 'X');

    B.store.disconnect(); // Bob's connection drops
    const dropped = await waitFor(A.store, (x) => x.room?.players.some((p) => !p.connected) === true);
    assert.equal(dropped.room!.status, 'playing');
    assert.equal(typeof dropped.room!.players.find((p) => !p.connected)!.offlineForMs, 'number');
    assert.ok(dropped.roomAt > 0);

    B.store.connect(); // and comes back: same room, same board, his move
    const back = await waitFor(B.store, (x) => x.connection === 'online' && (x.room?.state as any)?.board?.[4] === 'X');
    assert.equal(back.room!.you, 1);
    await waitFor(A.store, (x) => x.room?.players.every((p) => p.connected) === true && x.room.state !== null);
    await B.store.move({ cell: 0 });
    await waitFor(A.store, (x) => (x.room?.state as any)?.board?.[0] === 'O');
  } finally { A.store.disconnect(); B.store.disconnect(); await s.app.close(); }
});
