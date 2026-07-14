import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMyCompanies } from "@/api/companies";
import { fetchMyJobs, fetchMyJobStats } from "@/api/recruiter-jobs";
import { fetchRecentApplicationsForRecruiter } from "@/api/recruiter-applications";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { formatRelativeDate } from "@/utils/format";

export function RecruiterDashboardPage() {
  const { profile } = useCurrentUser();
  const recruiterId = profile?.id ?? "";

  const companiesQuery = useQuery({
    queryKey: ["companies", recruiterId],
    queryFn: () => fetchMyCompanies(recruiterId),
    enabled: !!recruiterId,
  });

  const jobsQuery = useQuery({
    queryKey: ["recruiter-jobs", recruiterId],
    queryFn: () => fetchMyJobs(recruiterId),
    enabled: !!recruiterId,
  });

  const statsQuery = useQuery({
    queryKey: ["recruiter-job-stats", recruiterId],
    queryFn: () => fetchMyJobStats(recruiterId),
    enabled: !!recruiterId,
  });

  const recentApplicationsQuery = useQuery({
    queryKey: ["recruiter-recent-applications", recruiterId],
    queryFn: () => fetchRecentApplicationsForRecruiter(recruiterId),
    enabled: !!recruiterId,
  });

  const jobs = jobsQuery.data ?? [];
  const hasCompany = (companiesQuery.data?.length ?? 0) > 0;
  const totalApplications = (statsQuery.data ?? []).reduce((sum, s) => sum + s.total_applications, 0);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Recruiter</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Dashboard
      </h1>

      {!companiesQuery.isLoading && !hasCompany && (
        <div className="mt-8 border border-grid p-8">
          <p className="font-display text-lg font-bold uppercase tracking-tight text-ink">
            No company yet
          </p>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Create a company profile first — every job you publish belongs to one.
          </p>
          <Button asChild className="mt-4">
            <Link to={ROUTES.recruiterCompany}>Set up company</Link>
          </Button>
        </div>
      )}

      {hasCompany && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total jobs" value={jobs.length} />
            <StatCard label="Published" value={jobs.filter((j) => j.status === "published").length} />
            <StatCard label="Draft" value={jobs.filter((j) => j.status === "draft").length} />
            <StatCard label="Closed" value={jobs.filter((j) => j.status === "closed").length} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total applications" value={totalApplications} />
            <StatCard
              label="Under review"
              value={(statsQuery.data ?? []).reduce((sum, s) => sum + s.under_review_count, 0)}
            />
            <StatCard
              label="Interview stage"
              value={(statsQuery.data ?? []).reduce((sum, s) => sum + s.interview_count, 0)}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-b border-grid pb-8">
            <Button asChild size="sm">
              <Link to={ROUTES.recruiterJobNew}>+ New role</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTES.recruiterCompany}>Manage companies</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTES.recruiterJobs}>View all jobs</Link>
            </Button>
          </div>

          <div className="mt-8">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
              Recent applications
            </p>

            {recentApplicationsQuery.isLoading && <ListSkeleton />}

            <ul>
              {recentApplicationsQuery.data?.map((application, index) => (
                <li key={application.id} className="border-b border-grid py-4">
                  <div className="flex items-baseline gap-4">
                    <span className="index-figure text-sm text-signal">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">
                        {application.users?.first_name} {application.users?.last_name}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs uppercase tracking-wide text-ink-soft">
                        <span>Applied to {application.jobs?.title}</span>
                        <span>·</span>
                        <StatusBadge status={application.status} />
                        <span>· {formatRelativeDate(application.created_at)}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {!recentApplicationsQuery.isLoading && recentApplicationsQuery.data?.length === 0 && (
              <p className="border-b border-grid py-8 text-sm text-ink-soft">No applications yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
