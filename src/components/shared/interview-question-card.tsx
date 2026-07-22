import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewQuestion } from "@/api/mock-interview";

const TYPE_LABELS: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  resume: "Resume",
  job_specific: "Role-specific",
  problem_solving: "Problem solving",
};

interface InterviewQuestionCardProps {
  question: InterviewQuestion;
  answer: string;
  onAnswerChange: (value: string) => void;
  questionKey: string | number;
}

export function InterviewQuestionCard({
  question,
  answer,
  onAnswerChange,
  questionKey,
}: InterviewQuestionCardProps) {
  return (
    <motion.div
      key={questionKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <span className="inline-block border border-grid px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
        {TYPE_LABELS[question.type] ?? "Question"}
      </span>
      <p className="mt-3 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
        {question.question}
      </p>
      <Textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Type your answer…"
        rows={7}
        className="mt-5"
        aria-label="Your answer"
      />
    </motion.div>
  );
}