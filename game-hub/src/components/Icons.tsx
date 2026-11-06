import type { SVGProps } from 'react';

const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const make = (d: string) => (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d={d} /></svg>
);

export const HomeIcon = make('M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10');
export const GridIcon = make('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z');
export const LayersIcon = make('M12 3l9 5-9 5-9-5zM3 13l9 5 9-5');
export const TrophyIcon = make('M8 4h8v5a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 13v4M8 21h8M10 17h4');
export const UserIcon = make('M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0');
export const CogIcon = make('M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7 5 11l2 1v1l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4-2-1z');
export const HeartIcon = make('M12 21s-7-4.6-9.3-9A5.4 5.4 0 0112 6.6 5.4 5.4 0 0121.3 12c-2.3 4.4-9.3 9-9.3 9z');
export const ClockIcon = make('M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z');
export const SpeakerIcon = make('M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13');
export const SpeakerOffIcon = make('M11 5L6 9H3v6h3l5 4V5zM16 9l5 6M21 9l-5 6');
export const GlobeIcon = make('M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18');
export const SearchIcon = make('M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4');
