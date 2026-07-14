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
