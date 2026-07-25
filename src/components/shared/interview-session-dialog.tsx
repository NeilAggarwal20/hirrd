import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InterviewProgress } from "@/components/shared/interview-progress";
import { InterviewQuestionCard } from "@/components/shared/interview-question-card";
import type { InterviewQuestion, MockInterviewResult } from "@/api/mock-interview";
import type { MockInterviewPhase } from "@/hooks/use-mock-interview";

const GENERATING_MESSAGES = [
  "Reading your resume…",
  "Reviewing the job description…",
  "Drafting personalized questions…",
];

const SUBMITTING_MESSAGES = ["Reviewing your answers…", "Scoring your interview…", "Preparing feedback…"];

function RotatingCaption({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % messages.length), 1500);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping bg-signal opacity-75" />
        <span className="relative inline-flex h-2 w-2 bg-signal" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

interface InterviewSessionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  phase: MockInterviewPhase;
  questions: InterviewQuestion[];
  answers: string[];
  currentIndex: number;
  errorMessage: string | null;
  onAnswerChange: (value: string) => void;
  onGoTo: (index: number) => void;
  onSubmit: () => Promise<MockInterviewResult>;
  onRetryGeneration: () => void;
  onSubmitted: (result: MockInterviewResult) => void;
}

export function InterviewSessionDialog({
  isOpen,
  onOpenChange,
  phase,
  questions,
  answers,
  currentIndex,
  errorMessage,
  onAnswerChange,
  onGoTo,
  onSubmit,
  onRetryGeneration,
  onSubmitted,
}: InterviewSessionDialogProps) {
  const total = questions.length;
  const isLastQuestion = currentIndex === total - 1;
  const currentAnswer = answers[currentIndex] ?? "";
  const isSubmitting = phase === "submitting";
  const isLiveQuestion = (phase === "in-progress" || phase === "submitting") && total > 0;

  // Belt-and-suspenders alongside the disabled button and the hook's own
  // in-flight de-duplication: guarantees this handler can't kick off a
  // second onSubmit() call while one is still resolving, regardless of
  // render timing.
  const isHandlingSubmitRef = useRef(false);

  async function handleSubmit() {
    if (isHandlingSubmitRef.current) return;
    isHandlingSubmitRef.current = true;
    try {
      const result = await onSubmit();
      onSubmitted(result);
    } catch {
      // errorMessage is already surfaced by the hook — stay on this view,
      // with everything still in place to retry.
    } finally {
      isHandlingSubmitRef.current = false;
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        {/*
          Three fixed-height-independent regions stacked in a column:
          header (title +, once a question is live, the progress bar)
          and footer (status line + Previous/Next/Submit) never scroll —
          only the middle (question + answer) does. max-h caps the whole
          dialog so it can never exceed the viewport; overflow-hidden on
          the outer element keeps the border/corners clean while the
          middle region owns its own overflow-y-auto.
        */}
        <Dialog.Content className="fixed top-1/2 left-1/2 flex max-h-[90vh] w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-grid bg-paper shadow-xl z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="shrink-0 border-b border-grid p-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-ink">
                <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                AI Mock Interview
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 border-grid hover:border-signal hover:text-signal text-ink-soft cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Answer one interview question at a time, then submit for AI feedback.
            </Dialog.Description>

            {isLiveQuestion && (
              <div className="mt-5">
                <InterviewProgress currentIndex={currentIndex} total={total} />
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {phase === "generating" && (
              <div className="space-y-6" aria-live="polite" role="status">
                <RotatingCaption messages={GENERATING_MESSAGES} />
                <div aria-hidden="true" className="animate-pulse space-y-3">
                  <div className="h-5 w-2/3 bg-paper-dim" />
                  <div className="h-24 bg-paper-dim" />
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="border border-grid p-6 text-center">
                <p className="text-sm text-ink">{errorMessage}</p>
                <Button variant="outline" size="sm" className="mt-4 cursor-pointer" onClick={onRetryGeneration}>
                  Try again
                </Button>
              </div>
            )}

            {isLiveQuestion && (
              <InterviewQuestionCard
                questionKey={currentIndex}
                question={questions[currentIndex]}
                answer={currentAnswer}
                onAnswerChange={onAnswerChange}
                disabled={isSubmitting}
              />
            )}
          </div>

          {isLiveQuestion && (
            <div className="shrink-0 border-t border-grid p-6 pt-5">
              {/* Reserved-height status line: whichever of these two
                  states is showing, the button row below never moves. */}
              <div className="min-h-[1.25rem]" aria-live="polite" role="status">
                {isSubmitting ? (
                  <RotatingCaption messages={SUBMITTING_MESSAGES} />
                ) : (
                  errorMessage && <p className="text-sm text-signal">{errorMessage}</p>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGoTo(currentIndex - 1)}
                  disabled={currentIndex === 0 || isSubmitting}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                {isLastQuestion ? (
                  <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="cursor-pointer">
                    {isSubmitting ? "Submitting…" : "Submit interview"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onGoTo(currentIndex + 1)}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}