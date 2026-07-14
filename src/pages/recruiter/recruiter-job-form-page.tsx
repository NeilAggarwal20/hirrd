import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchMyCompanies } from "@/api/companies";
import { createJob, fetchJobByIdForRecruiter, updateJob } from "@/api/recruiter-jobs";
import { JobForm } from "@/features/recruiter/job-form";
import { ROUTES } from "@/constants/routes";
import { parseCommaList, type JobFormValues } from "@/lib/validation";

export function RecruiterJobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { profile } = useCurrentUser();
  const recruiterId = profile?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState("");

  const companiesQuery = useQuery({
    queryKey: ["companies", recruiterId],
    queryFn: () => fetchMyCompanies(recruiterId),
    enabled: !!recruiterId,
  });

  const jobQuery = useQuery({
    queryKey: ["recruiter-job", id],
    queryFn: () => fetchJobByIdForRecruiter(id as string),
    enabled: isEditing,
  });

  const job = jobQuery.data;

  useEffect(() => {
    if (job?.company_id) {
      setCompanyId(job.company_id);
    }
  }, [job?.company_id]);

  const mutation = useMutation({
    mutationFn: (values: JobFormValues) => {
      const shared = {
        company_id: companyId,
        title: values.title,
        description: values.description,
        location: values.location || null,
        work_mode: values.workMode,
        employment_type: values.employmentType,
        experience_level: values.experienceLevel,
        category: values.category,
        salary_min: values.salaryMin ?? null,
        salary_max: values.salaryMax ?? null,
        skills: parseCommaList(values.skills),
        benefits: parseCommaList(values.benefits),
      };

      if (isEditing && job) {
        return updateJob(job.id, shared);
      }
      return createJob({ ...shared, recruiter_id: recruiterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs", recruiterId] });
      toast.success(isEditing ? "Role updated" : "Role created as a draft");
      navigate(ROUTES.recruiterJobs);
    },
    onError: () => toast.error("Couldn't save this role. Check every field and try again."),
  });

  if (isEditing && jobQuery.isLoading) {
    return <p className="text-sm text-ink-soft">Loading —</p>;
  }

  if (!isEditing && !companiesQuery.isLoading && (companiesQuery.data?.length ?? 0) === 0) {
    return (
      <div className="max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Recruiter</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
          New role
        </h1>
        <p className="mt-6 text-sm text-ink-soft">
          You need a company before you can post a role.{" "}
          <button
            type="button"
            onClick={() => navigate(ROUTES.recruiterCompany)}
            className="text-signal hover:underline"
          >
            Set one up first →
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Recruiter</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
        {isEditing ? "Edit role" : "New role"}
      </h1>

      <div className="mt-8 max-w-2xl">
        <JobForm
          companies={companiesQuery.data ?? []}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          submitLabel={isEditing ? "Save changes" : "Create as draft"}
          isSubmitting={mutation.isPending}
          onCancel={() => navigate(ROUTES.recruiterJobs)}
          onSubmit={(values) => mutation.mutate(values)}
          defaultValues={
            job
              ? {
                  title: job.title,
                  description: job.description,
                  location: job.location ?? "",
                  workMode: job.work_mode,
                  employmentType: job.employment_type,
                  experienceLevel: job.experience_level,
                  category: job.category,
                  salaryMin: job.salary_min ?? undefined,
                  salaryMax: job.salary_max ?? undefined,
                  skills: job.skills.join(", "),
                  benefits: job.benefits.join(", "),
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
