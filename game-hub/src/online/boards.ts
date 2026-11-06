import { lazy, type ComponentType } from 'react';
import type { BoardProps } from './types';

/** Online board per game kind. Add chess and checkers here when their servers rules exist. */
export const ONLINE_BOARDS: Record<string, ComponentType<BoardProps>> = {
  'tic-tac-toe': lazy(() => import('../games/tic-tac-toe/OnlineTicTacToe')),
};
