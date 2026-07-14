import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMyApplications, fetchMySavedJobs } from "@/api/candidate";
import { fetchPublishedJobs } from "@/api/jobs";
import { ROUTES } from "@/constants/routes";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { formatRelativeDate, formatResumeCompletion } from "@/utils/format";

export function CandidateDashboardPage() {
  const { profile } = useCurrentUser();
  const candidateId = profile?.id ?? "";

  const applicationsQuery = useQuery({
    queryKey: ["my-applications", candidateId],
    queryFn: () => fetchMyApplications(candidateId),
    enabled: !!candidateId,
  });

  const savedQuery = useQuery({
    queryKey: ["my-saved-jobs", candidateId],
    queryFn: () => fetchMySavedJobs(candidateId),
    enabled: !!candidateId,
  });

  const recommendedQuery = useQuery({
    queryKey: ["recommended-jobs"],
    queryFn: () => fetchPublishedJobs({ sort: "newest", limit: 8 }),
  });

  const appliedJobIds = new Set((applicationsQuery.data ?? []).map((a) => a.job_id));
  const recommended = (recommendedQuery.data ?? []).filter((job) => !appliedJobIds.has(job.id)).slice(0, 4);

  const completion = profile
    ? formatResumeCompletion({
        headline: profile.headline,
        bio: profile.bio,
        resume_url: profile.resume_url,
        skills: profile.skills,
        experience: profile.experience,
        education: profile.education,
      })
    : 0;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Candidate</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Dashboard
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-4 border-b border-grid pb-8 sm:grid-cols-4">
        <StatCard label="Applications" value={applicationsQuery.data?.length ?? 0} />
        <StatCard label="Saved roles" value={savedQuery.data?.length ?? 0} />
        <div className="border border-grid p-4">
          <span className="index-figure block text-3xl text-ink">{completion}%</span>
          <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">Resume complete</span>
          {completion < 100 && (
            <Link
              to={ROUTES.candidateProfile}
              className="mt-1 block font-mono text-[11px] text-signal hover:underline"
            >
              Finish it →
            </Link>
          )}
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="mt-8">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Recommended for you
          </p>
          <ul>
            {recommended.map((job, index) => (
              <li key={job.id} className="border-b border-grid py-4">
                <Link to={ROUTES.jobDetail(job.id)} className="group flex items-baseline gap-4">
                  <span className="index-figure text-sm text-signal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-ink group-hover:text-signal">{job.title}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
                      {job.company_name} · {job.category}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          Application timeline
        </p>

        {applicationsQuery.isLoading && <ListSkeleton />}

        <ul>
          {applicationsQuery.data?.map((application, index) => (
            <li key={application.id} className="border-b border-grid py-4">
              <div className="flex items-baseline gap-4">
                <span className="index-figure text-sm text-signal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={ROUTES.jobDetail(application.jobs?.id ?? "")}
                    className="font-medium text-ink hover:text-signal"
                  >
                    {application.jobs?.title ?? "Role no longer available"}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs uppercase tracking-wide text-ink-soft">
                    <span>{application.jobs?.companies?.name ?? "—"}</span>
                    <span>·</span>
                    <StatusBadge status={application.status} />
                    <span>· {formatRelativeDate(application.created_at)}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!applicationsQuery.isLoading && applicationsQuery.data?.length === 0 && (
          <p className="border-b border-grid py-8 text-sm text-ink-soft">
            No applications yet.{" "}
            <Link to={ROUTES.jobs} className="text-signal hover:underline">
              Browse open roles →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
