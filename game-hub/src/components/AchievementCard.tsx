import type { Achievement, AchievementCtx } from '../progress/logic';

export default function AchievementCard({ a, ctx, unlockedAt }: { a: Achievement; ctx: AchievementCtx; unlockedAt?: string }) {
  const target = Math.max(1, a.target(ctx));
  const value = Math.min(a.progress(ctx), target);
  const done = Boolean(unlockedAt);
  return (
    <div className={`glass flex gap-4 rounded-2xl p-4 ${done ? 'border-neon/40' : ''}`}>
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${done ? 'bg-neon/20 shadow-neon' : 'bg-white/5 opacity-60 grayscale'}`} aria-hidden>
        {a.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-display font-semibold">{a.title}</h3>
          {done && <span className="rounded-full bg-neon/20 px-2 py-0.5 text-[11px] text-fg">Unlocked</span>}
        </div>
        <p className="mt-0.5 text-sm text-muted">{a.description}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${a.title} progress`}
            aria-valuemin={0} aria-valuemax={target} aria-valuenow={value}>
            <div className="h-full rounded-full bg-gradient-to-r from-violet to-electric" style={{ width: `${(value / target) * 100}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted">{value} / {target}</span>
        </div>
        {done && <p className="mt-1.5 text-xs text-muted">{new Date(unlockedAt!).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}
