import { useState } from "react";
import {
  generateMockInterview,
  evaluateMockInterview,
  type InterviewQuestion,
  type MockInterviewResult,
} from "@/api/mock-interview";

export type MockInterviewPhase = "idle" | "generating" | "in-progress" | "submitting" | "error";

interface InterviewDraft {
  jobId: string;
  questions: InterviewQuestion[];
  answers: string[];
  currentIndex: number;
}

function draftKey(candidateId: string, jobId: string) {
  return `hirrd:mock-interview:${candidateId}:${jobId}`;
}

function readDraft(candidateId: string, jobId: string): InterviewDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(candidateId, jobId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterviewDraft;
    if (!Array.isArray(parsed.questions) || !Array.isArray(parsed.answers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(candidateId: string, draft: InterviewDraft) {
  try {
    localStorage.setItem(draftKey(candidateId, draft.jobId), JSON.stringify(draft));
  } catch {
    // Storage full/unavailable — losing autosave is non-fatal, the
    // candidate can still finish the session in this tab.
  }
}

function clearDraft(candidateId: string, jobId: string) {
  try {
    localStorage.removeItem(draftKey(candidateId, jobId));
  } catch {
    // no-op
  }
}

/**
 * Orchestrates one AI Mock Interview session for a given job: generating
 * questions, navigating between them, autosaving answers to localStorage
 * so a candidate can leave and come back, and submitting for evaluation.
 *
 * A session is scoped to (candidateId, jobId) — starting again for the
 * same job resumes any unfinished draft instead of regenerating questions.
 */
export function useMockInterview(jobId: string, candidateId: string | undefined) {
  const [phase, setPhase] = useState<MockInterviewPhase>("idle");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Derived straight from localStorage rather than mirrored into state —
  // it only needs to reflect "is there a draft right now" whenever this
  // renders (before starting, after submit/abandon clears it), not track
  // changes from some external subscription.
  const hasDraft = candidateId ? readDraft(candidateId, jobId) !== null : false;

  async function start() {
    if (!candidateId) return;
    setErrorMessage(null);

    const draft = readDraft(candidateId, jobId);
    if (draft) {
      setQuestions(draft.questions);
      setAnswers(draft.answers);
      setCurrentIndex(draft.currentIndex);
      setPhase("in-progress");
      return;
    }

    setPhase("generating");
    try {
      const generated = await generateMockInterview(jobId);
      const initialAnswers = new Array(generated.length).fill("");
      setQuestions(generated);
      setAnswers(initialAnswers);
      setCurrentIndex(0);
      setPhase("in-progress");
      writeDraft(candidateId, { jobId, questions: generated, answers: initialAnswers, currentIndex: 0 });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong generating your interview.");
      setPhase("error");
    }
  }

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      if (candidateId) writeDraft(candidateId, { jobId, questions, answers: next, currentIndex });
      return next;
    });
  }

  function goTo(index: number) {
    const clamped = Math.max(0, Math.min(questions.length - 1, index));
    setCurrentIndex(clamped);
    if (candidateId) writeDraft(candidateId, { jobId, questions, answers, currentIndex: clamped });
  }

  async function submit(): Promise<MockInterviewResult> {
    setPhase("submitting");
    setErrorMessage(null);
    try {
      const result = await evaluateMockInterview(jobId, questions, answers);
      if (candidateId) clearDraft(candidateId, jobId);
      setPhase("idle");
      return result;
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong evaluating your interview.");
      setPhase("in-progress");
      throw e;
    }
  }

  /** Discards the in-progress session (and its draft) without submitting. */
  function abandon() {
    if (candidateId) clearDraft(candidateId, jobId);
    setPhase("idle");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setErrorMessage(null);
  }

  /** Resets local view state only — used after a dialog closes mid-session, keeping the draft intact. */
  function reset() {
    setPhase("idle");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setErrorMessage(null);
  }

  return {
    phase,
    questions,
    answers,
    currentIndex,
    errorMessage,
    hasDraft,
    start,
    setAnswer,
    goTo,
    submit,
    abandon,
    reset,
  };
}