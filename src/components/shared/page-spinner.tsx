export function PageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-paper">
      <div className="flex items-center gap-3 font-mono text-sm text-ink-soft">
        <span
          className="h-2 w-2 animate-pulse bg-signal"
          aria-hidden="true"
        />
        <span>loading —</span>
      </div>
    </div>
  );
}
