import { useSyncExternalStore } from 'react';
import { online } from './index';

export const useOnline = () => useSyncExternalStore(online.subscribe, online.getState);
