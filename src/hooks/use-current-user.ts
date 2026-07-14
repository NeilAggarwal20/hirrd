import { useAuth, useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ensureUserProfile, fetchUserProfile } from "@/api/users";

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

/**
 * Returns the merged Clerk + Supabase view of "who is signed in".
 * On first render after sign-up, this provisions the matching
 * public.users row so RLS policies (which key off that row) have
 * something to check against.
 */
export function useCurrentUser() {
  const { user, isLoaded: isUserLoaded } = useUser();
  // useAuth() and useUser() are separate Clerk subscriptions. useUser()
  // can report isLoaded=true for a render or two before `user` is
  // actually populated on a returning/existing session — "the SDK has
  // initialized" and "we know who's signed in" are not the same instant.
  // Requiring useAuth()'s isLoaded too (Clerk's own recommended pattern)
  // closes that gap: without it, a momentary isLoaded=true + user=null
  // reads as "definitely signed out," which incorrectly redirects an
  // already-authenticated user back to /sign-in. Note this is NOT using
  // useAuth().isSignedIn as a second, competing source of truth (that
  // was the earlier, different bug) — only its isLoaded flag, ANDed in
  // as an extra safety gate. `user` from useUser() remains the sole
  // source for isSignedIn/profile below.
  const { isLoaded: isAuthLoaded } = useAuth();
  const isClerkLoaded = isAuthLoaded && isUserLoaded;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...CURRENT_USER_QUERY_KEY, user?.id],
    enabled: isClerkLoaded && !!user,
    queryFn: async () => {
      if (!user) return null;
      const existing = await fetchUserProfile(user.id);
      if (existing) return existing;

      return ensureUserProfile({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.imageUrl,
      });
    },
  });

  // Keep the profile in sync if Clerk's copy of the name/avatar changes.
  useEffect(() => {
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: [...CURRENT_USER_QUERY_KEY, user.id] });
    // Only re-run when the identity itself changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    // Not "resolved" until Clerk has fully settled AND, if it turns out
    // there IS a user, the profile query has also settled. Critically,
    // this stays true (loading) while isClerkLoaded is false, regardless
    // of what `user` currently reads — so a transient null never gets
    // mistaken for a confirmed signed-out state.
    isLoading: !isClerkLoaded || (!!user && query.isLoading),
    profile: query.data ?? null,
    isSignedIn: !!user,
    error: query.error,
  };
}
