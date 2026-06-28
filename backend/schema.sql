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
-- NOTE: ensure_conversation is re-defined in section 8 to be is_hiring-aware
-- (after the is_hiring column is added there).

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

-- ────────────────────────────────────────────────────────────────────────────
-- 6) SOCIAL LAYER · PHASE 1 — public profiles, usernames, follow/followers
--    (Also maintained standalone in backend/social-phase1.sql)
-- ────────────────────────────────────────────────────────────────────────────

-- 6a) usernames + headline on profiles
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists headline text;
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Slugify a base string into a unique, URL-safe handle (excludes p_id so it is
-- safe to call for an existing row). SECURITY DEFINER: needs to read all rows.
create or replace function public.gen_username(p_base text, p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare base text; candidate text; n int := 0;
begin
  base := regexp_replace(lower(coalesce(nullif(trim(p_base), ''), 'user')), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then base := 'user'; end if;
  base := left(base, 30);
  candidate := base;
  loop
    if not exists (select 1 from public.profiles where lower(username) = candidate and id is distinct from p_id) then
      return candidate;
    end if;
    n := n + 1;
    candidate := base || n::text;
  end loop;
end; $$;

-- Backfill handles for any profile that doesn't have one yet. Done row-by-row in
-- a loop so each call to gen_username sees the handles assigned by prior rows —
-- a single bulk UPDATE would let two identical names collide on the unique index.
do $$
declare r record;
begin
  for r in select id, full_name, email from public.profiles where username is null or trim(username) = '' loop
    update public.profiles
      set username = public.gen_username(coalesce(nullif(trim(r.full_name), ''), split_part(r.email, '@', 1)), r.id)
      where id = r.id;
  end loop;
end $$;

-- Re-issue the signup trigger so new users also get a handle (supersedes the
-- earlier definition in section 1)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_username text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
  v_username := public.gen_username(coalesce(nullif(trim(v_name), ''), split_part(new.email, '@', 1)), new.id);
  insert into public.profiles (id, email, full_name, role, role_selected, username)
  values (
    new.id, new.email, v_name,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'candidate'),
    (new.raw_user_meta_data ->> 'role') is not null,
    v_username
  );
  return new;
end; $$;

-- 6b) follows — directional follower graph
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx  on public.follows (follower_id);
alter table public.follows enable row level security;

drop policy if exists "authenticated can read follows" on public.follows;
create policy "authenticated can read follows" on public.follows for select using (auth.uid() is not null);
drop policy if exists "users can follow" on public.follows;
create policy "users can follow" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

create or replace function public.handle_follow_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare who record;
begin
  select coalesce(nullif(trim(company_name), ''), full_name, 'Someone') as label, username
    into who from public.profiles where id = new.follower_id;
  insert into public.notifications (profile_id, type, title, body, link)
  values (new.following_id, 'follow', 'New follower',
          who.label || ' started following you.', '/u/' || coalesce(who.username, ''));
  return new;
end; $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.handle_follow_notify();

-- 6c) public read on section tables (meant to be shown on a public profile;
--     writes stay owner-only). RLS OR-combines SELECT policies.
do $$
declare t text;
begin
  foreach t in array array['skills','languages','education','certifications','courses','awards','projects','custom_sections']
  loop
    execute format('drop policy if exists "authenticated can read %1$s" on public.%1$I;', t);
    execute format($f$create policy "authenticated can read %1$s" on public.%1$I for select using (auth.uid() is not null);$f$, t);
  end loop;
end $$;

-- 6d) public_profiles view — safe public face of a profile (email/phone/dob never
--     leak). Bypasses base-table RLS but exposes only safe columns; signed-in only.
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = off) as
  select
    p.id, p.username, p.full_name, p.headline, p.desired_role, p.role,
    p.location, p.photo_url, p.summary, p.linkedin_url, p.github_url,
    p.company_name, p.company_industry, p.company_website, p.company_size, p.company_about,
    p.created_at,
    (select count(*) from public.follows f where f.following_id = p.id) as followers_count,
    (select count(*) from public.follows f where f.follower_id  = p.id) as following_count
  from public.profiles p;

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 7) SOCIAL LAYER · PHASE 2 — feed: posts, likes, comments
--    (Also maintained standalone in backend/social-phase2.sql)
-- ────────────────────────────────────────────────────────────────────────────

-- 7a) posts (author fields denormalised so the feed renders without reading
--     owner-only profiles — same pattern as cv_snapshot / conversations)
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  author_name     text,
  author_username text,
  author_photo    text,
  author_role     public.user_role,
  content         text,
  image_url       text,
  like_count      int not null default 0,
  comment_count   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists posts_created_idx on public.posts (created_at desc);
alter table public.posts enable row level security;

drop policy if exists "authenticated can read posts" on public.posts;
create policy "authenticated can read posts" on public.posts for select using (auth.uid() is not null);
drop policy if exists "users can create posts" on public.posts;
create policy "users can create posts" on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists "authors can update posts" on public.posts;
create policy "authors can update posts" on public.posts for update using (auth.uid() = author_id);
drop policy if exists "authors can delete posts" on public.posts;
create policy "authors can delete posts" on public.posts for delete using (auth.uid() = author_id);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();

-- 7b) post likes
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);
alter table public.post_likes enable row level security;

drop policy if exists "authenticated can read post_likes" on public.post_likes;
create policy "authenticated can read post_likes" on public.post_likes for select using (auth.uid() is not null);
drop policy if exists "users can like" on public.post_likes;
create policy "users can like" on public.post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "users can unlike" on public.post_likes;
create policy "users can unlike" on public.post_likes for delete using (auth.uid() = user_id);

create or replace function public.handle_post_like_ins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p record; liker text;
begin
  update public.posts set like_count = like_count + 1 where id = new.post_id returning author_id, author_name into p;
  if p.author_id is not null and p.author_id <> new.user_id then
    select coalesce(nullif(trim(company_name), ''), full_name, 'Someone') into liker from public.profiles where id = new.user_id;
    insert into public.notifications (profile_id, type, title, body, link)
    values (p.author_id, 'like', 'New like', liker || ' liked your post.', '/post/' || new.post_id);
  end if;
  return new;
end; $$;
create or replace function public.handle_post_like_del()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end; $$;
drop trigger if exists post_likes_ins on public.post_likes;
create trigger post_likes_ins after insert on public.post_likes for each row execute function public.handle_post_like_ins();
drop trigger if exists post_likes_del on public.post_likes;
create trigger post_likes_del after delete on public.post_likes for each row execute function public.handle_post_like_del();

-- 7c) post comments
create table if not exists public.post_comments (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  author_name     text,
  author_username text,
  author_photo    text,
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;

drop policy if exists "authenticated can read post_comments" on public.post_comments;
create policy "authenticated can read post_comments" on public.post_comments for select using (auth.uid() is not null);
drop policy if exists "users can comment" on public.post_comments;
create policy "users can comment" on public.post_comments for insert with check (auth.uid() = author_id);
drop policy if exists "users can edit own comment" on public.post_comments;
create policy "users can edit own comment" on public.post_comments for update using (auth.uid() = author_id);
drop policy if exists "users can delete comment" on public.post_comments;
create policy "users can delete comment" on public.post_comments for delete using (
  auth.uid() = author_id or auth.uid() = (select author_id from public.posts where posts.id = post_comments.post_id)
);

create or replace function public.handle_post_comment_ins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  update public.posts set comment_count = comment_count + 1 where id = new.post_id returning author_id into p;
  if p.author_id is not null and p.author_id <> new.author_id then
    insert into public.notifications (profile_id, type, title, body, link)
    values (p.author_id, 'comment', 'New comment', coalesce(new.author_name, 'Someone') || ' commented on your post.', '/post/' || new.post_id);
  end if;
  return new;
end; $$;
create or replace function public.handle_post_comment_del()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  return old;
end; $$;
drop trigger if exists post_comments_ins on public.post_comments;
create trigger post_comments_ins after insert on public.post_comments for each row execute function public.handle_post_comment_ins();
drop trigger if exists post_comments_del on public.post_comments;
create trigger post_comments_del after delete on public.post_comments for each row execute function public.handle_post_comment_del();

-- 7d) storage — post-media bucket (feed images), public read / owner write
insert into storage.buckets (id, name, public) values ('post-media', 'post-media', true) on conflict (id) do nothing;
drop policy if exists "Post media is publicly readable" on storage.objects;
create policy "Post media is publicly readable" on storage.objects for select using (bucket_id = 'post-media');
drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media" on storage.objects for insert with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their post media" on storage.objects;
create policy "Users can delete their post media" on storage.objects for delete using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ────────────────────────────────────────────────────────────────────────────
-- 8) SOCIAL LAYER · PHASE 3 — sharing: unified inbox (DM anyone), share-a-post,
--    repost. (Also maintained standalone in backend/social-phase3.sql)
-- ────────────────────────────────────────────────────────────────────────────

-- 8a) unify inbox: any two users chat in the same conversations table. Existing
--     rows are hiring threads (is_hiring defaults true → keeps hiring actions).
alter table public.conversations add column if not exists is_hiring boolean not null default true;

-- ensure_dm canonicalises the two slots (recruiter → recruiter_id slot; same-role
-- pairs ordered by uuid) so a social DM and a hiring thread for the SAME pair map
-- to the same (recruiter_id, candidate_id) row → no duplicates, and is_hiring can
-- be flipped later by ensure_conversation.
create or replace function public.ensure_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid(); v_id uuid; meR record; otR record;
  rec_slot uuid; cand_slot uuid;
  rec_name text; rec_email text; rec_company text; cand_name text; cand_email text;
begin
  if me is null then raise exception 'not signed in'; end if;
  if me = p_other then raise exception 'cannot DM yourself'; end if;

  select full_name, email, company_name, role into meR from public.profiles where id = me;
  select full_name, email, company_name, role into otR from public.profiles where id = p_other;

  if meR.role = 'recruiter' and otR.role <> 'recruiter' then
    rec_slot := me; rec_name := meR.full_name; rec_email := meR.email; rec_company := meR.company_name;
    cand_slot := p_other; cand_name := otR.full_name; cand_email := otR.email;
  elsif otR.role = 'recruiter' and meR.role <> 'recruiter' then
    rec_slot := p_other; rec_name := otR.full_name; rec_email := otR.email; rec_company := otR.company_name;
    cand_slot := me; cand_name := meR.full_name; cand_email := meR.email;
  elsif me < p_other then
    rec_slot := me; rec_name := meR.full_name; rec_email := meR.email; rec_company := meR.company_name;
    cand_slot := p_other; cand_name := otR.full_name; cand_email := otR.email;
  else
    rec_slot := p_other; rec_name := otR.full_name; rec_email := otR.email; rec_company := otR.company_name;
    cand_slot := me; cand_name := meR.full_name; cand_email := meR.email;
  end if;

  select id into v_id from public.conversations where recruiter_id = rec_slot and candidate_id = cand_slot;
  if v_id is not null then return v_id; end if;

  insert into public.conversations
    (recruiter_id, candidate_id, recruiter_name, recruiter_email, candidate_name, candidate_email, company, is_hiring)
  values
    (rec_slot, cand_slot, rec_name, rec_email, cand_name, cand_email,
     case when (select role from public.profiles where id = rec_slot) = 'recruiter' then rec_company else null end,
     false)
  returning id into v_id;
  return v_id;
end; $$;

-- Re-define ensure_conversation now that is_hiring exists: flip an existing thread
-- (e.g. a prior social DM) to a hiring thread, and stamp is_hiring on new ones.
create or replace function public.ensure_conversation(p_recruiter uuid, p_candidate uuid, p_job uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; rec record; cand record; jobrec record;
begin
  if auth.uid() <> p_recruiter and auth.uid() <> p_candidate then
    raise exception 'not a participant';
  end if;
  select id into v_id from public.conversations where recruiter_id = p_recruiter and candidate_id = p_candidate;
  if v_id is not null then
    update public.conversations set is_hiring = true, job_id = coalesce(p_job, job_id) where id = v_id;
    return v_id;
  end if;
  select full_name, email, company_name into rec from public.profiles where id = p_recruiter;
  select full_name, email into cand from public.profiles where id = p_candidate;
  if p_job is not null then select title, company into jobrec from public.jobs where id = p_job; end if;
  insert into public.conversations (recruiter_id, candidate_id, job_id, recruiter_name, recruiter_email, candidate_name, candidate_email, company, job_title, is_hiring)
  values (p_recruiter, p_candidate, p_job,
    coalesce(rec.company_name, rec.full_name), rec.email,
    cand.full_name, cand.email,
    coalesce(jobrec.company, rec.company_name), jobrec.title, true)
  returning id into v_id;
  return v_id;
end; $$;

-- 8b) message notifications route by the RECIPIENT's real role + cover shared posts
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c record; recipient uuid; sender_label text; preview text; rrole public.user_role;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if new.sender_id = c.recruiter_id then recipient := c.candidate_id; sender_label := coalesce(c.recruiter_name, 'Someone');
  else recipient := c.recruiter_id; sender_label := coalesce(c.candidate_name, 'Someone'); end if;
  preview := coalesce(nullif(new.body, ''), case new.kind
    when 'interview' then 'Interview details' when 'offer' then 'Job offer'
    when 'rejection' then 'Application update' when 'post' then 'Shared a post' else 'New message' end);
  update public.conversations set
    last_message = preview, last_sender_id = new.sender_id,
    last_message_at = new.created_at, updated_at = new.created_at,
    recruiter_unread = recruiter_unread + (case when recipient = c.recruiter_id then 1 else 0 end),
    candidate_unread = candidate_unread + (case when recipient = c.candidate_id then 1 else 0 end)
  where id = new.conversation_id;
  if new.kind in ('text', 'post') then
    select role into rrole from public.profiles where id = recipient;
    insert into public.notifications (profile_id, type, title, body, link)
    values (recipient, 'message', 'New message from ' || sender_label, left(preview, 120),
      case when rrole = 'recruiter' then '/recruiter/inbox' else '/candidate/inbox' end);
  end if;
  return new;
end; $$;

-- 8c) reposts — a post referencing another (optional quote in content);
--     repost_snapshot keeps the original visible even if the source is deleted
alter table public.posts add column if not exists repost_of uuid references public.posts(id) on delete set null;
alter table public.posts add column if not exists repost_snapshot jsonb;

create or replace function public.handle_post_repost_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare orig_author uuid;
begin
  if new.repost_of is not null then
    select author_id into orig_author from public.posts where id = new.repost_of;
    if orig_author is not null and orig_author <> new.author_id then
      insert into public.notifications (profile_id, type, title, body, link)
      values (orig_author, 'repost', 'Your post was reposted',
        coalesce(new.author_name, 'Someone') || ' reposted your post.', '/post/' || new.id);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists posts_repost_notify on public.posts;
create trigger posts_repost_notify after insert on public.posts for each row execute function public.handle_post_repost_notify();

-- ────────────────────────────────────────────────────────────────────────────
-- 9) SOCIAL LAYER · PHASE 4 — moderation (reports). Suggested-people + trending
--    are client-side queries over existing tables (no schema). See social-phase4.sql
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  target_id   uuid not null,
  reason      text not null,
  details     text,
  status      text not null default 'open',   -- open | reviewed | dismissed
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

drop policy if exists "users can file reports" on public.reports;
create policy "users can file reports" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reporter can read own reports" on public.reports;
create policy "reporter can read own reports" on public.reports for select using (auth.uid() = reporter_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 10) SOCIAL LAYER · PHASE 5 — posts can attach a document/file
-- ────────────────────────────────────────────────────────────────────────────
alter table public.posts add column if not exists file_url  text;
alter table public.posts add column if not exists file_name text;

-- ============================================================================
--  Done. 23 tables/views + RLS + signup trigger + avatars/post-media buckets.
-- ============================================================================
