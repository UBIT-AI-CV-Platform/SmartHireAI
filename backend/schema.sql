-- ============================================================================
--  SmartHireAI — Database Schema (Supabase / PostgreSQL)
--  How to apply:
--    1. Open your Supabase project → SQL Editor → "New query"
--    2. Paste this entire file → Run
--  Safe to re-run: uses "if not exists" / "drop if exists" where needed.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) PROFILES + AUTH
-- ────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('candidate', 'recruiter');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  role          public.user_role not null default 'candidate',
  role_selected boolean not null default false,
  desired_role  text,
  location      text,
  date_of_birth date,
  phone         text,
  email         text,
  photo_url     text,
  linkedin      text,
  linkedin_url  text,
  github        text,
  github_url    text,
  discord       text,
  discord_url   text,
  summary       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Safe to re-run on an existing project: ensure the column exists
alter table public.profiles add column if not exists role_selected boolean not null default false;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role, role_selected)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'candidate'),
    -- role chosen at signup (email form) => true; Google sign-in has no role => false
    (new.raw_user_meta_data ->> 'role') is not null
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) PROFILE SECTION TABLES  (skills, languages, education, certifications,
--    courses, awards, projects) — owner-only access
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.skills (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.languages (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  level text not null default 'Fluent',
  created_at timestamptz not null default now()
);

create table if not exists public.education (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  degree text not null,
  institute text not null,
  start_year text,
  end_year text,
  created_at timestamptz not null default now()
);

create table if not exists public.certifications (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  issuer text,
  issue_date text,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  provider text,
  completion_date text,
  created_at timestamptz not null default now()
);

create table if not exists public.awards (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  issuer text,
  award_date text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  link text,
  created_at timestamptz not null default now()
);

-- User-defined custom sections (e.g. Volunteer Work, Publications). items = [{title, description}]
create table if not exists public.custom_sections (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  heading text not null,
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Enable RLS + owner-only policies for every section table
do $$
declare t text;
begin
  foreach t in array array['skills','languages','education','certifications','courses','awards','projects','custom_sections']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "owner can read %1$s" on public.%1$I;', t);
    execute format($f$create policy "owner can read %1$s" on public.%1$I for select using (auth.uid() = profile_id);$f$, t);
    execute format('drop policy if exists "owner can insert %1$s" on public.%1$I;', t);
    execute format($f$create policy "owner can insert %1$s" on public.%1$I for insert with check (auth.uid() = profile_id);$f$, t);
    execute format('drop policy if exists "owner can update %1$s" on public.%1$I;', t);
    execute format($f$create policy "owner can update %1$s" on public.%1$I for update using (auth.uid() = profile_id);$f$, t);
    execute format('drop policy if exists "owner can delete %1$s" on public.%1$I;', t);
    execute format($f$create policy "owner can delete %1$s" on public.%1$I for delete using (auth.uid() = profile_id);$f$, t);
    execute format('create index if not exists %1$s_profile_id_idx on public.%1$I (profile_id);', t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) JOBS + APPLICATIONS
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id           uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  company      text not null,
  location     text,
  description  text,
  salary       text,
  skills       text[] not null default '{}',
  is_open      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists jobs_recruiter_id_idx on public.jobs (recruiter_id);
alter table public.jobs enable row level security;

-- Helper: does the current user have an application to this job?
-- SECURITY DEFINER so it bypasses RLS on applications and does NOT cause the
-- jobs<->applications policy recursion ("infinite recursion detected in policy").
create or replace function public.candidate_applied_to(p_job_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.applications a
    where a.job_id = p_job_id and a.candidate_id = auth.uid()
  );
$$;

drop policy if exists "Anyone can view open jobs" on public.jobs;
create policy "Anyone can view open jobs"
  on public.jobs for select using (
    is_open = true
    or auth.uid() = recruiter_id
    or public.candidate_applied_to(id)
  );

drop policy if exists "Recruiters can insert their own jobs" on public.jobs;
create policy "Recruiters can insert their own jobs"
  on public.jobs for insert with check (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can update their own jobs" on public.jobs;
create policy "Recruiters can update their own jobs"
  on public.jobs for update using (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can delete their own jobs" on public.jobs;
create policy "Recruiters can delete their own jobs"
  on public.jobs for delete using (auth.uid() = recruiter_id);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

do $$ begin
  create type public.application_status as enum
    ('applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  status       public.application_status not null default 'applied',
  match_score  int,
  cover_note   text,
  cv_id        uuid,             -- soft reference to the cvs row that was sent (no hard FK: cvs is created later)
  cv_snapshot  jsonb,            -- copy of the CV content at apply time (what the recruiter sees)
  candidate_name  text,          -- snapshot so the recruiter can show the applicant without reading their profile
  candidate_email text,
  applied_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)
);

-- Safe to re-run: add the CV-attachment columns if the table predates them
alter table public.applications add column if not exists cv_id uuid;
alter table public.applications add column if not exists cv_snapshot jsonb;
alter table public.applications add column if not exists candidate_name text;
alter table public.applications add column if not exists candidate_email text;

create index if not exists applications_candidate_id_idx on public.applications (candidate_id);
create index if not exists applications_job_id_idx on public.applications (job_id);
alter table public.applications enable row level security;

drop policy if exists "Candidate or job-owner can view application" on public.applications;
create policy "Candidate or job-owner can view application"
  on public.applications for select using (
    auth.uid() = candidate_id
    or auth.uid() = (select recruiter_id from public.jobs where jobs.id = applications.job_id)
  );

drop policy if exists "Candidate can apply" on public.applications;
create policy "Candidate can apply"
  on public.applications for insert with check (auth.uid() = candidate_id);

drop policy if exists "Candidate or job-owner can update application" on public.applications;
create policy "Candidate or job-owner can update application"
  on public.applications for update using (
    auth.uid() = candidate_id
    or auth.uid() = (select recruiter_id from public.jobs where jobs.id = applications.job_id)
  );

drop policy if exists "Candidate can withdraw application" on public.applications;
create policy "Candidate can withdraw application"
  on public.applications for delete using (auth.uid() = candidate_id);

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 4) AI FEATURE TABLES  (cvs, interview_sessions) — owner-only
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.cvs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  target_role text,
  tone        text default 'Detailed',
  content     jsonb,
  ats_score   int,
  suggestions jsonb,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Safe to re-run on an existing project: ensure the favorite flag exists
alter table public.cvs add column if not exists is_favorite boolean not null default false;

create index if not exists cvs_profile_id_idx on public.cvs (profile_id);
alter table public.cvs enable row level security;

drop policy if exists "owner can read cvs" on public.cvs;
create policy "owner can read cvs" on public.cvs for select using (auth.uid() = profile_id);
drop policy if exists "owner can insert cvs" on public.cvs;
create policy "owner can insert cvs" on public.cvs for insert with check (auth.uid() = profile_id);
drop policy if exists "owner can update cvs" on public.cvs;
create policy "owner can update cvs" on public.cvs for update using (auth.uid() = profile_id);
drop policy if exists "owner can delete cvs" on public.cvs;
create policy "owner can delete cvs" on public.cvs for delete using (auth.uid() = profile_id);

drop trigger if exists cvs_set_updated_at on public.cvs;
create trigger cvs_set_updated_at
  before update on public.cvs
  for each row execute function public.set_updated_at();

-- Saved cover letters (history + favorites), owner-only
create table if not exists public.cover_letters (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  target_role text,
  company     text,
  tone        text default 'Professional',
  content     text,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cover_letters_profile_id_idx on public.cover_letters (profile_id);
alter table public.cover_letters enable row level security;

drop policy if exists "owner can read cover_letters" on public.cover_letters;
create policy "owner can read cover_letters" on public.cover_letters for select using (auth.uid() = profile_id);
drop policy if exists "owner can insert cover_letters" on public.cover_letters;
create policy "owner can insert cover_letters" on public.cover_letters for insert with check (auth.uid() = profile_id);
drop policy if exists "owner can update cover_letters" on public.cover_letters;
create policy "owner can update cover_letters" on public.cover_letters for update using (auth.uid() = profile_id);
drop policy if exists "owner can delete cover_letters" on public.cover_letters;
create policy "owner can delete cover_letters" on public.cover_letters for delete using (auth.uid() = profile_id);

drop trigger if exists cover_letters_set_updated_at on public.cover_letters;
create trigger cover_letters_set_updated_at
  before update on public.cover_letters
  for each row execute function public.set_updated_at();

-- Bookmarked / saved jobs (candidate side), owner-only
create table if not exists public.saved_jobs (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id     uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, job_id)
);

create index if not exists saved_jobs_profile_id_idx on public.saved_jobs (profile_id);
alter table public.saved_jobs enable row level security;

drop policy if exists "owner can read saved_jobs" on public.saved_jobs;
create policy "owner can read saved_jobs" on public.saved_jobs for select using (auth.uid() = profile_id);
drop policy if exists "owner can insert saved_jobs" on public.saved_jobs;
create policy "owner can insert saved_jobs" on public.saved_jobs for insert with check (auth.uid() = profile_id);
drop policy if exists "owner can delete saved_jobs" on public.saved_jobs;
create policy "owner can delete saved_jobs" on public.saved_jobs for delete using (auth.uid() = profile_id);

create table if not exists public.interview_sessions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id     uuid references public.jobs(id) on delete set null,
  role       text,
  questions  jsonb,
  feedback   jsonb,
  score      int,
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_profile_id_idx on public.interview_sessions (profile_id);
alter table public.interview_sessions enable row level security;

drop policy if exists "owner can read interviews" on public.interview_sessions;
create policy "owner can read interviews" on public.interview_sessions for select using (auth.uid() = profile_id);
drop policy if exists "owner can insert interviews" on public.interview_sessions;
create policy "owner can insert interviews" on public.interview_sessions for insert with check (auth.uid() = profile_id);
drop policy if exists "owner can update interviews" on public.interview_sessions;
create policy "owner can update interviews" on public.interview_sessions for update using (auth.uid() = profile_id);
drop policy if exists "owner can delete interviews" on public.interview_sessions;
create policy "owner can delete interviews" on public.interview_sessions for delete using (auth.uid() = profile_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5) STORAGE — avatars bucket (profile photos). Public read, owner-only write.
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
--  Done. 14 tables + RLS + signup trigger + avatars bucket are ready.
-- ============================================================================
