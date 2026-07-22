import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMyApplications, fetchMySavedJobs, withdrawApplication } from "@/api/candidate";
import { fetchMyMockInterviews, type MockInterviewHistoryItem } from "@/api/mock-interview";
import { fetchPublishedJobs } from "@/api/jobs";
import { ROUTES } from "@/constants/routes";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InterviewHistoryCard } from "@/components/shared/interview-history-card";
import { InterviewResultsDialog } from "@/components/shared/interview-results-dialog";
import { Button } from "@/components/ui/button";
import { formatRelativeDate, formatResumeCompletion } from "@/utils/format";
import { toast } from "sonner";

export function CandidateDashboardPage() {
  const queryClient = useQueryClient();
  const { profile } = useCurrentUser();
  const candidateId = profile?.id ?? "";
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  const applicationsQuery = useQuery({
    queryKey: ["my-applications", candidateId],
    queryFn: () => fetchMyApplications(candidateId),
    enabled: !!candidateId,
  });

  const savedJobsQuery = useQuery({
    queryKey: ["my-saved-jobs", candidateId],
    queryFn: () => fetchMySavedJobs(candidateId),
    enabled: !!candidateId,
  });

  const recommendedJobsQuery = useQuery({
    queryKey: ["recommended-jobs"],
    queryFn: () => fetchPublishedJobs({ sort: "newest", limit: 8 }),
  });

  const interviewHistoryQuery = useQuery({
    queryKey: ["my-mock-interviews", candidateId],
    queryFn: () => fetchMyMockInterviews(candidateId),
    enabled: !!candidateId,
  });

  const [selectedInterview, setSelectedInterview] = useState<MockInterviewHistoryItem | null>(null);

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => withdrawApplication(id),
    onSuccess: () => {
      toast.success("Application withdrawn.");
      queryClient.invalidateQueries({ queryKey: ["my-applications", candidateId] });
      setWithdrawId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to withdraw application.");
    },
  });

  const applications = applicationsQuery.data ?? [];
  const savedJobs = savedJobsQuery.data ?? [];

  const activeApplications = applications.filter(
    (app) => app.status !== "rejected" && app.status !== "withdrawn"
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-grid pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
            Candidate Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Manage your applications, saved jobs, and practice sessions.
          </p>
        </div>

        <Button asChild>
          <Link to={ROUTES.JOBS}>Browse Jobs</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Applications" value={applications.length} />
        <StatCard label="Active Applications" value={activeApplications.length} />
        <StatCard
          label="Profile Completion"
          value={`${formatResumeCompletion(profile?.resume_url)}%`}
        />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between border-b border-grid pb-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            My Applications
          </h2>
          <span className="font-mono text-xs text-ink-soft">{applications.length} Total</span>
        </div>

        {applicationsQuery.isLoading && <ListSkeleton className="mt-4" />}

        {!applicationsQuery.isLoading && applications.length > 0 && (
          <ul className="divide-y divide-grid">
            {applications.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link
                    to={ROUTES.JOB_DETAIL(app.job_id)}
                    className="truncate font-medium text-ink hover:underline"
                  >
                    {app.jobs?.title ?? "Position no longer available"}
                  </Link>
                  <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
                    <span>{app.jobs?.companies?.name ?? "—"}</span>
                    <span>·</span>
                    <span>Applied {formatRelativeDate(app.created_at)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={app.status} />
                  {app.status !== "withdrawn" && app.status !== "rejected" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWithdrawId(app.id)}
                      className="cursor-pointer"
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!applicationsQuery.isLoading && applications.length === 0 && (
          <p className="border-b border-grid py-8 text-sm text-ink-soft">
            You haven't submitted any job applications yet.
          </p>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between border-b border-grid pb-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Saved Jobs
          </h2>
          <span className="font-mono text-xs text-ink-soft">{savedJobs.length} Saved</span>
        </div>

        {savedJobsQuery.isLoading && <ListSkeleton className="mt-4" />}

        {!savedJobsQuery.isLoading && savedJobs.length > 0 && (
          <ul className="divide-y divide-grid">
            {savedJobs.map((saved) => (
              <li key={saved.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <Link
                    to={ROUTES.JOB_DETAIL(saved.job_id)}
                    className="font-medium text-ink hover:underline"
                  >
                    {saved.jobs?.title ?? "Role details"}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-ink-soft">
                    Saved {formatRelativeDate(saved.created_at)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={ROUTES.JOB_DETAIL(saved.job_id)}>View Role</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!savedJobsQuery.isLoading && savedJobs.length === 0 && (
          <p className="border-b border-grid py-8 text-sm text-ink-soft">
            No saved jobs found. Click "Save Job" on any posting to track it here.
          </p>
        )}
      </div>

      <div className="mt-10">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          Interview History
        </p>

        {interviewHistoryQuery.isLoading && <ListSkeleton />}

        {!interviewHistoryQuery.isLoading && (interviewHistoryQuery.data?.length ?? 0) > 0 && (
          <ul>
            {interviewHistoryQuery.data!.map((interview) => (
              <InterviewHistoryCard
                key={interview.id}
                interview={interview}
                onView={() => setSelectedInterview(interview)}
              />
            ))}
          </ul>
        )}

        {!interviewHistoryQuery.isLoading && interviewHistoryQuery.data?.length === 0 && (
          <p className="border-b border-grid py-8 text-sm text-ink-soft">
            No practice interviews yet. Open a role and try{" "}
            <span className="font-medium text-ink">Practice AI Interview</span> to prepare before you apply.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!withdrawId}
        onOpenChange={(open) => {
          if (!open) setWithdrawId(null);
        }}
        title="Withdraw Application"
        description="Are you sure you want to withdraw this job application? This action cannot be undone."
        confirmText="Withdraw Application"
        isPending={withdrawMutation.isPending}
        onConfirm={() => {
          if (withdrawId) withdrawMutation.mutate(withdrawId);
        }}
      />

      <InterviewResultsDialog
        isOpen={!!selectedInterview}
        onOpenChange={(open) => {
          if (!open) setSelectedInterview(null);
        }}
        jobTitle={selectedInterview?.jobTitle}
        result={selectedInterview}
      />
    </div>
  );
}