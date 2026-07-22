-- ==========================================================
-- HIRRD — AI candidate analysis (recruiter hiring report)
--
-- Same caching shape as ai_resume_reviews / ai_job_matches
-- (0005_ai_resume_analysis.sql): keyed by the application being
-- reviewed, invalidated when that application's resume_path
-- changes. Only the service role (used by the candidate-analysis
-- edge function) ever writes here.
--
-- Unlike the candidate-facing tables, this one is recruiter-only:
-- it contains the recruiter's private hiring notes (concerns,
-- interview questions) about a specific applicant, so candidates
-- are not granted a select policy on their own rows here.
-- ==========================================================

create table public.ai_candidate_analyses (
  application_id  uuid primary key references public.applications (id) on delete cascade,
  resume_path     text not null,
  result          jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index ai_candidate_analyses_application_idx on public.ai_candidate_analyses (application_id);

create trigger ai_candidate_analyses_set_updated_at
  before update on public.ai_candidate_analyses
  for each row execute function public.set_updated_at();

alter table public.ai_candidate_analyses enable row level security;

-- Only the recruiter who owns the job behind this application may
-- read the analysis of that application.
create policy "ai_candidate_analyses_select_recruiter"
  on public.ai_candidate_analyses for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = application_id
        and j.recruiter_id = (select auth.jwt() ->> 'sub')
    )
  );
