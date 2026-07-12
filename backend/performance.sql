-- ============================================================================
--  SmartHire AI - performance & abuse-protection migration
--
--  Run this once in the Supabase SQL editor (it is idempotent - safe to re-run).
--
--  1) Rate limiting  - a counter table + an atomic SECURITY DEFINER function the
--                      API routes call before doing any expensive work (Gemini).
--  2) Search indexes - trigram (GIN) indexes so `ilike '%term%'` on people and
--                      job search stops doing a full table scan.
--  3) List indexes   - covering indexes for the sorted/filtered lists the app
--                      renders on every dashboard load.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) RATE LIMITING
-- ─────────────────────────────────────────────────────────────────────────────

-- One row per (bucket, user). Bounded in size: buckets x users, so it never
-- grows unbounded and needs no pruning job.
create table if not exists public.rate_limits (
  key          text        primary key,
  count        integer     not null default 0,
  window_start timestamptz not null default now()
);

-- Locked down entirely: no policies, so PostgREST/anon/authenticated cannot read
-- or write it directly. The only way in is check_rate_limit() below, which runs
-- as the owner (SECURITY DEFINER) and derives the key from auth.uid() - so a
-- caller can never tamper with someone else's counter or reset their own.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

/**
 * Atomically consume one unit from the caller's bucket.
 *
 * Returns allowed=false once the caller has used more than p_limit requests
 * inside a rolling p_window_seconds window. The whole read-modify-write happens
 * in a single INSERT .. ON CONFLICT, so two concurrent requests can never both
 * slip through on the last remaining unit.
 */
create or replace function public.check_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_now    timestamptz := now();
  v_key    text;
  v_count  integer;
  v_start  timestamptz;
begin
  if v_uid is null then
    raise exception 'check_rate_limit: not authenticated';
  end if;

  v_key := p_bucket || ':' || v_uid::text;

  insert into public.rate_limits as rl (key, count, window_start)
  values (v_key, 1, v_now)
  on conflict (key) do update
    set
      -- window expired -> start a fresh one at 1, otherwise increment
      count = case
                when rl.window_start < v_now - make_interval(secs => p_window_seconds)
                then 1
                else rl.count + 1
              end,
      window_start = case
                when rl.window_start < v_now - make_interval(secs => p_window_seconds)
                then v_now
                else rl.window_start
              end
  returning rl.count, rl.window_start into v_count, v_start;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_start + make_interval(secs => p_window_seconds);
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) SEARCH INDEXES (trigram)
--
--    People search and job search use `ilike '%term%'`. A leading wildcard makes
--    a normal B-tree index useless, so Postgres was scanning every row. GIN +
--    gin_trgm_ops is the index type that can actually serve those queries.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;

-- public_profiles is a view, so the indexes belong on the base table.
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);

create index if not exists profiles_company_name_trgm_idx
  on public.profiles using gin (company_name gin_trgm_ops);

create index if not exists jobs_title_trgm_idx
  on public.jobs using gin (title gin_trgm_ops);

create index if not exists jobs_company_trgm_idx
  on public.jobs using gin (company gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) LIST INDEXES
--
--    These back the exact ORDER BY / WHERE combinations the dashboards issue on
--    every load, so Postgres can walk the index instead of sorting the table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Job board: "open jobs, newest first"
create index if not exists jobs_open_created_idx
  on public.jobs (created_at desc) where is_open;

-- NOTE: no index for the people-directory's "most-followed first" sort.
-- followers_count is not a column - it is a correlated subquery inside the
-- public_profiles view - so it cannot be indexed directly. Each row's count is
-- already served by the existing follows_following_idx, which is good enough at
-- this scale. If the profile count ever grows large, the fix is to denormalise
-- followers_count into a real profiles column maintained by a trigger.

-- Recruiter applicant pipeline: "this job's applicants, newest first"
-- NB: applications timestamps its rows with applied_at, not created_at.
create index if not exists applications_job_applied_idx
  on public.applications (job_id, applied_at desc);

-- Candidate "My applications": "my applications, newest first"
create index if not exists applications_candidate_applied_idx
  on public.applications (candidate_id, applied_at desc);

-- Unread-notification badge count
create index if not exists notifications_unread_idx
  on public.notifications (profile_id) where not is_read;
