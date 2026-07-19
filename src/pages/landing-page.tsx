import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedJobs } from "@/api/jobs";
import { ROUTES } from "@/constants/routes";
import { formatEmploymentType, formatRelativeDate, formatWorkMode } from "@/utils/format";

export function LandingPage() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", "landing-index"],
    queryFn: () => fetchPublishedJobs({ limit: 6 }),
  });

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
      <section className="grid grid-cols-1 gap-10 py-16 md:grid-cols-12 md:gap-6 md:py-24">
        {/* Thesis: the headline occupies the top-left, deliberately not centered */}
        <div className="md:col-span-7 md:pr-8">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-signal">
            Job portal — Edition 01
          </p>
          <h1 className="font-display text-[13vw] font-extrabold uppercase leading-[0.86] tracking-tight text-ink sm:text-[7rem] md:text-[6.5rem]">
            Hiring,
            <br />
            precisely.
          </h1>
          <p className="mt-8 max-w-md text-lg text-ink-soft">
            HIRRD strips hiring down to the exact match: the role, the
            requirement, the applicant. No noise, no dashboards for their
            own sake — a portal that reads like a well-set index.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to={ROUTES.jobs}
              className="border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper transition-colors hover:bg-signal hover:border-signal"
            >
              Browse open roles
            </Link>
            <Link
              to={ROUTES.signUp}
              className="border border-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-ink transition-colors hover:border-signal hover:text-signal"
            >
              Post a role →
            </Link>
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

      {/* AI Resume Review Promo Section */}
      <section className="border-t border-grid py-16 md:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8 items-stretch">
          {/* Pitch Column */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
                AI Optimization — Edition 01
              </p>
              <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl md:text-6xl">
                INTELLIGENT
                <br />
                RESUME REVIEW.
              </h2>
              <p className="mt-6 max-w-xl text-base text-ink-soft leading-relaxed">
                HIRRD incorporates Gemini AI models to analyze candidate resumes against modern recruiter benchmarks. Compare your profile with real industry standards, find critical skill gaps, optimize ATS compatibility, and secure matches against active roles automatically.
              </p>
              
              <ul className="mt-8 space-y-3 font-mono text-xs uppercase tracking-wider text-ink">
                <li className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 bg-signal" />
                  <span>Interactive ATS Compatibility Analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 bg-signal" />
                  <span>Real-time Skill Gap Mapping</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 bg-signal" />
                  <span>Actionable suggestions & grammar checks</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 bg-signal" />
                  <span>Instant Match Score Against Published Roles</span>
                </li>
              </ul>
            </div>

            <div className="mt-10 flex flex-col gap-3 items-start">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  disabled
                  className="border border-grid bg-paper-dim text-ink-soft cursor-not-allowed px-6 py-3 font-mono text-sm uppercase tracking-wide opacity-50"
                >
                  Coming Soon
                </button>
                <span className="inline-block px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide bg-signal/10 text-signal border border-signal/25">
                  Temporarily Offline
                </span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                AI Resume Review will be available soon.
              </p>
            </div>
          </div>

          {/* Graphic/Mockup Column */}
          <div className="md:col-span-5 flex flex-col border border-grid bg-paper-dim p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-grid pb-3 mb-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                Gemini Analysis Report // IND-002
              </span>
              <span className="inline-block px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide bg-signal/10 text-signal border border-signal/25">
                Live Preview
              </span>
            </div>

            <div className="space-y-6 flex-1">
              {/* Score section */}
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

              {/* Strengths section */}
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

              {/* Skill gap / Missing Skills */}
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

              {/* Suggestions */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-ink-soft block mb-1.5">
                  Optimization Guidelines
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-ink">
                  <li className="flex gap-2 items-start">
                    <span className="text-signal font-bold">—</span>
                    <span>Add structural engineering detail regarding Postgres schemas</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-signal font-bold">—</span>
                    <span>Quantify DevOps scope of your engineering workload</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 border-t border-grid pt-3 flex items-center justify-between text-ink-soft">
              <span className="font-mono text-[9px] uppercase">Review verified</span>
              <span className="font-mono text-[9px] uppercase">Confidence 96%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-t border-grid py-16 sm:grid-cols-3">
        {[
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
        ].map((item) => (
          <div key={item.n}>
            <span className="index-figure text-sm text-signal">{item.n}</span>
            <h3 className="mt-3 font-display text-xl font-bold uppercase tracking-tight text-ink">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-ink-soft">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
