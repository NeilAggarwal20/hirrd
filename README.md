# HIRRD — a job portal, built for signal over noise

Swiss-design job portal. React 19 + Vite + TypeScript, Clerk for identity,
Supabase/Postgres for data with row-level security enforced on every table.

This README covers the full build: project scaffold, auth wiring, database
schema + RLS + storage policies, routing, and every recruiter/candidate
feature — company CRUD with logo upload, job CRUD with a TipTap rich-text
description, the applicant review board, candidate profile + resume upload,
and advanced job search filters (location, remote, experience level, salary
floor).

## 1. Prerequisites

- Node.js 20.9+ 
- A free [Clerk](https://clerk.com) account
- A free [Supabase](https://supabase.com) project
- The [Supabase CLI](https://supabase.com/docs/guides/cli) if you want to run
  migrations locally (`brew install supabase/tap/supabase` or see their docs)

## 2. Clerk setup

1. Create an application in the Clerk dashboard. Enable **Email** (and any
   other sign-in strategies you want) under **User & Authentication**.
2. Go to **Configure → API Keys** and copy the **Publishable key**.
3. Go to **Configure → SSO Connections / Third-Party Auth** — actually, for
   this integration you configure it from the **Supabase** side (step 3.3
   below); Clerk needs no extra setup beyond having the app created.

## 3. Supabase setup

1. Create a new Supabase project.
2. Go to **Project Settings → Data API** and copy the **Project URL** and
   the **anon public key**.
3. Go to **Authentication → Sign In / Up → Third Party Auth**, click **Add
   provider**, choose **Clerk**, and paste your Clerk instance's domain
   (found in Clerk under **Configure → Domains**). This is what lets
   Supabase trust Clerk's session tokens directly — no JWT template, no
   shared secret.
4. Run the migrations. From the project root:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   This applies, in order: `0001_schema.sql` (tables, indexes, views),
   `0002_rls.sql` (row-level security on every table), `0003_storage.sql`
   (the `company-logos` and `resumes` buckets and their policies), and
   `0004_profile_and_job_enrichment.sql` (candidate/recruiter profile
   fields, `work_mode` replacing the old `is_remote` boolean, the public
   applicant-count function, and a guard against deleting a company that
   still has a published job).

## 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 5. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:5173. Sign up, complete onboarding (choose Recruiter
or Candidate), and you'll land on the matching dashboard.

## 6. Seed data & sample accounts

Clerk owns identity, so seed rows can't create Clerk users directly. To get
sample data locally:

1. Sign up twice in the running app — once you'll designate the "recruiter"
   test account, once the "candidate" test account.
2. In the Clerk dashboard → **Users**, copy each account's user id
   (`user_xxxxxxxxxxxx`).
3. Open `supabase/seed.sql` and replace the two placeholder ids with the
   real ones.
4. Run `supabase db reset` (local) or execute the seed file's contents
   against your project's SQL editor (hosted). This creates a sample
   company and three jobs (two published, one draft) owned by your
   recruiter test account.
5. Complete onboarding for both accounts in-app, picking the matching role
   for each (the seed only sets `role`/`onboarding_completed`... actually it
   does set them — if you seed before your first onboarding screen, you'll
   be redirected straight to the dashboard).

## 7. Project structure

```
src/
  api/          Typed Supabase queries/mutations, one file per resource
  components/   Shared, reusable UI (shadcn-style primitives + app widgets)
  constants/     Route paths and other fixed values
  hooks/         Custom hooks (e.g. useCurrentUser)
  layouts/       Route-level layout shells (root chrome, dashboard rail)
  lib/           Client singletons (Supabase client, Query client, cn())
  pages/         Route components
  providers/     Context/provider wiring (Clerk → Supabase token bridge)
  styles/        Global CSS + design tokens (Tailwind v4 @theme)
  types/         Hand-maintained types mirroring the SQL schema
supabase/
  migrations/    Schema, RLS, storage — apply in numeric order
  seed.sql       Local/dev sample data
```

## 8. Design system

Swiss / International Typographic Style: hairline rules, a strict grid,
square corners everywhere, one accent color (`--color-signal`, a true red —
see `src/styles/index.css` for the full token list). The signature UI
element is a numbered "index rail" — job listings and dashboard nav are
rendered as a running, mono-set index, like a timetable, because they
genuinely are ordered sequences. Fonts: Archivo Expanded (display, numerals
only), IBM Plex Sans (body/UI), IBM Plex Mono (data, labels, indices).

## 9. Security notes

- Every table has RLS enabled; there is no table any signed-in user can
  write to outside their own rows. See `supabase/migrations/0002_rls.sql`
  for the exact policy per table.
- Storage: `company-logos` is public-read (logos appear on every job card)
  but write-restricted to the owning recruiter. `resumes` is fully private —
  readable only by the candidate who owns the file and the recruiter whose
  job that resume was submitted against.
- The Supabase client (`src/lib/supabase.ts`) is a single instance whose
  auth token is supplied per-request by Clerk (`accessToken` option) — there
  is no long-lived service key anywhere in client code.

## 10. Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel. Framework preset: **Vite**.
3. Add the three `VITE_*` environment variables from step 4 in Vercel's
   project settings.
4. In Clerk, add your Vercel domain under **Configure → Domains** so
   sign-in/sign-up redirects work in production.
5. Deploy. `npm run build` is the build command Vercel will run
   automatically.

## 11. Feature coverage

**Recruiter**: company CRUD with logo upload, job CRUD (TipTap description,
work mode, skills, benefits), publish/close/delete with a real confirm
dialog, applicant review board (search, resume access via signed URL,
status transitions), a dashboard with job-status stat cards and recent
applications across every job, and a profile page (name, company role,
contact phone).

**Candidate**: job search with category/company/work-mode/experience/salary
filters and four sort orders, job detail with benefits/skills/applicant
count/share/copy-link/related-jobs/company-page, apply/save (role-gated —
see below), an applications list with withdraw, a saved-roles list, a
navbar shortcut with a live saved-count badge, and a profile page with
skills, work experience, education, portfolio/GitHub/LinkedIn links, and
resume upload/replace/preview/download. The candidate dashboard adds a
resume-completion meter, recommended roles, and an application timeline.

**Role separation (frontend + RLS, both enforced)**: recruiters never see
Apply/Save anywhere in the UI — job detail branches on `profile.role`, not
just sign-in state. On the database side, `saved_jobs` and `applications`
insert policies both require `role = 'candidate'` in addition to row
ownership, so the restriction holds even if a client bypassed the UI
entirely. This project has no separate backend server — Postgres RLS *is*
the authorization layer, since the client talks to Supabase directly.

**Business-rule hardening added in this pass**: a company with a published
job can't be deleted (a `BEFORE DELETE` trigger blocks it with a clear
error, surfaced as a toast); duplicate applications/saves were already
impossible via unique constraints and now the UI is fully consistent about
it too; destructive actions (delete company, delete job, withdraw
application) go through a real confirmation dialog instead of the browser's
native `confirm()`.

**Loading & transitions**: a single branded splash renders while Clerk
initializes (replacing the flash → black screen → white screen sequence
with one deliberate transition), every route is code-split and lazy-loaded
behind a shared Suspense fallback, and a top-level error boundary catches
render crashes instead of showing a blank page.

**Not built** (genuine remaining nice-to-haves): dark mode, page-transition
animation on route change (beyond the existing stagger/hover motion),
image optimization/CDN transforms for uploaded logos, and a dedicated
notifications/activity-feed system beyond the dashboards' recent-activity
lists.
