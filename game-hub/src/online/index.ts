import { createOnlineStore } from './store';
import { getState as progress } from '../progress/store';

/** The app-wide connection to the multiplayer server. Set VITE_API_URL when the server is on another address. */
export const online = createOnlineStore({
  baseUrl: ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, ''),
  storage: localStorage,
  profile: () => progress().profile,
});
