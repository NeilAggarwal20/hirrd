import { supabase } from "@/lib/supabase";
import type { ApplicationRow, SavedJobRow } from "@/types/database.types";

export interface ApplicationWithJob extends ApplicationRow {
  jobs: {
    id: string;
    title: string;
    status: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
}

export interface SavedJobWithDetails extends SavedJobRow {
  jobs: {
    id: string;
    title: string;
    status: string;
    location: string | null;
    work_mode: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
}

export async function fetchMyApplications(candidateId: string): Promise<ApplicationWithJob[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, jobs(id, title, status, companies(name, logo_url))")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as ApplicationWithJob[];
}

export async function withdrawApplication(id: string): Promise<void> {
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMySavedJobsCount(candidateId: string): Promise<number> {
  const { count, error } = await supabase
    .from("saved_jobs")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchMySavedJobs(candidateId: string): Promise<SavedJobRow[]> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchMySavedJobsWithDetails(candidateId: string): Promise<SavedJobWithDetails[]> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*, jobs(id, title, status, location, work_mode, companies(name, logo_url))")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as SavedJobWithDetails[];
}
