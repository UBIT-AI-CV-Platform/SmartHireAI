-- Run this once in the Supabase SQL Editor for an existing deployment.
-- It preserves all certification records and only adds the optional URL field.
alter table public.certifications add column if not exists link text;
