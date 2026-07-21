import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, SpellCheck2, ListChecks, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/chip";
import { fetchResumeReview } from "@/api/ai-analysis";

interface ResumeReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
}

/* ------------------------------------------------------------------ */
/* Animated count-up, used by the score cards. Runs once per mount.    */
/* Respects prefers-reduced-motion by resolving immediately.           */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf: number;

    if (prefersReducedMotion) {
      raf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(raf);
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

function ScoreCard({ label, score, active }: { label: string; score: number; active: boolean }) {
  const displayed = useCountUp(score, active);

  return (
    <div className="border border-grid p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-ink">
        {displayed}
        <span className="text-lg font-sans font-normal text-ink-soft">%</span>
      </p>
      <div
        className="mt-3 h-1.5 w-full bg-paper-dim"
        role="progressbar"
        aria-label={label}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-1.5 bg-signal"
          initial={{ width: 0 }}
          animate={active ? { width: `${score}%` } : { width: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function StrengthsList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Identified strengths" icon={<CheckCircle2 className="h-3.5 w-3.5 text-meadow" />}>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function WeaknessesList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Areas to improve" icon={<AlertTriangle className="h-3.5 w-3.5 text-amber" />}>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function GrammarList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Grammar review" icon={<SpellCheck2 className="h-3.5 w-3.5 text-ink-soft" />}>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span className="text-ink-soft">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function MissingSkillsChips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Missing skills">
      <div className="flex flex-wrap gap-2">
        {items.map((skill) => (
          <Chip key={skill} className="text-signal border-signal/40">
            {skill}
          </Chip>
        ))}
      </div>
    </Section>
  );
}

function ActionPlan({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Action plan" icon={<ListChecks className="h-3.5 w-3.5 text-signal" />}>
      <ol className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-ink">
            <span className="index-figure mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-signal text-[11px] text-signal">
              {i + 1}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Loading state: skeleton shell + a rotating caption so a ~5-10s      */
/* analysis doesn't read as a dead, frozen dialog.                     */
/* ------------------------------------------------------------------ */
const ANALYSIS_MESSAGES = [
  "Reading resume structure…",
  "Scoring ATS compatibility…",
  "Cross-referencing skill gaps…",
  "Checking grammar and phrasing…",
  "Drafting your action plan…",
];

function ReviewLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ANALYSIS_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div aria-live="polite" role="status" className="space-y-6">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping bg-signal opacity-75" />
          <span className="relative inline-flex h-2 w-2 bg-signal" />
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={messageIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {ANALYSIS_MESSAGES[messageIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 border border-grid bg-paper-dim" />
          <div className="h-28 border border-grid bg-paper-dim" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-1/4 bg-paper-dim" />
          <div className="h-3 w-3/4 bg-paper-dim" />
          <div className="h-3 w-2/3 bg-paper-dim" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-1/3 bg-paper-dim" />
          <div className="h-3 w-2/3 bg-paper-dim" />
        </div>
      </div>
    </div>
  );
}

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export function ResumeReviewDialog({ isOpen, onOpenChange, candidateId }: ResumeReviewDialogProps) {
  const query = useQuery({
    queryKey: ["ai-resume-review-v2", candidateId],
    queryFn: fetchResumeReview,
    enabled: isOpen,
    staleTime: Infinity,
    retry: false,
  });

  // Score cards animate in whenever data is available for an open dialog —
  // including on reopen, since staleTime: Infinity means reopening often
  // just replays cached data rather than refetching.
  const scoresActive = Boolean(query.data) && isOpen;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto border border-grid bg-paper p-6 shadow-xl z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-grid pb-4 mb-6">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-ink">
                <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                AI Resume Analysis
              </Dialog.Title>
              <Dialog.Description className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                Generated by Gemini
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-grid hover:border-signal hover:text-signal text-ink-soft cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {query.isLoading && <ReviewLoadingState />}

          {query.isError && (
            <div className="border border-grid p-6 text-center">
              <p className="text-sm text-ink">{(query.error as Error).message}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {query.data && (
            <div className="space-y-6">
              <motion.div
                {...fadeInUp}
                transition={{ duration: 0.35, delay: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                <ScoreCard label="Resume score" score={query.data.resumeScore} active={scoresActive} />
                <ScoreCard label="ATS score" score={query.data.atsScore} active={scoresActive} />
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.06 }}>
                <StrengthsList items={query.data.strengths ?? []} />
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.12 }}>
                <MissingSkillsChips items={query.data.missingSkills ?? []} />
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.18 }}>
                <WeaknessesList items={query.data.weaknesses ?? []} />
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.24 }}>
                <GrammarList items={query.data.grammarIssues ?? []} />
              </motion.div>

              <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.3 }}>
                <ActionPlan items={query.data.suggestions ?? []} />
              </motion.div>

              <motion.div
                {...fadeInUp}
                transition={{ duration: 0.35, delay: 0.36 }}
                className="flex items-center justify-between border-t border-grid pt-4 font-mono text-[11px] uppercase tracking-wide text-ink-soft"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-meadow" aria-hidden="true" />
                  Analysis completed successfully
                </span>
                <span>Generated by Gemini</span>
              </motion.div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}