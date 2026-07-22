import { useEffect, useState } from "react";
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
    <div aria-live="polite" role="status" className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal">
      <span className="relative flex h-2 w-2">
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

  async function handleSubmit() {
    try {
      const result = await onSubmit();
      onSubmitted(result);
    } catch {
      // errorMessage is already surfaced by the hook — stay on this view.
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 border border-grid bg-paper p-6 shadow-xl z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 border-b border-grid pb-4 mb-5">
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

          {phase === "generating" && (
            <div className="space-y-6">
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

          {(phase === "in-progress" || phase === "submitting") && total > 0 && (
            <div>
              <InterviewProgress currentIndex={currentIndex} total={total} />

              <div className="mt-6">
                <InterviewQuestionCard
                  questionKey={currentIndex}
                  question={questions[currentIndex]}
                  answer={currentAnswer}
                  onAnswerChange={onAnswerChange}
                />
              </div>

              {errorMessage && <p className="mt-4 text-sm text-signal">{errorMessage}</p>}

              {phase === "submitting" ? (
                <div className="mt-6 border-t border-grid pt-5">
                  <RotatingCaption messages={SUBMITTING_MESSAGES} />
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-between border-t border-grid pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGoTo(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="cursor-pointer"
                  >
                    Previous
                  </Button>
                  {isLastQuestion ? (
                    <Button size="sm" onClick={handleSubmit} className="cursor-pointer">
                      Submit interview
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onGoTo(currentIndex + 1)} className="cursor-pointer">
                      Next
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}