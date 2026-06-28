-- ============================================================================
--  SmartHireAI — SOCIAL LAYER · PHASE 4
--  Moderation (reports) · (suggested-people + trending are query-only, no schema)
--
--  How to apply: Supabase → SQL Editor → New query → paste → Run.
--  Safe to re-run (idempotent). Also appended to schema.sql (section 9).
--  Requires Phases 1–3.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- REPORTS — users flag a post / comment / profile. Polymorphic target_id (a
-- post/comment/profile uuid). One report per (reporter, target) — re-reporting
-- is a no-op. A reporter can read their own reports; review/resolution is done
-- by an admin via the service role (no public update/delete).
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

-- ============================================================================
--  Done. Phase 4: reports/moderation table (suggested-people + trending are
--  implemented client-side over existing tables — no schema needed).
-- ============================================================================
