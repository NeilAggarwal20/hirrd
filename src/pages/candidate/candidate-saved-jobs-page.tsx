import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMySavedJobsWithDetails } from "@/api/candidate";
import { unsaveJob } from "@/api/job-actions";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { formatWorkMode } from "@/utils/format";

export function CandidateSavedJobsPage() {
  const { profile } = useCurrentUser();
  const candidateId = profile?.id ?? "";
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ["my-saved-jobs-details", candidateId],
    queryFn: () => fetchMySavedJobsWithDetails(candidateId),
    enabled: !!candidateId,
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => unsaveJob(jobId, candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-saved-jobs-details", candidateId] });
      toast.success("Removed from saved roles");
    },
    onError: () => toast.error("Couldn't update saved roles."),
  });

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Candidate</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        Saved roles
      </h1>

      {savedQuery.isLoading && <ListSkeleton />}

      <ul className="mt-8 border-t border-grid">
        {savedQuery.data?.map((saved, index) => (
          <li key={saved.id} className="border-b border-grid py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <span className="index-figure text-sm text-signal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <Link
                    to={ROUTES.jobDetail(saved.jobs?.id ?? "")}
                    className="font-medium text-ink hover:text-signal"
                  >
                    {saved.jobs?.title ?? "Role no longer available"}
                  </Link>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
                    {saved.jobs?.companies?.name ?? "—"} ·{" "}
                    {saved.jobs?.work_mode === "remote"
                      ? "Remote"
                      : saved.jobs?.location ?? (saved.jobs ? formatWorkMode(saved.jobs.work_mode) : "—")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={unsaveMutation.isPending}
                onClick={() => unsaveMutation.mutate(saved.job_id)}
              >
                Unsave
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {!savedQuery.isLoading && savedQuery.data?.length === 0 && (
        <p className="border-b border-grid py-8 text-sm text-ink-soft">
          Nothing saved yet.{" "}
          <Link to={ROUTES.jobs} className="text-signal hover:underline">
            Browse open roles →
          </Link>
        </p>
      )}
    </div>
  );
}
