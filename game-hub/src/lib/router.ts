import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'explore'; category?: string }
  | { name: 'categories' }
  | { name: 'favorites' }
  | { name: 'history' }
  | { name: 'leaderboard' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'online'; code?: string }
  | { name: 'play'; id: string };

function parse(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'explore') return { name: 'explore', category: b };
  if (a === 'categories') return { name: 'categories' };
  if (a === 'online') return { name: 'online', code: b };
  if (a === 'favorites' || a === 'history' || a === 'leaderboard' || a === 'profile' || a === 'settings') return { name: a };
  if (a === 'play' && b) return { name: 'play', id: b };
  return { name: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const onChange = () => { setRoute(parse(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (href: string) => { location.hash = href.replace(/^#/, ''); };
