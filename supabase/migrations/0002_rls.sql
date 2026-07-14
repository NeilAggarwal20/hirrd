-- ==========================================================
-- HIRRD — Row Level Security
-- Every table has RLS enabled. There is no public write access
-- anywhere. All ownership checks compare against
-- (select auth.jwt() ->> 'sub'), which is the authenticated
-- Clerk user's id, injected by Supabase's native Clerk
-- third-party auth integration (Authentication > Sign In / Up >
-- Third Party Auth in the Supabase dashboard).
-- ==========================================================

alter table public.users        enable row level security;
alter table public.companies    enable row level security;
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;
alter table public.saved_jobs   enable row level security;

-- ----------------------------------------------------------
-- users
-- ----------------------------------------------------------

-- A signed-in user may read any profile (recruiters need candidate
-- profiles for applicant lists; candidates need recruiter/company
-- attribution). Only the row's owner can write to it.
create policy "users_select_authenticated"
  on public.users for select
  to authenticated
  using (true);

create policy "users_insert_self"
  on public.users for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = id);

create policy "users_update_self"
  on public.users for update
  to authenticated
  using ((select auth.jwt() ->> 'sub') = id)
  with check ((select auth.jwt() ->> 'sub') = id);

-- ----------------------------------------------------------
-- companies
-- ----------------------------------------------------------

-- Company profiles are public (candidates browse them via job listings).
create policy "companies_select_public"
  on public.companies for select
  to authenticated, anon
  using (true);

create policy "companies_insert_owner"
  on public.companies for insert
  to authenticated
  with check (
    (select auth.jwt() ->> 'sub') = recruiter_id
    and exists (
      select 1 from public.users u
      where u.id = (select auth.jwt() ->> 'sub') and u.role = 'recruiter'
    )
  );

create policy "companies_update_owner"
  on public.companies for update
  to authenticated
  using ((select auth.jwt() ->> 'sub') = recruiter_id)
  with check ((select auth.jwt() ->> 'sub') = recruiter_id);

create policy "companies_delete_owner"
  on public.companies for delete
  to authenticated
  using ((select auth.jwt() ->> 'sub') = recruiter_id);

-- ----------------------------------------------------------
-- jobs
-- ----------------------------------------------------------

-- Anyone can read published jobs; the owning recruiter can also
-- read their own drafts/closed jobs.
create policy "jobs_select_published_or_owner"
  on public.jobs for select
  to authenticated, anon
  using (
    status = 'published'
    or (select auth.jwt() ->> 'sub') = recruiter_id
  );

create policy "jobs_insert_owner"
  on public.jobs for insert
  to authenticated
  with check (
    (select auth.jwt() ->> 'sub') = recruiter_id
    and exists (
      select 1 from public.companies c
      where c.id = company_id and c.recruiter_id = (select auth.jwt() ->> 'sub')
    )
  );

create policy "jobs_update_owner"
  on public.jobs for update
  to authenticated
  using ((select auth.jwt() ->> 'sub') = recruiter_id)
  with check ((select auth.jwt() ->> 'sub') = recruiter_id);

create policy "jobs_delete_owner"
  on public.jobs for delete
  to authenticated
  using ((select auth.jwt() ->> 'sub') = recruiter_id);

-- ----------------------------------------------------------
-- applications
-- ----------------------------------------------------------

-- Visible to the candidate who applied, and to the recruiter who
-- owns the job being applied to.
create policy "applications_select_candidate_or_recruiter"
  on public.applications for select
  to authenticated
  using (
    (select auth.jwt() ->> 'sub') = candidate_id
    or exists (
      select 1 from public.jobs j
      where j.id = job_id and j.recruiter_id = (select auth.jwt() ->> 'sub')
    )
  );

create policy "applications_insert_candidate"
  on public.applications for insert
  to authenticated
  with check (
    (select auth.jwt() ->> 'sub') = candidate_id
    and exists (
      select 1 from public.users u
      where u.id = (select auth.jwt() ->> 'sub') and u.role = 'candidate'
    )
    and exists (
      select 1 from public.jobs j where j.id = job_id and j.status = 'published'
    )
  );

-- Candidates may withdraw (delete) their own application only while
-- it is still in the initial "applied" state.
create policy "applications_delete_candidate_withdraw"
  on public.applications for delete
  to authenticated
  using (
    (select auth.jwt() ->> 'sub') = candidate_id
    and status = 'applied'
  );

-- Only the recruiter who owns the job may change application status
-- (reject / accept / interview / hire).
create policy "applications_update_recruiter_status"
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.recruiter_id = (select auth.jwt() ->> 'sub')
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.recruiter_id = (select auth.jwt() ->> 'sub')
    )
  );

-- ----------------------------------------------------------
-- saved_jobs
-- ----------------------------------------------------------

create policy "saved_jobs_select_owner"
  on public.saved_jobs for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = candidate_id);

create policy "saved_jobs_insert_owner"
  on public.saved_jobs for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = candidate_id);

create policy "saved_jobs_delete_owner"
  on public.saved_jobs for delete
  to authenticated
  using ((select auth.jwt() ->> 'sub') = candidate_id);
