import type { Location } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

/**
 * Only ever return an internal, same-origin path. `from` ultimately
 * flows into a URL query param (see below), so without this check a
 * crafted link could smuggle an external redirect target through it.
 */
function toSafeInternalPath(path: string | undefined | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/**
 * ProtectedRoute redirects unauthenticated visitors to /sign-in with
 * `state: { from: location }`. Reads that back into a plain path, so
 * the sign-in/sign-up pages can send the user onward once they're
 * authenticated instead of always landing on onboarding/dashboard.
 */
export function getIntendedPath(locationState: unknown): string | null {
  const from = (locationState as { from?: Location } | null)?.from;
  if (!from) return null;
  return toSafeInternalPath(`${from.pathname}${from.search ?? ""}`);
}

/**
 * Where Clerk's <SignIn>/<SignUp> should force-redirect to once auth
 * completes. Onboarding still owns the final hop for brand-new or
 * not-yet-onboarded users — see `resolvePostOnboardingPath` — so the
 * intended destination is threaded through as a `redirect` query
 * param rather than being the direct target here.
 */
export function buildPostAuthRedirect(intendedPath: string | null): string {
  if (!intendedPath) return ROUTES.onboarding;
  return `${ROUTES.onboarding}?redirect=${encodeURIComponent(intendedPath)}`;
}

/**
 * Used by the onboarding page both for already-onboarded users
 * bouncing straight through, and for brand-new users right after
 * they pick a role.
 */
export function resolvePostOnboardingPath(
  redirectParam: string | null,
  roleDashboardPath: string
): string {
  return toSafeInternalPath(redirectParam) ?? roleDashboardPath;
}
