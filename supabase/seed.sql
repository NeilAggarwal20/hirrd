-- ==========================================================
-- HIRRD — Seed data for local development
--
-- Clerk users can't be created from SQL (Clerk owns identity),
-- so this seed assumes you've created two Clerk test accounts
-- first and pasted their real Clerk user ids below. See
-- README.md → "Seed data & sample accounts" for the exact steps.
-- Replace the two ids before running `supabase db reset`.
-- ==========================================================

-- Placeholders — swap these for real Clerk user ids (format: user_XXXXXXXXXXXX)
-- e.g. select id from auth.users is not applicable here since Clerk owns identity;
-- copy the id from the Clerk dashboard → Users → the test user you created.
\set recruiter_id 'user_replace_with_real_recruiter_clerk_id'
\set candidate_id 'user_replace_with_real_candidate_clerk_id'

insert into public.users (id, email, first_name, last_name, role, onboarding_completed)
values
  (:'recruiter_id', 'recruiter@hirrd.dev', 'Alex', 'Rivera', 'recruiter', true),
  (:'candidate_id', 'candidate@hirrd.dev', 'Jordan', 'Lee', 'candidate', true)
on conflict (id) do nothing;

insert into public.companies (id, recruiter_id, name, industry, headquarters, description)
values
  ('11111111-1111-1111-1111-111111111111', :'recruiter_id', 'Northwind Systems',
   'Enterprise Software', 'Bengaluru, IN',
   'Northwind builds infrastructure tooling used by mid-size engineering teams.')
on conflict (id) do nothing;

insert into public.jobs (id, company_id, recruiter_id, title, description, location, work_mode,
  employment_type, experience_level, category, salary_min, salary_max, status, benefits, skills)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', :'recruiter_id',
   'Frontend Engineer', '<p>Build the customer-facing product surface in React and TypeScript.</p>',
   'Bengaluru, IN', 'hybrid', 'full-time', 'mid', 'Engineering', 1800000, 2600000, 'published',
   array['Health insurance', 'Annual learning budget', 'Flexible hours'],
   array['React', 'TypeScript', 'Tailwind CSS']),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', :'recruiter_id',
   'Backend Engineer (Postgres)', '<p>Own the data layer: schema design, migrations, and query performance.</p>',
   'Remote', 'remote', 'full-time', 'senior', 'Engineering', 2400000, 3400000, 'published',
   array['Health insurance', 'Remote stipend', 'Equity'],
   array['PostgreSQL', 'Node.js', 'SQL performance tuning']),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', :'recruiter_id',
   'Product Design Intern', '<p>Support the design team on research, prototyping, and UI polish.</p>',
   'Bengaluru, IN', 'onsite', 'internship', 'entry', 'Design', 25000, 40000, 'draft',
   array['Mentorship program'],
   array['Figma', 'Prototyping'])
on conflict (id) do nothing;
