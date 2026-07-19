// Supabase Edge Function (Deno runtime).
//
// Deploy:   supabase functions deploy resume-job-match
// Secrets:  supabase secrets set GEMINI_API_KEY=your_key_here
//
// Invoked via supabase.functions.invoke("resume-job-match", { body: { jobId } }).
// The candidate is identified from their own verified session token
// (see _shared/auth.ts) — jobId is the only client-supplied input.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerId } from "../_shared/auth.ts";
import { extractResumeText } from "../_shared/pdf-text.ts";
import { stripHtml } from "../_shared/strip-html.ts";
import { callGeminiForJson } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface JobMatch {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  resumeWeaknesses: string[];
  recommendations: string[];
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 12);
}

function normalizeJobMatch(raw: unknown): JobMatch {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    matchScore: clampScore(r.matchScore),
    matchedSkills: toStringArray(r.matchedSkills),
    missingSkills: toStringArray(r.missingSkills),
    resumeWeaknesses: toStringArray(r.resumeWeaknesses),
    recommendations: toStringArray(r.recommendations),
  };
}

function buildPrompt(input: { resumeText: string; jobTitle: string; companyName: string; jobDescription: string; requiredSkills: string[] }): string {
  return `You are an ATS (Applicant Tracking System) resume-to-job matching engine.
Compare the candidate's resume against the job below and respond with
ONLY a single valid JSON object — no markdown, no code fences, no
commentary before or after it. Match this exact shape:

{
  "matchScore": number between 0 and 100,
  "matchedSkills": string[],
  "missingSkills": string[],
  "resumeWeaknesses": string[],
  "recommendations": string[]
}

Job title: ${input.jobTitle}
Company: ${input.companyName}
Required/listed skills: ${input.requiredSkills.join(", ") || "(none listed)"}

Job description:
"""
${input.jobDescription.slice(0, 8000)}
"""

Candidate resume:
"""
${input.resumeText.slice(0, 15000)}
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
    const candidateId = await getCallerId(req);
    const { jobId } = (await req.json()) as { jobId?: string };
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: user, error: userError }, { data: job, error: jobError }] = await Promise.all([
      supabaseAdmin.from("users").select("resume_url").eq("id", candidateId).maybeSingle(),
      supabaseAdmin
        .from("job_listings")
        .select("title, company_name, description, skills")
        .eq("id", jobId)
        .maybeSingle(),
    ]);

    if (userError) throw userError;
    if (jobError) throw jobError;

    if (!user?.resume_url) {
      return new Response(JSON.stringify({ error: "No resume uploaded yet" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }
    const resumePath = user.resume_url;

    const { data: cached } = await supabaseAdmin
      .from("ai_job_matches")
      .select("resume_path, result")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (cached && cached.resume_path === resumePath) {
      return new Response(JSON.stringify(cached.result), { status: 200, headers: corsHeaders });
    }

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from("resumes")
      .download(resumePath);
    if (downloadError) throw downloadError;

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const resumeText = await extractResumeText(bytes);
    if (!resumeText || resumeText.length < 30) {
      return new Response(JSON.stringify({ error: "Could not read text from this resume file" }), {
        status: 422,
        headers: corsHeaders,
      });
    }

    const rawResult = await callGeminiForJson(
      buildPrompt({
        resumeText,
        jobTitle: job.title,
        companyName: job.company_name,
        jobDescription: stripHtml(job.description),
        requiredSkills: job.skills ?? [],
      })
    );
    const result = normalizeJobMatch(rawResult);

    await supabaseAdmin.from("ai_job_matches").upsert(
      { candidate_id: candidateId, job_id: jobId, resume_path: resumePath, result },
      { onConflict: "candidate_id,job_id" }
    );

    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("resume-job-match error", error);
    return new Response(JSON.stringify({ error: "Failed to analyze resume against this job" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
