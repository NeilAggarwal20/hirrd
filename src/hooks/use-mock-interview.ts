import { useRef, useState } from "react";
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
 *
 * Both start() and submit() de-duplicate concurrent calls: if one is
 * already in flight (e.g. a fast double-click before the UI's disabled
 * state takes effect), a second call reuses the same in-flight promise
 * instead of firing a second request — belt-and-suspenders alongside the
 * UI's own disabled buttons, and the layer that actually prevents a race
 * regardless of render timing.
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

  const startPromiseRef = useRef<Promise<void> | null>(null);
  const submitPromiseRef = useRef<Promise<MockInterviewResult> | null>(null);

  function start(): Promise<void> {
    if (!candidateId) return Promise.resolve();
    if (startPromiseRef.current) return startPromiseRef.current;

    const promise = (async () => {
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
    })().finally(() => {
      startPromiseRef.current = null;
    });

    startPromiseRef.current = promise;
    return promise;
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

  function submit(): Promise<MockInterviewResult> {
    if (submitPromiseRef.current) return submitPromiseRef.current;

    setPhase("submitting");
    setErrorMessage(null);

    const promise = (async () => {
      try {
        const result = await evaluateMockInterview(jobId, questions, answers);
        if (candidateId) clearDraft(candidateId, jobId);
        setPhase("idle");
        return result;
      } catch (e) {
        // Answers are untouched here — the caller stays on the same
        // question, in-progress, free to retry without losing anything.
        setErrorMessage(e instanceof Error ? e.message : "Something went wrong evaluating your interview.");
        setPhase("in-progress");
        throw e;
      }
    })().finally(() => {
      submitPromiseRef.current = null;
    });

    submitPromiseRef.current = promise;
    return promise;
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