import { supabase } from "@/lib/supabase";
import type { JobApplicationStatsRow, JobInsert, JobRow, JobStatus, JobUpdate } from "@/types/database.types";

export async function fetchMyJobs(recruiterId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchJobByIdForRecruiter(id: string): Promise<JobRow | null> {
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyJobStats(recruiterId: string): Promise<JobApplicationStatsRow[]> {
  const { data, error } = await supabase
    .from("job_application_stats")
    .select("*")
    .eq("recruiter_id", recruiterId);

  if (error) throw error;
  return data;
}

export async function createJob(input: JobInsert): Promise<JobRow> {
  const { data, error } = await supabase.from("jobs").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateJob(id: string, patch: JobUpdate): Promise<JobRow> {
  const { data, error } = await supabase.from("jobs").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function setJobStatus(id: string, status: JobStatus): Promise<JobRow> {
  const { data, error } = await supabase.from("jobs").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
}
