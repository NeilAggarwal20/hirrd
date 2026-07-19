import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface ResumeReviewResult {
  resumeScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  grammarIssues: string[];
  suggestions: string[];
}

export interface JobMatchResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  resumeWeaknesses: string[];
  recommendations: string[];
}

/** Edge functions respond with `{ error: string }` JSON on non-2xx statuses. */
async function readFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
  }
  return fallback;
}

/**
 * Runs (or returns the cached) AI review of the caller's own resume.
 * The candidate is identified server-side from their session token —
 * there's nothing to pass here.
 */
export async function fetchResumeReview(): Promise<ResumeReviewResult> {
  const { data, error } = await supabase.functions.invoke<ResumeReviewResult>("resume-review", {
    body: {},
  });
  if (error) throw new Error(await readFunctionErrorMessage(error, "Couldn't analyze your resume."));
  if (!data) throw new Error("Couldn't analyze your resume.");
  return data;
}

/** Runs (or returns the cached) AI match of the caller's resume against one job. */
export async function fetchJobMatch(jobId: string): Promise<JobMatchResult> {
  const { data, error } = await supabase.functions.invoke<JobMatchResult>("resume-job-match", {
    body: { jobId },
  });
  if (error) throw new Error(await readFunctionErrorMessage(error, "Couldn't analyze your resume for this job."));
  if (!data) throw new Error("Couldn't analyze your resume for this job.");
  return data;
}
