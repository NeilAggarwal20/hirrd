// Supabase Edge Function (Deno runtime).
//
// Deploy:   supabase functions deploy candidate-analysis
// Secrets:  supabase secrets set GEMINI_API_KEY=your_key_here
//
// Invoked via supabase.functions.invoke("candidate-analysis", { body: { applicationId } }).
// The caller must be the recruiter who owns the job behind this
// application — verified server-side against their own Clerk session
// token (see _shared/auth.ts), never trusted from client input.
//
// This intentionally reuses every building block resume-review and
// resume-job-match already established (Gemini call/retry, PDF text
// extraction, HTML stripping, per-resume caching) rather than
// reimplementing them — only the prompt and the recruiter-facing
// shape are new.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerId } from "../_shared/auth.ts";
import { extractResumeText } from "../_shared/pdf-text.ts";
import { stripHtml } from "../_shared/strip-html.ts";
import { callGeminiForJson } from "../_shared/gemini.ts";
import { resolveResumeObjectPath } from "../_shared/storage-path.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Recommendation = "Highly Recommended" | "Recommended" | "Consider" | "Not Recommended";

interface CandidateAnalysis {
  recommendation: Recommendation;
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

const RECOMMENDATIONS: Recommendation[] = [
  "Highly Recommended",
  "Recommended",
  "Consider",
  "Not Recommended",
];

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, max);
}

function toText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toRecommendation(value: unknown): Recommendation {
  const s = typeof value === "string" ? value.trim() : "";
  const match = RECOMMENDATIONS.find((r) => r.toLowerCase() === s.toLowerCase());
  return match ?? "Consider";
}

/** Defensively coerces whatever Gemini returned into the exact shape the UI expects. */
function normalizeCandidateAnalysis(raw: unknown): CandidateAnalysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    recommendation: toRecommendation(r.recommendation),
    fitScore: clampScore(r.fitScore),
    skillsMatch: clampScore(r.skillsMatch),
    experienceMatch: clampScore(r.experienceMatch),
    educationMatch: clampScore(r.educationMatch),
    communicationScore: clampScore(r.communicationScore),
    strengths: toStringArray(r.strengths),
    missingSkills: toStringArray(r.missingSkills),
    concerns: toStringArray(r.concerns),
    interviewQuestions: toStringArray(r.interviewQuestions, 6),
    recruiterSummary: toText(r.recruiterSummary, 2000),
    hiringRecommendation: toText(r.hiringRecommendation, 500),
  };
}

function buildPrompt(input: {
  resumeText: string;
  coverLetter: string | null;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  requiredSkills: string[];
  candidateHeadline: string | null;
  candidateBio: string | null;
  candidateSkills: string[];
}): string {
  return `You are a senior technical recruiter's AI hiring assistant. Your job \
is to help a recruiter quickly decide whether a candidate is worth \
interviewing for a specific role, based ONLY on the materials provided below.

Respond with ONLY a single valid JSON object — no markdown, no code fences, \
no commentary before or after it. Match this exact shape:

{
  "recommendation": "Highly Recommended" | "Recommended" | "Consider" | "Not Recommended",
  "fitScore": number between 0 and 100,
  "skillsMatch": number between 0 and 100,
  "experienceMatch": number between 0 and 100,
  "educationMatch": number between 0 and 100,
  "communicationScore": number between 0 and 100,
  "strengths": string[],
  "missingSkills": string[],
  "concerns": string[],
  "interviewQuestions": string[],
  "recruiterSummary": string,
  "hiringRecommendation": string
}

Field guidance:
- "fitScore" is your overall assessment of how well this candidate fits this \
specific role, weighing skills, experience, and education together.
- "skillsMatch", "experienceMatch", and "educationMatch" each score how well \
the resume's skills, work history, and education line up against what the \
job asks for.
- "communicationScore" must be based only on the clarity, structure, and \
professionalism of the candidate's written materials (resume and cover \
letter) — there has been no interview yet, so do not imply otherwise.
- "strengths" and "concerns" must each be concrete and reference specific \
resume content, not generic statements.
- "missingSkills" lists role-relevant skills the resume does not evidence.
- "interviewQuestions" are 3-5 targeted questions this recruiter should ask \
to validate the candidate's weaker areas or unverified claims.
- "recruiterSummary" is 2-4 short paragraphs a busy recruiter can skim.
- "hiringRecommendation" is a single, direct 1-2 sentence verdict the \
recruiter could copy into their notes (e.g. "Strong frontend engineer with \
good React experience. Recommend moving to the technical interview.").

Critical accuracy rule: do not invent facts, employers, dates, degrees, or \
skills that are not present in the text below. If the resume is missing \
information needed to judge something (e.g. no education section, no \
quantifiable results, no cover letter), say so explicitly in the relevant \
field instead of guessing or filling the gap.

Job title: ${input.jobTitle}
Company: ${input.companyName}
Required/listed skills: ${input.requiredSkills.join(", ") || "(none listed)"}

Job description:
"""
${input.jobDescription.slice(0, 8000) || "(no job description provided)"}
"""

Candidate headline: ${input.candidateHeadline || "(none provided)"}
Candidate self-reported skills: ${input.candidateSkills.join(", ") || "(none listed)"}
Candidate bio: ${(input.candidateBio || "(none provided)").slice(0, 1000)}

Candidate resume:
"""
${input.resumeText.slice(0, 15000)}
"""

Candidate cover letter for this application:
"""
${(input.coverLetter ? stripHtml(input.coverLetter) : "(no cover letter submitted)").slice(0, 3000)}
"""`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    console.log("[1] Authenticating recruiter and parsing body...");
    let recruiterId: string;
    try {
      recruiterId = await getCallerId(req);
      console.log(`[1] Authenticated recruiter ID: ${recruiterId}`);
    } catch (e) {
      console.error("[1] Authentication failed:", e.message, e.stack, e);
      throw e;
    }

    let applicationId: string | undefined;
    try {
      const body = (await req.json()) as { applicationId?: string };
      applicationId = body.applicationId;
      console.log(`[1] Parsed applicationId: ${applicationId}`);
    } catch (e) {
      console.error("[1] Parsing request body failed:", e.message, e.stack, e);
      throw e;
    }

    if (!applicationId) {
      console.log("[1] Exit: applicationId is missing");
      return new Response(JSON.stringify({ error: "applicationId is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log("[2] Fetching application, job, company, and candidate profile...");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let application;
    try {
      const { data, error } = await supabaseAdmin
        .from("applications")
        .select(
          `resume_url, cover_letter, candidate_id,
           jobs!inner ( title, description, skills, recruiter_id, companies ( name ) ),
           users ( headline, bio, skills )`
        )
        .eq("id", applicationId)
        .maybeSingle();

      if (error) throw error;
      application = data;
      console.log(`[2] Application fetched: ${!!application}`);
    } catch (e) {
      console.error("[2] Fetching application failed:", e.message, e.stack, e);
      throw e;
    }

    if (!application) {
      console.log("[2] Exit: Application not found");
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const job = application.jobs;
    const candidate = application.users;

    if (!job || job.recruiter_id !== recruiterId) {
      console.log("[2] Exit: Caller does not own the job behind this application");
      return new Response(JSON.stringify({ error: "You don't have access to this application" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const RESUME_BUCKET = "resumes";
const rawResumeUrl = application.resume_url;

let resumePath: string;

try {
  resumePath = resolveResumeObjectPath(
    RESUME_BUCKET,
    rawResumeUrl
  );
} catch (e) {
  return new Response(
    JSON.stringify({
      error:
        "This candidate's resume reference looks invalid. Ask them to re-upload.",
    }),
    {
      status: 422,
      headers: corsHeaders,
    }
  );
}

    console.log("[3] Checking analysis cache...");
    let cached;
    try {
      const { data } = await supabaseAdmin
        .from("ai_candidate_analyses")
        .select("resume_path, result")
        .eq("application_id", applicationId)
        .maybeSingle();
      cached = data;
    } catch (e) {
      console.error("[3] Warning: Cache check failed (continuing):", e.message, e.stack, e);
    }

    if (cached && cached.resume_path === resumePath) {
      console.log("[3] Cache hit! Returning cached analysis");
      return new Response(JSON.stringify(cached.result), { status: 200, headers: corsHeaders });
    }
    console.log("[3] Cache miss or file changed.");

    console.log(`[4] Downloading resume PDF: ${resumePath}...`);
    let fileBlob;
    try {
      const { data, error: downloadError } = await supabaseAdmin.storage
        .from(RESUME_BUCKET)
        .download(resumePath);
      if (downloadError) {
  const isNotFound = /object not found/i.test(
    downloadError.message ?? ""
  );

  if (isNotFound) {
    return new Response(
      JSON.stringify({
        error: "This application references an older resume that is no longer available. This can happen if the resume was removed before the snapshot fix was applied. Please ask the candidate to submit a new application or upload the original resume if available.",
      }),
      {
        status: 404,
        headers: corsHeaders,
      }
    );
  }

  throw downloadError;
}

fileBlob = data;
console.log("[4] Resume PDF downloaded successfully");
      fileBlob = data;
      console.log("[4] Resume PDF downloaded successfully");
    } catch (e) {
      console.error("[4] Download PDF failed:", e.message, e.stack, e);
      throw e;
    }

    console.log("[5] Extracting text from PDF...");
    let resumeText;
    try {
      const bytes = new Uint8Array(await fileBlob.arrayBuffer());
      resumeText = await extractResumeText(bytes);
      console.log(`[5] Text extraction complete. Extracted text length: ${resumeText?.length ?? 0}`);
    } catch (e) {
      console.error("[5] Text extraction failed:", e.message, e.stack, e);
      throw e;
    }

    if (!resumeText || resumeText.length < 30) {
      console.log("[5] Exit: Extracted text too short or empty");
      return new Response(JSON.stringify({ error: "Could not read text from this candidate's resume" }), {
        status: 422,
        headers: corsHeaders,
      });
    }

    console.log("[6] Calling Gemini for JSON candidate analysis...");
    let rawResult;
    try {
      rawResult = await callGeminiForJson(
        buildPrompt({
          resumeText,
          coverLetter: application.cover_letter,
          jobTitle: job.title,
          companyName: job.companies?.name ?? "the company",
          jobDescription: stripHtml(job.description ?? ""),
          requiredSkills: job.skills ?? [],
          candidateHeadline: candidate?.headline ?? null,
          candidateBio: candidate?.bio ?? null,
          candidateSkills: candidate?.skills ?? [],
        })
      );
      console.log("[6] Gemini successfully responded");
    } catch (e) {
      console.error("[6] Gemini invocation failed:", e.message, e.stack, e);
      throw e;
    }

    console.log("[6] Normalizing Gemini response...");
    let result;
    try {
      result = normalizeCandidateAnalysis(rawResult);
      console.log("[6] Normalization complete:", JSON.stringify(result));
    } catch (e) {
      console.error("[6] Normalization failed:", e.message, e.stack, e);
      throw e;
    }

    console.log("[7] Writing analysis result to database...");
    try {
      await supabaseAdmin.from("ai_candidate_analyses").upsert(
        { application_id: applicationId, resume_path: resumePath, result },
        { onConflict: "application_id" }
      );
      console.log("[7] Database write complete");
    } catch (e) {
      console.error("[7] Database write failed:", e.message, e.stack, e);
      throw e;
    }

    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("candidate-analysis fatal error:", error.message, error.stack, error);
    return new Response(JSON.stringify({ error: error.message || "Failed to analyze this candidate" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
