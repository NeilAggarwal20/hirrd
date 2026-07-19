// Supabase Edge Function (Deno runtime).
//
// Deploy:   supabase functions deploy resume-review
// Secrets:  supabase secrets set GEMINI_API_KEY=your_key_here
//
// Invoked from the client via supabase.functions.invoke("resume-review"),
// with no body — the candidate is identified from their own verified
// session token (see _shared/auth.ts), never from client input.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerId } from "../_shared/auth.ts";
import { extractResumeText } from "../_shared/pdf-text.ts";
import { callGeminiForJson } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ResumeReview {
  resumeScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  grammarIssues: string[];
  suggestions: string[];
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

/** Defensively coerces whatever Gemini returned into the exact shape the UI expects. */
function normalizeResumeReview(raw: unknown): ResumeReview {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    resumeScore: clampScore(r.resumeScore),
    atsScore: clampScore(r.atsScore),
    strengths: toStringArray(r.strengths),
    weaknesses: toStringArray(r.weaknesses),
    missingSkills: toStringArray(r.missingSkills),
    grammarIssues: toStringArray(r.grammarIssues),
    suggestions: toStringArray(r.suggestions),
  };
}

function buildPrompt(resumeText: string): string {
  return `You are an ATS (Applicant Tracking System) resume analysis engine.
Analyze the resume text below and respond with ONLY a single valid JSON
object — no markdown, no code fences, no commentary before or after it.
Match this exact shape:

{
  "resumeScore": number between 0 and 100,
  "atsScore": number between 0 and 100,
  "strengths": string[],
  "weaknesses": string[],
  "missingSkills": string[],
  "grammarIssues": string[],
  "suggestions": string[]
}

Resume:
"""
${resumeText.slice(0, 15000)}
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
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("resume_url")
      .eq("id", candidateId)
      .maybeSingle();

    if (userError) throw userError;
    if (!user?.resume_url) {
      return new Response(JSON.stringify({ error: "No resume uploaded yet" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    const resumePath = user.resume_url;

    // Cache hit: same candidate, same resume file, no need to call Gemini again.
    const { data: cached } = await supabaseAdmin
      .from("ai_resume_reviews")
      .select("resume_path, result")
      .eq("candidate_id", candidateId)
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

    const rawResult = await callGeminiForJson(buildPrompt(resumeText));
    const result = normalizeResumeReview(rawResult);

    await supabaseAdmin.from("ai_resume_reviews").upsert(
      { candidate_id: candidateId, resume_path: resumePath, result },
      { onConflict: "candidate_id" }
    );

    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("resume-review error", error);
    return new Response(JSON.stringify({ error: "Failed to analyze resume" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
