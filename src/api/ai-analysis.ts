import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase, getClerkTokenValue } from "@/lib/supabase";

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

export type CandidateRecommendation =
  | "Highly Recommended"
  | "Recommended"
  | "Consider"
  | "Not Recommended";

export interface CandidateAnalysisResult {
  recommendation: CandidateRecommendation;
  fitScore: number;
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  communicationScore: number;
  strengths: string[];
  missingSkills: string[];
  concerns: string[];
  interviewQuestions: string[];
  recruiterSummary: string;
  hiringRecommendation: string;
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


/** Runs (or returns the cached) AI match of the caller's resume against one job. */
export async function fetchJobMatch(jobId: string): Promise<JobMatchResult> {
  const token = await getClerkTokenValue();
  const { data: rawData, error } = await supabase.functions.invoke<JobMatchResult>("resume-job-match", {
    body: { jobId },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) throw new Error(await readFunctionErrorMessage(error, "Couldn't analyze your resume for this job."));
  if (!rawData) throw new Error("Couldn't analyze your resume for this job.");

  // Same defensive parse as fetchResumeReview — SDK returns text/plain when
  // Content-Type header is absent from the edge function response.
  const data: JobMatchResult =
    typeof rawData === "string" ? JSON.parse(rawData) : rawData;

  return data;
}

export async function fetchResumeReview(): Promise<ResumeReviewResult> {
  const token = await getClerkTokenValue();

  const { data: rawData, error } = await supabase.functions.invoke<ResumeReviewResult>(
    "resume-review",
    {
      body: {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (error)
    throw new Error(
      await readFunctionErrorMessage(error, "Couldn't analyze your resume.")
    );

  if (!rawData)
    throw new Error("Couldn't analyze your resume.");

  // The Supabase functions SDK falls back to `response.text()` when the edge
  // function response is missing a Content-Type: application/json header.
  // In that case `rawData` arrives as a JSON string instead of a parsed object.
  // Parse it defensively so the UI always receives a proper ResumeReviewResult.
  const data: ResumeReviewResult =
    typeof rawData === "string" ? JSON.parse(rawData) : rawData;

  return data;
}

/**
 * Runs (or returns the cached) AI hiring analysis of a candidate's
 * application — resume plus cover letter, weighed against the job it
 * was submitted to. The caller must be the recruiter who owns that
 * job; this is enforced server-side, not just by hiding the button.
 */
export async function fetchCandidateAnalysis(applicationId: string): Promise<CandidateAnalysisResult> {
  const token = await getClerkTokenValue();

  const { data: rawData, error } = await supabase.functions.invoke<CandidateAnalysisResult>(
    "candidate-analysis",
    {
      body: { applicationId },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (error)
    throw new Error(await readFunctionErrorMessage(error, "Couldn't analyze this candidate."));

  if (!rawData) throw new Error("Couldn't analyze this candidate.");

  // Same defensive parse as fetchResumeReview/fetchJobMatch — the SDK
  // falls back to raw text when the edge function response is missing a
  // Content-Type: application/json header.
  const data: CandidateAnalysisResult =
    typeof rawData === "string" ? JSON.parse(rawData) : rawData;

  return data;
}