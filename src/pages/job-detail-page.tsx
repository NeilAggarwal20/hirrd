import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Show } from "@clerk/react";
import { Share2, Link as LinkIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchJobApplicantCount, fetchJobById, fetchRelatedJobs } from "@/api/jobs";
import { applyToJob, hasAppliedToJob, isJobSavedByCandidate, saveJob, unsaveJob } from "@/api/job-actions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/chip";
import { JobMatchDialog } from "@/components/shared/job-match-dialog";
import { pushNotification } from "@/lib/notifications";
import {
  formatEmploymentType,
  formatExperienceLevel,
  formatRelativeDate,
  formatSalaryRange,
  formatWorkMode,
} from "@/utils/format";
import { NotFoundPage } from "@/pages/not-found-page";

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useCurrentUser();
  const queryClient = useQueryClient();
  const jobId = id as string;
  const candidateId = profile?.id ?? "";
  const isCandidate = profile?.role === "candidate";
  const [isMatchOpen, setIsMatchOpen] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJobById(jobId),
    enabled: !!id,
  });

  const job = jobQuery.data;
  const isOwnJob = !!profile && profile.role === "recruiter" && job?.recruiter_id === profile.id;

  const applicantCountQuery = useQuery({
    queryKey: ["job-applicant-count", jobId],
    queryFn: () => fetchJobApplicantCount(jobId),
    enabled: !!job,
  });

  const relatedQuery = useQuery({
    queryKey: ["related-jobs", jobId],
    queryFn: () => fetchRelatedJobs(job!),
    enabled: !!job,
  });

  const savedQuery = useQuery({
    queryKey: ["job-saved", jobId, candidateId],
    queryFn: () => isJobSavedByCandidate(jobId, candidateId),
    enabled: !!candidateId && isCandidate,
  });

  const appliedQuery = useQuery({
    queryKey: ["job-applied", jobId, candidateId],
    queryFn: () => hasAppliedToJob(jobId, candidateId),
    enabled: !!candidateId && isCandidate,
  });

  const saveToggle = useMutation({
    mutationFn: () => (savedQuery.data ? unsaveJob(jobId, candidateId) : saveJob(jobId, candidateId)),
    onSuccess: () => {
      const wasSaved = savedQuery.data;
      queryClient.invalidateQueries({ queryKey: ["job-saved", jobId, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["my-saved-jobs-details", candidateId] });
      toast.success(wasSaved ? "Removed from saved roles" : "Saved");
      if (!wasSaved && job) {
        pushNotification({
          type: "job_saved",
          title: "Job saved",
          body: `${job.title} at ${job.company_name} was added to your saved roles.`,
        });
      }
    },
    onError: () => toast.error("Couldn't update saved roles."),
  });

  const apply = useMutation({
    mutationFn: () => {
      if (!profile?.resume_url) {
        throw new Error("NO_RESUME");
      }
      return applyToJob({ jobId, candidateId, resumeUrl: profile.resume_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applied", jobId, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["my-applications", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["job-applicant-count", jobId] });
      toast.success("Application submitted");
      if (job) {
        pushNotification({
          type: "application_submitted",
          title: "Application submitted",
          body: `Your application to ${job.title} at ${job.company_name} was submitted successfully.`,
        });
      }
    },
    onError: (error: Error) => {
      if (error.message === "NO_RESUME") {
        toast.error("Add a resume to your profile before applying.");
      } else {
        toast.error("Couldn't submit your application.");
      }
    },
  });

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: job?.title, url });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to copy
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (jobQuery.isLoading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 text-ink-soft">Loading —</div>;
  }

  if (!job) {
    return <NotFoundPage />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
      <Link to={ROUTES.jobs} className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal">
        ← All roles
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <Link
            to={ROUTES.companyDetail(job.company_id)}
            className="font-mono text-xs uppercase tracking-[0.2em] text-signal hover:underline"
          >
            {job.company_name}
          </Link>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase tracking-tight text-ink">
            {job.title}
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={handleShare} aria-label="Share this role">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
        <span>{job.work_mode === "remote" ? "Remote" : job.location ?? formatWorkMode(job.work_mode)}</span>
        <span>·</span>
        <span>{formatEmploymentType(job.employment_type)}</span>
        <span>·</span>
        <span>{formatExperienceLevel(job.experience_level)}</span>
        <span>·</span>
        <span>{formatSalaryRange(job.salary_min, job.salary_max)}</span>
        <span>·</span>
        <span>Posted {formatRelativeDate(job.created_at)}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {applicantCountQuery.data ?? 0} applicant
          {applicantCountQuery.data === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Show when="signed-out">
          <Link
            to={ROUTES.signIn}
            className="border border-ink bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-paper hover:bg-signal hover:border-signal"
          >
            Sign in to apply
          </Link>
        </Show>

        {isCandidate && (
          <>
            <Button
              disabled={appliedQuery.data || apply.isPending}
              onClick={() => apply.mutate()}
              size="lg"
            >
              {appliedQuery.data ? "Applied" : apply.isPending ? "Submitting —" : "Apply"}
            </Button>
            <Button variant="outline" size="lg" onClick={() => saveToggle.mutate()} disabled={saveToggle.isPending}>
              {savedQuery.data ? "Unsave" : "Save"}
            </Button>
            {profile?.resume_url && (
              <Button variant="outline" size="lg" onClick={() => setIsMatchOpen(true)}>
                Analyze Resume For This Job
              </Button>
            )}
          </>
        )}

        {isOwnJob && (
          <Link
            to={ROUTES.recruiterApplicants(job.id)}
            className="border border-ink px-6 py-3 font-mono text-sm uppercase tracking-wide text-ink hover:border-signal hover:text-signal"
          >
            View applicants
          </Link>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal"
        >
          <LinkIcon className="h-3.5 w-3.5" /> Copy link
        </button>
      </div>

      {job.skills.length > 0 && (
        <div className="mt-10 border-t border-grid pt-8">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Skills required</p>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
          </div>
        </div>
      )}

      {job.benefits.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Benefits</p>
          <div className="flex flex-wrap gap-2">
            {job.benefits.map((benefit) => (
              <Chip key={benefit} className="text-meadow">
                {benefit}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div
        className="prose prose-neutral mt-10 max-w-none border-t border-grid pt-10 [&_a]:text-signal"
        // Rendered from TipTap-authored HTML stored in jobs.description.
        dangerouslySetInnerHTML={{ __html: job.description }}
      />

      {relatedQuery.data && relatedQuery.data.length > 0 && (
        <div className="mt-16 border-t border-grid pt-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-signal">
            Related roles in {job.category}
          </p>
          <ul>
            {relatedQuery.data.map((related, index) => (
              <li key={related.id} className="border-b border-grid">
                <Link to={ROUTES.jobDetail(related.id)} className="group flex items-start gap-4 py-4">
                  <span className="index-figure pt-0.5 text-sm text-signal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink group-hover:text-signal">{related.title}</span>
                    <span className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
                      {related.company_name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isCandidate && profile?.resume_url && (
        <JobMatchDialog
          isOpen={isMatchOpen}
          onOpenChange={setIsMatchOpen}
          candidateId={candidateId}
          jobId={jobId}
          jobTitle={job.title}
        />
      )}
    </div>
  );
}
