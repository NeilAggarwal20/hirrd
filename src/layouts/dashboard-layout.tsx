import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  to: string;
  end?: boolean;
}

interface DashboardLayoutProps {
  sectionLabel: string;
  navItems: DashboardNavItem[];
}

/**
 * The signature element carried through every authenticated screen:
 * a numbered index rail, set in mono, styled after a Swiss transit
 * timetable. The numbers are real — they index this section's own
 * nav entries — not decorative filler.
 */
export function DashboardLayout({ sectionLabel, navItems }: DashboardLayoutProps) {
  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 px-6 sm:px-10 md:grid-cols-[220px_1fr]">
      <aside className="border-grid py-10 md:border-r md:pr-8">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          {sectionLabel}
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group flex items-baseline gap-3 border-l-2 border-transparent py-2 pl-3 font-sans text-sm text-ink-soft transition-colors hover:border-grid hover:text-ink",
                  isActive && "border-signal text-ink"
                )
              }
            >
              <span className="index-figure text-xs text-ink-soft/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 py-10 md:pl-10">
        <Outlet />
      </div>
    </div>
  );
}
