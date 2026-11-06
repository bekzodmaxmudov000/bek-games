import { useSyncExternalStore } from 'react';
import { getSettings, subscribeSettings } from './store';

export const useSettings = () => useSyncExternalStore(subscribeSettings, getSettings);
