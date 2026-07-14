import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyById } from "@/api/companies";
import { fetchPublishedJobs } from "@/api/jobs";
import { ROUTES } from "@/constants/routes";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { NotFoundPage } from "@/pages/not-found-page";
import { formatEmploymentType, formatRelativeDate, formatWorkMode } from "@/utils/format";

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();

  const companyQuery = useQuery({
    queryKey: ["company", id],
    queryFn: () => fetchCompanyById(id as string),
    enabled: !!id,
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", "by-company", id],
    queryFn: () => fetchPublishedJobs({ companyId: id, limit: 50 }),
    enabled: !!id,
  });

  if (companyQuery.isLoading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 text-ink-soft">Loading —</div>;
  }

  if (!companyQuery.data) {
    return <NotFoundPage />;
  }

  const company = companyQuery.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
      <Link to={ROUTES.jobs} className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal">
        ← All roles
      </Link>

      <div className="mt-6 flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-grid bg-paper-dim">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-[10px] text-ink-soft">No logo</span>
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
            {company.name}
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
            {[company.industry, company.headquarters].filter(Boolean).join(" · ") || "—"}
          </p>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-xs text-signal hover:underline"
            >
              {company.website.replace(/^https?:\/\//, "")} ↗
            </a>
          )}
        </div>
      </div>

      {company.description && <p className="mt-6 max-w-xl text-sm text-ink-soft">{company.description}</p>}

      <p className="mt-12 mb-4 font-mono text-xs uppercase tracking-[0.2em] text-signal">
        Open roles at {company.name}
      </p>

      {jobsQuery.isLoading && <ListSkeleton />}

      <ul className="border-t border-grid">
        {jobsQuery.data?.map((job, index) => (
          <li key={job.id} className="border-b border-grid">
            <Link to={ROUTES.jobDetail(job.id)} className="group flex items-start gap-4 py-5">
              <span className="index-figure pt-0.5 text-sm text-signal">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink group-hover:text-signal">{job.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
                  <span>{job.work_mode === "remote" ? "Remote" : job.location ?? formatWorkMode(job.work_mode)}</span>
                  <span>·</span>
                  <span>{formatEmploymentType(job.employment_type)}</span>
                </span>
              </span>
              <span className="hidden shrink-0 font-mono text-xs text-ink-soft sm:block">
                {formatRelativeDate(job.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!jobsQuery.isLoading && jobsQuery.data?.length === 0 && (
        <p className="border-b border-grid py-8 text-sm text-ink-soft">No open roles right now.</p>
      )}
    </div>
  );
}
