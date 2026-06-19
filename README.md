# SmartHire AI

> An AI-powered recruitment platform that helps candidates build standout CVs and apply to jobs in one click, and helps recruiters post roles and review applicants — built as a Final Year Project.

SmartHire AI brings the whole hiring loop into one place: candidates create an ATS-optimized CV with AI, browse jobs posted by recruiters, and apply with a single click that sends their CV. Recruiters post jobs and review every applicant (with their CV) from a dedicated dashboard.

---

## ✨ Features

### Candidate portal
- **Build Profile** — full profile with skills, languages, education, certifications, courses, awards, projects, and custom sections; profile photo with a square-crop uploader.
- **AI CV Generator** (powered by Google Gemini)
  - Generates an ATS-optimized CV from your profile, tailored to a target role, tone, and even a pasted job description.
  - Authentic **ATS score + breakdown**, missing-keyword detection, and readable suggestions.
  - **3 templates** (Modern / Classic / Minimal), single/two-column layouts, accent colors, fonts, photo toggle, and section show/hide.
  - **Inline editing**, **PDF** and **Word (DOCX)** export.
  - **AI Cover Letter** generator.
  - **My CVs** library — history, rename/delete, **favorites**, and a quick-view popup for CVs and cover letters.
- **Jobs & Applications** (LinkedIn/Glassdoor-style)
  - Browse open roles with search, location, **remote-only**, skill chips, **min-salary** filter, and sorting (best match / newest / salary / A–Z).
  - **Skills-match %** per job, company logos, "New" badges.
  - **One-click apply** that attaches your latest CV.
  - **Save/bookmark** jobs, a rich job-detail popup, and an **applications tracker** with live status.
  - **External Jobs** — aggregated listings from LinkedIn, Indeed, and Glassdoor alongside platform jobs.
- **Interviews** — view scheduled interviews, accept/decline proposals, join video calls (WebRTC), and track offer outcomes.
- **Inbox** — real-time in-app messaging with recruiters.
- **Notifications** — activity feed for application updates, interview invites, and messages.

### Recruiter portal
- **Post a Job** (title, company, location, salary, skills, description) — instantly visible to candidates.
- Manage job posts: open/close, delete, live applicant counts.
- **Applicants view** per job — see each candidate, their skills-match score, move them through a status pipeline (applied → screening → interview → offer → rejected), and **view the CV they applied with**.
- **AI Screening** — rank all applicants for a job by fit score (Shortlist / Maybe / Pass verdicts with strengths & concerns), powered by Gemini.
- **Interview Kit generator** — auto-generate a structured interview guide (intro, categorised questions with "look-for" hints, red flags, closing tip) for any role.
- **Recruiter AI Copilot** — chat assistant for drafting job descriptions, interview-invite emails, screening checklists, and more.
- **Interviews** — schedule interviews, propose times, and track stage (proposed → accepted → completed → offer → hired / rejected).
- **Inbox** — in-app messaging between recruiter and candidates.
- **Analytics** — hiring funnel visualisation, job-performance stats, and match-score distributions.
- **Company Profile** — set company bio, logo, and website visible to candidates.
- **Settings** — manage recruiter account preferences.

### Auth & accounts
- Email/password signup with **OTP email verification**, login, and **forgot/reset password**.
- **Google OAuth** sign-in with a role-selection step.
- **Role-based access**: one email = one role (candidate or recruiter), with portal gating and redirects.

---

## 🛠️ Tech Stack

| Layer | Technology |
|------|------------|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, Material Symbols, Inter + Sora fonts |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Row-Level Security) |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Real-time | Supabase Realtime (broadcast signalling for WebRTC video calls) |
| Libraries | `@supabase/ssr`, `react-easy-crop`, `react-to-print`, `docx`, `react-markdown`, `remark-gfm` |

---

## 📁 Project Structure

```
SmartHireAI/
├── frontend/                 # Next.js app
│   ├── app/
│   │   ├── candidate/        # Candidate portal (overview, jobs, CVs, interviews, inbox, notifications, settings)
│   │   ├── recruiter/        # Recruiter portal (jobs, applicants, AI screening, interviews, inbox, analytics, settings)
│   │   ├── interview/[id]/   # WebRTC video-call room
│   │   └── api/              # Server-side routes (apply, external-jobs, inbox, recruiter AI endpoints)
│   ├── components/
│   │   ├── candidate/        # CVPreview, ExternalJobs, Pagination, NotificationsBell, Sidebar
│   │   ├── recruiter/        # Copilot, Sidebar
│   │   └── shared/           # Inbox, FancySelect
│   ├── lib/                  # Supabase clients, Gemini helper, email utilities, types
│   ├── .env.example          # Template for environment variables
│   └── package.json
└── backend/                  # Supabase database
    ├── schema.sql            # Full schema: tables + RLS + triggers + storage
    └── email-templates/      # Branded OTP + password-reset emails
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- A **Supabase** project ([supabase.com](https://supabase.com))
- A free **Google Gemini API key** ([aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repo
```bash
git clone https://github.com/UBIT-AI-CV-Platform/SmartHireAI.git
cd SmartHireAI/frontend
```

### 2. Configure environment variables
Copy the template and fill in your own values:
```bash
cp .env.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
GEMINI_API_KEY=your-gemini-api-key
JSEARCH_API_KEY=your-rapidapi-jsearch-key   # optional: enables external job listings
```
> `.env.local` is git-ignored — never commit your real keys.

### 3. Set up the database
In the Supabase dashboard → **SQL Editor**, run these in order:
1. **`backend/schema.sql`** — creates all tables, RLS policies, the signup trigger, and the avatars storage bucket. (Safe to re-run.)
2. **`backend/seed-demo.sql`** *(optional)* — creates demo recruiter & candidate accounts with full profiles and sample jobs, so you can explore the whole flow immediately.

Then configure Supabase Auth:
- **URL Configuration** → Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`
- Enable **Email confirmations** and paste the templates from `backend/email-templates/`
- *(Optional)* Enable the **Google** OAuth provider

### 4. Install & run
```bash
npm install
npm run dev
```
Open **http://localhost:3000**.

---

## 🧪 Quick Test Flow
1. Sign up as a **recruiter** → post a job.
2. Sign up as a **candidate** → Build Profile → generate a CV.
3. Candidate → **Jobs & Applications** → Browse Jobs → **Apply**.
4. Recruiter → open the job → **Applicants** → view the candidate's CV and update their status.
5. Recruiter → **AI Screening** → select the job → rank all applicants by fit score.
6. Recruiter → **Interviews** → schedule an interview for a shortlisted candidate.
7. Candidate → **Interviews** → accept the invite → join the video call room.
8. Recruiter → **Inbox** → message the candidate directly.

---

## 📜 Scripts (in `frontend/`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |

---

## 👥 Contributors
Final Year Project — UBIT AI CV Platform team.

---

*This project is for educational purposes.*
