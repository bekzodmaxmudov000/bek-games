import { go } from '../lib/router';
import { levelInfo, totalXp } from '../progress/logic';
import { useProgressSelector } from '../progress/useProgress';
import { BrandMark, Wordmark } from './Brand';
import { CogIcon, SearchIcon } from './Icons';

interface Props { query: string; onQuery: (q: string) => void; showSearch: boolean }

export default function TopBar({ query, onQuery, showSearch }: Props) {
  const profile = useProgressSelector((s) => s.profile);
  const matches = useProgressSelector((s) => s.matches);
  const { level } = levelInfo(totalXp(matches));
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b sm:gap-4 border-white/10 bg-ink/60 px-5 backdrop-blur-xl md:px-8">
      <a href="#/" aria-label="BEK GAMES home" className="flex shrink-0 items-center gap-2 md:hidden">
        <BrandMark className="h-9 w-9" />
        <Wordmark className="hidden text-base min-[480px]:inline" />
      </a>
      {showSearch && (
        <form className="relative ml-auto w-full max-w-sm md:ml-0" role="search"
          onSubmit={(e) => { e.preventDefault(); go('#/explore'); }}>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search games"
            aria-label="Search games"
            className="glass w-full rounded-full py-2 pl-10 pr-4 text-sm placeholder:text-muted focus:border-neon/50" />
        </form>
      )}
      <a href="#/settings" aria-label="Open settings" className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-fg">
        <CogIcon width={20} height={20} />
      </a>
      <a href="#/profile" aria-label="Open profile" className="flex shrink-0 items-center gap-3 rounded-full py-1 pl-3 pr-1 transition-colors hover:bg-white/5">
        <span className="hidden text-right sm:block">
          <span className="block text-sm leading-tight">{profile.username}</span>
          <span className="block text-xs text-muted">Level {level}</span>
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet to-electric text-xl ring-2 ring-neon/40">{profile.avatar}</span>
      </a>
    </header>
  );
}
