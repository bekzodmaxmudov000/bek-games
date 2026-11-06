import { NAV } from '../lib/nav';
import { BrandMark, Wordmark } from './Brand';
import SoonBadge from './SoonBadge';

export default function Sidebar({ active }: { active: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col overflow-y-auto border-r border-white/10 bg-ink/70 px-3 py-6 backdrop-blur-xl md:flex lg:w-64 lg:px-4">
      <a href="#/" className="mb-8 flex items-center gap-3 rounded-xl px-1 py-1" aria-label="BEK GAMES home">
        <BrandMark className="h-11 w-11" />
        <Wordmark className="hidden text-xl lg:block" />
      </a>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(({ id, label, href, Icon, soon }) =>
          soon || !href ? (
            <div key={id} aria-disabled="true" title={`${label} – coming soon`}
              className="flex cursor-default select-none items-center gap-3 rounded-xl px-3 py-2.5 text-muted opacity-45">
              <Icon className="shrink-0" />
              <span className="hidden flex-1 lg:block">{label}</span>
              <SoonBadge className="hidden lg:block" />
            </div>
          ) : (
            <a key={id} href={href} aria-current={active === id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                active === id ? 'bg-neon/15 text-fg ring-1 ring-neon/40' : 'text-muted hover:bg-white/5 hover:text-fg'
              }`}>
              <Icon className="shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </a>
          ),
        )}
      </nav>
    </aside>
  );
}
