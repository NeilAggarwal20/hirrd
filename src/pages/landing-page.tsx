import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Mic, UserSearch, Check, Sparkles, CheckCircle2 } from "lucide-react";
import { fetchPublishedJobs } from "@/api/jobs";
import { ROUTES } from "@/constants/routes";
import { formatEmploymentType, formatRelativeDate, formatWorkMode } from "@/utils/format";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Chip } from "@/components/shared/chip";
import { cn } from "@/lib/utils";

const HERO_BADGES = ["AI Resume Review", "AI Mock Interview", "AI Candidate Analysis", "Recruiter Dashboard"];

const STATS = [
  { value: "1,200+", label: "AI Resume Reviews" },
  { value: "400+", label: "AI Candidate Analyses" },
  { value: "<15s", label: "Avg. Analysis Time" },
];

// One shared showcase, three tabs — instead of a separate deep-dive
// section per feature. Bullet items are always visible in the tab list
// (so the page reads in full without clicking); selecting a tab swaps
// the mock screenshot on the right.
const AI_CAPABILITIES = [
  {
    key: "resume-review",
    n: "01",
    icon: FileSearch,
    title: "AI Resume Review",
    blurb: "Score your resume, close skill gaps, and check ATS fit — instantly.",
    items: ["ATS Score", "Resume Score", "Missing Skills", "Grammar Suggestions"],
  },
  {
    key: "mock-interview",
    n: "02",
    icon: Mic,
    title: "AI Mock Interview",
    blurb: "Practice a role-specific interview generated from your resume, then get scored on it.",
    items: ["AI-Generated Questions", "Technical + HR Mix", "Instant AI Evaluation", "Sample Better Answers"],
  },
  {
    key: "candidate-analysis",
    n: "03",
    icon: UserSearch,
    title: "AI Candidate Analysis",
    blurb: "A structured hiring report for every applicant — before you open the resume.",
    items: ["Fit Score", "Hiring Recommendation", "Recruiter Summary", "Interview Questions"],
  },
] as const;

const TRADITIONAL_HIRING = ["Manual Resume Screening", "Inconsistent Evaluation", "Time Consuming"];
const HIRRD_AI = ["AI Resume Review", "AI Mock Interviews", "AI Candidate Analysis", "Faster Decisions"];

const INFO_CARDS = [
  {
    n: "01",
    title: "For candidates",
    body: "Filter by location, salary, and experience level. Apply once, track every application from one place.",
  },
  {
    n: "02",
    title: "For recruiters",
    body: "Stand up a company profile, publish roles, and move applicants through review to hire without leaving the tab.",
  },
  {
    n: "03",
    title: "Built on real infrastructure",
    body: "Clerk for identity, Postgres row-level security for data — every row protected, not just the routes.",
  },
];

const BUILT_WITH = ["React", "Supabase", "Clerk", "Gemini AI"];

export function LandingPage() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", "landing-index"],
    queryFn: () => fetchPublishedJobs({ limit: 6 }),
  });

  const { isSignedIn, profile } = useCurrentUser();
  const [activeCapability, setActiveCapability] = useState<(typeof AI_CAPABILITIES)[number]["key"]>(
    "resume-review"
  );
  const [isCapabilitiesPaused, setIsCapabilitiesPaused] = useState(false);

    useEffect(() => {
    if (isCapabilitiesPaused) return;

    if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
        return;
    }

    const timer = setTimeout(() => {
        setActiveCapability((current) => {
        const currentIndex = AI_CAPABILITIES.findIndex(
            (cap) => cap.key === current
        );
        const nextIndex = (currentIndex + 1) % AI_CAPABILITIES.length;
        return AI_CAPABILITIES[nextIndex].key;
        });
    }, 2500);

    return () => clearTimeout(timer);
    }, [activeCapability, isCapabilitiesPaused]);

  let ctaTo: string = ROUTES.signUp;
  let ctaText = "Sign up to review resume";

  if (isSignedIn) {
    if (profile?.role === "candidate") {
      ctaTo = ROUTES.candidateProfile;
      ctaText = "Go to Profile to Review Resume";
    } else {
      ctaTo = ROUTES.recruiterDashboard;
      ctaText = "Go to Dashboard";
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
      <section className="grid grid-cols-1 gap-10 py-14 md:grid-cols-12 md:gap-6 md:py-20">
        {/* Thesis: the headline occupies the top-left, deliberately not centered */}
        <div className="md:col-span-7 md:pr-8">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-signal">
            Job portal — Edition 01
          </p>
          <h1 className="font-display text-[13vw] font-extrabold uppercase leading-[0.86] tracking-tight text-ink sm:text-[7rem] md:text-[6.5rem]">
            Hiring,
            <br />
            precisely.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-soft">
            HIRRD strips hiring down to the exact match: the role, the
            requirement, the applicant. No noise, no dashboards for their
            own sake — a portal that reads like a well-set index.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={ROUTES.jobs}
              className="border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper transition-colors hover:bg-signal hover:border-signal"
            >
              Browse open roles
            </Link>
            <Link
              to={ROUTES.signUp}
              className="group border border-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-ink transition-colors hover:border-signal hover:text-signal"
            >
              Post a role{" "}
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Subtle proof badges — the feature set in one glance, not a pitch */}
          <div className="mt-7 flex flex-wrap gap-2">
            {HERO_BADGES.map((label, i) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: "easeOut" }}
                className="inline-flex items-center gap-1.5 border border-grid bg-paper-dim px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
              >
                <Check className="h-3 w-3 text-meadow" aria-hidden="true" />
                {label}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Signature: a live numbered index, overlapping the hero column like a
            layered print sheet. This IS a real sequence (the latest published
            roles), so numbering is functional, not decorative. */}
        <div className="border-t border-grid pt-8 md:col-span-5 md:-mt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Latest listings
          </p>

          {isLoading && (
            <ul className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="h-16 animate-pulse border-b border-grid bg-paper-dim" />
              ))}
            </ul>
          )}

          {!isLoading && jobs?.length === 0 && (
            <p className="border-b border-grid py-6 text-sm text-ink-soft">
              No roles published yet. Be the first — post one.
            </p>
          )}

          <ul>
            {jobs?.map((job, index) => (
              <motion.li
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
                className="border-b border-grid"
              >
                <Link
                  to={ROUTES.jobDetail(job.id)}
                  className="group flex items-start gap-4 py-4"
                >
                  <span className="index-figure pt-0.5 text-sm text-signal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink group-hover:text-signal">
                      {job.title}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
                      <span>{job.company_name}</span>
                      <span>·</span>
                      <span>{job.work_mode === "remote" ? "Remote" : job.location ?? formatWorkMode(job.work_mode)}</span>
                      <span>·</span>
                      <span>{formatEmploymentType(job.employment_type)}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 font-mono text-xs text-ink-soft sm:block">
                    {formatRelativeDate(job.created_at)}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>

          {jobs && jobs.length > 0 && (
            <Link
              to={ROUTES.jobs}
              className="mt-6 inline-block font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal"
            >
              View all roles →
            </Link>
          )}
        </div>
      </section>

      {/* Stats — thin, monochrome, no chart-junk */}
      <section className="border-t border-grid py-8 md:py-10">
        <div className="grid grid-cols-1 divide-y divide-grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-0 py-4 first:pt-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0">
              <span className="font-display text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* AI Capabilities — one shared showcase with three tabs, instead of a
          separate deep-dive section per feature. Bullet items stay visible
          on every tab (so the page reads in full without a click); picking
          a tab swaps the mock screenshot on the right. */}
      <section className="border-t border-grid py-12 md:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Platform — AI layer</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink sm:text-4xl">
          Hiring intelligence, built in.
        </h2>

        <div
            className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12"
            onMouseEnter={() => setIsCapabilitiesPaused(true)}
            onMouseLeave={() => setIsCapabilitiesPaused(false)}
        >
          <div className="border border-grid md:col-span-5">
            {AI_CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              const isActive = activeCapability === cap.key;
              return (
                <button
                  key={cap.key}
                  type="button"
                  onClick={() => setActiveCapability(cap.key)}
                  aria-pressed={isActive}
                  className={cn(
                    "block w-full border-l-2 px-5 py-5 text-left transition-colors duration-200",
                    i > 0 && "border-t border-t-grid",
                    isActive ? "border-l-signal bg-paper-dim" : "border-l-transparent hover:bg-paper-dim/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", isActive ? "text-signal" : "text-ink-soft")} aria-hidden="true" />
                    <span
                      className={cn(
                        "font-display text-base font-bold uppercase tracking-tight",
                        isActive ? "text-ink" : "text-ink-soft"
                      )}
                    >
                      {cap.title}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{cap.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cap.items.map((item) => (
                      <span
                        key={item}
                        className="border border-grid px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                            <div className="mt-4 h-0.5 w-full bg-grid">
            {isActive && !isCapabilitiesPaused && (
                <div
                className="h-0.5 bg-signal animate-capability-progress"
                style={{ animationDuration: "2500ms" }}
                />
            )}
            </div>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-7">
            <AnimatePresence mode="wait">
              {activeCapability === "resume-review" && (
                <motion.div
                  key="resume-review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex h-full flex-col border border-grid bg-paper-dim p-6"
                >
                  <div className="flex items-center justify-between border-b border-grid pb-3 mb-6">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                      Gemini Analysis Report // IND-002
                    </span>
                    <span className="inline-block px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide bg-signal/10 text-signal border border-signal/25">
                      Live Preview
                    </span>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-grid bg-paper p-3">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-soft block">
                          Resume Score
                        </span>
                        <span className="font-display text-3xl font-extrabold text-ink mt-1 block">
                          87<span className="text-sm font-sans font-normal text-ink-soft">/100</span>
                        </span>
                        <div className="mt-2 h-1 bg-paper-dim relative">
                          <div className="absolute top-0 left-0 h-1 bg-signal" style={{ width: "87%" }} />
                        </div>
                      </div>
                      <div className="border border-grid bg-paper p-3">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-soft block">
                          ATS Score
                        </span>
                        <span className="font-display text-3xl font-extrabold text-ink mt-1 block">
                          92<span className="text-sm font-sans font-normal text-ink-soft">%</span>
                        </span>
                        <div className="mt-2 h-1 bg-paper-dim relative">
                          <div className="absolute top-0 left-0 h-1 bg-signal" style={{ width: "92%" }} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-soft block mb-1.5">
                        Identified Strengths
                      </span>
                      <ul className="space-y-1 font-mono text-[11px] text-ink">
                        <li className="flex gap-2 items-start">
                          <span className="text-meadow font-bold">+</span>
                          <span>Excellent deployment of quantifiable results in previous roles</span>
                        </li>
                        <li className="flex gap-2 items-start">
                          <span className="text-meadow font-bold">+</span>
                          <span>Strong alignment in frontend technology suite (React, Tailwind)</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-soft block mb-1.5">
                        Missing Stack Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {["Docker", "AWS ECS", "CI/CD Orchestration"].map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 font-mono text-[10px] bg-paper border border-grid text-ink-soft uppercase tracking-wide"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-grid pt-3 flex items-center justify-between text-ink-soft">
                    <span className="font-mono text-[9px] uppercase">Review verified</span>
                    <span className="font-mono text-[9px] uppercase">Confidence 96%</span>
                  </div>
                </motion.div>
              )}

              {activeCapability === "mock-interview" && (
                <motion.div
                  key="mock-interview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="border border-grid bg-paper p-6 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-grid pb-4 mb-6">
                    <div>
                      <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-ink">
                        <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                        Interview Feedback
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink">Frontend Engineer — Practice Session</p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">Generated by Gemini</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-grid bg-paper-dim p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Overall</p>
                      <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-ink">
                        88<span className="font-sans text-lg font-normal text-ink-soft">%</span>
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-paper">
                        <div className="h-1.5 bg-signal" style={{ width: "88%" }} />
                      </div>
                    </div>
                    <div className="border border-grid p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Technical</p>
                      <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink">
                        85<span className="font-sans text-sm font-normal text-ink-soft">%</span>
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-paper-dim">
                        <div className="h-1.5 bg-ink" style={{ width: "85%" }} />
                      </div>
                    </div>
                    <div className="border border-grid p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Communication</p>
                      <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-ink">
                        90<span className="font-sans text-sm font-normal text-ink-soft">%</span>
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-paper-dim">
                        <div className="h-1.5 bg-ink" style={{ width: "90%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Strengths</p>
                    <ul className="space-y-1.5">
                      <li className="flex gap-2 text-sm text-ink">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                        Clear explanation of the React reconciliation question
                      </li>
                      <li className="flex gap-2 text-sm text-ink">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                        Confident, structured answers under time pressure
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {activeCapability === "candidate-analysis" && (
                <motion.div
                  key="candidate-analysis"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="border border-grid bg-paper p-6 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-grid pb-4 mb-6">
                    <div>
                      <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-ink">
                        <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
                        AI Candidate Analysis
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink">
                        Maya Chen <span className="text-ink-soft">— Frontend Engineer</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center border border-meadow bg-meadow-dim px-3 py-1 font-mono text-xs uppercase tracking-[0.15em] text-meadow">
                          Highly Recommended
                        </span>
                        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                          Generated by Gemini
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 border border-grid bg-paper-dim p-4 sm:col-span-1">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Overall fit</p>
                      <p className="mt-2 font-display text-5xl font-extrabold tabular-nums text-ink">
                        94<span className="font-sans text-xl font-normal text-ink-soft">%</span>
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-paper">
                        <div className="h-1.5 bg-signal" style={{ width: "94%" }} />
                      </div>
                    </div>
                    <div className="border border-grid p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Skills match</p>
                      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
                        91<span className="font-sans text-base font-normal text-ink-soft">%</span>
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-paper-dim">
                        <div className="h-1.5 bg-ink" style={{ width: "91%" }} />
                      </div>
                    </div>
                    <div className="border border-grid p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Experience match</p>
                      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
                        88<span className="font-sans text-base font-normal text-ink-soft">%</span>
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-paper-dim">
                        <div className="h-1.5 bg-ink" style={{ width: "88%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Strengths</p>
                      <ul className="space-y-1.5">
                        <li className="flex gap-2 text-sm text-ink">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                          Shipped production React + TypeScript at scale
                        </li>
                        <li className="flex gap-2 text-sm text-ink">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                          Clear, quantified impact across past roles
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Missing skills</p>
                      <div className="flex flex-wrap gap-2">
                        {["GraphQL", "Kubernetes"].map((skill) => (
                          <Chip key={skill} className="text-signal border-signal/40">
                            {skill}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Why HIRRD — the comparison, minimal */}
      <section className="border-t border-grid py-10 md:py-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Why HIRRD</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink sm:text-4xl">
          Less screening. More signal.
        </h2>

        <div className="mt-8 grid grid-cols-1 border border-grid sm:grid-cols-2">
          <div className="p-5 sm:border-r sm:border-grid">
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">Traditional hiring</p>
            <ul className="mt-3 space-y-2.5">
              {TRADITIONAL_HIRING.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-ink-soft">
                  <span className="text-ink-soft">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-grid p-5 sm:border-t-0">
            <p className="font-mono text-xs uppercase tracking-wide text-signal">HIRRD AI</p>
            <ul className="mt-3 space-y-2.5">
              {HIRRD_AI.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-ink">
                  <Check className="h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-t border-grid py-12 sm:grid-cols-2 md:py-16 lg:grid-cols-3">
        {INFO_CARDS.map((item) => (
          <div key={item.n} className="group border-t border-grid pt-6 transition-colors duration-200 hover:border-signal">
            <span className="index-figure text-sm text-signal">{item.n}</span>
            <h3 className="mt-3 font-display text-xl font-bold uppercase tracking-tight text-ink transition-colors duration-200 group-hover:text-signal">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-ink-soft">{item.body}</p>
          </div>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="border-t border-grid py-12 md:py-16">
        <div className="border border-grid bg-paper-dim px-6 py-12 text-center sm:px-10 md:py-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Get started</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink sm:text-4xl md:text-5xl">
            Build your AI-powered hiring workflow today.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={ctaTo}
              className="border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper transition-colors hover:bg-signal hover:border-signal"
            >
              {ctaText} →
            </Link>
            <Link
              to={ROUTES.jobs}
              className="border border-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-ink transition-colors hover:border-signal hover:text-signal"
            >
              Browse open roles
            </Link>
          </div>
        </div>
      </section>

      {/* Built With — monochrome, text only, sits right above the global footer */}
      <section className="border-t border-grid py-8 text-center md:py-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Built with</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {BUILT_WITH.map((tech) => (
            <Chip key={tech}>{tech}</Chip>
          ))}
        </div>
      </section>
    </div>
  );
}