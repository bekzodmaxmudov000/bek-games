import type { Identity } from './auth';
import type { Room } from './rooms';
import type { OnlineRoom } from '../src/online/types';

export interface ViewContext { now: number; graceMs: number }

/** What a player is allowed to see of a room. */
export function publicRoom(room: Room, lookup: (id: string) => Identity | undefined, viewerId: string, ctx: ViewContext): OnlineRoom {
  const me = room.players.find((p) => p.id === viewerId);
  return {
    code: room.code, game: room.game, status: room.status, hostId: room.hostId, round: room.round, gameId: room.gameId,
    you: me ? me.seat : null, turnSeat: room.turnSeat, result: room.result, state: room.state,
    players: room.players.map((p) => ({
      id: p.id, seat: p.seat, connected: p.connected,
      username: lookup(p.id)?.username ?? 'Player', avatar: lookup(p.id)?.avatar ?? '🚀',
      offlineForMs: p.connected ? null : Math.max(0, ctx.now - p.lastSeen),
    })),
    rematch: [...room.rematchBy], version: room.version, graceMs: ctx.graceMs,
  };
}
