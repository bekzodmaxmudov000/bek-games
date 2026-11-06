import { NAV } from '../lib/nav';

export default function BottomNav({ active }: { active: string }) {
  const items = NAV.filter((n) => n.mobile);
  return (
    <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-x-0 border-b-0 px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map(({ id, label, href, Icon, soon }) =>
        soon || !href ? (
          <div key={id} aria-disabled="true" className="flex cursor-default select-none flex-col items-center gap-0.5 py-2 text-muted opacity-45">
            <Icon width={20} height={20} />
            <span className="text-[10px]">{label}</span>
            <span className="text-[8px] leading-none">Soon</span>
          </div>
        ) : (
          <a key={id} href={href} aria-current={active === id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 ${active === id ? 'text-neon' : 'text-muted'}`}>
            <Icon width={20} height={20} />
            <span className="text-[10px]">{label}</span>
          </a>
        ),
      )}
    </nav>
  );
}
