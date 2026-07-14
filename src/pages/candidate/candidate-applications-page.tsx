import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMyApplications, withdrawApplication } from "@/api/candidate";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelativeDate } from "@/utils/format";

export function CandidateApplicationsPage() {
  const { profile } = useCurrentUser();
  const candidateId = profile?.id ?? "";
  const queryClient = useQueryClient();

  const applicationsQuery = useQuery({
    queryKey: ["my-applications", candidateId],
    queryFn: () => fetchMyApplications(candidateId),
    enabled: !!candidateId,
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications", candidateId] });
      toast.success("Application withdrawn");
    },
    onError: () => toast.error("Couldn't withdraw — it may have already moved past review."),
  });

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Candidate</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Applications
      </h1>

      {applicationsQuery.isLoading && <ListSkeleton />}

      <ul className="mt-8 border-t border-grid">
        {applicationsQuery.data?.map((application, index) => (
          <li key={application.id} className="border-b border-grid py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <span className="index-figure text-sm text-signal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
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
                    <span>· Applied {formatRelativeDate(application.created_at)}</span>
                  </p>
                </div>
              </div>

              {application.status === "applied" && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline" disabled={withdrawMutation.isPending}>
                      Withdraw
                    </Button>
                  }
                  title="Withdraw this application?"
                  description="The recruiter will no longer see you as an applicant for this role."
                  confirmLabel="Withdraw"
                  onConfirm={() => withdrawMutation.mutate(application.id)}
                />
              )}
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
  );
}
