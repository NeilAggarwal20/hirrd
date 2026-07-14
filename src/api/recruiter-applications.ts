import { supabase } from "@/lib/supabase";
import type { ApplicationRow, ApplicationStatus } from "@/types/database.types";

export interface ApplicantRow extends ApplicationRow {
  users: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    headline: string | null;
  } | null;
}

export interface RecentApplicantRow extends ApplicantRow {
  jobs: { recruiter_id: string; title: string } | null;
}

export async function fetchRecentApplicationsForRecruiter(
  recruiterId: string,
  limit = 8
): Promise<RecentApplicantRow[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, users(id, first_name, last_name, email, headline), jobs!inner(recruiter_id, title)")
    .eq("jobs.recruiter_id", recruiterId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as unknown as RecentApplicantRow[];
}

export async function fetchApplicantsForJob(jobId: string): Promise<ApplicantRow[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, users(id, first_name, last_name, email, headline)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as ApplicantRow[];
}

export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) throw error;
}
