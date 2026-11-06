import { randomInt } from 'node:crypto';
import { rulesFor } from './games';
import type { FinishReason, Seat } from '../src/online/types';

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export interface RoomPlayer { id: string; seat: Seat; connected: boolean; lastSeen: number }
export interface Room {
  code: string;
  game: string;
  hostId: string;
  status: RoomStatus;
  round: number;
  gameId: string;
  players: RoomPlayer[];
  state: unknown;
  turnSeat: Seat | null;
  result: { winnerSeat: Seat | null; reason: FinishReason } | null;
  createdAt: number;
  updatedAt: number;
  matchmade: boolean;
  /** Increases on every publish; lets clients drop out-of-order updates. */
  version: number;
  /** Players who asked for a rematch. */
  rematchBy: string[];
}

export class RoomError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export type ManagerEvent =
  | { type: 'room'; room: Room; to: string[] }
  | { type: 'noroom'; to: string[] }
  | { type: 'queue'; to: string[]; game: string | null };

export interface ManagerOptions {
  now?: () => number;
  /** How long a player may be offline during a game before they forfeit. */
  graceMs?: number;
  /** Rooms nobody is connected to are removed after this. */
  idleMs?: number;
  /** Finished rooms are removed after this. */
  finishedMs?: number;
  /** Rooms still waiting for a game are removed after this. */
  waitingMs?: number;
  emit?: (e: ManagerEvent) => void;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid typos
export const CODE_LENGTH = 6;
export const normalizeCode = (raw: unknown) => (typeof raw === 'string' ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : '');

const MESSAGES: Record<string, string> = {
  not_your_turn: 'It is not your turn.',
  cell_taken: 'That square is already taken.',
  bad_move: 'That move is not valid.',
  game_over: 'The game is already over.',
};

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private byPlayer = new Map<string, string>();
  private online = new Set<string>();
  private queue: { playerId: string; game: string }[] = [];
  private now: () => number;
  readonly graceMs: number;
  private idleMs: number;
  private finishedMs: number;
  private waitingMs: number;
  private emit: (e: ManagerEvent) => void;

  constructor(o: ManagerOptions = {}) {
    this.now = o.now ?? Date.now;
    this.graceMs = o.graceMs ?? 30_000;
    this.idleMs = o.idleMs ?? 10 * 60_000;
    this.finishedMs = o.finishedMs ?? 15 * 60_000;
    this.waitingMs = o.waitingMs ?? 30 * 60_000;
    this.emit = o.emit ?? (() => undefined);
  }

  roomOf(playerId: string): Room | null {
    const code = this.byPlayer.get(playerId);
    return code ? this.rooms.get(code) ?? null : null;
  }
  queueOf(playerId: string): string | null { return this.queue.find((q) => q.playerId === playerId)?.game ?? null; }

  // ---------- rooms ----------
  createRoom(playerId: string, game: unknown): Room {
    if (!rulesFor(game)) throw new RoomError('unknown_game', 'Unknown game.');
    this.requireFree(playerId);
    this.queueLeave(playerId);
    const t = this.now();
    const room: Room = {
      code: this.uniqueCode(), game: game as string, hostId: playerId, status: 'waiting', round: 0, gameId: '',
      players: [this.seatPlayer(playerId, 0)], state: null, turnSeat: null, result: null, createdAt: t, updatedAt: t, matchmade: false,
      version: 0, rematchBy: [],
    };
    this.rooms.set(room.code, room);
    this.byPlayer.set(playerId, room.code);
    this.publish(room);
    return room;
  }

  joinRoom(playerId: string, rawCode: unknown): Room {
    const code = normalizeCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) throw new RoomError('room_not_found', 'Room not found. Check the code.', 404);
    if (this.byPlayer.get(playerId) === code) return room;
    this.requireFree(playerId);
    if (room.players.length >= 2) throw new RoomError('room_full', 'This room is full.', 409);
    this.queueLeave(playerId);
    room.players.push(this.seatPlayer(playerId, room.players.some((p) => p.seat === 0) ? 1 : 0));
    this.byPlayer.set(playerId, code);
    if (room.status === 'finished') { room.status = 'waiting'; room.state = null; room.result = null; room.turnSeat = null; room.rematchBy = []; }
    this.touch(room);
    this.publish(room);
    return room;
  }

  leaveRoom(playerId: string): void {
    const room = this.roomOf(playerId);
    if (!room) return;
    if (room.status === 'playing') {
      const other = room.players.find((p) => p.id !== playerId);
      this.finish(room, other ? other.seat : null, 'left');
    }
    room.players = room.players.filter((p) => p.id !== playerId);
    room.rematchBy = room.rematchBy.filter((id) => id !== playerId);
    this.byPlayer.delete(playerId);
    this.emit({ type: 'noroom', to: [playerId] });
    if (!room.players.length) { this.rooms.delete(room.code); return; }
    if (room.hostId === playerId) room.hostId = room.players[0].id;
    this.touch(room);
    this.publish(room);
  }

  startGame(playerId: string): Room {
    const room = this.mustRoom(playerId);
    if (room.hostId !== playerId) throw new RoomError('not_host', 'Only the host can start the game.', 403);
    if (room.status === 'playing') throw new RoomError('already_playing', 'The game is already running.', 409);
    if (room.players.length < 2) throw new RoomError('need_opponent', 'Wait for a second player.', 409);
    if (room.players.some((p) => !p.connected)) throw new RoomError('opponent_offline', 'A player is offline.', 409);
    this.begin(room);
    return room;
  }

  move(playerId: string, move: unknown): Room {
    const room = this.mustRoom(playerId);
    if (room.status !== 'playing') throw new RoomError('not_playing', 'No game is running.', 409);
    const me = room.players.find((p) => p.id === playerId)!;
    const rules = rulesFor(room.game)!;
    const res = rules.apply(room.state, me.seat, move);
    if ('error' in res) throw new RoomError(res.error, MESSAGES[res.error] ?? 'Illegal move.', 422);
    room.state = res.state;
    const out = rules.outcome(room.state);
    if (out) this.finish(room, out.winnerSeat, out.reason);
    else room.turnSeat = rules.turn(room.state);
    this.touch(room);
    this.publish(room);
    return room;
  }

  /** After a game both players can agree to play again. The game starts once both have asked. */
  rematch(playerId: string): Room {
    const room = this.mustRoom(playerId);
    if (room.status !== 'finished') throw new RoomError('not_finished', 'The game is not finished yet.', 409);
    if (room.players.length < 2) throw new RoomError('need_opponent', 'Your opponent left the room.', 409);
    if (!room.rematchBy.includes(playerId)) room.rematchBy.push(playerId);
    if (room.players.every((p) => room.rematchBy.includes(p.id))) {
      if (room.players.some((p) => !p.connected)) throw new RoomError('opponent_offline', 'Your opponent is offline.', 409);
      this.begin(room);
    } else {
      this.touch(room);
      this.publish(room);
    }
    return room;
  }

  resign(playerId: string): Room {
    const room = this.mustRoom(playerId);
    if (room.status !== 'playing') throw new RoomError('not_playing', 'No game is running.', 409);
    const other = room.players.find((p) => p.id !== playerId);
    this.finish(room, other ? other.seat : null, 'resigned');
    this.publish(room);
    return room;
  }

  // ---------- presence ----------
  setConnected(playerId: string, connected: boolean): void {
    if (connected) this.online.add(playerId);
    else { this.online.delete(playerId); this.queueLeave(playerId); }
    const room = this.roomOf(playerId);
    const p = room?.players.find((x) => x.id === playerId);
    if (!room || !p || p.connected === connected) return;
    p.connected = connected;
    p.lastSeen = this.now();
    this.touch(room);
    this.publish(room);
  }

  /** Sends the current room to its players again (e.g. after a profile change). */
  republish(playerId: string): void {
    const room = this.roomOf(playerId);
    if (room) this.publish(room);
  }

  // ---------- matchmaking ----------
  queueJoin(playerId: string, game: unknown): Room | null {
    if (!rulesFor(game)) throw new RoomError('unknown_game', 'Unknown game.');
    this.requireFree(playerId);
    if (this.queueOf(playerId) === game) return null;
    this.queueLeave(playerId, false);
    const i = this.queue.findIndex((q) => q.game === game && q.playerId !== playerId && this.online.has(q.playerId));
    if (i >= 0) {
      const [partner] = this.queue.splice(i, 1);
      return this.matchmake(partner.playerId, playerId, game as string);
    }
    this.queue.push({ playerId, game: game as string });
    this.emit({ type: 'queue', to: [playerId], game: game as string });
    return null;
  }

  queueLeave(playerId: string, notify = true): void {
    const before = this.queue.length;
    this.queue = this.queue.filter((q) => q.playerId !== playerId);
    if (notify && this.queue.length !== before) this.emit({ type: 'queue', to: [playerId], game: null });
  }

  // ---------- cleanup ----------
  /** Forfeits players who stayed offline too long and removes dead rooms. Call it regularly. */
  sweep(): void {
    const t = this.now();
    for (const room of [...this.rooms.values()]) {
      if (room.status === 'playing' && room.players.some((p) => !p.connected && t - p.lastSeen > this.graceMs)) {
        const stay = room.players.filter((p) => p.connected);
        this.finish(room, stay.length === 1 ? stay[0].seat : null, 'disconnected');
        this.publish(room);
      }
      const idle = t - room.updatedAt;
      const nobody = !room.players.some((p) => p.connected);
      if ((nobody && idle > this.idleMs) || (room.status === 'finished' && idle > this.finishedMs) || (room.status === 'waiting' && idle > this.waitingMs)) {
        this.destroy(room);
      }
    }
  }

  // ---------- persistence ----------
  snapshot(): Room[] { return [...this.rooms.values()].map((r) => structuredClone(r)); }

  /** Loads saved rooms. Everyone starts offline until their stream reconnects. */
  restore(rooms: Room[]): void {
    for (const r of rooms) {
      if (!rulesFor(r.game) || !Array.isArray(r.players) || !r.players.length) continue;
      r.players.forEach((p) => { p.connected = false; p.lastSeen = this.now(); });
      r.updatedAt = this.now();
      r.version ??= 0;
      r.rematchBy ??= [];
      this.rooms.set(r.code, r);
      r.players.forEach((p) => this.byPlayer.set(p.id, r.code));
    }
  }

  // ---------- internals ----------
  private requireFree(id: string) {
    if (this.byPlayer.has(id)) throw new RoomError('already_in_room', 'Leave your current room first.', 409);
  }
  private mustRoom(id: string): Room {
    const room = this.roomOf(id);
    if (!room) throw new RoomError('not_in_room', 'You are not in a room.', 409);
    return room;
  }
  private seatPlayer(id: string, seat: Seat): RoomPlayer {
    return { id, seat, connected: this.online.has(id), lastSeen: this.now() };
  }
  private uniqueCode(): string {
    for (let i = 0; i < 50; i++) {
      let c = '';
      for (let k = 0; k < CODE_LENGTH; k++) c += ALPHABET[randomInt(ALPHABET.length)];
      if (!this.rooms.has(c)) return c;
    }
    throw new RoomError('busy', 'Could not create a room, try again.', 503);
  }
  private begin(room: Room) {
    const rules = rulesFor(room.game)!;
    if (room.round > 0) room.players.forEach((p) => { p.seat = p.seat === 0 ? 1 : 0; }); // rematch: swap who starts
    room.round++;
    room.gameId = `${room.code}-${room.round}`;
    room.state = rules.init();
    room.turnSeat = rules.turn(room.state);
    room.result = null;
    room.rematchBy = [];
    room.status = 'playing';
    this.touch(room);
    this.publish(room);
  }
  private matchmake(hostId: string, guestId: string, game: string): Room {
    const t = this.now();
    const room: Room = {
      code: this.uniqueCode(), game, hostId, status: 'waiting', round: 0, gameId: '',
      players: [this.seatPlayer(hostId, 0), this.seatPlayer(guestId, 1)], state: null, turnSeat: null, result: null,
      createdAt: t, updatedAt: t, matchmade: true, version: 0, rematchBy: [],
    };
    this.rooms.set(room.code, room);
    this.byPlayer.set(hostId, room.code);
    this.byPlayer.set(guestId, room.code);
    this.emit({ type: 'queue', to: [hostId, guestId], game: null });
    this.begin(room);
    return room;
  }
  private finish(room: Room, winnerSeat: Seat | null, reason: FinishReason) {
    room.status = 'finished';
    room.result = { winnerSeat, reason };
    room.turnSeat = null;
    this.touch(room);
  }
  private touch(room: Room) { room.updatedAt = this.now(); }
  private publish(room: Room) {
    room.version++;
    this.emit({ type: 'room', room, to: room.players.map((p) => p.id) });
  }
  private destroy(room: Room) {
    const ids = room.players.map((p) => p.id);
    ids.forEach((id) => this.byPlayer.delete(id));
    this.rooms.delete(room.code);
    this.emit({ type: 'noroom', to: ids });
  }
}
