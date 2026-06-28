# SmartHire AI

> An AI-powered, full-stack recruitment platform **and professional network** — combining intelligent CV building, job matching, AI screening, video interviews, and real-time messaging with a LinkedIn-style social feed of public profiles, posts, and follows. Built as a Final Year Project.

SmartHire AI brings the entire hiring lifecycle into one place. Candidates build ATS-optimized CVs with Google Gemini, discover jobs, apply in one click, practice interviews with an AI coach, and attend video calls. Recruiters post jobs, screen applicants with AI, manage a full hiring pipeline, schedule interviews, and message candidates.

On top of the ATS sits a **social layer**: every user gets a public profile, a shared **feed** where candidates and recruiters post updates (text, images, and documents), and the ability to **follow** people, **like**, **comment**, **repost**, and **share** posts — all wired into one unified inbox where you can message anyone.

---

## Table of Contents

- [Features — Candidate Portal](#-candidate-portal)
- [Features — Recruiter Portal](#-recruiter-portal)
- [Social Network & Feed](#-social-network--feed)
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

### Dashboard (Feed + Overview)
The candidate home page (`/candidate`) merges the social **feed** and the personal **overview** into one screen:

**Left column (~60%) — the social feed**
- **People search bar** at the top — find any user by name, `@handle`, or company with a live results dropdown
- **Post composer** — a "Start a post" bar that opens a popup to write an update (with **bold/italic** formatting), attach a **photo** or a **document/PDF**, and publish
- **Feed tabs:** **Following** (people you follow + yourself), **Discover** (the whole community), **Trending** (most-liked/commented posts of the last 30 days)
- Infinite "Load more" pagination

**Right column (~40%) — your details**
- **Profile mini-card** — photo, time-based greeting, headline, follower/following counts, **View profile** and **Edit** buttons
- **Stat cards** — Applications, Interviews, Offers, Saved jobs
- **Upcoming interviews** shortcut
- **Profile completeness** checklist with progress bar
- **Recommended jobs** — top skill-matched roles with match %
- **Quick actions** — Generate CV, Find Jobs, AI Coach, Build Profile
- **Who to follow** — suggested people you don't follow yet

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

### Interviews (a tab inside the Inbox)
Interviews now live as the **Interviews tab inside the Inbox** (the old standalone page redirects there). The tab lists every interview with its stage, date, and the other party; selecting one opens the backing chat thread, where a live **interview card** carries all the actions.

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

### Inbox (unified — message anyone)
One real-time inbox for **all** conversations — hiring threads *and* social DMs:
- **Two tabs:** **Messages** and **Interviews** (the interviews list, see above)
- **Message anyone** — "New message" search finds any user; you can also DM straight from someone's profile (**Message** button) or by sharing a post
- Conversation list with the other person's **photo + name** (avatar links to their profile), last-message preview, unread badges, relative time
- Message thread with sent/received bubbles, timestamps, auto-scroll
- **Shared-post cards** — when someone shares a post to you, it appears as a tappable preview linking to the post
- **Hiring threads** additionally show recruiter quick-actions (Schedule interview / Send offer / Reject) and live interview cards; plain social DMs stay clean
- Deep-linking via `?c=<conversationId>` and `?tab=interviews`
- Real-time via Supabase (instant new-message delivery + read sync)

---

### Notifications
A structured activity feed:
- **Notification types** with distinct icons and colours: applied (indigo), status update (amber), interview invite (sky), offer (green), message (primary), **new follower (pink)**, **like (rose)**, **comment (blue)**, **repost (emerald)**
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

### Dashboard (Feed + Overview)
The recruiter home page (`/recruiter`) merges the social **feed** with a hiring overview, mirroring the candidate layout:

**Left column (~60%) — the social feed**
- **People search bar** to find any candidate or recruiter
- **Post composer** — share company updates, hiring posts, photos, or documents (with bold/italic formatting)
- **Following / Discover / Trending** feed tabs

**Right column (~40%) — hiring at a glance**
- **Profile mini-card** — photo, greeting, company, follower/following counts, **View profile** and **Edit**
- **Hiring stats** — Open jobs, Applicants, Interviews
- **Recent applicants** — latest candidates with the job they applied to
- **Quick actions** — Post a job, Applicants, AI tools, Analytics
- **Who to follow**

> The deeper hiring tools (full pipeline chart, expiring-jobs alerts, top jobs) live on the dedicated **Jobs**, **Applicants**, and **Analytics** pages.

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

### Interviews Management (a tab inside the Inbox)
Scheduling and tracking now happen inside the **Inbox** — the **Interviews tab** lists every interview, and the actions live on the interview card within each candidate's chat thread (the old standalone page redirects to `/recruiter/inbox?tab=interviews`).

**Scheduling** (from a candidate's chat thread)
- A **Schedule interview** quick-action opens a modal:
  - Date and time picker (required)
  - Duration: 15, 30, 45, or 60 minutes
  - Meeting link (optional — external URL, e.g. Zoom/Meet)
  - Notes for the candidate (optional)
- Reschedule modal — same fields

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

### Inbox (unified — message anyone)
The same shared, unified inbox as the candidate side:
- **Messages** and **Interviews** tabs in one place
- Message **anyone** (applicants, other recruiters, or any user via search / their profile / a shared post)
- Hiring threads expose the **Schedule interview / Send offer / Reject** quick-actions and live interview cards; social DMs stay clean
- Avatars show the other person's photo and link to their profile
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

## 🌐 Social Network & Feed

A LinkedIn-style professional layer that both candidates and recruiters share. Visibility is **logged-in only** — any signed-in user can view profiles and the feed, but logged-out visitors are redirected to sign in.

### Posts & Feed
- **Create a post** in a popup composer: write a caption with **bold/italic** (markdown), attach **one image** and/or **one document** (PDF/DOC/PPT/XLS/CSV/TXT, up to 15 MB)
- **Like** (with a maroon-red gradient heart), **Comment** (threaded, with add/delete), **Repost** (optionally with your own quote), and **Share**
- **Share** menu: **Copy link** to the post's permalink (`/post/[id]`), or **Send in a message** to anyone (lands as a shared-post card in their inbox)
- **Edit** or **Delete** your own posts; **Hide** or **Report** others' posts
- Documents render as a downloadable chip; reposts embed the original post inline
- **Feed tabs:** Following · Discover · Trending (most-engaged in the last 30 days)

### Public Profiles (`/u/<handle>`)
Every user gets an auto-generated `@username` and a public profile that renders **inside the portal shell** (sidebar + topbar):
- Clean header (no cover image) — photo, name, role badge, headline, location, company, **followers/following** counts, and a bio
- **60/40 layout** — the person's **posts** on the left, their **details** on the right. Candidates show profile sections (skills, languages, projects, education, certifications, courses, awards, custom sections); **recruiters show a Company card** (name, industry, size, website, about) since they manage company info, not personal sections
- **Follow / Unfollow**, **Message** (opens or starts a DM), **Copy link**, and **Report**
- **Edit in place** on your own profile — update name, headline, location, bio, and photo without leaving the page
- Reachable from search, the feed, the "Who to follow" card, post authors, inbox avatars, and the sidebar user card

### Follow Graph & Discovery
- **Follow** anyone; followers/following are public and open in a list modal
- **People search** (top of the Dashboard) with a live results dropdown
- **Who to follow** suggestions (excludes people you already follow)
- A **new follower** notification is sent on each follow

### Moderation
- **Report** a post, comment, or profile with a reason + optional details (one report per target; re-reporting is a no-op)
- **Hide post** removes a post from your own feed locally
- Reports are stored for admin review (service-role only); reporters can read their own reports

---

## 🔐 Auth & Accounts

- **Email/password signup** with OTP email verification (branded email template)
- **Login** with email and password
- **Forgot password** → email with a reset link → set new password flow
- **Google OAuth** — one-click sign in, followed by a role-selection step (Candidate or Recruiter)
- **Role-based access** — one email maps to one role only; portal gating redirects users to the correct dashboard; wrong-role access is blocked
- **Middleware-level route protection** — `/candidate/*`, `/recruiter/*`, `/interview/*`, `/u/*`, and `/post/*` all require an active session

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
| Social | Public profiles, feed, follows, posts/likes/comments, reposts, sharing, moderation (Supabase tables + RLS + `public_profiles` view) |
| Libraries | `@supabase/ssr`, `react-easy-crop`, `react-to-print`, `docx`, `react-markdown`, `remark-gfm`, `date-fns` |

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
│   │   │   ├── page.tsx               # Dashboard (social feed + overview)
│   │   │   ├── u/[username]/          # Public profile (rendered in portal shell)
│   │   │   ├── build-profile/         # Profile builder
│   │   │   ├── cv-generator/          # AI CV + Cover Letter generator
│   │   │   ├── my-applications/       # Jobs, saved, applications, web jobs
│   │   │   ├── inbox/                 # Unified inbox (Messages + Interviews tabs)
│   │   │   ├── ai-coach/              # AI interview coach
│   │   │   ├── notifications/         # Notifications feed
│   │   │   ├── settings/              # Account settings
│   │   │   └── feed/ · people/ · interviews/   # redirect stubs → Dashboard / Inbox
│   │   │
│   │   ├── recruiter/                 # Recruiter portal
│   │   │   ├── layout.tsx             # Sidebar + header + auth guard
│   │   │   ├── loading.tsx            # Route-level loading spinner
│   │   │   ├── error.tsx              # Route-level error boundary
│   │   │   ├── page.tsx               # Dashboard (social feed + hiring overview)
│   │   │   ├── u/[username]/          # Public profile (rendered in portal shell)
│   │   │   ├── jobs/                  # Job posting & management
│   │   │   ├── applicants/            # Pipeline management (list + kanban)
│   │   │   ├── ai-screening/          # AI rank + interview kit + copilot
│   │   │   ├── inbox/                 # Unified inbox (Messages + Interviews tabs)
│   │   │   ├── analytics/             # Hiring analytics
│   │   │   ├── company-profile/       # Company info + logo
│   │   │   ├── settings/              # Account settings
│   │   │   └── feed/ · people/ · interviews/   # redirect stubs → Dashboard / Inbox
│   │   │
│   │   ├── u/[username]/              # Public profile (standalone / shareable link)
│   │   ├── post/[id]/                 # Single-post permalink (shareable)
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
│   │   ├── candidate/                 # CVPreview, Sidebar, NotificationsBell, ExternalJobs, Pagination, ImageCropModal
│   │   ├── recruiter/                 # Copilot, Sidebar
│   │   ├── social/                    # Dashboard, Feed, PostCard, CreatePost (+composer), PublicProfileView,
│   │   │                              #   SinglePostView, PeopleDirectory, PeopleSearchBar, WhoToFollow,
│   │   │                              #   FollowButton, FollowListModal, PersonCard, SharePostModal,
│   │   │                              #   RepostModal, ReportModal
│   │   └── shared/                    # Inbox (unified), FancySelect, ThemeToggle
│   │
│   ├── lib/
│   │   ├── supabase/                  # Server + client + middleware Supabase clients, DB types
│   │   ├── social.ts                  # Social types + helpers (relativeTime, tagline, initials…)
│   │   ├── useProfileLink.ts          # Portal-aware profile URL hook
│   │   ├── gemini.ts                  # Multi-key Gemini caller with rotation + model fallback
│   │   └── emails.ts                  # Nodemailer email sending
│   │
│   ├── proxy.ts                       # Auth/session middleware (Next 16 "proxy") + route protection
│   ├── .env.example                   # Environment variable template
│   └── package.json
│
└── backend/
    ├── schema.sql                     # Full consolidated DB schema (tables, views, RLS, triggers, buckets)
    ├── social-phase1.sql … social-phase5.sql  # Social layer deltas (profiles+follows, feed,
    │                                  #   sharing/unified-inbox, moderation, post file attachments)
    ├── social-fixes.sql               # Follow-up fixes (idempotent)
    ├── seed-social.sql                # Optional demo data — posts, jobs, profile details
    ├── cleanup-recruiter-details.sql  # Removes fake recruiter profile sections (run once)
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
In the Supabase dashboard → **SQL Editor**, paste and run **`backend/schema.sql`** (the full consolidated schema).

This creates:
- **Tables** — `profiles`, `skills`, `languages`, `education`, `certifications`, `courses`, `awards`, `projects`, `custom_sections`, `cvs`, `cover_letters`, `saved_jobs`, `jobs`, `applications`, `interviews`, `interview_sessions`, `conversations`, `messages`, `notifications`, `follows`, `posts`, `post_likes`, `post_comments`, `reports`
- **`public_profiles` view** — exposes only the safe, public columns of a profile (email / phone / DOB stay private)
- **Row-Level Security** on every table — owner-only writes; the social tables (profiles-as-public-view, follows, posts, comments, likes, profile sections) are readable by any signed-in user
- **Triggers** — auto-create a `profiles` row + unique `@username` on signup; maintain unread counts, like/comment counts, and notifications (apply, status, interview, message, follow, like, comment, repost)
- **Storage buckets** — `avatars` (profile + company photos) and `post-media` (feed images + documents)

> The social layer is also available as incremental deltas (`social-phase1.sql` … `social-phase5.sql` + `social-fixes.sql`) for upgrading an existing DB. Running the full `schema.sql` once is equivalent.

The script is idempotent — safe to re-run.

### 1b. (Optional) Seed demo data
For a lively feed and sample jobs, run **`backend/seed-social.sql`** in the SQL Editor. It adds varied posts (text / image / CV / document) at past timestamps, dummy jobs for recruiters, candidate profile sections, and headline/location/bio/company details — only for users who are missing them (safe + idempotent). Recruiters intentionally do **not** get personal sections (they manage Company details instead). `cleanup-recruiter-details.sql` removes any such fake recruiter sections if they were seeded earlier.

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
7. **Recruiter** → **Inbox** → open the candidate's chat → **Schedule interview** (date, time, duration).
8. **Candidate** → **Inbox → Interviews tab** → open the chat → **Accept** the interview.
9. Both parties → **Join Room** → live WebRTC video call in the browser.
10. **Recruiter** → Mark Completed → **Make Offer**.
11. **Candidate** → Inbox → **Accept Offer** 🎉
12. **Recruiter** → Analytics → review funnel, match quality, and time-to-hire data.

### AI Features Checklist
- [ ] CV Generator: generate with a pasted job description and check ATS score + missing keywords
- [ ] AI Coach: set role to the applied job, set difficulty to Hard, run a mock interview
- [ ] AI Screening: rank all applicants after 2+ candidates apply
- [ ] Interview Kit: generate a full kit for any posted job
- [ ] AI Copilot: ask it to write a job description from scratch
- [ ] AI Outreach: draft an offer email for a candidate

### Social Layer
1. **Dashboard** → **Start a post** → add a caption (try **bold/italic**), attach a photo or a document → Post; it appears in your feed.
2. Open the **Discover** tab to see everyone's posts → **Like**, **Comment**, and **Repost** one.
3. Use the **search bar** to find a person → open their profile → **Follow** and **Message** them.
4. **Share** a post → **Send in a message** (it lands in their inbox as a card) or **Copy link** (`/post/[id]`).
5. Click your name at the bottom of the sidebar → your **public profile** → **Edit profile** (headline, bio, photo).
6. Switch to the **Following** tab — posts from people you now follow show up live.

> Tip: run the optional seed scripts (see Database Setup → 1b) first so the feed already has content to scroll.

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
