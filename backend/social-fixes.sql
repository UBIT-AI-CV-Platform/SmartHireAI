-- ============================================================================
--  SmartHireAI — SOCIAL LAYER · FOLLOW-UP FIXES (run once)
--  Apply if you already ran social-phase1..4 (or schema.sql). Safe + idempotent.
--  These are also folded into the canonical schema.sql / social-phase1 / phase3.
--
--  Fixes:
--   1) Username backfill is collision-proof (matters only if two profiles share
--      an identical name). No-op if every profile already has a handle.
--   2) DMs + hiring threads for the same pair always map to ONE conversation,
--      and a thread flips to "hiring" when a recruiter↔candidate relationship
--      forms (so the Schedule/Offer/Reject actions appear).
-- ============================================================================

-- 1) Collision-proof username backfill (row-by-row so each call sees prior handles)
do $$
declare r record;
begin
  for r in select id, full_name, email from public.profiles where username is null or trim(username) = '' loop
    update public.profiles
      set username = public.gen_username(coalesce(nullif(trim(r.full_name), ''), split_part(r.email, '@', 1)), r.id)
      where id = r.id;
  end loop;
end $$;

-- 2a) Canonical ensure_dm: recruiter → recruiter_id slot (same-role pairs ordered
--     by uuid) so a social DM and a hiring thread for the same pair are one row.
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

-- 2b) ensure_conversation flips an existing (possibly social) thread to hiring
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

-- ============================================================================
--  Done. Re-run safe.
-- ============================================================================
