import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMyMockInterviews } from "@/api/mock-interview";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { formatRelativeDate } from "@/utils/format";

export function CandidateInterviewsPage() {
  const { profile } = useCurrentUser();
  const candidateId = profile?.id ?? "";

  const interviewsQuery = useQuery({
    queryKey: ["my-mock-interviews", candidateId],
    queryFn: () => fetchMyMockInterviews(candidateId),
    enabled: !!candidateId,
  });

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Candidate</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Interview History
      </h1>

      {interviewsQuery.isLoading && <ListSkeleton />}

      <ul className="mt-8 border-t border-grid">
        {interviewsQuery.data?.map((interview, index) => (
          <li key={interview.id} className="border-b border-grid py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <span className="index-figure text-sm text-signal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <Link to={ROUTES.jobDetail(interview.jobId)} className="font-medium text-ink hover:text-signal">
                    {interview.jobTitle}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs uppercase tracking-wide text-ink-soft">
                    <span>{interview.companyName}</span>
                    <span>·</span>
                    <span>Completed {formatRelativeDate(interview.createdAt)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="hidden gap-4 font-mono text-xs uppercase tracking-wide text-ink-soft sm:flex">
                  <span>
                    Overall <span className="font-display text-sm font-bold text-ink">{interview.overallScore}%</span>
                  </span>
                  <span>
                    Technical <span className="font-display text-sm font-bold text-ink">{interview.technicalScore}%</span>
                  </span>
                  <span>
                    Comms <span className="font-display text-sm font-bold text-ink">{interview.communicationScore}%</span>
                  </span>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={ROUTES.candidateInterviewResults(interview.id)} state={{ interview }}>
                    View feedback
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!interviewsQuery.isLoading && interviewsQuery.data?.length === 0 && (
        <p className="border-b border-grid py-8 text-sm text-ink-soft">
          No practice interviews yet. Open a role and try{" "}
          <span className="font-medium text-ink">Practice AI Interview</span> to prepare before you apply.
        </p>
      )}
    </div>
  );
}