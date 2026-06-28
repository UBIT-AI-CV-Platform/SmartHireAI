-- ============================================================================
--  SmartHireAI — SOCIAL LAYER · PHASE 1
--  Public profiles · usernames · headline · follow / followers
--
--  How to apply:
--    Supabase → SQL Editor → New query → paste this whole file → Run.
--  Safe to re-run (idempotent). This is also appended to schema.sql so the
--  consolidated schema stays the single source of truth.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) USERNAMES + HEADLINE on profiles
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists headline text;

-- case-insensitive unique handle
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Slugify a base string into a unique, URL-safe handle (excludes p_id from the
-- uniqueness check so it's safe to call for an existing row). SECURITY DEFINER:
-- it must read across all profiles to guarantee global uniqueness.
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
    if not exists (
      select 1 from public.profiles
      where lower(username) = candidate and id is distinct from p_id
    ) then
      return candidate;
    end if;
    n := n + 1;
    candidate := base || n::text;
  end loop;
end; $$;

-- Backfill handles for every existing profile that doesn't have one yet. Looped
-- row-by-row so each gen_username call sees handles assigned by earlier rows — a
-- single bulk UPDATE would let two identical names collide on the unique index.
do $$
declare r record;
begin
  for r in select id, full_name, email from public.profiles where username is null or trim(username) = '' loop
    update public.profiles
      set username = public.gen_username(coalesce(nullif(trim(r.full_name), ''), split_part(r.email, '@', 1)), r.id)
      where id = r.id;
  end loop;
end $$;

-- Re-issue the signup trigger so new users get a handle automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_username text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
  v_username := public.gen_username(coalesce(nullif(trim(v_name), ''), split_part(new.email, '@', 1)), new.id);
  insert into public.profiles (id, email, full_name, role, role_selected, username)
  values (
    new.id,
    new.email,
    v_name,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'candidate'),
    (new.raw_user_meta_data ->> 'role') is not null,
    v_username
  );
  return new;
end; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) FOLLOWS — directional follower graph
-- ────────────────────────────────────────────────────────────────────────────
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

-- Any signed-in user can see the follow graph (followers/following are public,
-- LinkedIn-style). You may only create/remove your OWN follow edges.
drop policy if exists "authenticated can read follows" on public.follows;
create policy "authenticated can read follows"
  on public.follows for select using (auth.uid() is not null);

drop policy if exists "users can follow" on public.follows;
create policy "users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- Notify the followed user (reuses the notifications table + bell).
create or replace function public.handle_follow_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare who record;
begin
  select coalesce(nullif(trim(company_name), ''), full_name, 'Someone') as label, username
    into who from public.profiles where id = new.follower_id;
  insert into public.notifications (profile_id, type, title, body, link)
  values (new.following_id, 'follow', 'New follower',
          who.label || ' started following you.',
          '/u/' || coalesce(who.username, ''));
  return new;
end; $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.handle_follow_notify();

-- ────────────────────────────────────────────────────────────────────────────
-- 3) PUBLIC READ on profile section tables
--   These are meant to be shown on a public profile, so any signed-in user may
--   read them. Writes stay owner-only (the existing owner policies are kept;
--   RLS OR-combines SELECT policies, so this just widens read access).
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['skills','languages','education','certifications','courses','awards','projects','custom_sections']
  loop
    execute format('drop policy if exists "authenticated can read %1$s" on public.%1$I;', t);
    execute format($f$create policy "authenticated can read %1$s" on public.%1$I for select using (auth.uid() is not null);$f$, t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) public_profiles VIEW — the SAFE public face of a profile
--   profiles stays owner-only (email / phone / dob never leak). This view
--   bypasses that RLS (security_invoker = off) but exposes ONLY safe columns,
--   and is granted to signed-in users only (revoked from anon).
--   NOTE: Supabase's advisor will flag this as a "security definer view" — that
--   is intentional here; it is how we expose column-limited public data.
-- ────────────────────────────────────────────────────────────────────────────
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = off) as
  select
    p.id,
    p.username,
    p.full_name,
    p.headline,
    p.desired_role,
    p.role,
    p.location,
    p.photo_url,
    p.summary,
    p.linkedin_url,
    p.github_url,
    p.company_name,
    p.company_industry,
    p.company_website,
    p.company_size,
    p.company_about,
    p.created_at,
    (select count(*) from public.follows f where f.following_id = p.id) as followers_count,
    (select count(*) from public.follows f where f.follower_id  = p.id) as following_count
  from public.profiles p;

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ============================================================================
--  Done. Phase 1 social layer is ready:
--    profiles.username + profiles.headline, follows table + RLS + notify,
--    public-read on section tables, and the public_profiles view.
-- ============================================================================
