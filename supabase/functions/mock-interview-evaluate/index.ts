import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { getCallerId } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const candidateId = await getCallerId(req);
    if (!candidateId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, questions, answers } = await req.json();

    if (!jobId || !Array.isArray(questions) || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: "jobId, questions, and answers are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

const { data: user } = await supabaseAdmin
  .from("users")
  .select("id, role")
  .eq("id", candidateId)
  .maybeSingle();

if (!user || user.role !== "candidate") {
  return new Response(
    JSON.stringify({ error: "Only candidates can submit mock interviews." }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, title")
      .eq("id", jobId)
      .single();

    if (!job) {
      return new Response(
        JSON.stringify({ error: "Job not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const transcript = questions
      .map((q: any, i: number) => `Q${i + 1} (${q.type}): ${q.question}\nA: ${answers[i] || "(No answer provided)"}`)
      .join("\n\n");

    const prompt = `You are an expert technical interviewer evaluating a practice mock interview for the role of "${job.title}".

Transcript:
${transcript}

Evaluate the candidate's performance thoroughly and objectively based on their answers.

Return ONLY a raw JSON object (no markdown formatting, no code blocks) with this exact schema:
{
  "overallScore": number (0-100),
  "technicalScore": number (0-100),
  "communicationScore": number (0-100),
  "strengths": string[] (2-4 key strengths shown in answers),
  "weaknesses": string[] (2-4 weaknesses or missing details),
  "improvements": string[] (2-4 actionable suggestions),
  "sampleBetterAnswers": string[] (1-3 examples of stronger answers for questions they struggled with)
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const cleanJson = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

    let evaluation;
    try {
      evaluation = JSON.parse(cleanJson);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse evaluation response from Gemini." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clamp = (num: number) => Math.min(100, Math.max(0, Math.round(num || 0)));
    const overallScore = clamp(evaluation.overallScore);
    const technicalScore = clamp(evaluation.technicalScore);
    const communicationScore = clamp(evaluation.communicationScore);

    const feedbackJson = {
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      improvements: evaluation.improvements || [],
      sampleBetterAnswers: evaluation.sampleBetterAnswers || [],
      questions,
      answers,
    };

    const { data: savedRecord, error: insertError } = await supabaseAdmin
      .from("mock_interviews")
      .insert({
        candidate_id: user.id,
        job_id: jobId,
        overall_score: overallScore,
        technical_score: technicalScore,
        communication_score: communicationScore,
        feedback_json: feedbackJson,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to save mock interview results." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        id: savedRecord.id,
        overallScore,
        technicalScore,
        communicationScore,
        strengths: feedbackJson.strengths,
        weaknesses: feedbackJson.weaknesses,
        improvements: feedbackJson.improvements,
        sampleBetterAnswers: feedbackJson.sampleBetterAnswers,
        createdAt: savedRecord.created_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});