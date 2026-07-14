export function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16 sm:px-10" aria-busy="true" aria-live="polite">
      <div className="h-4 w-24 animate-pulse bg-paper-dim" />
      <div className="mt-4 h-10 w-64 animate-pulse bg-paper-dim" />
      <div className="mt-8 h-32 w-full animate-pulse bg-paper-dim" />
    </div>
  );
}
