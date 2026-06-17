-- ============================================================================
--  SmartHireAI — Dummy Jobs Seed
--  Purpose: quickly fill the jobs board so the CANDIDATE side can be tested
--           (browse, filter, view details, one-click apply).
--
--  How to apply:
--    1. Run backend/schema.sql first (creates the jobs table + policies).
--    2. Make sure at least ONE user has signed up (any role).
--    3. Open Supabase → SQL Editor → New query → paste this file → Run.
--
--  Notes:
--    • Jobs are attached to an existing recruiter profile if one exists,
--      otherwise to the first available profile (just so they have an owner —
--      candidates can see/apply to all open jobs regardless of owner).
--    • Safe to re-run: a job is only inserted if the same title+company
--      doesn't already exist.
-- ============================================================================

do $$
declare
  rec_id uuid;
begin
  -- Prefer a real recruiter; otherwise fall back to any existing profile.
  select id into rec_id from public.profiles where role = 'recruiter' order by created_at limit 1;
  if rec_id is null then
    select id into rec_id from public.profiles order by created_at limit 1;
  end if;
  if rec_id is null then
    raise exception 'No profiles found. Sign up at least one user before seeding jobs.';
  end if;

  insert into public.jobs (recruiter_id, title, company, location, salary, skills, description)
  select rec_id, j.title, j.company, j.location, j.salary, j.skills, j.description
  from (values
    ('Frontend Developer', 'Nova Labs', 'Remote', '$60k – $90k',
      array['React','TypeScript','CSS','Next.js','Tailwind'],
      'We are looking for a Frontend Developer to build fast, accessible web apps with React and Next.js. You will work closely with designers to ship polished, responsive interfaces and care deeply about performance and code quality.'),

    ('Backend Engineer', 'CloudPeak', 'Lahore, PK', 'PKR 250k – 400k / mo',
      array['Node.js','PostgreSQL','REST APIs','Docker','AWS'],
      'Join our platform team to design and maintain scalable backend services. You will build REST APIs, optimize Postgres queries, and own services from development through deployment on AWS.'),

    ('Full Stack Developer', 'Brightwave', 'Remote', '$70k – $110k',
      array['React','Node.js','TypeScript','MongoDB','GraphQL'],
      'Own features end to end across our React frontend and Node backend. Ideal for a generalist who enjoys moving fast, shipping product, and working directly with users.'),

    ('UI/UX Designer', 'Pixel & Co.', 'Karachi, PK', 'PKR 180k – 300k / mo',
      array['Figma','UI Design','Prototyping','User Research','Design Systems'],
      'Design intuitive, beautiful product experiences from wireframe to high-fidelity. You will run user research, build prototypes in Figma, and maintain our growing design system.'),

    ('Data Analyst', 'Insightly', 'Remote', '$50k – $80k',
      array['SQL','Python','Excel','Power BI','Data Visualization'],
      'Turn raw data into clear, actionable insights for the business. You will write SQL, build dashboards, and partner with teams to answer their toughest questions with data.'),

    ('Machine Learning Engineer', 'Cortex AI', 'Islamabad, PK', 'PKR 350k – 550k / mo',
      array['Python','TensorFlow','PyTorch','Machine Learning','NLP'],
      'Build and deploy ML models that power our products. Experience with NLP, model training, and putting models into production is a strong plus.'),

    ('Mobile App Developer (Flutter)', 'Appsmith', 'Remote', '$55k – $85k',
      array['Flutter','Dart','Firebase','REST APIs','Mobile'],
      'Develop cross-platform mobile apps with Flutter. You will ship features for iOS and Android, integrate with our APIs, and obsess over smooth, native-feeling UX.'),

    ('DevOps Engineer', 'Stackforge', 'Remote', '$80k – $120k',
      array['AWS','Kubernetes','Docker','CI/CD','Terraform'],
      'Own our cloud infrastructure and developer tooling. You will manage Kubernetes clusters, build CI/CD pipelines, and automate everything with Terraform.'),

    ('Product Manager', 'Lumen', 'Lahore, PK', 'PKR 300k – 500k / mo',
      array['Product Strategy','Roadmapping','Agile','Analytics','Communication'],
      'Define the what and why for one of our core product areas. You will set the roadmap, work with engineering and design, and use data to drive decisions.'),

    ('QA Automation Engineer', 'TestPilot', 'Remote', '$45k – $75k',
      array['Selenium','Cypress','JavaScript','Test Automation','CI/CD'],
      'Keep our releases rock solid. You will design and maintain automated test suites with Cypress and Selenium and embed quality into the development pipeline.'),

    ('Graphic Designer', 'Studio Mint', 'Karachi, PK', 'PKR 120k – 220k / mo',
      array['Adobe Photoshop','Illustrator','Branding','Typography','Creativity'],
      'Create eye-catching visuals across social, web, and print. You will shape brand identity, design marketing assets, and bring creative ideas to life.'),

    ('Digital Marketing Specialist', 'GrowthHive', 'Remote', '$40k – $65k',
      array['SEO','Google Ads','Content Marketing','Analytics','Social Media'],
      'Drive growth across paid and organic channels. You will run campaigns, optimize for SEO, analyze performance, and grow our audience.'),

    ('Cloud Solutions Architect', 'SkyBridge', 'Remote', '$110k – $150k',
      array['AWS','Azure','System Design','Microservices','Security'],
      'Architect secure, scalable cloud solutions for enterprise clients. You will design systems, guide engineering teams, and make high-impact technical decisions.'),

    ('Junior Software Engineer', 'CodeStart', 'Lahore, PK', 'PKR 120k – 200k / mo',
      array['JavaScript','HTML','CSS','Git','Problem Solving'],
      'A great first role for new graduates. You will learn from senior engineers, contribute to real features, and grow your skills in a supportive team.'),

    ('Cybersecurity Analyst', 'SentinelOps', 'Islamabad, PK', 'PKR 280k – 450k / mo',
      array['Network Security','SIEM','Penetration Testing','Linux','Incident Response'],
      'Defend our systems and data. You will monitor for threats, run security assessments, respond to incidents, and harden our infrastructure.')
  ) as j(title, company, location, salary, skills, description)
  where not exists (
    select 1 from public.jobs x where x.title = j.title and x.company = j.company
  );

  raise notice 'Seed complete. Jobs are owned by profile %.', rec_id;
end $$;
