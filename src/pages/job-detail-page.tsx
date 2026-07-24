import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fetchJobApplicantCount, fetchJobById, fetchRelatedJobs } from "@/api/jobs";
import { applyToJob, hasAppliedToJob, isJobSavedByCandidate, saveJob, unsaveJob } from "@/api/job-actions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMockInterview } from "@/hooks/use-mock-interview";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/chip";
import { JobMatchDialog } from "@/components/shared/job-match-dialog";
import { InterviewStartDialog } from "@/components/shared/interview-start-dialog";
import { InterviewSessionDialog } from "@/components/shared/interview-session-dialog";
import type { MockInterviewResult } from "@/api/mock-interview";
import { pushNotification } from "@/lib/notifications";
import {
  formatEmploymentType,
  formatExperienceLevel,
  formatWorkMode,
  formatRelativeDate,
  formatSalaryRange,
} from "@/utils/format";


export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useCurrentUser();
  const candidateId = profile?.id ?? "";
  const isCandidate = profile?.role === "candidate";
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [isInterviewStartOpen, setIsInterviewStartOpen] = useState(false);
  const [isInterviewSessionOpen, setIsInterviewSessionOpen] = useState(false);
  const interview = useMockInterview(jobId, candidateId || undefined);

  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJobById(jobId),
    enabled: !!id,
  });

  const applicantCountQuery = useQuery({
    queryKey: ["job-applicant-count", id],
    queryFn: () => fetchJobApplicantCount(jobId),
    enabled: !!id,
  });

  const hasAppliedQuery = useQuery({
    queryKey: ["has-applied", id, candidateId],
    queryFn: () => hasAppliedToJob(jobId, candidateId),
    enabled: !!id && isCandidate && !!candidateId,
  });

  const isSavedQuery = useQuery({
    queryKey: ["is-saved", id, candidateId],
    queryFn: () => isJobSavedByCandidate(jobId, candidateId),
    enabled: !!id && isCandidate && !!candidateId,
  });

  const relatedJobsQuery = useQuery({
    queryKey: ["related-jobs", jobQuery.data?.category],
    queryFn: () => fetchRelatedJobs(jobQuery.data!), 
    enabled: !!jobQuery.data,
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!profile?.resume_url) throw new Error("Resume required to apply");
      return applyToJob({
        jobId,
        candidateId,
        resumeUrl: profile.resume_url,
      });
    },
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["has-applied", id, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["job-applicant-count", id] });

      if (jobQuery.data?.recruiter_id) {
        pushNotification({
          type: "application_submitted",
          title: "New Job Application",
          body: `A candidate applied for ${jobQuery.data.title}.`,
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit application.");
    },
  });

  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      if (isSavedQuery.data) {
        await unsaveJob(jobId, candidateId);
      } else {
        await saveJob(jobId, candidateId);
      }
    },
    onSuccess: () => {
      toast.success(isSavedQuery.data ? "Job removed from saved list." : "Job saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["is-saved", id, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["saved-jobs", candidateId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update saved status.");
    },
  });

  function handleStartInterview() {
    setIsInterviewStartOpen(false);
    setIsInterviewSessionOpen(true);
    interview.start();
  }

  function handleInterviewSubmitted(result: MockInterviewResult) {
    setIsInterviewSessionOpen(false);
    navigate(ROUTES.candidateInterviewResults(result.id), {
      state: {
        interview: {
          id: result.id,
          jobId,
          jobTitle: job?.title ?? "This role",
          companyName: job?.companies?.name ?? "—",
          overallScore: result.overallScore,
          technicalScore: result.technicalScore,
          communicationScore: result.communicationScore,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          improvements: result.improvements,
          sampleBetterAnswers: result.sampleBetterAnswers,
          questions: interview.questions,
          answers: interview.answers,
          createdAt: result.createdAt,
        },
      },
    });
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: jobQuery.data?.title,
          url,
        });
      } catch {
        // User canceled share sheet
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  }

  if (jobQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-8 w-1/3 bg-paper-dim animate-pulse" />
        <div className="mt-4 h-4 w-1/4 bg-paper-dim animate-pulse" />
        <div className="mt-8 space-y-4">
          <div className="h-4 bg-paper-dim animate-pulse" />
          <div className="h-4 bg-paper-dim animate-pulse" />
          <div className="h-4 w-2/3 bg-paper-dim animate-pulse" />
        </div>
      </div>
    );
  }

  const job = jobQuery.data;

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          Job Not Found
        </h1>
        <p className="mt-2 text-ink-soft">
          The position you are looking for may have been closed or removed.
        </p>
        <Button asChild className="mt-6">
          <Link to={ROUTES.jobs}>Browse All Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-grid pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-ink sm:text-4xl">
            {job.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm font-medium text-ink-soft">
            {job.companies?.name && <span>{job.companies.name}</span>}
            <span>·</span>
            <span>{formatWorkMode(job.work_mode)}</span>
            <span>·</span>
            <span>{formatRelativeDate(job.created_at)}</span>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleShare} className="cursor-pointer">
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip>{formatEmploymentType(job.employment_type)}</Chip>
        <Chip>{formatExperienceLevel(job.experience_level)}</Chip>
        <Chip>{formatSalaryRange(job.salary_min, job.salary_max)}</Chip>
        {job.departments?.name && <Chip>{job.departments.name}</Chip>}
      </div>

      <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-ink-soft">
        <Users className="h-4 w-4" />
        <span>
          {applicantCountQuery.isLoading
            ? "..."
            : `${applicantCountQuery.data ?? 0} candidate(s) applied`}
        </span>
      </div>

      {isCandidate && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-y border-grid py-4">
          {hasAppliedQuery.data ? (
            <Button disabled variant="outline">
              Applied
            </Button>
          ) : (
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="cursor-pointer"
            >
              {applyMutation.isPending ? "Submitting…" : "Apply Now"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => toggleSaveMutation.mutate()}
            disabled={toggleSaveMutation.isPending}
            className="cursor-pointer"
          >
            {isSavedQuery.data ? "Saved" : "Save Job"}
          </Button>

          {profile?.resume_url && (
            <Button variant="outline" onClick={() => setIsMatchOpen(true)} className="cursor-pointer">
              Analyze Resume For This Job
            </Button>
          )}

          {profile?.resume_url && (
            <Button variant="outline" size="lg" onClick={() => setIsInterviewStartOpen(true)} className="cursor-pointer">
              <Sparkles className="h-4 w-4" /> Practice AI Interview
            </Button>
          )}
        </div>
      )}

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Job Description
          </h2>
          <div
            className="prose prose-neutral mt-3 max-w-none text-ink"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        </section>

        {job.skills && job.skills.length > 0 && (
          <section>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
              Required Skills
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Chip key={skill}>{skill}</Chip>
              ))}
            </div>
          </section>
        )}
      </div>

      {relatedJobsQuery.data && relatedJobsQuery.data.length > 0 && (
        <div className="mt-12 border-t border-grid pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Similar Positions
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {relatedJobsQuery.data.map((relJob) => (
              <Link
                key={relJob.id}
                to={ROUTES.jobDetail(relJob.id)}
                className="block border border-grid p-4 transition-colors hover:border-signal"
              >
                <p className="font-medium text-ink">{relJob.title}</p>
                <p className="mt-1 font-mono text-xs text-ink-soft">
                  {formatWorkMode(relJob.work_mode)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isCandidate && profile?.resume_url && (
        <JobMatchDialog
          isOpen={isMatchOpen}
          onOpenChange={setIsMatchOpen}
          jobId={jobId}
          jobTitle={job.title}
          candidateId={candidateId}
        />
      )}

      {isCandidate && profile?.resume_url && (
        <>
          <InterviewStartDialog
            isOpen={isInterviewStartOpen}
            onOpenChange={setIsInterviewStartOpen}
            onStart={handleStartInterview}
            isStarting={interview.phase === "generating"}
            hasDraft={interview.hasDraft}
          />
          <InterviewSessionDialog
            isOpen={isInterviewSessionOpen}
            onOpenChange={(open) => {
              setIsInterviewSessionOpen(open);
              if (!open) interview.reset();
            }}
            phase={interview.phase}
            questions={interview.questions}
            answers={interview.answers}
            currentIndex={interview.currentIndex}
            errorMessage={interview.errorMessage}
            onAnswerChange={(value) => interview.setAnswer(interview.currentIndex, value)}
            onGoTo={interview.goTo}
            onSubmit={interview.submit}
            onRetryGeneration={interview.start}
            onSubmitted={handleInterviewSubmitted}
          />
        </>
      )}
    </div>
  );
}