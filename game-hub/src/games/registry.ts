import { CATEGORIES, type Category, type GameModule } from './types';

// Every folder in src/games/<name>/index.tsx is picked up automatically.
const modules = import.meta.glob<{ default: GameModule }>('./*/index.tsx', { eager: true });

export const games: GameModule[] = Object.values(modules)
  .map((m) => m.default)
  .filter((g) => g.status === 'ready')
  .sort((a, b) => b.popularity - a.popularity);

export const recentGames = [...games].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
export const gameRoute = (g: GameModule) => `#/play/${g.id}`;
export const getGame = (id: string) => games.find((g) => g.id === id);
export const gamesIn = (c: Category) => games.filter((g) => g.categories.includes(c));
export const featuredGame = games.find((g) => g.featured) ?? games[0];
export const categorySlug = (c: Category) => c.toLowerCase();
export const categoryFromSlug = (s?: string) => CATEGORIES.find((c) => c.toLowerCase() === s);
