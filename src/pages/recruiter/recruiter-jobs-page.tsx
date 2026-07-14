import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { deleteJob, fetchMyJobs, fetchMyJobStats, setJobStatus } from "@/api/recruiter-jobs";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatEmploymentType } from "@/utils/format";
import type { JobStatus } from "@/types/database.types";

const statusOrder: JobStatus[] = ["draft", "published", "closed"];

export function RecruiterJobsPage() {
  const { profile } = useCurrentUser();
  const recruiterId = profile?.id ?? "";
  const queryClient = useQueryClient();

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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["recruiter-jobs", recruiterId] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) => setJobStatus(id, status),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't update the role's status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      invalidate();
      toast.success("Role deleted");
    },
    onError: () => toast.error("Couldn't delete this role."),
  });

  const statsByJob = new Map((statsQuery.data ?? []).map((s) => [s.job_id, s]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Recruiter</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
            Jobs
          </h1>
        </div>
        <Button asChild size="sm">
          <Link to={ROUTES.recruiterJobNew}>+ New role</Link>
        </Button>
      </div>

      <ul className="mt-8">
        {jobsQuery.data?.map((job, index) => {
          const stats = statsByJob.get(job.id);
          const nextStatus = statusOrder[(statusOrder.indexOf(job.status) + 1) % statusOrder.length];
          return (
            <li key={job.id} className="border-b border-grid py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span className="index-figure text-sm text-signal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-ink">{job.title}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
                      {formatEmploymentType(job.employment_type)} ·{" "}
                      <span
                        className={
                          job.status === "published"
                            ? "text-meadow"
                            : job.status === "closed"
                              ? "text-ink-soft"
                              : "text-amber"
                        }
                      >
                        {job.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={ROUTES.recruiterApplicants(job.id)}
                    className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal"
                  >
                    {stats?.total_applications ?? 0} applicant{stats?.total_applications === 1 ? "" : "s"}
                  </Link>
                  <Button asChild size="sm" variant="outline">
                    <Link to={ROUTES.recruiterJobEdit(job.id)}>Edit</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: job.id, status: nextStatus })}
                  >
                    Mark {nextStatus}
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="destructive" disabled={deleteMutation.isPending}>
                        Delete
                      </Button>
                    }
                    title={`Delete "${job.title}"?`}
                    description="This permanently removes the role and every application submitted to it."
                    confirmLabel="Delete role"
                    onConfirm={() => deleteMutation.mutate(job.id)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!jobsQuery.isLoading && jobsQuery.data?.length === 0 && (
        <p className="mt-8 border-b border-grid py-8 text-sm text-ink-soft">
          No roles yet.{" "}
          <Link to={ROUTES.recruiterJobNew} className="text-signal hover:underline">
            Post your first one →
          </Link>
        </p>
      )}
    </div>
  );
}
