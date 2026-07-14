-- ==========================================================
-- HIRRD — Storage buckets & policies
--
-- Path conventions (enforced by the upload code, not just by
-- convention — see src/api/storage.ts):
--   company-logos/{recruiter_id}/{filename}
--   resumes/{candidate_id}/{filename}
--
-- storage.foldername(name) returns an array of path segments,
-- so foldername(name)[1] is always the owning Clerk user id.
-- ==========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-logos', 'company-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- company-logos — publicly readable (they're displayed on every
-- job card), writable only by the recruiter who owns that folder.
-- ----------------------------------------------------------

create policy "logo_public_read"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'company-logos');

create policy "logo_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "logo_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "logo_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

-- ----------------------------------------------------------
-- resumes — private. Readable by the candidate who owns the file,
-- and by any recruiter whose job that candidate applied to with
-- this exact resume. Writable only by the owning candidate.
-- ----------------------------------------------------------

create policy "resume_owner_or_recruiter_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
      or exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where a.resume_url = name
          and j.recruiter_id = (select auth.jwt() ->> 'sub')
      )
    )
  );

create policy "resume_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "resume_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
