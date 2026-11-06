const base = import.meta.env.BASE_URL;

/** Round emblem of the BEK GAMES logo, for small spots (sidebar, header). */
export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return <img src={`${base}logo-mark.png`} alt="" width={44} height={44} className={`${className} shrink-0 rounded-full shadow-neon`} />;
}

/** BEK in silver, GAMES in neon purple, like the logo. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold uppercase italic tracking-wide ${className}`}>
      <span className="bg-gradient-to-b from-white to-silver bg-clip-text text-transparent">Bek</span>{' '}
      <span className="bg-gradient-to-b from-neon to-violet bg-clip-text text-transparent">Games</span>
    </span>
  );
}
