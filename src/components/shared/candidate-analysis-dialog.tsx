import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  MessageCircleQuestion,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/chip";
import { fetchCandidateAnalysis } from "@/api/ai-analysis";
import { getResumeSignedUrl } from "@/api/storage";
import type { CandidateRecommendation } from "@/api/ai-analysis";
import { cn } from "@/lib/utils";

interface CandidateAnalysisDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
  jobTitle?: string;
  resumePath: string;
}

/* ------------------------------------------------------------------ */
/* Animated count-up, mirrors the one in resume-review-dialog.tsx.     */
/* Kept local to this file — each AI report dialog in this app is a    */
/* self-contained unit, matching the existing convention.              */
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

function MetricCard({ label, score, active, hero }: { label: string; score: number; active: boolean; hero?: boolean }) {
  const displayed = useCountUp(score, active);

  return (
    <div className={cn("border border-grid p-4", hero && "bg-paper-dim")}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">{label}</p>
      <p className={cn("mt-2 font-display font-extrabold tabular-nums text-ink", hero ? "text-5xl" : "text-3xl")}>
        {displayed}
        <span className={cn("font-sans font-normal text-ink-soft", hero ? "text-xl" : "text-base")}>%</span>
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
          className={cn("h-1.5", hero ? "bg-signal" : "bg-ink")}
          initial={{ width: 0 }}
          animate={active ? { width: `${score}%` } : { width: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

const RECOMMENDATION_STYLES: Record<CandidateRecommendation, string> = {
  "Highly Recommended": "border-meadow text-meadow bg-meadow-dim",
  "Recommended": "border-ink text-ink bg-paper-dim",
  "Consider": "border-amber text-amber bg-amber-dim",
  "Not Recommended": "border-signal text-signal bg-signal/10",
};

function RecommendationBadge({ recommendation }: { recommendation: CandidateRecommendation }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-3 py-1 font-mono text-xs uppercase tracking-[0.15em]",
        RECOMMENDATION_STYLES[recommendation]
      )}
    >
      {recommendation}
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
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

/* ------------------------------------------------------------------ */
/* Loading state: skeleton shell + rotating captions describing each   */
/* analysis stage.                                                     */
/* ------------------------------------------------------------------ */
const ANALYSIS_MESSAGES = [
  "Analyzing candidate…",
  "Reading resume…",
  "Extracting skills…",
  "Comparing with job requirements…",
  "Generating hiring summary…",
  "Preparing interview questions…",
  "Almost done…",
];

function AnalysisLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ANALYSIS_MESSAGES.length);
    }, 1600);
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
        <div className="h-16 border border-grid bg-paper-dim" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="h-24 border border-grid bg-paper-dim" />
          <div className="h-24 border border-grid bg-paper-dim" />
          <div className="h-24 border border-grid bg-paper-dim" />
          <div className="h-24 border border-grid bg-paper-dim" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-1/4 bg-paper-dim" />
          <div className="h-3 w-3/4 bg-paper-dim" />
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

export function CandidateAnalysisDialog({
  isOpen,
  onOpenChange,
  applicationId,
  candidateName,
  jobTitle,
  resumePath,
}: CandidateAnalysisDialogProps) {
  const [isResumeExpanded, setIsResumeExpanded] = useState(false);
  const [resumeSignedUrl, setResumeSignedUrl] = useState<string | null>(null);
  const [isResumeLoading, setIsResumeLoading] = useState(false);

  const query = useQuery({
    queryKey: ["candidate-analysis", applicationId],
    queryFn: () => fetchCandidateAnalysis(applicationId),
    enabled: isOpen,
    staleTime: Infinity,
    retry: false,
  });

  const scoresActive = Boolean(query.data) && isOpen;

  // Reset the resume panel whenever the dialog closes, so a different
  // candidate's dialog always opens back to the collapsed AI report view.
  function handleOpenChange(open: boolean) {
    if (!open) {
      setIsResumeExpanded(false);
      setResumeSignedUrl(null);
    }
    onOpenChange(open);
  }

  async function toggleResume() {
    if (isResumeExpanded) {
      setIsResumeExpanded(false);
      return;
    }
    setIsResumeExpanded(true);
    if (!resumeSignedUrl) {
      setIsResumeLoading(true);
      try {
        const url = await getResumeSignedUrl(resumePath);
        setResumeSignedUrl(url);
      } catch {
        toast.error("Couldn't load this resume.");
        setIsResumeExpanded(false);
      } finally {
        setIsResumeLoading(false);
      }
    }
  }

  async function downloadResume() {
    try {
      const url = resumeSignedUrl ?? (await getResumeSignedUrl(resumePath));
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      link.rel = "noopener noreferrer";
      link.click();
    } catch {
      toast.error("Couldn't download this resume.");
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-all duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-3xl max-h-[88vh] overflow-y-auto border border-grid bg-paper p-6 shadow-xl z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 border-b border-grid pb-4 mb-6">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-ink">
                <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                AI Candidate Analysis
              </Dialog.Title>
              <p className="mt-1 text-sm font-medium text-ink">
                {candidateName}
                {jobTitle && <span className="text-ink-soft"> — {jobTitle}</span>}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {query.data && <RecommendationBadge recommendation={query.data.recommendation} />}
                <Dialog.Description className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                  Generated by Gemini
                </Dialog.Description>
              </div>
            </div>
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

          {query.isLoading && <AnalysisLoadingState />}

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
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              >
                <div className="col-span-2 sm:col-span-1">
                  <MetricCard label="Overall fit" score={query.data.fitScore} active={scoresActive} hero />
                </div>
                <MetricCard label="Skills match" score={query.data.skillsMatch} active={scoresActive} />
                <MetricCard label="Experience match" score={query.data.experienceMatch} active={scoresActive} />
                <MetricCard label="Communication" score={query.data.communicationScore} active={scoresActive} />
                <MetricCard label="Education match" score={query.data.educationMatch} active={scoresActive} />
              </motion.div>

              {query.data.recruiterSummary && (
                <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.06 }}>
                  <Section title="Recruiter summary">
                    <div className="space-y-2 border border-grid p-4 text-sm leading-relaxed text-ink">
                      {query.data.recruiterSummary.split(/\n{2,}/).map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </Section>
                </motion.div>
              )}

              {query.data.strengths.length > 0 && (
                <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.12 }}>
                  <Section title="Strengths" icon={<CheckCircle2 className="h-3.5 w-3.5 text-meadow" />}>
                    <ul className="space-y-1.5">
                      {query.data.strengths.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                </motion.div>
              )}

              {query.data.missingSkills.length > 0 && (
                <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.18 }}>
                  <Section title="Missing skills">
                    <div className="flex flex-wrap gap-2">
                      {query.data.missingSkills.map((skill) => (
                        <Chip key={skill} className="text-signal border-signal/40">
                          {skill}
                        </Chip>
                      ))}
                    </div>
                  </Section>
                </motion.div>
              )}

              {query.data.concerns.length > 0 && (
                <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.24 }}>
                  <Section title="Concerns" icon={<AlertTriangle className="h-3.5 w-3.5 text-amber" />}>
                    <ul className="space-y-1.5">
                      {query.data.concerns.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink">
                          <span className="text-amber">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                </motion.div>
              )}

              {query.data.interviewQuestions.length > 0 && (
                <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.3 }}>
                  <Section
                    title="Suggested interview questions"
                    icon={<MessageCircleQuestion className="h-3.5 w-3.5 text-signal" />}
                  >
                    <ol className="space-y-2.5">
                      {query.data.interviewQuestions.map((item, i) => (
                        <li key={i} className="flex gap-3 text-sm text-ink">
                          <span className="index-figure mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-signal text-[11px] text-signal">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </Section>
                </motion.div>
              )}

              {query.data.hiringRecommendation && (
                <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.36 }}>
                  <Section title="Hiring recommendation">
                    <div className="border border-ink bg-ink p-5">
                      <p className="font-display text-base font-semibold leading-snug text-paper">
                        {query.data.hiringRecommendation}
                      </p>
                    </div>
                  </Section>
                </motion.div>
              )}

              <motion.div
                {...fadeInUp}
                transition={{ duration: 0.35, delay: 0.42 }}
                className="flex items-center justify-between border-t border-b border-grid py-4 font-mono text-[11px] uppercase tracking-wide text-ink-soft"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-meadow" aria-hidden="true" />
                  Analysis completed successfully
                </span>
                <span>Generated by Gemini</span>
              </motion.div>

              {/* --------------------------------------------------- */}
              {/* Full resume — kept available at all times, but      */}
              {/* collapsed by default so the AI report is what the   */}
              {/* recruiter reads first.                              */}
              {/* --------------------------------------------------- */}
              <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.48 }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    Full resume
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadResume} className="gap-1.5 cursor-pointer">
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                    {resumeSignedUrl && (
                      <Button variant="outline" size="sm" asChild className="gap-1.5 cursor-pointer">
                        <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={toggleResume} className="gap-1.5 cursor-pointer">
                      {isResumeExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" /> Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> Expand resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isResumeExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 h-[60vh] w-full overflow-hidden border border-grid bg-paper-dim">
                        {isResumeLoading && (
                          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-wide text-ink-soft">
                            Loading resume…
                          </div>
                        )}
                        {!isResumeLoading && resumeSignedUrl && (
                          <iframe
                            src={`${resumeSignedUrl}#toolbar=0`}
                            title="Candidate resume"
                            className="h-full w-full border-none"
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
