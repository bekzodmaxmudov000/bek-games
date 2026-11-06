export default function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid place-items-center gap-3 py-16 text-muted">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-neon" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
