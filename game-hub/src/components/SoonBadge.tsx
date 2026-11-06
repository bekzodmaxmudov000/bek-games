export default function SoonBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[10px] leading-none text-muted ${className}`}>
      Coming Soon
    </span>
  );
}
