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
  -- recruiter / company fields (only recruiters use these)
  company_name     text,
  company_website  text,
  company_industry text,
  company_size     text,
  company_about    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Safe to re-run on an existing project: ensure the columns exist
alter table public.profiles add column if not exists role_selected boolean not null default false;
alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists company_website text;
alter table public.profiles add column if not exists company_industry text;
alter table public.profiles add column if not exists company_size text;
alter table public.profiles add column if not exists company_about text;

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
  expires_at   timestamptz,            -- application deadline; past = expired/old job
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Safe to re-run: add the deadline column if the table predates it
alter table public.jobs add column if not exists expires_at timestamptz;

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
  recruiter_rating int,          -- 1-5 stars set by the recruiter
  recruiter_notes  text,         -- private recruiter notes
  applied_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)
);

-- Safe to re-run: add the CV-attachment + recruiter-side columns if the table predates them
alter table public.applications add column if not exists cv_id uuid;
alter table public.applications add column if not exists cv_snapshot jsonb;
alter table public.applications add column if not exists candidate_name text;
alter table public.applications add column if not exists candidate_email text;
alter table public.applications add column if not exists recruiter_rating int;   -- 1-5 stars (recruiter only)
alter table public.applications add column if not exists recruiter_notes text;   -- private recruiter notes

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

-- AI Interview Coach chat sessions. messages = [{role:'user'|'assistant', content}]
create table if not exists public.interview_sessions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id     uuid references public.jobs(id) on delete set null,
  role       text,
  title      text,
  messages   jsonb not null default '[]',
  questions  jsonb,
  feedback   jsonb,
  score      int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run: add chat columns if the table predates them
alter table public.interview_sessions add column if not exists title text;
alter table public.interview_sessions add column if not exists messages jsonb not null default '[]';
alter table public.interview_sessions add column if not exists updated_at timestamptz not null default now();

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

drop trigger if exists interview_sessions_set_updated_at on public.interview_sessions;
create trigger interview_sessions_set_updated_at
  before update on public.interview_sessions
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 4b) NOTIFICATIONS  — in-app alerts (apply confirmation + status changes)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type       text not null default 'info',   -- applied | status | info
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_id_idx on public.notifications (profile_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "owner can read notifications" on public.notifications;
create policy "owner can read notifications" on public.notifications for select using (auth.uid() = profile_id);
drop policy if exists "owner can insert notifications" on public.notifications;
create policy "owner can insert notifications" on public.notifications for insert with check (auth.uid() = profile_id);
drop policy if exists "owner can update notifications" on public.notifications;
create policy "owner can update notifications" on public.notifications for update using (auth.uid() = profile_id);
drop policy if exists "owner can delete notifications" on public.notifications;
create policy "owner can delete notifications" on public.notifications for delete using (auth.uid() = profile_id);

-- Auto-create a notification when a candidate applies, and when a recruiter
-- changes the application status. SECURITY DEFINER so it can write the
-- notification for the candidate regardless of who triggered the change.
create or replace function public.handle_application_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  j record;
begin
  select title, company, recruiter_id into j from public.jobs where id = new.job_id;
  if (tg_op = 'INSERT') then
    -- candidate: confirmation
    insert into public.notifications (profile_id, type, title, body, link)
    values (new.candidate_id, 'applied', 'Application sent',
      'You applied to ' || coalesce(j.title, 'a job') || coalesce(' at ' || j.company, '') || '.',
      '/candidate/my-applications');
    -- recruiter: new applicant alert
    if j.recruiter_id is not null then
      insert into public.notifications (profile_id, type, title, body, link)
      values (j.recruiter_id, 'applicant', 'New applicant',
        coalesce(new.candidate_name, 'A candidate') || ' applied to ' || coalesce(j.title, 'your job') || '.',
        '/recruiter/applicants');
    end if;
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'applied') then
    -- if an interview drives this application, the interviews trigger sends the
    -- (richer) notification instead — avoid a duplicate "status changed" ping.
    if not exists (select 1 from public.interviews i where i.application_id = new.id) then
      insert into public.notifications (profile_id, type, title, body, link)
      values (new.candidate_id, 'status', 'Application update',
        'Your application for ' || coalesce(j.title, 'a job') || coalesce(' at ' || j.company, '') || ' is now ' || new.status || '.',
        '/candidate/my-applications');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists applications_notify on public.applications;
create trigger applications_notify
  after insert or update on public.applications
  for each row execute function public.handle_application_notify();

-- Broadcast notification inserts/updates over Supabase Realtime so the bell
-- badge updates instantly (RLS still limits each user to their own rows).
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when others then null; end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4c) INTERVIEWS — schedule + offer lifecycle (recruiter <-> candidate)
--   stage: proposed -> accepted/declined -> completed -> offer -> offer_accepted/offer_declined
--          (or rejected after interview, or cancelled)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.interviews (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  job_id         uuid references public.jobs(id) on delete set null,
  recruiter_id   uuid not null references public.profiles(id) on delete cascade,
  candidate_id   uuid not null references public.profiles(id) on delete cascade,
  candidate_name text,
  job_title      text,
  scheduled_at   timestamptz,
  duration_min   int not null default 30,
  meeting_link   text,
  location       text default 'Online',
  stage          text not null default 'proposed',
  notes          text,
  reminded_at    timestamptz,           -- set when the "upcoming interview" reminder was sent
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Safe to re-run: add the reminder column if the table predates it
alter table public.interviews add column if not exists reminded_at timestamptz;

create index if not exists interviews_recruiter_id_idx on public.interviews (recruiter_id);
create index if not exists interviews_candidate_id_idx on public.interviews (candidate_id);
alter table public.interviews enable row level security;

drop policy if exists "parties can read interviews" on public.interviews;
create policy "parties can read interviews" on public.interviews for select using (auth.uid() = recruiter_id or auth.uid() = candidate_id);
drop policy if exists "recruiter can insert interviews" on public.interviews;
create policy "recruiter can insert interviews" on public.interviews for insert with check (auth.uid() = recruiter_id);
drop policy if exists "parties can update interviews" on public.interviews;
create policy "parties can update interviews" on public.interviews for update using (auth.uid() = recruiter_id or auth.uid() = candidate_id);
drop policy if exists "recruiter can delete interviews" on public.interviews;
create policy "recruiter can delete interviews" on public.interviews for delete using (auth.uid() = recruiter_id);

drop trigger if exists interviews_set_updated_at on public.interviews;
create trigger interviews_set_updated_at before update on public.interviews for each row execute function public.set_updated_at();

-- Notify the other party as the interview/offer moves through its stages
create or replace function public.handle_interview_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare role_txt text := coalesce(new.job_title, 'a role');
begin
  if (tg_op = 'INSERT') then
    insert into public.notifications (profile_id, type, title, body, link)
    values (new.candidate_id, 'interview', 'Interview scheduled', 'You have an interview for ' || role_txt || '. Please confirm your availability.', '/candidate/interviews');
  elsif (tg_op = 'UPDATE' and new.stage is distinct from old.stage) then
    if new.stage = 'accepted' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.recruiter_id, 'interview', 'Interview accepted', coalesce(new.candidate_name, 'The candidate') || ' accepted the interview for ' || role_txt || '.', '/recruiter/interviews');
    elsif new.stage = 'declined' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.recruiter_id, 'interview', 'Interview declined', coalesce(new.candidate_name, 'The candidate') || ' declined the interview for ' || role_txt || '.', '/recruiter/interviews');
    elsif new.stage = 'completed' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.candidate_id, 'interview', 'Interview complete', 'Your interview for ' || role_txt || ' is complete — awaiting the result.', '/candidate/interviews');
    elsif new.stage = 'offer' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.candidate_id, 'offer', 'You received an offer! 🎉', 'You got an offer for ' || role_txt || '. Review and respond.', '/candidate/interviews');
    elsif new.stage = 'offer_accepted' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.recruiter_id, 'offer', 'Offer accepted 🎉', coalesce(new.candidate_name, 'The candidate') || ' accepted your offer for ' || role_txt || '.', '/recruiter/interviews');
    elsif new.stage = 'offer_declined' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.recruiter_id, 'offer', 'Offer declined', coalesce(new.candidate_name, 'The candidate') || ' declined your offer for ' || role_txt || '.', '/recruiter/interviews');
    elsif new.stage = 'rejected' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.candidate_id, 'status', 'Application update', 'After your interview for ' || role_txt || ', you were not selected this time.', '/candidate/interviews');
    elsif new.stage = 'cancelled' then
      insert into public.notifications (profile_id, type, title, body, link) values (new.candidate_id, 'interview', 'Interview cancelled', 'Your interview for ' || role_txt || ' was cancelled.', '/candidate/interviews');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists interviews_notify on public.interviews;
create trigger interviews_notify after insert or update on public.interviews for each row execute function public.handle_interview_notify();

-- Time-based reminders: call from the client on load. Sends a one-time reminder
-- to BOTH parties for confirmed interviews happening within the next 24 hours.
create or replace function public.generate_interview_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare r record; whentxt text;
begin
  for r in
    select * from public.interviews
    where stage = 'accepted' and reminded_at is null and scheduled_at is not null
      and scheduled_at > now() and scheduled_at <= now() + interval '24 hours'
      and (auth.uid() = recruiter_id or auth.uid() = candidate_id)
  loop
    whentxt := to_char(r.scheduled_at, 'Dy DD Mon, HH12:MI AM');
    insert into public.notifications (profile_id, type, title, body, link)
    values (r.candidate_id, 'interview', 'Interview reminder ⏰',
      'Your interview for ' || coalesce(r.job_title, 'a role') || ' is on ' || whentxt || '.', '/candidate/interviews');
    insert into public.notifications (profile_id, type, title, body, link)
    values (r.recruiter_id, 'interview', 'Interview reminder ⏰',
      'Your interview with ' || coalesce(r.candidate_name, 'a candidate') || ' is on ' || whentxt || '.', '/recruiter/interviews');
    update public.interviews set reminded_at = now() where id = r.id;
  end loop;
end; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4d) INBOX — direct messaging (recruiter <-> candidate), one thread per pair
--   conversations hold denormalised names/emails so each party can render the
--   other side + send branded emails WITHOUT reading the other's profile (which
--   is owner-only under RLS). messages.kind: text | system | interview | offer | rejection
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  recruiter_id    uuid not null references public.profiles(id) on delete cascade,
  candidate_id    uuid not null references public.profiles(id) on delete cascade,
  job_id          uuid references public.jobs(id) on delete set null,
  recruiter_name  text,
  recruiter_email text,
  candidate_name  text,
  candidate_email text,
  company         text,
  job_title       text,
  last_message    text,
  last_sender_id  uuid,
  last_message_at timestamptz,
  recruiter_unread int not null default 0,
  candidate_unread int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (recruiter_id, candidate_id)
);

create index if not exists conversations_recruiter_idx on public.conversations (recruiter_id, updated_at desc);
create index if not exists conversations_candidate_idx on public.conversations (candidate_id, updated_at desc);
alter table public.conversations enable row level security;

drop policy if exists "parties can read conversations" on public.conversations;
create policy "parties can read conversations" on public.conversations for select using (auth.uid() = recruiter_id or auth.uid() = candidate_id);
drop policy if exists "parties can update conversations" on public.conversations;
create policy "parties can update conversations" on public.conversations for update using (auth.uid() = recruiter_id or auth.uid() = candidate_id);
-- inserts go through ensure_conversation() (security definer); no direct insert policy needed.

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text,
  kind            text not null default 'text',   -- text | system | interview | offer | rejection
  meta            jsonb,                            -- e.g. { interview_id, scheduled_at, stage }
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

-- SECURITY DEFINER membership check so messages policies don't recurse into conversations RLS
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and (auth.uid() = c.recruiter_id or auth.uid() = c.candidate_id)
  );
$$;

drop policy if exists "members can read messages" on public.messages;
create policy "members can read messages" on public.messages for select using (public.is_conversation_member(conversation_id));
drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages" on public.messages for insert with check (auth.uid() = sender_id and public.is_conversation_member(conversation_id));
drop policy if exists "members can update messages" on public.messages;
create policy "members can update messages" on public.messages for update using (public.is_conversation_member(conversation_id));

-- Get (or create) the single conversation between a recruiter and candidate.
-- Callable by EITHER party; security definer so it can snapshot both profiles'
-- names/emails (profiles are owner-only readable). Returns the conversation id.
create or replace function public.ensure_conversation(p_recruiter uuid, p_candidate uuid, p_job uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  rec record;
  cand record;
  jobrec record;
begin
  if auth.uid() <> p_recruiter and auth.uid() <> p_candidate then
    raise exception 'not a participant';
  end if;

  select id into v_id from public.conversations where recruiter_id = p_recruiter and candidate_id = p_candidate;
  if v_id is not null then
    if p_job is not null then update public.conversations set job_id = p_job where id = v_id; end if;
    return v_id;
  end if;

  select full_name, email, company_name into rec from public.profiles where id = p_recruiter;
  select full_name, email into cand from public.profiles where id = p_candidate;
  if p_job is not null then select title, company into jobrec from public.jobs where id = p_job; end if;

  insert into public.conversations (recruiter_id, candidate_id, job_id, recruiter_name, recruiter_email, candidate_name, candidate_email, company, job_title)
  values (p_recruiter, p_candidate, p_job,
    coalesce(rec.company_name, rec.full_name), rec.email,
    cand.full_name, cand.email,
    coalesce(jobrec.company, rec.company_name), jobrec.title)
  returning id into v_id;
  return v_id;
end; $$;

-- On each new message: bump the conversation summary, raise the recipient's
-- unread count, and create a 'message' notification for the recipient.
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c record; recipient uuid; sender_label text; preview text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if new.sender_id = c.recruiter_id then recipient := c.candidate_id; sender_label := coalesce(c.recruiter_name, 'A recruiter');
  else recipient := c.recruiter_id; sender_label := coalesce(c.candidate_name, 'A candidate'); end if;

  preview := coalesce(nullif(new.body, ''), case new.kind when 'interview' then 'Interview details' when 'offer' then 'Job offer' when 'rejection' then 'Application update' else 'New message' end);

  update public.conversations set
    last_message = preview,
    last_sender_id = new.sender_id,
    last_message_at = new.created_at,
    updated_at = new.created_at,
    recruiter_unread = recruiter_unread + (case when recipient = c.recruiter_id then 1 else 0 end),
    candidate_unread = candidate_unread + (case when recipient = c.candidate_id then 1 else 0 end)
  where id = new.conversation_id;

  -- Only plain chat messages raise a "new message" notification. Lifecycle cards
  -- (interview/offer/rejection/system) are notified by the interviews trigger, so
  -- this avoids double-pinging the recipient for the same event.
  if new.kind = 'text' then
    insert into public.notifications (profile_id, type, title, body, link)
    values (recipient, 'message', 'New message from ' || sender_label, left(preview, 120),
      case when recipient = c.recruiter_id then '/recruiter/inbox' else '/candidate/inbox' end);
  end if;
  return new;
end; $$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages for each row execute function public.handle_new_message();

-- Broadcast messages + conversations over Realtime for instant chat updates
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
exception when others then null; end $$;

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
--  Done. 18 tables + RLS + signup trigger + avatars bucket are ready.
-- ============================================================================
