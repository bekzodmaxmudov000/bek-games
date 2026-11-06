import type { ComponentType, SVGProps } from 'react';
import { ClockIcon, CogIcon, GlobeIcon, GridIcon, HeartIcon, HomeIcon, LayersIcon, TrophyIcon, UserIcon } from '../components/Icons';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  soon?: boolean;
  /** Shown in the mobile bottom navigation. */
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { id: 'home', label: 'Home', href: '#/', Icon: HomeIcon, mobile: true },
  { id: 'explore', label: 'All Games', href: '#/explore', Icon: GridIcon, mobile: true },
  { id: 'online', label: 'Play Online', href: '#/online', Icon: GlobeIcon, mobile: true },
  { id: 'categories', label: 'Categories', href: '#/categories', Icon: LayersIcon },
  { id: 'favorites', label: 'Favorites', href: '#/favorites', Icon: HeartIcon, mobile: true },
  { id: 'history', label: 'History', href: '#/history', Icon: ClockIcon },
  { id: 'leaderboard', label: 'Leaderboard', href: '#/leaderboard', Icon: TrophyIcon },
  { id: 'profile', label: 'Profile', href: '#/profile', Icon: UserIcon, mobile: true },
  { id: 'settings', label: 'Settings', href: '#/settings', Icon: CogIcon },
];
