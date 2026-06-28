-- ============================================================================
--  SmartHireAI — SOCIAL LAYER · PHASE 2
--  Feed · posts (text + image) · likes · comments
--
--  How to apply: Supabase → SQL Editor → New query → paste → Run.
--  Safe to re-run (idempotent). Also appended to schema.sql (section 7).
--  Requires Phase 1 (profiles.username, follows) to be applied first.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) POSTS — author fields are denormalised (same pattern as cv_snapshot /
--    conversations) so the feed renders without reading owner-only profiles.
-- ────────────────────────────────────────────────────────────────────────────
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

create index if not exists posts_author_idx  on public.posts (author_id);
create index if not exists posts_created_idx  on public.posts (created_at desc);
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
create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) POST LIKES
-- ────────────────────────────────────────────────────────────────────────────
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

-- like → bump count + notify the author (skip self-likes)
create or replace function public.handle_post_like_ins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p record; liker text;
begin
  update public.posts set like_count = like_count + 1 where id = new.post_id
    returning author_id, author_name into p;
  if p.author_id is not null and p.author_id <> new.user_id then
    select coalesce(nullif(trim(company_name), ''), full_name, 'Someone') into liker
      from public.profiles where id = new.user_id;
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

-- ────────────────────────────────────────────────────────────────────────────
-- 3) POST COMMENTS  (author fields denormalised, same as posts)
-- ────────────────────────────────────────────────────────────────────────────
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
-- comment author OR the post's author may delete a comment
drop policy if exists "users can delete comment" on public.post_comments;
create policy "users can delete comment" on public.post_comments for delete using (
  auth.uid() = author_id
  or auth.uid() = (select author_id from public.posts where posts.id = post_comments.post_id)
);

create or replace function public.handle_post_comment_ins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  update public.posts set comment_count = comment_count + 1 where id = new.post_id
    returning author_id into p;
  if p.author_id is not null and p.author_id <> new.author_id then
    insert into public.notifications (profile_id, type, title, body, link)
    values (p.author_id, 'comment', 'New comment',
      coalesce(new.author_name, 'Someone') || ' commented on your post.', '/post/' || new.post_id);
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

-- ────────────────────────────────────────────────────────────────────────────
-- 4) STORAGE — post-media bucket (feed images). Public read, owner-only write.
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

drop policy if exists "Post media is publicly readable" on storage.objects;
create policy "Post media is publicly readable" on storage.objects for select using (bucket_id = 'post-media');
drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media" on storage.objects for insert with check (
  bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Users can delete their post media" on storage.objects;
create policy "Users can delete their post media" on storage.objects for delete using (
  bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
--  Done. Phase 2 feed layer is ready: posts + post_likes + post_comments
--  (with count + notify triggers) and the post-media storage bucket.
-- ============================================================================
