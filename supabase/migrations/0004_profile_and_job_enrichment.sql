-- ==========================================================
-- HIRRD — Profile enrichment, job richness, and production
-- hardening found during the polish pass.
--
-- This migration is written to be safely re-runnable: every
-- ADD COLUMN, index, constraint, trigger, and policy is guarded
-- so running this file twice (or resuming after a partial failure)
-- does not error and does not create duplicates.
-- ==========================================================

-- ----------------------------------------------------------
-- Candidate/recruiter profile enrichment
-- ----------------------------------------------------------
alter table public.users
  add column if not exists skills text[] not null default '{}',
  add column if not exists experience jsonb not null default '[]',
  add column if not exists education jsonb not null default '[]',
  add column if not exists portfolio_url text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists phone text,
  add column if not exists company_role text; -- recruiter's title at their company (e.g. "Talent Lead")

comment on column public.users.experience is
  'jsonb array of { title, company, start_date, end_date, description }';
comment on column public.users.education is
  'jsonb array of { school, degree, start_date, end_date }';

-- ----------------------------------------------------------
-- job_listings depends on jobs.is_remote (it selects it directly),
-- so the view MUST be dropped before that column can be dropped.
-- It's recreated further down, once the jobs table is in its final
-- shape. Dropping it here is itself idempotent (IF EXISTS) — if this
-- migration already ran to completion, the view already reflects the
-- new columns and this is just a drop-and-immediately-recreate.
-- ----------------------------------------------------------
drop view if exists public.job_listings;

-- ----------------------------------------------------------
-- Jobs: replace the boolean is_remote with a real three-way
-- work mode, and add benefits/skills for job detail + filtering.
-- ----------------------------------------------------------
alter table public.jobs add column if not exists work_mode text;

-- Backfill work_mode from is_remote only if is_remote still exists
-- (i.e. only on the first successful run of this migration — on a
-- re-run after completion, is_remote is already gone and this is a
-- no-op). Dynamic SQL is required here because a static reference to
-- `is_remote` would fail to parse once the column has been dropped.
do $migration$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'is_remote'
  ) then
    execute $sql$
      update public.jobs
      set work_mode = coalesce(work_mode, case when is_remote then 'remote' else 'onsite' end)
    $sql$;
  end if;
end
$migration$;

-- Safety net: if anything above didn't backfill every row (shouldn't
-- happen, but this keeps the NOT NULL below from ever failing), default
-- remaining nulls to 'onsite'. No-op if there are no nulls.
update public.jobs set work_mode = 'onsite' where work_mode is null;

alter table public.jobs alter column work_mode set not null;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_work_mode_chk'
  ) then
    alter table public.jobs add constraint jobs_work_mode_chk
      check (work_mode in ('remote', 'hybrid', 'onsite'));
  end if;
end
$migration$;

drop index if exists public.jobs_is_remote_idx;
alter table public.jobs drop column if exists is_remote;

alter table public.jobs
  add column if not exists benefits text[] not null default '{}',
  add column if not exists skills text[] not null default '{}';

create index if not exists jobs_work_mode_idx on public.jobs (work_mode);
create index if not exists jobs_skills_gin_idx on public.jobs using gin (skills);

-- ----------------------------------------------------------
-- job_listings view: recreate now that jobs is in its final shape.
-- Safe to run repeatedly — it was unconditionally dropped above.
-- ----------------------------------------------------------
create view public.job_listings as
select
  j.id,
  j.title,
  j.description,
  j.location,
  j.work_mode,
  j.employment_type,
  j.experience_level,
  j.category,
  j.salary_min,
  j.salary_max,
  j.benefits,
  j.skills,
  j.status,
  j.published_at,
  j.created_at,
  j.recruiter_id,
  c.id as company_id,
  c.name as company_name,
  c.logo_url as company_logo_url,
  c.industry as company_industry
from public.jobs j
join public.companies c on c.id = j.company_id;

-- ----------------------------------------------------------
-- Public applicant counts without exposing individual rows.
-- RLS on `applications` intentionally hides other people's rows,
-- so a plain COUNT(*) under RLS would under-count for anyone but
-- the owning recruiter. This function runs as its definer (bypassing
-- RLS) but returns only a count — no row data leaks.
-- `create or replace` is already idempotent.
-- ----------------------------------------------------------
create or replace function public.job_applicant_count(p_job_id uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.applications where job_id = p_job_id;
$$;

grant execute on function public.job_applicant_count(uuid) to authenticated, anon;

-- ----------------------------------------------------------
-- Guard: a company with a published job can't be deleted out
-- from under that listing. Recruiters must close every job first.
-- `create or replace function` is idempotent; the trigger itself
-- needs an explicit drop first since Postgres has no
-- `CREATE TRIGGER IF NOT EXISTS`.
-- ----------------------------------------------------------
create or replace function public.prevent_company_delete_with_published_jobs()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.jobs where company_id = old.id and status = 'published'
  ) then
    raise exception 'Close every published job before deleting this company.'
      using errcode = 'foreign_key_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists companies_block_delete_with_published_jobs on public.companies;

create trigger companies_block_delete_with_published_jobs
  before delete on public.companies
  for each row execute function public.prevent_company_delete_with_published_jobs();

-- ----------------------------------------------------------
-- Defense in depth: saved_jobs previously only checked that the
-- caller owned the row being inserted, not that they were actually
-- a candidate. A recruiter could save a job. Tighten it to match
-- the same role check applications already had.
-- ----------------------------------------------------------
drop policy if exists "saved_jobs_insert_owner" on public.saved_jobs;

create policy "saved_jobs_insert_owner"
  on public.saved_jobs for insert
  to authenticated
  with check (
    (select auth.jwt() ->> 'sub') = candidate_id
    and exists (
      select 1 from public.users u
      where u.id = (select auth.jwt() ->> 'sub') and u.role = 'candidate'
    )
  );
