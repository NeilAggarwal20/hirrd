import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/constants/routes";
import type { UserRole } from "@/types/database.types";
import { PageSpinner } from "@/components/shared/page-spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If set, only a profile with this role may pass. */
  requireRole?: UserRole;
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  // Both isSignedIn and isLoading come from useCurrentUser() — the same
  // underlying Clerk subscription (useUser()) — so they can never
  // disagree with each other on a given render. Previously this read
  // isSignedIn from a *separate* useAuth() call: two independent Clerk
  // subscriptions that are not guaranteed to update in the same tick
  // (e.g. during Clerk's periodic background session refresh). A
  // transient isSignedIn=false from that second subscription, arriving
  // after the profile was already loaded, fell straight through to the
  // sign-in redirect below even though the user was still authenticated
  // — landing on /sign-in while signed in then triggers Clerk's own
  // auto-redirect-away-from-sign-in, bouncing back through /onboarding
  // and into the dashboard, repeating every time the same refresh
  // recurs. Using one hook for both signals removes that possibility.
  const { isLoading: isProfileLoading, isSignedIn, profile } = useCurrentUser();
  const location = useLocation();

  if (isProfileLoading) {
    return <PageSpinner />;
  }

  if (!isSignedIn) {
    return <Navigate to={ROUTES.signIn} replace state={{ from: location }} />;
  }

  if (!profile?.onboarding_completed && location.pathname !== ROUTES.onboarding) {
    return <Navigate to={ROUTES.onboarding} replace />;
  }

  if (requireRole && profile?.role !== requireRole) {
    const fallback = profile?.role === "recruiter" ? ROUTES.recruiterDashboard : ROUTES.candidateDashboard;
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
