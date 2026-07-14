import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchApplicantsForJob, setApplicationStatus } from "@/api/recruiter-applications";
import { getResumeSignedUrl } from "@/api/storage";
import { fetchJobByIdForRecruiter } from "@/api/recruiter-jobs";
import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/utils/format";
import { ResumeDialog } from "@/components/shared/resume-dialog";
import type { ApplicationStatus } from "@/types/database.types";

const statusOptions: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under review" },
  { value: "interview", label: "Interview" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

export function RecruiterApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  const jobQuery = useQuery({
    queryKey: ["recruiter-job", jobId],
    queryFn: () => fetchJobByIdForRecruiter(jobId as string),
    enabled: !!jobId,
  });

  const applicantsQuery = useQuery({
    queryKey: ["applicants", jobId],
    queryFn: () => fetchApplicantsForJob(jobId as string),
    enabled: !!jobId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => setApplicationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants", jobId] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-job-stats"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Couldn't update this applicant's status."),
  });

  const filtered = useMemo(() => {
    const applicants = applicantsQuery.data ?? [];
    if (!search.trim()) return applicants;
    const term = search.toLowerCase();
    return applicants.filter((a) => {
      const name = `${a.users?.first_name ?? ""} ${a.users?.last_name ?? ""}`.toLowerCase();
      return name.includes(term) || a.users?.email.toLowerCase().includes(term);
    });
  }, [applicantsQuery.data, search]);

  async function openResume(path: string, candidateName: string) {
    try {
      const url = await getResumeSignedUrl(path);
      setPreviewUrl(url);
      setPreviewName(candidateName);
      setIsPreviewOpen(true);
    } catch {
      toast.error("Couldn't open this resume.");
    }
  }

  return (
    <div>
      <Link
        to={ROUTES.recruiterJobs}
        className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-signal"
      >
        ← All jobs
      </Link>

      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-signal">Applicants</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        {jobQuery.data?.title ?? "Role"}
      </h1>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email —"
        className="mt-6 max-w-sm"
      />

      <ul className="mt-6 border-t border-grid">
        {filtered.map((applicant, index) => {
          const name = `${applicant.users?.first_name ?? ""} ${applicant.users?.last_name ?? ""}`;
          return (
            <li key={applicant.id} className="border-b border-grid py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span className="index-figure text-sm text-signal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-ink">
                      {name}
                    </p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
                      {applicant.users?.email} · Applied {formatRelativeDate(applicant.created_at)}
                    </p>
                    {applicant.users?.headline && (
                      <p className="mt-1 text-sm text-ink-soft">{applicant.users.headline}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => openResume(applicant.resume_url, name)} className="cursor-pointer">
                    View resume
                  </Button>
                  <Select
                    value={applicant.status}
                    onValueChange={(status) =>
                      statusMutation.mutate({ id: applicant.id, status: status as ApplicationStatus })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!applicantsQuery.isLoading && filtered.length === 0 && (
        <p className="border-b border-grid py-8 text-sm text-ink-soft">
          {search ? `No applicants match "${search}".` : "No applicants yet."}
        </p>
      )}

      {/* Embedded Resume Preview Dialog */}
      <ResumeDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        resumeUrl={previewUrl}
        candidateName={previewName}
      />
    </div>
  );
}
