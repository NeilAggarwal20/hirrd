// Supabase Edge Function (Deno runtime).
//
// Deploy:   supabase functions deploy mock-interview-generate
// Secrets:  supabase secrets set GEMINI_API_KEY=your_key_here
//
// Invoked via supabase.functions.invoke("mock-interview-generate", { body: { jobId } }).
// candidateId always comes from the caller's own verified Clerk session
// token (see _shared/auth.ts) — never from client input.
//
// This does not persist anything: the returned question set becomes a
// client-side draft (see useMockInterview) until the candidate submits
// answers to mock-interview-evaluate, which is the only function that
// writes to mock_interviews.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerId } from "../_shared/auth.ts";
import { extractResumeText } from "../_shared/pdf-text.ts";
import { resolveResumeObjectPath } from "../_shared/storage-path.ts";
import { stripHtml } from "../_shared/strip-html.ts";
import { callGeminiForJson } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESUME_BUCKET = "resumes";

type QuestionType = "technical" | "behavioral" | "resume" | "job_specific" | "problem_solving";
const QUESTION_TYPES: QuestionType[] = ["technical", "behavioral", "resume", "job_specific", "problem_solving"];

interface InterviewQuestion {
  type: QuestionType;
  question: string;
}

function toQuestionType(value: unknown): QuestionType {
  const s = typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  const match = QUESTION_TYPES.find((t) => t === s);
  return match ?? "technical";
}

function normalizeQuestions(raw: unknown): InterviewQuestion[] {
  const arr = Array.isArray((raw as { questions?: unknown })?.questions)
    ? (raw as { questions: unknown[] }).questions
    : Array.isArray(raw)
    ? raw
    : [];

  return arr
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => ({
      type: toQuestionType(q.type),
      question: typeof q.question === "string" ? q.question.trim() : "",
    }))
    .filter((q) => q.question.length > 0)
    .slice(0, 7);
}

function buildPrompt(input: {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  experienceLevel: string;
}): string {
  return `You are an experienced technical interviewer preparing a candidate for \
a real interview. Generate a personalized mock interview based ONLY on the \
resume and job details below.

Respond with ONLY a single valid JSON object — no markdown, no code fences, \
no commentary before or after it. Match this exact shape:

{
  "questions": [
    { "type": "technical" | "behavioral" | "resume" | "job_specific" | "problem_solving", "question": string }
  ]
}

Rules:
- Generate 5 to 7 questions total, not fewer, not more.
- Include a genuine mix of types: at least one "technical" question tied \
to the required skills, one "behavioral" question, one "resume" question \
that references something specific from the candidate's actual resume \
(a project, employer, or claim), one "job_specific" question tied to what \
this particular role/description asks for, and one "problem_solving" \
question.
- Every question must be specific to this candidate and this role. Do not \
produce generic questions like "Tell me about yourself" or "What are your \
strengths?" that could apply to any candidate.
- Do not invent resume details that aren't present in the text below —
  reference only what's actually there.

Job title: ${input.jobTitle}
Experience level: ${input.experienceLevel || "(not specified)"}
Required/listed skills: ${input.requiredSkills.join(", ") || "(none listed)"}

Job description:
"""
${input.jobDescription.slice(0, 6000) || "(no job description provided)"}
"""

Candidate resume:
"""
${input.resumeText.slice(0, 12000)}
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
    console.log("[1] Authenticating candidate and parsing body...");
    let candidateId: string;

try {
  candidateId = await getCallerId(req);
  console.log("Authenticated:", candidateId);
} catch (e) {
  console.error("AUTH ERROR:", e.message, e.stack);
  throw e;
}
    const { jobId } = (await req.json()) as { jobId?: string };
    console.log(`[1] candidateId=${candidateId} jobId=${jobId}`);

    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[2] Fetching candidate profile and job...");
    const [{ data: user, error: userError }, { data: job, error: jobError }] = await Promise.all([
      supabaseAdmin.from("users").select("role, resume_url").eq("id", candidateId).maybeSingle(),
      supabaseAdmin.from("jobs").select("title, description, skills, experience_level").eq("id", jobId).maybeSingle(),
    ]);

    if (userError) throw userError;
    if (jobError) throw jobError;

    if (!user || user.role !== "candidate") {
      return new Response(JSON.stringify({ error: "Only candidates can practice a mock interview" }), {
        status: 403,
        headers: corsHeaders,
      });
    }
    if (!job) {
      return new Response(JSON.stringify({ error: "This role could not be found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }
    if (!user.resume_url) {
      return new Response(JSON.stringify({ error: "Add a resume to your profile before practicing an interview" }), {
        status: 422,
        headers: corsHeaders,
      });
    }

    let resumePath: string;
    try {
      resumePath = resolveResumeObjectPath(RESUME_BUCKET, user.resume_url);
    } catch (e) {
      console.error("[2] Could not resolve resume object path:", e.message, e);
      return new Response(JSON.stringify({ error: "Your resume reference looks invalid — try re-uploading it." }), {
        status: 422,
        headers: corsHeaders,
      });
    }

    console.log(`[3] Downloading resume — bucket: "${RESUME_BUCKET}", path: "${resumePath}"`);
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from(RESUME_BUCKET)
      .download(resumePath);

    if (downloadError) {
      const isNotFound = /object not found/i.test(downloadError.message ?? "");
      console.error("[3] Resume download failed:", downloadError.message, downloadError);
      return new Response(
        JSON.stringify({
          error: isNotFound
            ? "Your resume file couldn't be found in storage. Please re-upload it on your profile."
            : "Couldn't read your resume file.",
        }),
        { status: isNotFound ? 404 : 500, headers: corsHeaders }
      );
    }

    console.log("[4] Extracting resume text...");
    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const resumeText = await extractResumeText(bytes);

    if (!resumeText || resumeText.length < 30) {
      return new Response(JSON.stringify({ error: "Couldn't read text from your resume." }), {
        status: 422,
        headers: corsHeaders,
      });
    }

    console.log("[5] Calling Gemini for interview questions...");
    const rawResult = await callGeminiForJson(
      buildPrompt({
        resumeText,
        jobTitle: job.title,
        jobDescription: stripHtml(job.description ?? ""),
        requiredSkills: job.skills ?? [],
        experienceLevel: job.experience_level ?? "",
      })
    );

    const questions = normalizeQuestions(rawResult);

    if (questions.length < 3) {
      console.error("[5] Gemini returned too few usable questions:", JSON.stringify(rawResult));
      return new Response(
        JSON.stringify({ error: "Couldn't generate a good set of interview questions. Please try again." }),
        { status: 502, headers: corsHeaders }
      );
    }

    console.log(`[5] Generated ${questions.length} questions`);
    return new Response(JSON.stringify({ questions }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("mock-interview-generate fatal error:", error.message, error.stack, error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate your mock interview" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});