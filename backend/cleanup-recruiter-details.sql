-- ============================================================================
--  SmartHireAI — CLEANUP: remove fake recruiter profile sections
--  Recruiters have NO UI to add skills/languages/education/projects/etc., so any
--  such rows for a recruiter were dummy seed data and shouldn't be shown.
--  This deletes them. Recruiter profiles instead display their Company details
--  (editable on the Company Profile page).
--
--  Run once in Supabase → SQL Editor. Safe to re-run.
--  (Does NOT touch candidates — they CAN manage these sections.)
-- ============================================================================

delete from public.skills         s  using public.profiles p where s.profile_id  = p.id and p.role = 'recruiter';
delete from public.languages      l  using public.profiles p where l.profile_id  = p.id and p.role = 'recruiter';
delete from public.education      e  using public.profiles p where e.profile_id  = p.id and p.role = 'recruiter';
delete from public.certifications c  using public.profiles p where c.profile_id  = p.id and p.role = 'recruiter';
delete from public.courses        co using public.profiles p where co.profile_id = p.id and p.role = 'recruiter';
delete from public.awards         a  using public.profiles p where a.profile_id  = p.id and p.role = 'recruiter';
delete from public.projects       pr using public.profiles p where pr.profile_id = p.id and p.role = 'recruiter';
delete from public.custom_sections cs using public.profiles p where cs.profile_id = p.id and p.role = 'recruiter';

-- ============================================================================
--  Done. Recruiter profiles now only show what a recruiter can actually edit
--  (name, headline, location, bio, photo + Company details).
-- ============================================================================
