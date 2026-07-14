-- ==========================================================
-- HIRRD — Core schema
-- Clerk is the identity provider. Postgres user ids are the
-- Clerk user id (the JWT "sub" claim), stored as text — NOT uuid,
-- because auth.uid() does not work with third-party Clerk auth.
-- Always compare against (select auth.jwt() ->> 'sub').
-- ==========================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ----------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------
-- users — mirrors the Clerk identity, holds app-specific profile data
-- ----------------------------------------------------------
create table public.users (
  id                    text primary key, -- Clerk user id (sub claim)
  email                 text not null unique,
  first_name            text,
  last_name             text,
  avatar_url            text,
  role                  text check (role in ('recruiter', 'candidate')),
  onboarding_completed  boolean not null default false,
  resume_url            text,       -- candidate's default resume (Storage path)
  headline              text,       -- candidate's short professional headline
  bio                   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index users_role_idx on public.users (role);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------
-- companies — owned by a recruiter
-- ----------------------------------------------------------
create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  recruiter_id  text not null references public.users (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 120),
  logo_url      text,
  website       text,
  industry      text,
  headquarters  text,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (recruiter_id, name)
);

create index companies_recruiter_idx on public.companies (recruiter_id);
create index companies_name_trgm_idx on public.companies using gin (name gin_trgm_ops);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------
-- jobs — owned by a recruiter, belongs to a company
-- ----------------------------------------------------------
create table public.jobs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  recruiter_id      text not null references public.users (id) on delete cascade,
  title             text not null check (char_length(title) between 3 and 160),
  description       text not null,          -- TipTap-authored HTML
  location          text,
  is_remote         boolean not null default false,
  employment_type   text not null check (employment_type in ('full-time', 'part-time', 'contract', 'internship')),
  experience_level  text not null check (experience_level in ('entry', 'mid', 'senior', 'lead')),
  category          text not null,
  salary_min        integer check (salary_min is null or salary_min >= 0),
  salary_max        integer check (salary_max is null or salary_max >= 0),
  status            text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint jobs_salary_range_chk check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  )
);

create index jobs_company_idx on public.jobs (company_id);
create index jobs_recruiter_idx on public.jobs (recruiter_id);
create index jobs_status_idx on public.jobs (status);
create index jobs_category_idx on public.jobs (category);
create index jobs_location_idx on public.jobs (location);
create index jobs_is_remote_idx on public.jobs (is_remote);
create index jobs_experience_idx on public.jobs (experience_level);
create index jobs_employment_idx on public.jobs (employment_type);
create index jobs_created_at_idx on public.jobs (created_at desc);
create index jobs_title_trgm_idx on public.jobs using gin (title gin_trgm_ops);
create index jobs_published_feed_idx on public.jobs (status, created_at desc) where status = 'published';

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create or replace function public.jobs_set_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger jobs_set_published_at
  before update on public.jobs
  for each row execute function public.jobs_set_published_at();

-- ----------------------------------------------------------
-- applications — a candidate applying to a job
-- ----------------------------------------------------------
create table public.applications (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references public.jobs (id) on delete cascade,
  candidate_id   text not null references public.users (id) on delete cascade,
  resume_url     text not null,
  cover_letter   text,
  status         text not null default 'applied'
                 check (status in ('applied', 'under_review', 'interview', 'accepted', 'rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create index applications_job_idx on public.applications (job_id);
create index applications_candidate_idx on public.applications (candidate_id);
create index applications_status_idx on public.applications (status);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------
-- saved_jobs — candidate bookmarks
-- ----------------------------------------------------------
create table public.saved_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs (id) on delete cascade,
  candidate_id  text not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create index saved_jobs_candidate_idx on public.saved_jobs (candidate_id);

-- ----------------------------------------------------------
-- Views
-- ----------------------------------------------------------

-- Public job feed with denormalized company info (candidate browsing)
create view public.job_listings as
select
  j.id,
  j.title,
  j.description,
  j.location,
  j.is_remote,
  j.employment_type,
  j.experience_level,
  j.category,
  j.salary_min,
  j.salary_max,
  j.status,
  j.published_at,
  j.created_at,
  c.id as company_id,
  c.name as company_name,
  c.logo_url as company_logo_url,
  c.industry as company_industry
from public.jobs j
join public.companies c on c.id = j.company_id;

-- Per-job applicant counts, for recruiter analytics
create view public.job_application_stats as
select
  j.id as job_id,
  j.recruiter_id,
  count(a.id) as total_applications,
  count(a.id) filter (where a.status = 'applied') as applied_count,
  count(a.id) filter (where a.status = 'under_review') as under_review_count,
  count(a.id) filter (where a.status = 'interview') as interview_count,
  count(a.id) filter (where a.status = 'accepted') as accepted_count,
  count(a.id) filter (where a.status = 'rejected') as rejected_count
from public.jobs j
left join public.applications a on a.job_id = j.id
group by j.id, j.recruiter_id;
