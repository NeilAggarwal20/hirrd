import { Link, NavLink, Outlet } from "react-router-dom";
import { Show, UserButton, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMySavedJobsCount } from "@/api/candidate";

export function RootLayout() {
  const { isSignedIn } = useAuth();
  const { profile } = useCurrentUser();

  const savedCountQuery = useQuery({
    queryKey: ["my-saved-jobs-count", profile?.id],
    queryFn: () => fetchMySavedJobsCount(profile!.id),
    enabled: !!profile && profile.role === "candidate",
    staleTime: 15_000,
  });

  const navLinks: { label: string; to: string; badge?: number }[] = [{ label: "Roles", to: ROUTES.jobs }];

  if (!isSignedIn) {
    navLinks.push({ label: "For recruiters", to: ROUTES.recruiterDashboard });
  } else if (profile?.role === "candidate") {
    navLinks.push({ label: "Saved", to: ROUTES.candidateSaved, badge: savedCountQuery.data });
    navLinks.push({ label: "Dashboard", to: ROUTES.candidateDashboard });
  } else if (profile?.role === "recruiter") {
    navLinks.push({ label: "Dashboard", to: ROUTES.recruiterDashboard });
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-grid">
        <div className="mx-auto flex max-w-[1400px] items-end justify-between gap-6 px-6 py-6 sm:px-10">
          <Link to={ROUTES.home} className="group">
            <span className="block font-display text-[2.1rem] font-extrabold uppercase leading-[0.85] tracking-tight text-ink">
              HIRRD
            </span>
            <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              No. 001 — Hiring, precisely
            </span>
          </Link>

          <nav className="hidden items-center gap-8 font-mono text-sm uppercase tracking-wide sm:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 border-b-2 border-transparent pb-1 text-ink-soft transition-colors hover:text-ink",
                    isActive && "border-signal text-ink"
                  )
                }
              >
                {link.label}
                {!!link.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center bg-signal px-1 font-mono text-[10px] text-paper">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <Link
                to={ROUTES.signIn}
                className="font-mono text-sm uppercase tracking-wide text-ink-soft hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                to={ROUTES.signUp}
                className="border border-ink bg-ink px-4 py-2 font-mono text-sm uppercase tracking-wide text-paper transition-colors hover:bg-signal hover:border-signal"
              >
                Get started
              </Link>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-grid">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-8 font-mono text-xs uppercase tracking-wide text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© {new Date().getFullYear()} HIRRD</span>
          <span>Built on Clerk · Supabase · Postgres</span>
        </div>
      </footer>
    </div>
  );
}
