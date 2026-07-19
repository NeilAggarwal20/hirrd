import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in."
  );
}

/**
 * A Supabase client whose auth token is supplied by Clerk on every
 * request, via the `accessToken` option. This is the current
 * (post-April-2025) native integration — there is no JWT template
 * involved. `getClerkToken` is a closure set once, from
 * <SupabaseProvider>, to `() => session.getToken()`.
 *
 * Do not construct a second client elsewhere in the app; import
 * `supabase` from here everywhere.
 */
let getClerkToken: (() => Promise<string | null>) | null = null;

export function registerClerkTokenGetter(getter: () => Promise<string | null>) {
  getClerkToken = getter;
}

export async function getClerkTokenValue(): Promise<string | null> {
  if (!getClerkToken) return null;
  return getClerkToken();
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  async accessToken() {
    return getClerkTokenValue();
  },
});

