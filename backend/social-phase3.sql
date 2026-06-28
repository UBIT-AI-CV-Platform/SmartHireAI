-- ============================================================================
--  SmartHireAI — SOCIAL LAYER · PHASE 3
--  Sharing · unified inbox (DM anyone) · share-a-post · repost
--
--  How to apply: Supabase → SQL Editor → New query → paste → Run.
--  Safe to re-run (idempotent). Also appended to schema.sql (section 8).
--  Requires Phase 1 + Phase 2 to be applied first.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) UNIFY THE INBOX — any two users can chat in the SAME conversations table.
--    Existing rows are hiring threads, so is_hiring defaults to true (keeps the
--    interview/offer quick-actions exactly as they are). Generic DMs are
--    created with is_hiring = false (no hiring actions shown).
-- ────────────────────────────────────────────────────────────────────────────
alter table public.conversations add column if not exists is_hiring boolean not null default true;

-- Get (or create) the single conversation between the current user and anyone
-- else. Canonicalises the two slots (recruiter → recruiter_id slot; same-role
-- pairs ordered by uuid) so a social DM and a hiring thread for the SAME pair map
-- to the same (recruiter_id, candidate_id) row → no duplicate threads, and
-- is_hiring can be flipped later by ensure_conversation.
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

-- Re-define ensure_conversation to flip an existing (possibly social) thread to a
-- hiring thread when a recruiter↔candidate relationship is established.
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

-- ────────────────────────────────────────────────────────────────────────────
-- 2) MESSAGE NOTIFICATIONS — route by the RECIPIENT's real role (so same-role
--    DMs land in the right portal inbox) and also notify for shared posts.
-- ────────────────────────────────────────────────────────────────────────────
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

  -- plain chat + shared posts raise a notification; lifecycle cards are handled
  -- by the interviews trigger (avoids double-pinging).
  if new.kind in ('text', 'post') then
    select role into rrole from public.profiles where id = recipient;
    insert into public.notifications (profile_id, type, title, body, link)
    values (recipient, 'message', 'New message from ' || sender_label, left(preview, 120),
      case when rrole = 'recruiter' then '/recruiter/inbox' else '/candidate/inbox' end);
  end if;
  return new;
end; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) REPOSTS — a repost is a post that references another (with an optional
--    quote in `content`). repost_snapshot keeps the original visible even if the
--    source post is later deleted.
-- ────────────────────────────────────────────────────────────────────────────
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
create trigger posts_repost_notify after insert on public.posts
  for each row execute function public.handle_post_repost_notify();

-- ============================================================================
--  Done. Phase 3: unified DM-anyone inbox (ensure_dm + is_hiring), shared-post
--  messages, and reposts.
-- ============================================================================
