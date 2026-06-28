-- ============================================================================
--  SmartHireAI — SOCIAL SEED (dummy posts / jobs / profile details)
--  Fills a lively feed for WHOEVER is already registered in your DB.
--
--  How to apply: Supabase → SQL Editor → New query → paste → Run.
--  Safe + idempotent: only touches users who are MISSING the thing being seeded
--  (e.g. a user with no posts gets posts; a user who already posted is skipped).
--  Requires the social schema (phases 1–5) to be applied first.
--
--  Re-run friendly. To re-seed a user, delete their rows first.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) PROFILE DETAILS — headline / location / summary (only where empty)
-- ────────────────────────────────────────────────────────────────────────────
update public.profiles p set
  location = coalesce(nullif(trim(p.location), ''),
    (array['Karachi, Pakistan','Lahore, Pakistan','Islamabad, Pakistan','Remote','Dubai, UAE'])[1 + (abs(hashtext(p.id::text) % 1000000) % 5)])
where p.location is null or trim(p.location) = '';

update public.profiles p set
  headline = coalesce(nullif(trim(p.headline), ''), nullif(trim(p.desired_role), ''),
    case when p.role = 'recruiter' then 'Talent Acquisition & Hiring'
         else (array['Frontend Developer','Full-Stack Engineer','Software Engineer','Data Analyst','UI/UX Designer'])[1 + (abs(hashtext(p.id::text) % 1000000) % 5)] end)
where p.headline is null or trim(p.headline) = '';

update public.profiles p set
  summary = coalesce(nullif(trim(p.summary), ''),
    case when p.role = 'recruiter'
      then 'Helping great people find great teams. I hire across engineering, product and design — always happy to connect with talent building cool things.'
      else (array[
        'Passionate developer who loves turning ideas into clean, reliable products. Always learning, always shipping.',
        'Software engineer focused on building delightful user experiences and writing maintainable code.',
        'Curious problem-solver with a love for clean architecture, good UX, and strong coffee.',
        'Open to new opportunities. I enjoy collaborating with teams that care about quality and impact.'
      ])[1 + (abs(hashtext(p.id::text) % 1000000) % 4)] end)
where p.summary is null or trim(p.summary) = '';

-- Recruiter company fields where empty
update public.profiles p set
  company_name = coalesce(nullif(trim(p.company_name), ''),
    (array['Nimbus Labs','BrightHire','CodeCrafters','Vertex Digital','Northstar Tech'])[1 + (abs(hashtext(p.id::text) % 1000000) % 5)]),
  company_industry = coalesce(nullif(trim(p.company_industry), ''), 'Information Technology'),
  company_about = coalesce(nullif(trim(p.company_about), ''), 'We build modern software products and we are always looking for talented people to join our growing team.')
where p.role = 'recruiter' and (p.company_name is null or trim(p.company_name) = '');

-- ────────────────────────────────────────────────────────────────────────────
-- 2) CANDIDATE SECTIONS — skills / education / projects (only if they have none)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.skills (profile_id, name)
select p.id, x.name
from public.profiles p
cross join (values ('JavaScript'),('TypeScript'),('React'),('Next.js'),('Node.js'),('PostgreSQL'),('Python'),('Tailwind CSS'),('Git')) as x(name)
where p.role = 'candidate' and not exists (select 1 from public.skills s where s.profile_id = p.id);

insert into public.languages (profile_id, name, level)
select p.id, x.name, x.lvl
from public.profiles p
cross join (values ('English','Fluent'),('Urdu','Native')) as x(name, lvl)
where p.role = 'candidate' and not exists (select 1 from public.languages l where l.profile_id = p.id);

insert into public.education (profile_id, degree, institute, start_year, end_year)
select p.id, 'BS Computer Science',
  (array['University of Karachi','NUST','FAST NUCES','LUMS','COMSATS University'])[1 + (abs(hashtext(p.id::text) % 1000000) % 5)],
  '2019', '2023'
from public.profiles p
where p.role = 'candidate' and not exists (select 1 from public.education e where e.profile_id = p.id);

insert into public.projects (profile_id, name, description, link)
select p.id, x.name, x.descr, x.link
from public.profiles p
cross join (values
  ('SmartHire Clone', 'A full-stack recruitment platform with AI CV generation and job matching.', 'https://github.com'),
  ('Realtime Chat App', 'A WebSocket-based chat app with presence and typing indicators.', 'https://github.com')
) as x(name, descr, link)
where p.role = 'candidate' and not exists (select 1 from public.projects pr where pr.profile_id = p.id);

-- NOTE: recruiters do NOT get skills/education/projects/etc. — they have no UI to
-- manage those. A recruiter's public profile shows their Company details instead
-- (set above + on the Company Profile page).

-- ────────────────────────────────────────────────────────────────────────────
-- 3) DUMMY JOBS — a few per recruiter (only recruiters with < 2 jobs)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.jobs (recruiter_id, title, company, location, description, salary, skills, is_open, expires_at, created_at)
select r.id, j.title,
  coalesce(nullif(trim(r.company_name), ''), 'SmartHire Partner'),
  j.location, j.descr, j.salary, j.skills, true,
  now() + interval '30 days',
  now() - ((j.age_days) || ' days')::interval
from public.profiles r
cross join (values
  ('Frontend Developer',  'Remote',              'Build modern, responsive UIs with React and Next.js. Collaborate with design and backend to ship delightful features.', '120k–150k', array['React','TypeScript','Tailwind CSS','Next.js'], 2),
  ('Backend Engineer',    'Karachi, Pakistan',   'Design and scale REST APIs, own database performance, and ship reliable services.', '130k–160k', array['Node.js','PostgreSQL','AWS','Docker'], 6),
  ('Full-Stack Developer','Lahore, Pakistan',    'Work across the stack on a fast-growing product. Comfortable with both frontend and backend.', '140k–170k', array['React','Node.js','PostgreSQL','TypeScript'], 11),
  ('UI/UX Designer',      'Remote',              'Craft intuitive flows and beautiful interfaces. Strong portfolio required.', '90k–120k', array['Figma','Prototyping','Design Systems'], 18),
  ('Data Analyst',        'Islamabad, Pakistan', 'Turn data into insight with dashboards and clear reporting.', '100k–130k', array['SQL','Python','Power BI'], 25)
) as j(title, location, descr, salary, skills, age_days)
where r.role = 'recruiter' and (select count(*) from public.jobs jb where jb.recruiter_id = r.id) < 2;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) DUMMY POSTS — varied (thoughts / image / CV / document), past timings.
--    Only seed users who currently have NO posts, so your real test posts stay.
--    image_url uses picsum.photos (seeded per row); file_url uses public sample PDFs.
-- ────────────────────────────────────────────────────────────────────────────

-- 4a) Candidate posts
insert into public.posts (author_id, author_name, author_username, author_photo, author_role, content, image_url, file_url, file_name, created_at)
select p.id, p.full_name, p.username, p.photo_url, p.role,
  t.content,
  case when t.kind = 'image' then 'https://picsum.photos/seed/' || substr(md5(p.id::text || t.ord::text), 1, 12) || '/800/500' else null end,
  case when t.kind = 'cv'  then 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
       when t.kind = 'doc' then 'https://www.africau.edu/images/default/sample.pdf' else null end,
  case when t.kind = 'cv' then 'My_CV.pdf' when t.kind = 'doc' then 'Portfolio_Highlights.pdf' else null end,
  now() - (((t.ord * 13) + (abs(hashtext(p.id::text) % 1000000) % 60)) || ' hours')::interval
from public.profiles p
cross join (values
  (1, 'text',  E'Excited to share that I just shipped a side project this weekend! 🚀\n\nLearned a ton about performance and clean architecture along the way. **Always be building.**'),
  (2, 'text',  E'Open to new opportunities! 👀\n\nIf your team is hiring frontend or full-stack engineers, I''d love to connect. *Remote or on-site both work for me.*'),
  (3, 'cv',    'Just refreshed my CV — feedback welcome, and feel free to share with anyone hiring. 📄'),
  (4, 'image', 'Late-night coding sessions hit different ☕💻'),
  (5, 'text',  E'3 things that made me a better engineer this year:\n\n1. Reading other people''s code\n2. Writing tests *first*\n3. Asking "why" before "how"'),
  (6, 'doc',   'Put together a small portfolio doc of my recent work. Take a look! 👇'),
  (7, 'image', 'Grateful to have presented at our local dev meetup today. Community > everything 🙌')
) as t(ord, kind, content)
where p.role = 'candidate' and not exists (select 1 from public.posts po where po.author_id = p.id);

-- 4b) Recruiter posts
insert into public.posts (author_id, author_name, author_username, author_photo, author_role, content, image_url, file_url, file_name, created_at)
select p.id, p.full_name, p.username, p.photo_url, p.role,
  t.content,
  case when t.kind = 'image' then 'https://picsum.photos/seed/' || substr(md5(p.id::text || t.ord::text), 1, 12) || '/800/500' else null end,
  case when t.kind = 'doc' then 'https://www.africau.edu/images/default/sample.pdf' else null end,
  case when t.kind = 'doc' then 'Hiring_Guide.pdf' else null end,
  now() - (((t.ord * 17) + (abs(hashtext(p.id::text) % 1000000) % 50)) || ' hours')::interval
from public.profiles p
cross join (values
  (1, 'text',  E'We''re hiring! 🚀\n\nLooking for **frontend and backend engineers** to join our growing team. DM me or check the jobs tab if you''re interested.'),
  (2, 'text',  E'A quick tip for candidates: tailor your CV to the role. A focused, relevant CV beats a long generic one *every single time.*'),
  (3, 'image', 'Great energy at the office today — proud of this team 💜'),
  (4, 'doc',   'Sharing our hiring guide so candidates know exactly what to expect in our process. Transparency matters. 📄'),
  (5, 'text',  E'What we look for isn''t just skills — it''s curiosity, ownership, and the willingness to learn. Skills can be taught. Attitude is everything.')
) as t(ord, kind, content)
where p.role = 'recruiter' and not exists (select 1 from public.posts po where po.author_id = p.id);

-- ============================================================================
--  Done. Existing users now have profile details, recruiters have jobs, and the
--  feed is full of varied posts (text / image / CV / document) at different times.
-- ============================================================================
