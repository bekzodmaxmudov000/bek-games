import { Chess } from 'chess.js';
import type { Level } from '../types';
import { pickMove } from './engine';

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<{ id: number; fen: string; level: Level }>) => void) | null;
  postMessage: (msg: unknown) => void;
};

scope.onmessage = (e) => {
  const m = pickMove(new Chess(e.data.fen), e.data.level);
  scope.postMessage({ id: e.data.id, move: { from: m.from, to: m.to, promotion: m.promotion } });
};
