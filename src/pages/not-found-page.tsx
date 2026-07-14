import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-start px-6 py-24 sm:px-10">
      <span className="index-figure text-signal">404</span>
      <h1 className="mt-4 font-display text-4xl font-extrabold uppercase tracking-tight text-ink">
        Not indexed
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        There's no entry at this address. It may have been closed, withdrawn, or never existed.
      </p>
      <Link
        to={ROUTES.home}
        className="mt-8 border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper hover:bg-signal hover:border-signal"
      >
        Back to start
      </Link>
    </div>
  );
}
