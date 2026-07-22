import re
with open('src/pages/job-detail-page.tsx', 'r') as f:
    content = f.read()

# 1. Remove Show import
content = re.sub(r'import \{ Show \} from "@clerk/react";\n', '', content)

# 2. Fix lucide-react imports
content = content.replace('import { Share2, Link as LinkIcon, Users, Sparkles } from "lucide-react";', 'import { Share2, Users, Sparkles } from "lucide-react";')

# 3. Fix fetchRelatedJobs
content = re.sub(
    r'queryKey: \["related-jobs", jobQuery\.data\?\.department_id\],\n\s*queryFn: \(\) => fetchRelatedJobs\(jobQuery\.data!\.department_id, jobId\),\n\s*enabled: !!jobQuery\.data\?\.department_id,',
    'queryKey: ["related-jobs", jobQuery.data?.category],\n    queryFn: () => fetchRelatedJobs(jobQuery.data!), \n    enabled: !!jobQuery.data,',
    content
)

# 4. Fix applyMutation
apply_mutation_old = '''    mutationFn: () => applyToJob(candidateId, jobId),'''
apply_mutation_new = '''    mutationFn: () => {
      if (!profile?.resume_url) throw new Error("Resume required to apply");
      return applyToJob({
        jobId,
        candidateId,
        resumeUrl: profile.resume_url,
      });
    },'''
content = content.replace(apply_mutation_old, apply_mutation_new)

# 5. Fix pushNotification
push_old = '''        pushNotification({
          userId: jobQuery.data.recruiter_id,
          type: "application_received",
          title: "New Job Application",
          body: A candidate applied for .,
          data: { jobId, candidateId },
        });'''
push_new = '''        pushNotification({
          type: "application_submitted",
          title: "New Job Application",
          body: A candidate applied for .,
        });'''
content = content.replace(push_old, push_new)

# 6. Fix ROUTES.JOBS
content = content.replace('ROUTES.JOBS', 'ROUTES.jobs')
content = content.replace('ROUTES.JOB_DETAIL', 'ROUTES.jobDetail')

# 7. Fix formatWorkMode
content = content.replace('formatWorkMode(job.location_mode, job.location)', 'formatWorkMode(job.work_mode)')
content = content.replace('formatWorkMode(relJob.location_mode, relJob.location)', 'formatWorkMode(relJob.work_mode)')

# 8. Fix formatSalaryRange
content = content.replace('formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)', 'formatSalaryRange(job.salary_min, job.salary_max)')

# 9. Fix JobMatchDialog
content = content.replace('jobTitle={job.title}\n        />', 'jobTitle={job.title}\n          candidateId={candidateId}\n        />')

with open('src/pages/job-detail-page.tsx', 'w') as f:
    f.write(content)
