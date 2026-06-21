# SmartHire AI

> An AI-powered, full-stack recruitment platform that connects candidates and recruiters through intelligent CV building, job matching, AI screening, video interviews, and real-time messaging — built as a Final Year Project.

SmartHire AI brings the entire hiring lifecycle into one place. Candidates build ATS-optimized CVs with Google Gemini, discover jobs, apply in one click, practice interviews with an AI coach, and attend video calls — all from a single dashboard. Recruiters post jobs, screen applicants with AI, manage a full hiring pipeline, schedule interviews, and communicate with candidates through an integrated inbox.

---

## Table of Contents

- [Features — Candidate Portal](#-candidate-portal)
- [Features — Recruiter Portal](#-recruiter-portal)
- [Features — Auth & Accounts](#-auth--accounts)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Quick Test Flow](#-quick-test-flow)
- [Deployment Checklist](#-deployment-checklist)
- [Scripts](#-scripts)
- [Contributors](#-contributors)

---

## 🎓 Candidate Portal

### Overview Dashboard
The candidate home page gives a full picture of the job search at a glance:
- **Time-based greeting** with profile photo, name, desired role, and location
- **Stat cards** — total applications, interviews scheduled, offers received, and saved jobs
- **Profile completeness bar** with a checklist (photo, summary, role, skills, education, CV generated)
- **Resume strength card** — displays the latest CV's ATS score (0–100) with a color-coded progress bar and dynamic feedback
- **Application pipeline chart** — visual breakdown of applications by status (Applied / Screening / Interview / Offer / Rejected), withdrawn excluded
- **Recent activity feed** — last 5 applications with status badges and relative timestamps ("2h ago", "3d ago")
- **Upcoming interviews** — next confirmed interview with job title and date
- **Recommended jobs** — skill-matched job cards with a color-coded match percentage (green ≥75%, amber ≥40%, slate below)
- **Document stats** — counts of CVs, cover letters, and AI coach sessions
- **Quick action links** — Build Profile, Generate CV, Find Jobs, AI Practice

---

### Build Profile
A complete, multi-section profile builder that feeds every AI feature on the platform:

**Personal Info**
- Profile photo upload with in-browser square-crop modal (PNG/JPG, max 5 MB, remove option)
- Full name, desired role, location, date of birth, phone number, email
- Social links: LinkedIn, GitHub, Discord — each with a username field and a separate verified URL field

**Professional Summary**
- Free-text area for a career bio, used by the AI CV generator and coach

**Skills**
- Add, edit, delete skills via an inline chip editor
- Duplicate prevention, Enter-to-save, auto-focus on new entry
- Skills appear across CV generation, job matching, and coach context

**Languages**
- Language name + proficiency level (Native / Fluent / Professional / Intermediate / Elementary)
- Duplicate prevention

**Education, Certifications, Courses, Awards, Projects**
- Each section is a full card-based list with Add / Edit / Delete per entry
- Education: degree, institute, start year, end year
- Certifications: name, issuer, issue date
- Courses: name, provider, completion date
- Awards: name, issuer, award date
- Projects: name, description, optional link (opens in new tab)

**Custom Sections**
- Create any user-defined section with a heading and bullet items — rendered on the CV under their own heading

**Validation**
- Email format, phone (7–20 chars, allows `+`, spaces, dashes), all URLs must start with `http://` or `https://`, DOB cannot be in the future

**Save States**
- Saving… → Saved! feedback, button disabled during save

---

### AI CV Generator
The flagship feature — generates a complete, professional CV from the user's profile using Google Gemini:

**Generation Controls**
- Target role input (defaults to desired role from profile)
- Tone selector: Professional, Concise, Detailed, Creative, Technical, Academic
- Custom instructions textarea (up to 1,000 characters) — e.g. "Emphasise my open-source work"
- Job description textarea (up to 4,000 characters) — paste a real JD for targeted ATS matching

**CV Customization**
- 3 templates: **Modern**, **Classic**, **Minimal**
- Layout: **Single column** or **Two column**
- Font family: **Sans**, **Serif**, **Mono**
- 6 accent colours: Indigo, Emerald, Rose, Amber, Sky, Slate
- Profile photo: include or exclude toggle
- Section visibility toggles: Summary, Experience, Education, Skills, Certifications, Courses, Awards (each individually shown/hidden)

**CV Preview**
- Real-time styled preview with the chosen template, layout, font, and colour
- Header: name, coloured title, email, phone, location, LinkedIn, GitHub, Discord links
- Experience: role, organization, period, bullet-point accomplishments
- Skills: colour-coded chips
- All other sections render with icons and structured layout
- Custom sections appear under their user-defined headings

**ATS Intelligence**
- ATS score 0–100 with a progress bar and tier label
- Category-level breakdown (e.g. Keywords, Format, Impact) with individual scores
- Missing keywords list — terms from the pasted job description not found in the CV, shown in amber
- Top AI suggestions (numbered, personalized) for improving the CV

**Document Actions**
- **Inline editing** — click any text field on the preview to edit directly (amber-ring highlight, blur to save)
- **PDF export** — print-to-PDF via browser
- **Word export** — downloads a formatted `.docx` file
- **AI Cover Letter** — opens a modal with a company name input, generates a tailored letter, allows re-draft, manual editing, copy, download, and favourite toggle

**My CVs Library**
- Full history of all generated CVs and cover letters
- **Tabs:** CVs / Cover Letters
- **Favourites filter** — star/unstar any document
- CV cards show: target role, creation date, ATS score, favourite toggle, rename, delete
- Cover letter cards show: role · company, content preview (first 70 chars), date, favourite, delete
- **Quick-view popup** — full preview of any CV or cover letter with open, edit, copy, and download actions

---

### Jobs & Applications
A LinkedIn/Glassdoor-style job discovery and application tracker:

**Browse Jobs Tab**
- **Search** by title, company, or skill
- **Location** text filter
- **Sort** by: Best match, Newest, Oldest, Salary high→low, Salary low→high, Title A→Z, Title Z→A
- **Minimum salary** slider (shows "Any" or formatted value)
- **Remote only** toggle
- **Popular skills chips** — top 8–10 skills in demand, click to add to filter
- Clear filters button (visible when filters are active)

**Job Cards**
- Company logo/initial avatar, job title, company name, location, short description
- **"New" badge** on jobs posted within 7 days
- Remote badge, salary display, first 4 skills (your matched skills highlighted in colour, missing skills greyed)
- "+X more skills" when there are more than 4
- **Match percentage** — colour-coded (green ≥75%, amber ≥40%, slate below)
- Save / bookmark toggle, posted time, "2/5 skills matched" label
- Apply button with loading state, or Applied indicator

**Job Detail Modal**
- Company, title, status (Open/Closed/New), posted time
- Save toggle, Share button (copies plain-text summary to clipboard)
- Remote / location / salary pills
- Full skills match breakdown — percentage bar, "X of Y skills matched", green for matched, grey for missing
- Full job description
- Apply & choose CV button (when not applied yet), or "Already applied" state

**Apply Flow**
- CV picker modal — lists all generated CVs with target role, date, ATS score
- Radio select with View preview option before sending
- Sends application with chosen CV snapshot attached
- "Need a CV first" modal if no CVs exist, links to CV Generator

**Saved Jobs Tab**
- All bookmarked jobs in the same card format with one-click apply

**My Applications Tab**
- Application cards: company logo, job title, company, location, "Applied X time ago", match score, status badge (Applied / Screening / Interview / Offer / Rejected), View job and Withdraw buttons

**Web Jobs Tab (External)**
- Aggregated listings from LinkedIn, Indeed, and Glassdoor via Jooble API
- Source badge per listing (colour-coded per platform)
- Direct external link to apply on the source site

**Sidebar Widgets**
- Your Job Hunt card: open jobs, saved, applications, average match score
- Top Matches: 3 highest-matching open roles
- Skills in Demand: top 8 skills with demand counts, click to filter
- Boost Match CTA: links to profile builder if match scores are low

---

### Interviews
Full interview lifecycle management for candidates:

**Status Pipeline**
| Status | Meaning |
|---|---|
| Proposed | Awaiting your accept/decline |
| Accepted | Confirmed — ready to attend |
| Declined | You declined the invite |
| Completed | Interview done — awaiting result |
| Offer | Recruiter sent an offer |
| Offer Accepted | You accepted the offer |
| Offer Declined | You declined the offer |
| Rejected | Not selected after interview |
| Cancelled | Cancelled by the recruiter |

**Interview Cards**
- Job title, scheduled date & time (formatted: "Thu, Dec 3, 2:30 PM"), duration, location or "Online"
- Status badge with matching icon and colour
- Recruiter notes (if provided)
- **Action buttons (context-aware):**
  - Proposed → **Accept** / **Decline**
  - Accepted (with internal room) → **Join Room** (WebRTC video call)
  - Accepted (with external link) → **Join Meeting** (external URL)
  - Completed → waiting state message
  - Offer → **Accept Offer** / **Decline Offer**

**Sections**
- Upcoming (Proposed, Accepted) separated from Past (all terminal states)

---

### AI Interview Coach
A full conversational AI coach for interview preparation:

**Session Management**
- New session button
- Session history sidebar with session title (auto-labelled from role or first message), delete per session, click to restore

**Configuration**
- **Job focus** — select from your applied jobs (Job · Company) or type a custom role
- **Difficulty** — Easy, Medium, Hard
- **Mode** — Chat (open conversation) or Mock (structured mock interview)

**Chat Features**
- Streaming responses with live typing animation
- Copy button on assistant messages (on hover)
- Regenerate button on last AI message (on hover)
- Quick follow-up buttons after each response: **Sample answer**, **Make it harder**, **Next question**, **Why this matters**
- Voice input via browser speech recognition — speak your answer, text appears in the input
- Shift+Enter for newline, Enter to send

**Starter Prompts (empty state)**
- Run a full mock interview
- What questions should I expect for this role?
- Help me answer "Tell me about yourself"
- Give me a tough behavioural question

**End Session**
- "End session & save" button generates a session title and saves the conversation

---

### Inbox
Real-time messaging between candidates and recruiters:
- Conversation list with recruiter name and last message preview
- Unread count badge
- Message thread view with sent/received alignment
- Timestamps per message
- Text input with send button
- Auto-scrolls to latest message
- Empty state when no conversations yet

---

### Notifications
A structured activity feed:
- **Notification types** with distinct icons and colours: applied (indigo), status update (amber), interview invite (sky), offer (green), message (primary)
- Filter tabs: All, Unread, Read — with counts
- Mark all as read button
- Per-notification toggle read/unread and delete (revealed on hover)
- Unread indicator (blue dot)
- Relative timestamps
- Clickable to navigate to the related page

---

### Settings (Candidate)
- **Account section** — email (read-only), account type (read-only), editable full name with save/feedback
- **Change password** — new password + confirm password, min 8 characters, visibility toggle, success/error feedback
- **Sign out** — logs out on the current device

---

## 🏢 Recruiter Portal

### Overview Dashboard
A real-time command centre for the recruiter's hiring activity:
- **Time-based greeting** with recruiter name and company name
- **Stat cards** — Active Jobs, Total Applicants, Interviews Scheduled, Offers Extended — all pulling live data
- **Recent applicants** — latest 6 applications with candidate avatar, name, applied job, time ago, match score, and status badge
- **Hiring pipeline chart** — stacked bar showing application flow across Applied / Screening / Interview / Offer / Rejected with colour-coded counts
- **Top jobs** — 4 highest-activity jobs by applicant count with open/closed status
- **Expiring jobs alert** — amber card listing jobs closing within 7 days with days-remaining countdown
- **Quick action grid** — Post a Job, Applicants, Company Profile, Settings
- **AI Tools panel** — direct links to AI Screening, AI Copilot, and Analytics with descriptions
- **Company profile CTA** — prompts setup if not configured, or links to update

---

### Jobs Management
Full control over the recruiter's job postings:

**Posting a Job**
- Job title (required), company (required), location (optional), salary range (optional, free text e.g. "$60k–$90k")
- Required skills (comma-separated)
- Deadline date (optional — job auto-archives when passed)
- Job description (textarea)
- **"Write with AI" button** — calls the AI Copilot to draft a professional description from the title, company, and skills

**Job List Tabs**
- **Active** — open and closed (but not expired) jobs
- **Old / Expired** — past-deadline jobs

**Job Cards**
- Company avatar, title, status badges (Open/Closed, Expired, Deadline countdown "Closes in 7d" in amber)
- Company, location, salary, first 6 skills, applicant count
- **Actions:** Close/Reopen toggle, Edit, Delete (with confirmation), Repost (expired jobs)

**Job Detail Modal**
- Full view with salary pill, applicant count, required skills, full description

**Sidebar Widgets**
- At-a-Glance: active jobs, expired jobs, total applicants
- AI Screening CTA
- Posting Tips: set deadline for auto-archive, list exact skills, use Write with AI

---

### Applicants Management
The core pipeline management tool for reviewing and moving candidates:

**Views**
- **List view** (default) — full detail cards, sortable and filterable
- **Board view (Kanban)** — drag-and-drop columns for Applied, Screening, Interview, Offer, Rejected

**Filters (List View)**
- Search by name, email, or job title
- Filter by specific job
- Filter by status
- Sort by: Newest, Oldest, Best Match, Top Rated

**Applicant Cards**
- Candidate avatar (colour-coded initials), name, email, applied job, time ago, match score
- 5-star rating system (click to rate 1–5)
- **Status pipeline** — inline buttons to move the candidate: Applied → Screening → Interview → Offer → Rejected
- **View CV** — opens the exact CV snapshot the candidate submitted
- **Draft Email (Outreach)** — opens the AI email drafting modal
- **Notes** — inline expandable textarea with save/cancel

**Kanban Board**
- 5 columns with candidate count per column
- Drag-and-drop cards between columns to update status
- Cards show avatar, name, job title, match score, View CV button
- Drop zones highlight on hover

**AI Outreach Email Modal**
- Candidate name and email shown at the top
- Email type selector: **Interview Invite**, **Rejection**, **Offer**
- **Draft with AI** — generates a professional, personalized email template
- Editable textarea, copy to clipboard, send button
- Success/error feedback

**Sidebar**
- Total applicants, top-rated count, average match score
- Pipeline breakdown with clickable status filters
- AI Screening CTA

---

### AI Screening
AI-powered applicant analysis and interview preparation, all in one place:

**Tabs**
- **Screening** — AI analysis tools
- **Copilot** — AI chat assistant (see below)

**Job Selector**
- Dropdown listing all the recruiter's active jobs

**Mode: Rank Applicants**
Sends all applicant CVs to Gemini for simultaneous analysis:
- **Overall Summary** — a paragraph-level narrative of the applicant pool
- **Ranked applicant cards** (sorted best to worst):
  - Rank number, candidate avatar and name
  - **Recommendation badge**: Shortlist (green) / Maybe (amber) / Pass (grey)
  - **AI verdict** — one-sentence summary of fit
  - **Fit score 0–100** with colour-coded progress bar
  - **Strengths** — bulleted list (green) of positive signals from the CV
  - **Concerns** — bulleted list (amber) of gaps or red flags
  - View CV button (if CV snapshot exists)

**Mode: Interview Kit**
Generates a complete, structured interview guide for the selected job:
- **Intro** — recommended interview approach
- **Question categories** (e.g. Technical, Behavioural, Cultural Fit) each with:
  - Multiple interview questions
  - **"Look for:"** guidance per question (what a good answer contains)
- **Red Flags** — warning signs to watch for during the interview
- **Closing Tip** — advice on how to close the interview
- **Copy Kit** button — copies the full kit to clipboard

**Recruiter AI Copilot**
A full conversational AI assistant embedded in the AI Tools page:
- Chat interface with markdown-rendered responses
- Starter prompts: Write a job description, Draft interview-invite email, Give interview questions, What to look for when screening
- Streaming responses with typing animation
- Persistent within the session

---

### Interviews Management
Full scheduling and tracking of all interviews:

**Scheduling**
- Schedule Interview button opens a modal:
  - Candidate selector (dropdown of applicants from recruiter's jobs, excludes withdrawn)
  - Date and time picker (required)
  - Duration: 15, 30, 45, or 60 minutes
  - Meeting link (optional — external URL, e.g. Zoom/Meet)
  - Notes for the candidate (optional)
- Reschedule modal — same fields, candidate pre-selected

**Interview Status Pipeline**
| Status | Action Available |
|---|---|
| Proposed | Reschedule, Cancel, Join (if link set) |
| Accepted | Mark Completed, Make Offer, Reject, Reschedule, Cancel, Join Room |
| Completed | Make Offer, Reject |
| Offer | Waiting for candidate response |
| Offer Accepted / Rejected / Cancelled | Delete |

**Interview Cards**
- Candidate avatar and name, job title, status badge with icon and colour
- Scheduled date/time, duration, location or meeting link
- Context-aware action buttons per status (see table above)
- **Join Room** — opens the internal WebRTC video call at `/interview/[id]`
- **External Join** — opens the meeting link in a new tab

**Sections**
- Upcoming (Proposed, Accepted)
- In Review & Offers (Completed, Offer)
- Closed (all terminal states)

---

### Inbox
Same shared messaging interface as the candidate side:
- Conversation list with candidate names and last message previews
- Unread count badges
- Full message thread per conversation
- Text input with send
- Auto-scroll to latest
- Real-time via Supabase

---

### Analytics
Data-driven insights into the recruiter's hiring performance:

**Summary Metrics (Stat Cards)**
- Active jobs count
- Total applicants count
- Average match score (%)
- Offer/hire rate (offers ÷ total applicants, %)

**Applications Over Time**
- Bar chart for the last 14 days
- Date labels on X-axis (every other day to avoid crowding)
- Application count on Y-axis
- Hover shows exact count per day

**Hiring Funnel**
- Horizontal bars for Applied → Screening → Interview → Offer
- Percentage label per stage
- "Conversion to offer: X%" headline stat

**Match Quality Distribution**
- Applicants bucketed by match score: 0–40%, 40–60%, 60–75%, 75–100%
- Colour-coded bars (slate, amber, sky, green)
- Shows how skilled the applicant pool is

**Top Jobs by Applicants**
- Horizontal bar chart for up to 6 jobs
- Applicant count per job labelled

---

### Company Profile
What candidates see about the recruiter's company:
- **Logo upload** — image crop modal, 5 MB limit, stored in Supabase Storage
- Company name (required), Recruiter name
- Website URL (must be a valid http/https link), Industry, Location
- Company size: 1–10, 11–50, 51–200, 201–500, 500+
- About company (multi-line description)
- **Live candidate-view preview card** in the sidebar — shows exactly how the profile appears to job seekers (logo, name, industry, location, size badge, website, about, recruiter name)

---

### Settings (Recruiter)
- **Account section** — email (read-only), account type (read-only), editable full name with save/feedback
- **Change password** — new + confirm, min 8 characters, visibility toggle, success/error feedback
- **Sign out**

---

## 🔐 Auth & Accounts

- **Email/password signup** with OTP email verification (branded email template)
- **Login** with email and password
- **Forgot password** → email with a reset link → set new password flow
- **Google OAuth** — one-click sign in, followed by a role-selection step (Candidate or Recruiter)
- **Role-based access** — one email maps to one role only; portal gating redirects users to the correct dashboard; wrong-role access is blocked
- **Middleware-level route protection** — all `/candidate/*` and `/recruiter/*` routes require an active session

---

## 📹 WebRTC Video Interview Room

A peer-to-peer video call room built directly into the platform, no third-party app required:
- **Dark-themed full-screen room** with two video tiles (remote + local)
- **Connection status bar** — green "Connected · MM:SS" timer, amber "Connecting…", or "Waiting for [name]…"
- **Video tiles** — participant name, role tag ("You" / "Interviewer" / "Candidate"), colour-coded avatar when camera is off, mic-muted indicator (red icon)
- **Controls bar** — microphone toggle (green/red), camera toggle (green/red), Leave call (red)
- **Media error handling** — amber warning if camera or mic is denied; audio-only participation still works
- **Signalling** via Supabase Realtime broadcast channel (no separate signalling server)
- **ICE/STUN** — Google STUN servers for NAT traversal

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.7 |
| Styling | Tailwind CSS v4, Material Symbols Outlined, Inter + Sora via `next/font` |
| Backend / DB | Supabase (PostgreSQL, Row-Level Security, Auth, Storage, Realtime) |
| AI | Google Gemini API (`gemini-2.5-flash` with `gemini-2.0-flash` fallback) |
| Real-time | Supabase Realtime — broadcast signalling for WebRTC, live messaging |
| Video | WebRTC (browser-native, peer-to-peer) |
| Email | Nodemailer via Gmail SMTP (application confirmation emails) |
| External Jobs | Jooble API (LinkedIn, Indeed, Glassdoor aggregation) |
| Analytics | Vercel Analytics |
| Image Optimization | `next/image` with AVIF/WebP auto-conversion |
| Libraries | `@supabase/ssr`, `react-easy-crop`, `react-to-print`, `docx`, `react-markdown`, `remark-gfm` |

---

## 📁 Project Structure

```
SmartHireAI/
├── frontend/                          # Next.js 16 application
│   ├── app/
│   │   ├── page.tsx                   # Landing page
│   │   ├── layout.tsx                 # Root layout (fonts, metadata, analytics)
│   │   ├── not-found.tsx              # Branded 404 page
│   │   ├── error.tsx                  # Root error boundary
│   │   ├── sitemap.ts                 # Dynamic sitemap (/sitemap.xml)
│   │   ├── robots.ts                  # Crawler rules (/robots.txt)
│   │   │
│   │   ├── auth/                      # Auth pages
│   │   │   ├── page.tsx               # Login / signup entry
│   │   │   ├── callback/route.ts      # OAuth + email confirmation callback
│   │   │   ├── forgot-password/       # Forgot password form
│   │   │   └── reset-password/        # Reset password form (from email link)
│   │   │
│   │   ├── candidate/                 # Candidate portal
│   │   │   ├── layout.tsx             # Sidebar + header + auth guard
│   │   │   ├── loading.tsx            # Route-level loading spinner
│   │   │   ├── error.tsx              # Route-level error boundary
│   │   │   ├── page.tsx               # Overview / Dashboard
│   │   │   ├── build-profile/         # Profile builder
│   │   │   ├── cv-generator/          # AI CV + Cover Letter generator
│   │   │   ├── my-applications/       # Jobs, saved, applications, web jobs
│   │   │   ├── interviews/            # Interview tracker
│   │   │   ├── inbox/                 # Messaging
│   │   │   ├── ai-coach/              # AI interview coach
│   │   │   ├── notifications/         # Notifications feed
│   │   │   └── settings/              # Account settings
│   │   │
│   │   ├── recruiter/                 # Recruiter portal
│   │   │   ├── layout.tsx             # Sidebar + header + auth guard
│   │   │   ├── loading.tsx            # Route-level loading spinner
│   │   │   ├── error.tsx              # Route-level error boundary
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── jobs/                  # Job posting & management
│   │   │   ├── applicants/            # Pipeline management (list + kanban)
│   │   │   ├── ai-screening/          # AI rank + interview kit + copilot
│   │   │   ├── interviews/            # Interview scheduling & tracking
│   │   │   ├── inbox/                 # Messaging
│   │   │   ├── analytics/             # Hiring analytics
│   │   │   ├── company-profile/       # Company info + logo
│   │   │   └── settings/              # Account settings
│   │   │
│   │   ├── interview/[id]/            # WebRTC video call room
│   │   │
│   │   └── api/                       # Next.js server-side routes
│   │       ├── generate-cv/           # AI CV generation
│   │       ├── generate-cover-letter/ # AI cover letter generation
│   │       ├── interview-coach/       # AI coach (streaming)
│   │       ├── apply/                 # Job application submission + email
│   │       ├── external-jobs/         # Jooble API proxy
│   │       ├── inbox/                 # Message send/receive
│   │       └── recruiter/
│   │           ├── screen-applicants/ # AI applicant ranking
│   │           ├── interview-kit/     # AI interview guide generation
│   │           ├── job-description/   # AI job description drafting
│   │           ├── outreach/          # AI email drafting
│   │           └── copilot/           # AI copilot chat (streaming)
│   │
│   ├── components/
│   │   ├── landing/                   # Landing page sections (Navigation, Hero, Features, FAQ, CTA, Footer)
│   │   ├── auth/                      # Auth UI (SocialButton, etc.)
│   │   ├── candidate/                 # CVPreview, Sidebar, NotificationsBell, ExternalJobs, Pagination
│   │   ├── recruiter/                 # Copilot, Sidebar
│   │   └── shared/                    # Inbox, FancySelect
│   │
│   ├── lib/
│   │   ├── supabase/                  # Server + client + middleware Supabase clients, DB types
│   │   ├── gemini.ts                  # Multi-key Gemini caller with rotation + model fallback
│   │   └── emails.ts                  # Nodemailer email sending
│   │
│   ├── .env.example                   # Environment variable template
│   └── package.json
│
└── backend/
    ├── schema.sql                     # Full DB schema: tables, RLS, triggers, storage bucket
    └── email-templates/
        ├── confirm-signup.html        # Branded OTP verification email
        └── reset-password.html        # Branded password reset email
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- A free **Supabase** project — [supabase.com](https://supabase.com)
- A free **Google Gemini API key** — [aistudio.google.com](https://aistudio.google.com)
- *(Optional)* A **Jooble API key** for external job listings — [jooble.org/api/about](https://jooble.org/api/about)

### 1. Clone the repo
```bash
git clone https://github.com/UBIT-AI-CV-Platform/SmartHireAI.git
cd SmartHireAI/frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in your values (see [Environment Variables](#-environment-variables) below).

### 4. Set up the database
See [Database Setup](#-database-setup) below.

### 5. Run the development server
```bash
npm run dev
```
Open **http://localhost:3000**.

---

## 🔑 Environment Variables

```env
# ── Supabase ─────────────────────────────────────────────────────────────────
# Find these in: Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ── App URL ───────────────────────────────────────────────────────────────────
# Used in sitemap, robots.txt, and email links.
# Change to your deployed URL in production.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Google Gemini ─────────────────────────────────────────────────────────────
# Get a free key at https://aistudio.google.com
# Option A — single key:
GEMINI_API_KEY=your-gemini-key
# Option B — multiple keys (comma-separated) for higher quota.
# The app rotates between keys automatically; on a 429 it switches immediately.
# GEMINI_API_KEYS=key1,key2,key3

# ── Email (SMTP) ──────────────────────────────────────────────────────────────
# Used for application-confirmation emails to candidates.
# For Gmail: use a Google App Password (not your login password).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ── External Job Listings (optional) ─────────────────────────────────────────
# Free key from https://jooble.org/api/about — shows LinkedIn/Indeed/Glassdoor jobs.
# Without this key the Web Jobs tab shows a demo result set.
JOOBLE_API_KEY=your-jooble-key
```

---

## 🗄️ Database Setup

### 1. Run the schema
In the Supabase dashboard → **SQL Editor**, paste and run **`backend/schema.sql`**.

This creates:
- All tables (`profiles`, `skills`, `languages`, `education`, `certifications`, `courses`, `awards`, `projects`, `custom_sections`, `cvs`, `cover_letters`, `jobs`, `applications`, `interviews`, `messages`, `notifications`, `company_profiles`)
- Row-Level Security (RLS) policies — each user can only read/write their own data
- Signup trigger — automatically inserts a row into `profiles` when a new user registers
- Avatars storage bucket — for profile and company logo photos

The script is idempotent — safe to re-run if you need to reset.

### 2. Configure Supabase Auth
In the Supabase dashboard → **Authentication**:

**URL Configuration**
| Setting | Value |
|---|---|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/**` |

**Email Templates**
- Go to **Auth → Email Templates**
- Paste the HTML from `backend/email-templates/confirm-signup.html` into the **Confirm signup** template
- Paste `backend/email-templates/reset-password.html` into the **Reset password** template

**Google OAuth** *(optional)*
- Enable the Google provider under **Auth → Providers → Google**
- Add your Google Cloud OAuth Client ID and Secret
- Add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` as an authorised redirect URI in Google Cloud Console

---

## 🧪 Quick Test Flow

### Full Hiring Cycle
1. **Sign up as a recruiter** → fill in Company Profile → **Post a Job** (use "Write with AI" for the description).
2. **Sign up as a candidate** → **Build Profile** (add skills, education, projects) → **Generate CV** (paste the job description for ATS matching) → export as PDF.
3. **Candidate** → Jobs & Applications → Browse Jobs → find the job → **Apply** (select the generated CV).
4. **Recruiter** → AI Screening → select the job → **Rank Applicants** — see AI scores, strengths, and concerns.
5. **Recruiter** → AI Screening → **Interview Kit** — generate structured interview questions for the role.
6. **Recruiter** → Applicants → move the candidate to **Screening** → draft an **Interview Invite** email with AI Outreach.
7. **Recruiter** → Interviews → **Schedule Interview** (set date, time, duration).
8. **Candidate** → Interviews → **Accept** the interview invite.
9. Both parties → **Join Room** → live WebRTC video call in the browser.
10. **Recruiter** → Mark Completed → **Make Offer**.
11. **Candidate** → Interviews → **Accept Offer** 🎉
12. **Recruiter** → Analytics → review funnel, match quality, and time-to-hire data.

### AI Features Checklist
- [ ] CV Generator: generate with a pasted job description and check ATS score + missing keywords
- [ ] AI Coach: set role to the applied job, set difficulty to Hard, run a mock interview
- [ ] AI Screening: rank all applicants after 2+ candidates apply
- [ ] Interview Kit: generate a full kit for any posted job
- [ ] AI Copilot: ask it to write a job description from scratch
- [ ] AI Outreach: draft an offer email for a candidate

---

## 🌐 Deployment Checklist

When deploying to **Vercel** (or any platform):

### 1. Set environment variables on the platform
Add all variables from `.env.example` in the Vercel dashboard → Project → Settings → Environment Variables. Change:
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. Update Supabase URL Configuration
In Supabase → Authentication → URL Configuration:
- **Site URL** → `https://your-app.vercel.app`
- **Redirect URLs** → add `https://your-app.vercel.app/**` (keep `http://localhost:3000/**` for local dev)

### 3. Update Google OAuth (if enabled)
In Google Cloud Console → Credentials → your OAuth Client → **Authorized redirect URIs**, add:
```
https://your-app.vercel.app/auth/callback
```

No code changes are required — all URLs are resolved from `window.location.origin` or `NEXT_PUBLIC_APP_URL` at runtime.

---

## 📜 Scripts

Run from the `frontend/` directory:

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |

---

## 👥 Contributors

**Final Year Project — UBIT AI CV Platform**

Built with Next.js, Supabase, and Google Gemini as a capstone project demonstrating full-stack AI-integrated web development.

---

*This project is for educational purposes.*
