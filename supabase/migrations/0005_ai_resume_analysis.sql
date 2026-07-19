-- ==========================================================
-- HIRRD — AI resume analysis (caching tables)
--
-- Both Gemini-backed features are expensive to call repeatedly, so
-- results are cached here keyed by candidate (+ job, for the match
-- feature) and invalidated only when the candidate's resume_path
-- changes. Only the service role (used by the resume-review and
-- resume-job-match edge functions) ever writes to these tables —
-- regular clients get read-only access to their own rows.
-- ==========================================================

create table public.ai_resume_reviews (
  candidate_id  text primary key references public.users (id) on delete cascade,
  resume_path   text not null,
  result        jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger ai_resume_reviews_set_updated_at
  before update on public.ai_resume_reviews
  for each row execute function public.set_updated_at();

alter table public.ai_resume_reviews enable row level security;

create policy "ai_resume_reviews_owner_select"
  on public.ai_resume_reviews for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = candidate_id);

-- ----------------------------------------------------------

create table public.ai_job_matches (
  candidate_id  text not null references public.users (id) on delete cascade,
  job_id        uuid not null references public.jobs (id) on delete cascade,
  resume_path   text not null,
  result        jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

create trigger ai_job_matches_set_updated_at
  before update on public.ai_job_matches
  for each row execute function public.set_updated_at();

alter table public.ai_job_matches enable row level security;

create policy "ai_job_matches_owner_select"
  on public.ai_job_matches for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = candidate_id);
