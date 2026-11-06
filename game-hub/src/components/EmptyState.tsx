export default function EmptyState({ title, text, action }: { title: string; text: string; action?: { label: string; href: string } }) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      <svg viewBox="0 0 120 120" className="mb-5 h-28 w-28" fill="none" strokeLinecap="round">
        <circle cx="60" cy="60" r="46" stroke="#a855f7" strokeOpacity=".25" strokeWidth="2" strokeDasharray="4 8" />
        <circle cx="60" cy="60" r="30" stroke="#38bdf8" strokeOpacity=".4" strokeWidth="2" />
        <path d="M60 46v28M46 60h28" stroke="#c084fc" strokeWidth="5" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,.8))' }} />
      </svg>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-muted">{text}</p>
      {action && (
        <a href={action.href} className="mt-6 rounded-full border border-neon/40 px-5 py-2 text-sm hover:bg-neon/10">{action.label}</a>
      )}
    </div>
  );
}
