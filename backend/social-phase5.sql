-- ============================================================================
--  SmartHireAI — SOCIAL LAYER · PHASE 5
--  Posts can carry a document/file attachment (in addition to an image).
--  Apply: Supabase → SQL Editor → paste → Run. Safe to re-run.
--  Also appended to schema.sql (section 10).
-- ============================================================================

alter table public.posts add column if not exists file_url  text;
alter table public.posts add column if not exists file_name text;

-- ============================================================================
--  Done. posts.file_url + posts.file_name added (uploads go to the existing
--  post-media bucket).
-- ============================================================================
