import { supabase } from "@/lib/supabase";

export async function isJobSavedByCandidate(jobId: string, candidateId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function saveJob(jobId: string, candidateId: string): Promise<void> {
  const { error } = await supabase.from("saved_jobs").insert({ job_id: jobId, candidate_id: candidateId });
  if (error) throw error;
}

export async function unsaveJob(jobId: string, candidateId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId);
  if (error) throw error;
}

export async function hasAppliedToJob(jobId: string, candidateId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function applyToJob(input: {
  jobId: string;
  candidateId: string;
  resumeUrl: string;
  coverLetter?: string;
}): Promise<void> {
  const { error } = await supabase.from("applications").insert({
    job_id: input.jobId,
    candidate_id: input.candidateId,
    resume_url: input.resumeUrl,
    cover_letter: input.coverLetter ?? null,
  });
  if (error) throw error;
}
