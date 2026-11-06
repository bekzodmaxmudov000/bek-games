import { useSyncExternalStore } from 'react';
import { getState, subscribe } from './store';

export const useProgress = () => useSyncExternalStore(subscribe, getState);

/** Subscribe to one slice only. The selector must return a value that stays referentially stable until it really changes. */
export const useProgressSelector = <T,>(select: (s: ReturnType<typeof getState>) => T): T =>
  useSyncExternalStore(subscribe, () => select(getState()));
