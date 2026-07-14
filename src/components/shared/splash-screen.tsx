export function SplashScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-paper">
      <span className="font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        HIRRD
      </span>
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
        <span className="h-1.5 w-1.5 animate-pulse bg-signal" aria-hidden="true" />
        <span>Loading —</span>
      </div>
    </div>
  );
}
