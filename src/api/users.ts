import { supabase } from "@/lib/supabase";
import type { UserRole, UserRow, UserUpdate } from "@/types/database.types";

export async function fetchUserProfile(clerkUserId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates the app-side profile row the first time a Clerk user is
 * seen. Safe to call on every load — it no-ops (via upsert) if the
 * row already exists.
 */
export async function ensureUserProfile(input: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: input.id,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        avatar_url: input.avatarUrl,
      },
      { onConflict: "id", ignoreDuplicates: false }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(clerkUserId: string, patch: UserUpdate): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", clerkUserId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
export async function completeOnboarding(
  clerkUserId: string,
  role: UserRole
): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .update({ role, onboarding_completed: true })
    .eq("id", clerkUserId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
