// Supabase Edge Function (Deno runtime).
//
// Deploy:   supabase functions deploy mock-interview-evaluate
// Secrets:  supabase secrets set GEMINI_API_KEY=your_key_here (already set
//           for the other AI functions)
//
// Invoked via supabase.functions.invoke("mock-interview-evaluate", {
//   body: { jobId, questions, answers }
// }).
//
// This is the only place a mock_interviews row is written — the
// in-progress draft (questions + answers as the candidate works through
// them) lives client-side until this call succeeds.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerId } from "../_shared/auth.ts";
import { callGeminiForJson, GeminiServiceError } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface InterviewQuestion {
  type: string;
  question: string;
}

interface Feedback {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  sampleBetterAnswers: string[];
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeFeedback(raw: unknown): Feedback {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    overallScore: clampScore(r.overallScore),
    technicalScore: clampScore(r.technicalScore),
    communicationScore: clampScore(r.communicationScore),
    strengths: toStringArray(r.strengths),
    weaknesses: toStringArray(r.weaknesses),
    improvements: toStringArray(r.improvements),
    sampleBetterAnswers: toStringArray(r.sampleBetterAnswers, 6),
  };
}

function buildPrompt(qa: { question: string; type: string; answer: string }[]): string {
  const transcript = qa
    .map(
      (item, i) =>
        `Q${i + 1} (${item.type}): ${item.question}\nCandidate's answer: ${
          item.answer.trim() || "(left blank)"
        }`
    )
    .join("\n\n");

  return `You are a senior interviewer giving a candidate direct, constructive \
feedback after a mock interview. Judge ONLY what's in the transcript below \
— do not invent claims the candidate didn't make.

Respond with ONLY a single valid JSON object — no markdown, no code fences, \
no commentary before or after it. Match this exact shape:

{
  "overallScore": number between 0 and 100,
  "technicalScore": number between 0 and 100,
  "communicationScore": number between 0 and 100,
  "strengths": string[],
  "weaknesses": string[],
  "improvements": string[],
  "sampleBetterAnswers": string[]
}

Field guidance:
- "technicalScore" reflects the accuracy and depth of answers to technical/
  problem-solving questions specifically.
- "communicationScore" reflects clarity, structure, and confidence of the
  answers as written, independent of technical correctness.
- "overallScore" weighs both together.
- A question left blank should count against the relevant scores — don't
  ignore it.
- "strengths" and "weaknesses" must reference specific answers, not
  generic interview advice.
- "improvements" are concrete, actionable tips tied to what was actually
  weak in this transcript.
- "sampleBetterAnswers" gives 2-4 short model answers for the weakest
  questions, each prefixed with which question it improves on (e.g.
  "For the React reconciliation question: ...").

Interview transcript:
"""
${transcript}
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
    const candidateId = await getCallerId(req);
    const body = (await req.json()) as {
      jobId?: string;
      questions?: InterviewQuestion[];
      answers?: string[];
    };
    const { jobId, questions, answers } = body;
    console.log(`[1] candidateId=${candidateId} jobId=${jobId} questions=${questions?.length} answers=${answers?.length}`);

    if (
      !jobId ||
      !Array.isArray(questions) ||
      !Array.isArray(answers) ||
      questions.length === 0 ||
      questions.length !== answers.length
    ) {
      return new Response(
        JSON.stringify({ error: "jobId, questions, and matching answers are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[2] Verifying job exists...");
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) {
      return new Response(JSON.stringify({ error: "This role could not be found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const qa = questions.map((q, i) => ({
      type: typeof q?.type === "string" ? q.type : "technical",
      question: typeof q?.question === "string" ? q.question : "",
      answer: typeof answers[i] === "string" ? answers[i] : "",
    }));

    console.log("[3] Calling Gemini for interview evaluation...");
    const rawResult = await callGeminiForJson(buildPrompt(qa));
    const feedback = normalizeFeedback(rawResult);
    console.log("[3] Normalized feedback:", JSON.stringify(feedback));

    console.log("[4] Persisting interview history...");
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("mock_interviews")
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        overall_score: feedback.overallScore,
        technical_score: feedback.technicalScore,
        communication_score: feedback.communicationScore,
        feedback_json: {
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          improvements: feedback.improvements,
          sampleBetterAnswers: feedback.sampleBetterAnswers,
          questions: qa.map(({ type, question }) => ({ type, question })),
          answers: qa.map(({ answer }) => answer),
        },
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      // Evaluation itself succeeded — only the save failed. Say so
      // specifically, since "couldn't evaluate your interview" would be
      // misleading (and would make a retry regenerate a whole new
      // evaluation for what's really just a database hiccup).
      console.error("[4] Failed to save interview history:", insertError.message, insertError);
      return new Response(
        JSON.stringify({
          error: "Your interview was scored, but saving it to your history failed. Please try submitting again.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }
    console.log(`[4] Saved mock_interviews row ${inserted.id}`);

    return new Response(
      JSON.stringify({
        id: inserted.id,
        createdAt: inserted.created_at,
        ...feedback,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      console.error("mock-interview-evaluate: Gemini service error:", error.status, error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: corsHeaders,
      });
    }
    console.error("mock-interview-evaluate fatal error:", error.message, error.stack, error);
    return new Response(JSON.stringify({ error: error.message || "Failed to evaluate your interview" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});