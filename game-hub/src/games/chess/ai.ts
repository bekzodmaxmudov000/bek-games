// Runs the chess search in a Web Worker so the page never freezes while the computer thinks.
// Falls back to the main thread if workers are unavailable.
import { Chess } from 'chess.js';
import type { Level } from '../types';
import { pickMove } from './engine';

export interface AIMove { from: string; to: string; promotion?: string }
interface Job { resolve: (m: AIMove) => void; fen: string; level: Level }

const MIN_THINK_MS = 350; // keeps replies from feeling instant
let worker: Worker | null | undefined;
let seq = 0;
const jobs = new Map<number, Job>();

const solveHere = (fen: string, level: Level): AIMove => {
  const m = pickMove(new Chess(fen), level);
  return { from: m.from, to: m.to, promotion: m.promotion };
};

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    const w = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; move: AIMove }>) => {
      const job = jobs.get(e.data.id);
      if (!job) return;
      jobs.delete(e.data.id);
      job.resolve(e.data.move);
    };
    w.onerror = () => {
      w.terminate();
      worker = null;
      jobs.forEach((job) => job.resolve(solveHere(job.fen, job.level)));
      jobs.clear();
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

export function requestMove(fen: string, level: Level): { promise: Promise<AIMove>; cancel: () => void } {
  const id = ++seq;
  const wait = new Promise<void>((r) => window.setTimeout(r, MIN_THINK_MS));
  const search = new Promise<AIMove>((resolve) => {
    const w = getWorker();
    if (!w) return resolve(solveHere(fen, level));
    jobs.set(id, { resolve, fen, level });
    w.postMessage({ id, fen, level });
  });
  return {
    promise: Promise.all([search, wait]).then(([m]) => m),
    cancel: () => { jobs.delete(id); },
  };
}
