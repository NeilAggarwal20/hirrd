import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Show, UserButton, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMySavedJobsCount } from "@/api/candidate";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationCenter } from "@/components/shared/notification-center";
import { Button } from "@/components/ui/button";

export function RootLayout() {
  const { isSignedIn } = useAuth();
  const { profile } = useCurrentUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-paper transition-colors duration-200">
      <header className="border-b border-grid">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-6 sm:px-10">
          <Link to={ROUTES.home} className="group" onClick={() => setIsMobileMenuOpen(false)}>
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

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Show when="signed-in">
              <NotificationCenter />
            </Show>

            <div className="hidden items-center gap-4 sm:flex">
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

            {/* Mobile Hamburger toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9 p-0 border-grid hover:border-ink hover:text-ink sm:hidden"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isMobileMenuOpen && (
          <div className="border-t border-grid bg-paper px-6 py-6 font-mono text-sm uppercase tracking-wide sm:hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between border-l-2 border-transparent pl-3 text-ink-soft transition-colors",
                      isActive && "border-signal text-ink"
                    )
                  }
                >
                  <span>{link.label}</span>
                  {!!link.badge && (
                    <span className="flex h-4 min-w-4 items-center justify-center bg-signal px-1 text-[10px] text-paper">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              <div className="mt-4 border-t border-grid pt-4 flex flex-col gap-3">
                <Show when="signed-out">
                  <Link
                    to={ROUTES.signIn}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center border border-grid py-2 text-ink-soft hover:text-ink"
                  >
                    Sign in
                  </Link>
                  <Link
                    to={ROUTES.signUp}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center border border-ink bg-ink py-2 text-paper hover:bg-signal hover:border-signal"
                  >
                    Get started
                  </Link>
                </Show>
                <Show when="signed-in">
                  <div className="flex items-center justify-between border border-grid p-2">
                    <span className="text-xs text-ink-soft">Account settings:</span>
                    <UserButton />
                  </div>
                </Show>
              </div>
            </nav>
          </div>
        )}
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
