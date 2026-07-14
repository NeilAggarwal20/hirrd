import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { registerClerkTokenGetter } from "@/lib/supabase";

/**
 * Wires Clerk's session token into the shared Supabase client.
 * Must render inside <ClerkProvider>, above anything that queries
 * Supabase. No JWT template is used — this relies on the Clerk
 * integration being enabled under Supabase dashboard →
 * Authentication → Sign In / Up → Third Party Auth → Clerk.
 */
export function SupabaseProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    registerClerkTokenGetter(() => getToken());
  }, [isLoaded, getToken]);

  return children;
}
