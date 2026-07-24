import { supabase, getClerkTokenValue } from "@/lib/supabase";
import { readFunctionErrorMessage } from "@/api/ai-analysis";
import type { MockInterviewRow } from "@/types/database.types";

export type InterviewQuestionType =
  | "technical"
  | "behavioral"
  | "resume"
  | "job_specific"
  | "problem_solving";

export interface InterviewQuestion {
  type: InterviewQuestionType;
  question: string;
}

export interface MockInterviewFeedback {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  sampleBetterAnswers: string[];
}

export interface MockInterviewResult extends MockInterviewFeedback {
  id: string;
  createdAt: string;
}

export interface MockInterviewHistoryItem extends MockInterviewFeedback {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  questions: InterviewQuestion[];
  answers: string[];
  createdAt: string;
}

/**
 * Generates a fresh, personalized set of mock interview questions for one
 * job, from the caller's own resume. Nothing is persisted by this call —
 * the question set becomes a client-side draft until submitted for
 * evaluation.
 */
export async function generateMockInterview(jobId: string): Promise<InterviewQuestion[]> {
  const token = await getClerkTokenValue();

  const { data: rawData, error } = await supabase.functions.invoke<{ questions: InterviewQuestion[] }>(
    "mock-interview-generate",
    {
      body: { jobId },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (error)
    throw new Error(await readFunctionErrorMessage(error, "Couldn't generate your mock interview."));
  if (!rawData) throw new Error("Couldn't generate your mock interview.");

  const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  return data.questions;
}

/** Submits answers for evaluation and permanently saves the result to interview history. */
export async function evaluateMockInterview(
  jobId: string,
  questions: InterviewQuestion[],
  answers: string[]
): Promise<MockInterviewResult> {
  const token = await getClerkTokenValue();

  const { data: rawData, error } = await supabase.functions.invoke<MockInterviewResult>(
    "mock-interview-evaluate",
    {
      body: { jobId, questions, answers },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (error)
    throw new Error(await readFunctionErrorMessage(error, "Couldn't evaluate your interview."));
  if (!rawData) throw new Error("Couldn't evaluate your interview.");

  const data: MockInterviewResult = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  return data;
}

interface MockInterviewJoinRow extends MockInterviewRow {
  jobs: { title: string; companies: { name: string } | null } | null;
}

function mapMockInterviewRow(row: MockInterviewJoinRow): MockInterviewHistoryItem {
  const feedback = (row.feedback_json ?? {}) as Partial<MockInterviewFeedback> & {
    questions?: InterviewQuestion[];
    answers?: string[];
  };

  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.jobs?.title ?? "Deleted role",
    companyName: row.jobs?.companies?.name ?? "—",
    overallScore: row.overall_score,
    technicalScore: row.technical_score,
    communicationScore: row.communication_score,
    strengths: feedback.strengths ?? [],
    weaknesses: feedback.weaknesses ?? [],
    improvements: feedback.improvements ?? [],
    sampleBetterAnswers: feedback.sampleBetterAnswers ?? [],
    questions: feedback.questions ?? [],
    answers: feedback.answers ?? [],
    createdAt: row.created_at,
  };
}

const MOCK_INTERVIEW_SELECT = `id, job_id, overall_score, technical_score, communication_score, feedback_json, created_at,
   jobs ( title, companies ( name ) )`;

/** Lists the caller's own past mock interviews, most recent first. */
export async function fetchMyMockInterviews(candidateId: string): Promise<MockInterviewHistoryItem[]> {
  const { data, error } = await supabase
    .from("mock_interviews")
    .select(MOCK_INTERVIEW_SELECT)
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data as unknown as MockInterviewJoinRow[];
  return rows.map(mapMockInterviewRow);
}

/**
 * Fetches one past interview by id — used by the Interview Results page
 * when it's opened directly (a refresh, a bookmark, or a shared link)
 * rather than arriving with the result already in navigation state.
 * RLS (mock_interviews_select_owner) enforces the candidate_id match
 * server-side regardless, but filtering here too keeps a mistaken id
 * from ever momentarily resolving to someone else's row client-side.
 */
export async function fetchMockInterviewById(
  id: string,
  candidateId: string
): Promise<MockInterviewHistoryItem | null> {
  const { data, error } = await supabase
    .from("mock_interviews")
    .select(MOCK_INTERVIEW_SELECT)
    .eq("id", id)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapMockInterviewRow(data as unknown as MockInterviewJoinRow);
}