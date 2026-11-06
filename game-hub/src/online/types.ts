// Shared contract between the multiplayer server and the app.
export type Seat = 0 | 1;
export type FinishReason = 'win' | 'draw' | 'resigned' | 'left' | 'disconnected';

export interface Me { id: string; username: string; avatar: string }
export interface GameInfo { kind: string; title: string }

export interface OnlinePlayer {
  id: string; seat: Seat; connected: boolean; username: string; avatar: string;
  /** How long this player has been offline, in ms, as of when the room was sent. Null while connected. */
  offlineForMs: number | null;
}

export interface OnlineRoom {
  code: string;
  game: string;
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  /** Increases with every rematch. */
  round: number;
  /** Unique per game played in the room, used to reward XP only once. */
  gameId: string;
  /** Your seat in this room. */
  you: Seat | null;
  turnSeat: Seat | null;
  result: { winnerSeat: Seat | null; reason: FinishReason } | null;
  state: unknown;
  players: OnlinePlayer[];
  /** Ids of players who asked for a rematch after the game ended. */
  rematch: string[];
  /** Grows with every change. Clients ignore updates older than what they already show. */
  version: number;
  /** Offline players forfeit after this many ms. */
  graceMs: number;
}

/** Props every online game board receives. */
export interface BoardProps { room: OnlineRoom; meId?: string }
