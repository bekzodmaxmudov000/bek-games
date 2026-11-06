const base = import.meta.env.BASE_URL;

export default function Footer() {
  return (
    <footer className="mt-14 flex flex-col items-center gap-3 border-t border-white/10 px-5 py-10 text-center">
      <img src={`${base}logo.png`} alt="BEK GAMES" width={112} height={112} className="h-24 w-24 sm:h-28 sm:w-28" />
      <p className="text-sm tracking-[0.2em] text-muted">YOUR WORLD. YOUR GAME.</p>
      <p className="text-xs text-muted/70">© {new Date().getFullYear()} BEK GAMES</p>
    </footer>
  );
}
