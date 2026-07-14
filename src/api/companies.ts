import { supabase } from "@/lib/supabase";
import type { CompanyRow } from "@/types/database.types";

export async function fetchCompanyById(id: string): Promise<CompanyRow | null> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyCompanies(recruiterId: string): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCompany(input: {
  recruiterId: string;
  name: string;
  industry?: string;
  headquarters?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}): Promise<CompanyRow> {
  const { data, error } = await supabase
    .from("companies")
    .insert({
      recruiter_id: input.recruiterId,
      name: input.name,
      industry: input.industry ?? null,
      headquarters: input.headquarters ?? null,
      website: input.website ?? null,
      description: input.description ?? null,
      logo_url: input.logoUrl ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompany(
  id: string,
  patch: Partial<Pick<CompanyRow, "name" | "industry" | "headquarters" | "website" | "description" | "logo_url">>
): Promise<CompanyRow> {
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}
