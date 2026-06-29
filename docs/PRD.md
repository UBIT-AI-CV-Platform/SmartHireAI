# SmartHire AI — Product Requirements Document (PRD)

**Project type:** Final Year Project (FYP) — Bachelor's in Computer Science
**Institution:** University of Karachi — **UBIT** (Department of Computer Science)
**Contributors:** Shanza Iftikhar · Zayyam Siddiqui · Sufiyan Khan
**Repository:** https://github.com/UBIT-AI-CV-Platform/SmartHireAI
**Document type:** Software Requirements / Product Requirements Specification

---

## Document Control

| Version | Author(s) | Summary of Changes |
|---|---|---|
| 1.0 | Shanza Iftikhar, Zayyam Siddiqui, Sufiyan Khan | Initial comprehensive PRD covering the full SmartHire AI platform |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction](#2-introduction)
3. [Objectives](#3-objectives)
4. [Scope](#4-scope)
5. [Stakeholders & User Personas](#5-stakeholders--user-personas)
6. [Product Overview](#6-product-overview)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Detailed Functional Specification](#8-detailed-functional-specification)
9. [User Stories & Use Cases](#9-user-stories--use-cases)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [System Architecture](#11-system-architecture)
12. [Data Model](#12-data-model)
13. [AI Integration](#13-ai-integration)
14. [External Integrations](#14-external-integrations)
15. [UX & Design System](#15-ux--design-system)
16. [Success Metrics & KPIs](#16-success-metrics--kpis)
17. [Assumptions & Constraints](#17-assumptions--constraints)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Testing & Validation](#19-testing--validation)
20. [Deployment & Environments](#20-deployment--environments)
21. [DevOps, CI/CD & Quality Engineering](#21-devops-cicd--quality-engineering)
22. [Future Work & Roadmap](#22-future-work--roadmap)
23. [Project Team & Methodology](#23-project-team--methodology)
24. [Requirements Traceability Matrix](#24-requirements-traceability-matrix)
25. [Glossary](#25-glossary)

---

## 1. Executive Summary

**SmartHire AI** is an AI-powered, full-stack recruitment platform combined with a LinkedIn-style professional network. It unifies the entire hiring lifecycle — profile building, AI-assisted CV and cover-letter generation, job discovery and applications, AI applicant screening, interview scheduling, in-browser video interviews, and real-time messaging — and layers a professional social network on top, where candidates and recruiters maintain public profiles, post to a shared feed, follow one another, and interact through likes, comments, reposts, and shares.

The platform serves **two roles** from a single product: **Candidates** (job seekers) and **Recruiters** (hiring managers / companies). It uses **Google Gemini** for all AI features and **Supabase** (PostgreSQL, Auth, Storage, Realtime, Row-Level Security) for the backend. Real-time messaging and notifications are delivered over Supabase Realtime, and video interviews run peer-to-peer over **WebRTC**.

The product is built **Pakistan-first** — targeting university students, fresh graduates, and local recruiters — with an architecture designed to scale globally. This document is the single source of truth for the product's purpose, scope, complete functional and non-functional requirements, architecture, data model, and success criteria, capturing every major feature and its sub-features.

---

## 2. Introduction

### 2.1 Purpose of this Document
This PRD defines the complete set of requirements for SmartHire AI down to individual sub-features. It serves as the reference for design, implementation, testing, and evaluation, and is intended for the development team, the examination committee, and any future maintainers.

### 2.2 Background & Motivation
Job seeking and hiring in Pakistan (and much of South Asia) are fragmented and inefficient:

- **Candidates** struggle to produce ATS-friendly CVs, lack structured interview preparation, apply through scattered low-feedback channels, and have limited professional visibility.
- **Recruiters** are overwhelmed by unstructured applications, spend disproportionate time screening, and lack integrated tooling for ranking, scheduling, and outreach.
- **Professional networking** (the LinkedIn model) is dominated by global platforms not tailored to local students/fresh graduates, and is disconnected from the actual application and hiring workflow.

SmartHire AI addresses these gaps by combining **AI assistance**, an **end-to-end ATS**, and a **professional social network** in one product, so that discovery, branding, application, screening, interviewing, and hiring all happen in a single place.

### 2.3 Problem Statement
> Job seekers and recruiters lack a single, intelligent platform that connects professional networking with the end-to-end hiring process. Candidates need help creating competitive CVs and preparing for interviews; recruiters need efficient AI tools to screen and engage talent; and both need a transparent, social way to discover, connect with, and communicate with each other.

### 2.4 Proposed Solution
A responsive web application with two role-based portals over one secure backend, providing: AI document tooling (CV / cover letter with ATS scoring), a complete ATS (jobs, applications, pipeline, interviews, offers), AI hiring tools (ranking, interview kits, copilot, outreach), in-browser WebRTC video interviews, a professional social network (profiles, feed, follows, posts, sharing, moderation), and a unified real-time inbox for messaging any user.

### 2.5 Intended Audience
- **Development team / maintainers** — implementation reference.
- **Examination committee** — evaluation against objectives and scope.
- **Future contributors** — onboarding and extension.

---

## 3. Objectives

The project objectives are stated as SMART goals:

| # | Objective |
|---|---|
| O1 | Build a role-based web platform supporting Candidate and Recruiter portals over a single secure backend. |
| O2 | Integrate generative AI (Google Gemini) to produce ATS-optimized CVs and cover letters with an explainable score, category breakdown, and suggestions. |
| O3 | Implement an end-to-end ATS: job posting, one-click application with a CV snapshot, applicant pipeline, interview scheduling, and the full offer lifecycle. |
| O4 | Provide AI hiring tools for recruiters: applicant ranking, interview-kit generation, a conversational copilot, and outreach email drafting. |
| O5 | Enable in-browser, peer-to-peer video interviews using WebRTC with real-time signalling. |
| O6 | Deliver a LinkedIn-style social layer: public profiles, a shared feed, follows, posts with media, likes/comments/reposts/shares, search, trending, and lightweight moderation. |
| O7 | Provide a single real-time inbox enabling messaging between any two users, with hiring actions embedded in recruiter↔candidate threads. |
| O8 | Enforce data security and privacy via PostgreSQL Row-Level Security so each user can only access data they are authorized to see. |
| O9 | Deliver a responsive, accessible, theme-aware (light/dark) user experience across devices. |

---

## 4. Scope

### 4.1 In Scope
- Email/password authentication with email OTP verification, Google OAuth with role selection, and password reset.
- **Candidate portal:** dashboard (social feed + overview), profile builder, AI CV + cover-letter generator, jobs & applications (internal + aggregated external listings), AI interview coach, notifications, and settings.
- **Recruiter portal:** dashboard (social feed + hiring overview), job management, applicant pipeline (list + Kanban), AI screening (rank + interview kit + copilot), analytics, company profile, notifications, and settings.
- **Interview lifecycle** (schedule → accept → complete → offer → accept/reject) with an in-browser WebRTC video room.
- **Unified, real-time inbox** (message anyone) with hiring actions embedded in recruiter↔candidate threads, plus an Interviews tab.
- **Social network:** public profiles, feed (text/image/document posts), like, comment, repost, share (copy link + send to inbox), follow/followers, people search, who-to-follow, trending, and reporting/moderation.
- **Notifications** across all of the above, with real-time delivery.
- Light/dark theming, responsive layouts, branded transactional emails.

### 4.2 Out of Scope (this version)
- Native mobile apps (the product is a responsive web app / PWA-ready).
- Real payments, subscriptions, or billing.
- Direct submission of applications to external job boards (external listings link out).
- Group / multi-party chat (messaging is strictly 1:1).
- Recorded interviews, call transcription, or AI scoring of live video.
- In-app admin/moderation dashboard (reports are stored for service-role review).
- Phone / SMS verification.

### 4.3 Scope Dependencies
External job aggregation depends on a third-party API (Jooble); without a key a demo dataset is shown. Email delivery depends on SMTP configuration; without it, in-app actions still succeed (emails are best-effort). WebRTC uses STUN only (no TURN), so symmetric-NAT networks may fail to connect peer-to-peer; an external meeting link is available as a fallback.

---

## 5. Stakeholders & User Personas

### 5.1 Stakeholders
- **Primary users:** Candidates (job seekers) and Recruiters (hiring managers / companies).
- **Evaluators:** University examination committee.
- **Maintainers:** The student development team (Shanza, Zayyam, Sufiyan).
- **Third parties:** Supabase, Google (Gemini, OAuth), email/SMTP provider, Jooble.

### 5.2 Personas

**Persona A — "Ayesha", Final-year CS student (Candidate)**
- Goals: build a strong CV, find relevant entry-level jobs, prepare for interviews, be discovered.
- Frustrations: doesn't know what recruiters want; generic CVs; no feedback; low visibility.
- Needs: AI CV help, ATS score, job matching, mock interviews, a discoverable public profile.

**Persona B — "Bilal", Technical recruiter at a software house (Recruiter)**
- Goals: fill roles fast, find quality candidates, reduce screening time.
- Frustrations: too many unstructured CVs; slow shortlisting; scattered communication.
- Needs: AI ranking, structured interview kits, a clear pipeline, integrated scheduling and messaging.

**Persona C — "Sana", Fresh graduate building a personal brand (Candidate + Social)**
- Goals: share projects/achievements, grow a network, get noticed by recruiters.
- Needs: a public profile, a feed to post to, follows, and recruiter visibility.

**Persona D — "Hina", In-house HR at a startup (Recruiter + Brand)**
- Goals: build employer brand, post company updates, attract applicants.
- Needs: a company profile, the ability to post to the feed, and a talent pool to engage.

---

## 6. Product Overview

### 6.1 Vision
> To be the single platform where a professional's journey — building a profile, growing a network, finding opportunities, and getting hired — happens end to end, made smarter by AI.

### 6.2 Value Propositions
- **For candidates:** AI that levels the playing field (CV, ATS score, interview prep) + a public profile and feed for visibility + frictionless applications.
- **For recruiters:** AI that cuts screening time + a complete pipeline + native scheduling, video, and messaging + a talent pool to discover and engage.
- **For both:** one transparent, social, real-time environment instead of many disconnected tools.

### 6.3 High-Level Feature Map
- **Identity & Profiles:** authentication, role selection, profile builder, public profiles.
- **AI Documents:** CV generator, cover letters, ATS scoring.
- **Jobs & Applications:** browse/search, save, apply (CV snapshot), track, external listings.
- **AI Hiring:** applicant ranking, interview kits, copilot, outreach.
- **Interviews:** scheduling, lifecycle, WebRTC video room.
- **Social:** feed, posts, likes, comments, reposts, shares, follows, search, trending, moderation.
- **Communication:** unified real-time inbox, notifications, transactional emails.

---

## 7. User Roles & Permissions

| Capability | Candidate | Recruiter |
|---|---|---|
| Build personal profile (skills, education, projects…) | ✅ | — (uses Company Profile instead) |
| Maintain a company profile | — | ✅ |
| Generate AI CV / cover letter | ✅ | — |
| Browse & apply to jobs | ✅ | — |
| Post jobs & manage applicants | — | ✅ |
| AI applicant screening / interview kits / copilot | — | ✅ |
| Schedule interviews & make offers | — | ✅ |
| Accept/decline interviews & offers | ✅ | — |
| Join WebRTC interview room | ✅ | ✅ |
| Post to feed, like, comment, repost, share | ✅ | ✅ |
| Follow / be followed, public profile | ✅ | ✅ |
| Message anyone (unified inbox) | ✅ | ✅ |
| Report posts / comments / profiles | ✅ | ✅ |

**Role rules:** one email maps to exactly one role; the role is chosen at signup (or after Google OAuth via a role-selection step); portal access is gated and wrong-role access is redirected to the user's own portal.

---

## 8. Detailed Functional Specification

> This section enumerates every feature with its sub-features. Requirement IDs (e.g. **FR-AUTH-1**) are summarized in the [Requirements Traceability Matrix](#24-requirements-traceability-matrix). Priorities: **M** = Must, **S** = Should, **C** = Could.

### 8.1 Authentication & Account Management

**8.1.1 Sign Up (Email/Password)** — *M*
- Two-tab auth screen (Login / Sign up) with entrance animations.
- Fields: full name, email, password, and a **role selector** (Candidate / Recruiter).
- Client-side validation: email format, password strength/length, required fields.
- On submit, the chosen role and full name are passed as user metadata.

**8.1.2 Email OTP Verification** — *M*
- After sign up, a **6-digit OTP** is emailed (branded "Confirm signup" template).
- A second step renders a 6-input OTP field; the code is verified before the account is activated.
- Resend/again handling and error feedback.

**8.1.3 Login** — *M*
- Email + password sign in.
- Already-logged-in users hitting the auth page are redirected to their portal.
- Friendly error messages for invalid credentials.

**8.1.4 Google OAuth** — *S*
- One-click Google sign-in (styled white/compact button).
- First-time OAuth users land on a **role-selection page** (Candidate / Recruiter) before entering a portal.

**8.1.5 Forgot / Reset Password** — *M*
- "Forgot password" requests a reset email (branded "Reset password" template).
- The reset link opens a set-new-password form (exchange code → update password).

**8.1.6 Role Model & Portal Gating** — *M*
- One email = one role permanently (cannot switch without deleting the account).
- A `role_selected` flag distinguishes email signups (role chosen) from fresh OAuth users (must choose).
- Defense-in-depth portal gating: a server-side role check in the Next.js middleware (`proxy.ts` → `lib/supabase/middleware.ts`) evaluates the authenticated user's role on every request and redirects before the wrong portal renders; the portal layout applies an additional client-side check as a fallback. Unselected users are routed to role-selection at both layers.

**8.1.7 Session & Route Protection** — *M*
- Session refresh via middleware on every request.
- Protected route prefixes: `/candidate`, `/recruiter`, `/interview`, `/u`, `/post` — signed-out users are redirected to the auth page.
- Authenticated users are additionally restricted to their role-scoped portal: a server-side role check in middleware redirects cross-role access to `/candidate` or `/recruiter` to the user's correct portal. The routes `/interview`, `/u`, and `/post` remain shared across both roles.

**8.1.8 Sign Out** — *M*
- Sign-out from the sidebar with a confirmation modal; clears the session and returns to landing.

---

### 8.2 Candidate — Dashboard (Feed + Overview)

The candidate home page (`/candidate`) merges the social feed and the personal overview into one screen, split into a left feed (~60%) and a right detail rail (~40%).

**8.2.1 People Search Bar** — *S*
- Top-of-page search input with a **live results dropdown**.
- Matches by full name, `@handle`, or company; results link to the person's profile.

**8.2.2 Post Composer** — *M*
- A compact "Start a post" trigger bar (avatar + prompt + Post button) that opens a **composer popup**.
- Popup supports: **rich text** caption with a **Bold / Italic** toolbar (wraps the selected text in markdown), **one image** attachment (≤5 MB, preview + remove), and **one document** attachment (PDF/DOC/DOCX/PPT/PPTX/XLS/XLSX/TXT/CSV, ≤15 MB, name chip + remove).
- Validations and posting state; on publish, the new post is prepended to the feed.

**8.2.3 Feed** — *M*
- **Tabs:** **Following** (posts from people you follow + yourself), **Discover** (the whole community), **Trending** (most-liked/commented posts from the last 30 days).
- Cursor-based **"Load more"** pagination.
- Live refresh of the Following feed when the follow graph changes (no manual reload).
- Empty/loading/error states per tab.

**8.2.4 Right Rail — Profile Mini-Card** — *S*
- Photo, time-based greeting ("Good morning/afternoon/evening, [first name]"), headline, follower/following counts.
- **View profile** button (opens the public profile inside the portal shell) and **Edit** button.

**8.2.5 Right Rail — Stat Cards** — *S*
- Applications, Interviews, Offers, Saved jobs — each links to the relevant page.

**8.2.6 Right Rail — Other Widgets** — *S*
- **Upcoming interviews** shortcut.
- **Profile completeness** checklist + progress bar (photo, summary, target role, skills, education, first CV).
- **Recommended jobs** — top skill-matched open roles with match %.
- **Quick actions** — Generate CV, Find Jobs, AI Coach, Build Profile.
- **Who to follow** — suggested users not yet followed (with inline Follow).

---

### 8.3 Candidate — Build Profile

A complete, multi-section profile builder that feeds every AI feature.

**8.3.1 Personal Info** — *M*
- Profile photo upload with an **in-browser square-crop modal** (PNG/JPG, ≤5 MB, remove option); photo also appears in the topbar and sidebar.
- Fields: full name, desired role, location, date of birth, phone, email.
- **Social links:** LinkedIn, GitHub, Discord — each with a username field and a separate verified URL field.

**8.3.2 Professional Summary** — *M*
- Free-text career bio used by the AI CV generator, the coach, and the public profile.

**8.3.3 Skills** — *M*
- Inline chip editor: add, edit, delete; duplicate prevention; Enter-to-save; auto-focus on new entry.
- Skills drive CV generation, job matching, and coach context.

**8.3.4 Languages** — *M*
- Language name + proficiency (Native / Fluent / Professional / Intermediate / Elementary); duplicate prevention.

**8.3.5 Card Sections (Education, Certifications, Courses, Awards, Projects)** — *M*
- Each is a card list with **Add / Edit / Delete** per entry via a reusable config-driven component.
- Education: degree, institute, start year, end year.
- Certifications: name, issuer, issue date.
- Courses: name, provider, completion date.
- Awards: name, issuer, award date.
- Projects: name, description, optional link (opens in a new tab).

**8.3.6 Custom Sections** — *S*
- User-defined section with a heading and bullet items; flows into the CV and the public profile.

**8.3.7 Validation & Save States** — *M*
- Email format, phone (7–20 chars, allows `+`, spaces, dashes), URLs must start with `http(s)://`, DOB not in the future.
- Top "Save Profile" persists basic info + summary; every section item saves/updates/deletes immediately with "Saving… → Saved!" feedback.

---

### 8.4 Candidate — AI CV & Cover Letter Generator

The flagship feature — generates a complete, professional CV from the profile using Google Gemini.

**8.4.1 Generation Controls** — *M*
- Target role (defaults to the profile's desired role).
- **Tone** selector: Professional, Concise, Detailed, Creative, Technical, Academic.
- **Custom instructions** textarea (≤1,000 chars), e.g. "Emphasise my open-source work".
- **Job description** textarea (≤4,000 chars) for targeted ATS matching.

**8.4.2 CV Customization** — *S*
- **Templates:** Modern, Classic, Minimal.
- **Layout:** Single column or Two column.
- **Font:** Sans, Serif, Mono.
- **Accent colour:** Indigo, Emerald, Rose, Amber, Sky, Slate.
- **Profile photo:** include/exclude toggle.
- **Section visibility toggles:** Summary, Experience, Education, Skills, Certifications, Courses, Awards.

**8.4.3 CV Preview** — *M*
- Real-time styled preview reflecting template, layout, font, and colour.
- Header: name, coloured title, email, phone, location, LinkedIn/GitHub/Discord.
- Experience (derived from projects), Education, colour-coded Skill chips, and all other sections with icons.
- Custom sections render under their user-defined headings; empty dates are hidden.

**8.4.4 ATS Intelligence** — *M*
- ATS score (0–100) with progress bar and tier label.
- **Category breakdown** (e.g. Keyword Match, Impact & Metrics, Completeness, Clarity & Formatting, Role Relevance) each with a score + note.
- **Missing keywords** — terms from the pasted JD absent from the CV (amber).
- **Top suggestions** — numbered, personalized, self-contained improvement tips.

**8.4.5 Document Actions** — *M*
- **Inline editing** — click any preview field to edit directly; edits persist to the saved CV.
- **PDF export** (print-to-PDF) and **Word export** (`.docx`).
- **AI Cover Letter** — modal with a company input; generates a tailored letter with re-draft, manual edit, copy, download, and favourite.

**8.4.6 Documents Library ("My Documents")** — *S*
- Tabs: **CVs** / **Cover Letters** (with counts) and a **Favourites** filter.
- CV cards: target role, date, ATS score, favourite toggle, rename, delete.
- Cover-letter cards: role · company, content preview, date, favourite, delete.
- **Quick-view popup** for any document with open/edit/copy/download.
- Latest CV auto-restores on mount.

---

### 8.5 Candidate — Jobs & Applications

A LinkedIn/Glassdoor-style job discovery and application tracker with four tabs and a persistent sidebar.

**8.5.1 Browse Jobs — Filters** — *M*
- Search by title, company, or skill; location text filter.
- **Sort:** Best match, Newest, Oldest, Salary high→low, Salary low→high, Title A→Z, Title Z→A.
- **Minimum salary** slider; **Remote only** toggle; **popular skill chips** (click to filter); clear-filters.

**8.5.2 Job Cards** — *M*
- Company logo/initial, title, company, location, short description.
- **"New" badge** (posted within 7 days), Remote badge, salary, first 4 skills (matched highlighted, missing greyed) with "+X more".
- **Match %** (green ≥75, amber ≥40, slate below), "X/Y skills matched", save/bookmark toggle, posted time.
- Apply button with loading state, or an Applied indicator; applied jobs are hidden from Browse.

**8.5.3 Job Detail Modal** — *M*
- Company, title, status (Open/Closed/New), posted time; save + share (copies a blurb).
- Remote/location/salary pills; full skills-match bar (matched vs missing); full description.
- Apply & choose CV, or "Already applied" state.

**8.5.4 Apply Flow** — *M*
- **CV-picker modal** listing all generated CVs (target role, date, ATS score) with a View-preview option.
- On send, an application is created with a **CV snapshot** and a computed match score, routed through a server endpoint that also sends a **branded confirmation email** (best-effort).
- "Need a CV first" prompt linking to the CV Generator if none exist.

**8.5.5 Saved Jobs Tab** — *S*
- All bookmarked jobs in card format with one-click apply.

**8.5.6 My Applications Tab** — *M*
- Application cards: company, title, location, "Applied X ago", match score, status badge (Applied/Screening/Interview/Offer/Rejected), View job, Withdraw.

**8.5.7 Web Jobs Tab (External)** — *C*
- Aggregated listings (Jooble → Adzuna → demo fallback) tagged by source (LinkedIn/Indeed/Glassdoor).
- Source-filter chips derived from actual results; **Load more**; Apply opens the original posting in a new tab.

**8.5.8 Sidebar Widgets** — *S*
- Your Job Hunt (open/saved/applied/avg match); Top Matches (3); Skills in Demand (clickable); Boost-profile tip.

**8.5.9 Pagination** — *S*
- Reusable windowed pagination (15/page) across Browse, Saved, My Applications, and Web Jobs.

---

### 8.6 Candidate — AI Interview Coach

A conversational AI coach for interview preparation.

**8.6.1 Session Management** — *S*
- New session button; history sidebar with auto-labelled titles, delete per session, click to restore.

**8.6.2 Configuration** — *M*
- **Job focus** — select an applied job (Job · Company) or type a custom role.
- **Difficulty** — Easy / Medium / Hard.
- **Mode** — Chat (open) or Mock (structured mock interview).

**8.6.3 Chat Experience** — *M*
- Streaming responses with live typing animation; markdown rendering.
- Copy and Regenerate on hover; follow-up quick buttons (Sample answer, Make it harder, Next question, Why this matters).
- Voice input via browser speech recognition; Shift+Enter newline, Enter to send; Stop button.

**8.6.4 Starter Prompts & Save** — *S*
- Empty-state starter chips; "End session & save" persists the conversation with a generated title.

---

### 8.7 Candidate — Notifications
- See [§8.23 Notifications System](#823-notifications-system) (shared across both portals).

### 8.8 Candidate — Settings — *M*
- Account: email (read-only), account type (read-only), editable full name with save/feedback.
- Change password (new + confirm, min length, visibility toggle, feedback).
- Sign out.

---

### 8.9 Recruiter — Dashboard (Feed + Overview)

The recruiter home page (`/recruiter`) mirrors the candidate dashboard: a left social feed (~60%) and a right hiring rail (~40%).

**8.9.1 Feed (left)** — *M*
- People search bar, post composer (company updates / hiring posts / media), and Following/Discover/Trending tabs.

**8.9.2 Hiring Rail (right)** — *S*
- **Profile mini-card** (photo, greeting, company, follower/following, View profile + Edit).
- **Hiring stats** — Open jobs, Applicants, Interviews.
- **Recent applicants** — latest candidates with the job they applied to.
- **Quick actions** — Post a job, Applicants, AI tools, Analytics.
- **Who to follow**.
- Deeper hiring tools live on the dedicated Jobs, Applicants, and Analytics pages.

---

### 8.10 Recruiter — Jobs Management

**8.10.1 Posting a Job** — *M*
- Fields: title (required), company (required), location, salary (free text), required skills (comma-separated), deadline date, description.
- **"Write with AI"** drafts a professional description from title/company/skills.

**8.10.2 Job List** — *M*
- Tabs: **Active** (open + closed but not expired) and **Old / Expired** (past-deadline).
- Job cards: company avatar, title, status badges (Open/Closed, Expired, "Closes in Nd"), company/location/salary, first 6 skills, applicant count.

**8.10.3 Job Actions** — *S*
- Close/Reopen toggle, Edit, Delete (with confirmation), **Repost** (reactivate expired with a new deadline).
- Click-title detail modal (salary pill, applicant count, skills, full description).

**8.10.4 Sidebar Widgets** — *S*
- At-a-glance (active/expired/applicants), AI Screening CTA, posting tips.

---

### 8.11 Recruiter — Applicants & Pipeline

**8.11.1 Views** — *M*
- **List view** (detailed cards) and **Board view (Kanban)** with drag-and-drop columns: Applied, Screening, Interview, Offer, Rejected.

**8.11.2 Filters & Sort (List)** — *S*
- Search (name/email/job), filter by job, filter by status, sort (Newest / Oldest / Best Match / Top Rated).

**8.11.3 Applicant Cards** — *M*
- Avatar, name, email, applied job, time ago, match score.
- **5-star rating**, **status pipeline** buttons (Applied → Screening → Interview → Offer → Rejected).
- **View CV** (exact submitted snapshot), **Draft Email** (AI outreach), **Notes** (inline expandable, save/cancel).

**8.11.4 Kanban Board** — *M*
- 5 columns with per-column counts; drag-and-drop to update status; cards show avatar/name/job/match + View CV; drop zones highlight.

**8.11.5 AI Outreach Email Modal** — *S*
- Candidate name/email; email type (Interview Invite / Rejection / Offer); **Draft with AI**; editable body; copy; send; feedback.

**8.11.6 Sidebar** — *S*
- Total applicants, top-rated count, average match score; pipeline breakdown with clickable status filters.

---

### 8.12 Recruiter — AI Screening (AI Tools)

Two tabs: **Screening** and **Copilot**, with a job selector.

**8.12.1 Rank Applicants** — *M*
- Sends all applicant CV snapshots + the job to Gemini for simultaneous analysis.
- **Overall summary** of the applicant pool.
- **Ranked cards** (best→worst): rank, avatar, name; **recommendation** (Shortlist/Maybe/Pass); one-line verdict; **fit score 0–100** with bar; **strengths** (green); **concerns** (amber); View CV.

**8.12.2 Interview Kit** — *S*
- Categorized questions (Technical / Behavioural / Cultural Fit…), each with **"look for"** guidance; **red flags**; **closing tip**; **Copy Kit**.

**8.12.3 Recruiter Copilot** — *S*
- Embedded conversational assistant (streaming, markdown) with starter prompts (write a JD, draft an interview-invite email, give questions, what to look for).

---

### 8.13 Recruiter — Analytics — *S*
- **Stat cards:** active jobs, total applicants, average match score, offer/hire rate.
- **Applications over time** — 14-day bar chart.
- **Hiring funnel** — Applied → Screening → Interview → Offer with conversion %.
- **Match-quality distribution** — buckets 0–40 / 40–60 / 60–75 / 75–100.
- **Top jobs by applicants** — horizontal bar chart (up to 6).

---

### 8.14 Recruiter — Company Profile — *M*
- **Logo upload** with crop modal (≤5 MB) stored in Supabase Storage.
- Fields: company name (required), recruiter name, website (valid URL), industry, location, company size (1–10 / 11–50 / 51–200 / 201–500 / 500+), about.
- **Live candidate-view preview** card showing how the company appears to job seekers.
- Company details surface as the **Company card** on the recruiter's public profile.

### 8.15 Recruiter — Settings — *M*
- Same as candidate settings: editable name, change password, sign out; email/role read-only.

---

### 8.16 Interviews & Lifecycle

**8.16.1 Scheduling** — *M*
- From a candidate's chat thread, **Schedule interview** opens a modal: date + time (required), duration (15/30/45/60 min), optional meeting link, optional notes. Reschedule reuses the same modal.

**8.16.2 Status Pipeline** — *M*

| Stage | Meaning / Available Action |
|---|---|
| Proposed | Awaiting candidate accept/decline; recruiter can reschedule/cancel/join |
| Accepted | Confirmed; both can Join Room; recruiter can mark completed / make offer / reject |
| Declined | Candidate declined the invite |
| Completed | Interview done; recruiter can make offer or reject |
| Offer | Offer sent; candidate accepts/declines |
| Offer Accepted | Hired 🎉 |
| Offer Declined | Candidate declined the offer |
| Rejected | Not selected after interview |
| Cancelled | Cancelled by recruiter |

**8.16.3 Candidate Actions** — *M*
- Accept / decline an interview; Join Room (internal) or Join Meeting (external link); accept/decline an offer.

**8.16.4 Sync & Reminders** — *M*
- Interview stage changes sync the application status and notify the other party.
- One-time "upcoming interview" reminders to both parties for accepted interviews within 24 hours.

**8.16.5 Interviews in the Inbox** — *S*
- Interviews are surfaced as an **Interviews tab** inside the Inbox; selecting one opens the backing chat thread where a live interview card carries the actions. The old standalone interview pages redirect here.

---

### 8.17 WebRTC Video Interview Room — *M*
- Full-screen, dark-themed room with remote + local video tiles.
- **Live media** via `getUserMedia`; **RTCPeerConnection** with Google STUN; **Supabase Realtime broadcast** signalling (no separate server).
- **Connection status bar** — "Connected · MM:SS" timer, "Connecting…", or "Waiting for [name]…".
- **Tiles** — participant name, role tag (You / Interviewer / Candidate), colour avatar when camera is off, mic-muted indicator.
- **Controls** — microphone toggle, camera toggle, Leave call.
- **Error handling** — graceful banner if camera/mic is denied; audio-only still works; self-view mirrored.

---

### 8.18 Unified Inbox & Messaging

One real-time inbox for **all** conversations — hiring threads and social DMs.

**8.18.1 Conversation List & Tabs** — *M*
- **Messages** and **Interviews** tabs.
- List rows: other person's **photo + name** (avatar links to their profile), last-message preview, unread badge, relative time.

**8.18.2 Message Anyone** — *M*
- **New message** search finds any user; start a DM from a profile's **Message** button or by sharing a post.
- Conversations are unified — a social DM and a hiring thread for the same pair map to one conversation.

**8.18.3 Thread View** — *M*
- Sent/received bubbles, timestamps, auto-scroll; the header avatar/name link to the other person's profile.
- **Shared-post cards** render inline and link to the post.

**8.18.4 Hiring Actions (recruiter↔candidate threads only)** — *M*
- Quick-actions: Schedule interview / Send offer / Reject; live **interview cards** with stage-aware buttons; concise system lines on each transition. Social DMs stay clean.

**8.18.5 Real-time & Deep-linking** — *M*
- Instant delivery + read sync via Supabase Realtime; deep-links `?c=<conversationId>` and `?tab=interviews`.

**8.18.6 Email Notifications** — *C*
- Best-effort branded emails for new message / interview / offer / rejection events.

---

### 8.19 Social — Public Profiles

Every user has an auto-generated `@username` and a public profile at `/u/<handle>`, rendered **inside the portal shell** (sidebar + topbar); a standalone shareable version also exists.

**8.19.1 Profile Header** — *M*
- Clean header (no cover image): photo, name, role badge, headline, `@handle`, location, company (recruiters), **follower/following** counts (open list modals), and a bio.
- Action buttons: **Follow / Unfollow**, **Message**, **Copy link**, **Report** (and **Edit profile** on your own).

**8.19.2 60/40 Layout** — *M*
- Left (~60%): the user's **posts**.
- Right (~40%): **details** — candidates show profile sections (skills, languages, projects, education, certifications, courses, awards, custom sections); **recruiters show a Company card** (name, industry, size, website, about), since recruiters manage company info rather than personal sections.

**8.19.3 Edit In Place (own profile)** — *S*
- Modal to edit name, headline, location, bio, and photo without leaving the page.

**8.19.4 Reachability** — *S*
- Profiles are reachable from search, the feed, "Who to follow", post authors, inbox avatars, and the sidebar user card.

---

### 8.20 Social — Feed & Posts

**8.20.1 Create Post** — *M*
- Caption with **bold/italic** (markdown), one image, and/or one document; see [§8.2.2](#82-candidate--dashboard-feed--overview).

**8.20.2 Post Rendering** — *M*
- Markdown caption (bold/italic/links/lists); image; **document chip** (download/open); reposts embed the original inline; relative timestamps; role badge.

**8.20.3 Like** — *M*
- Optimistic toggle with a maroon-red gradient heart; like count.

**8.20.4 Comment** — *M*
- Expandable thread; add comments (Enter to send); delete own comments (post author may delete any comment on their post); comment count.

**8.20.5 Repost** — *S*
- Repost with an optional quote; reposting a repost targets the original; the original author is notified.

**8.20.6 Share** — *S*
- Share menu: **Copy link** (permalink `/post/<id>`) or **Send in a message** (search a recipient → lands as a shared-post card in their inbox, with an optional note).

**8.20.7 Manage Own Post** — *M*
- **Edit** (bold/italic toolbar) and **Delete** via the post's ⋯ menu.

**8.20.8 Permalink Page** — *S*
- A standalone single-post page (`/post/<id>`) for sharing, with the post and its comments expanded.

---

### 8.21 Social — Follow Graph & Discovery

**8.21.1 Follow / Unfollow** — *M*
- Follow any user; followers/following are public and open in a list modal; a **new-follower** notification is sent.

**8.21.2 People Search** — *S*
- Search by name / handle / company from the dashboard with a live dropdown.

**8.21.3 Who to Follow** — *S*
- Suggested users (excludes those already followed), shown on the dashboard.

**8.21.4 Trending** — *S*
- A feed tab surfacing the most-engaged posts (likes + comments) of the last 30 days.

---

### 8.22 Social — Moderation

**8.22.1 Report** — *S*
- Report a **post**, **comment**, or **profile** with a reason (Spam / Harassment / Inappropriate / Misinformation / Scam / Other) and optional details.
- One report per target per user (re-reporting is a friendly no-op); reports are stored for service-role review.

**8.22.2 Hide Post** — *C*
- Locally hide a post from your own feed.

**8.22.3 Visibility Model** — *M*
- Logged-in-only visibility; logged-out visitors are redirected to sign in. Private fields (email/phone/DOB) are never exposed.

---

### 8.23 Notifications System

**8.23.1 Types** — *M*
- applied, status update, interview, offer, **message**, **new follower**, **like**, **comment**, **repost** — each with a distinct icon/colour.

**8.23.2 Generation** — *M*
- Created by database triggers on the relevant events (apply, status change, interview lifecycle, new chat message, follow, like, comment, repost); de-duplicated where multiple triggers could overlap.

**8.23.3 Bell & Page** — *M*
- Topbar **bell** with a real-time unread badge; a full notifications page with All/Unread/Read filters, mark-one/mark-all read, delete, and click-to-navigate.

### 8.24 Transactional Emails — *C*
- Branded emails for: signup OTP, password reset, application confirmation, and inbox events (new message / interview / offer / rejection). All inbox/application emails are best-effort and never block the in-app action.

---

## 9. User Stories & Use Cases

- **US-1:** *As a candidate,* I want AI to generate an ATS-optimized CV from my profile so I can apply with a competitive document.
- **US-2:** *As a candidate,* I want to see how well I match a job so I apply to the most relevant roles.
- **US-3:** *As a candidate,* I want to practice with an AI coach so I'm prepared for interviews.
- **US-4:** *As a recruiter,* I want AI to rank applicants so I can shortlist faster.
- **US-5:** *As a recruiter,* I want to schedule and conduct interviews in-app so I don't need external tools.
- **US-6:** *As any user,* I want a public profile and a feed so I can build my brand and be discovered.
- **US-7:** *As any user,* I want to follow people and see their posts so I stay connected to my network.
- **US-8:** *As any user,* I want to message anyone in one inbox so all my conversations live in one place.
- **US-9:** *As any user,* I want to share a post or job with my network via link or DM.
- **US-10:** *As any user,* I want to report inappropriate content so the platform stays professional.

**Sample use case — Apply to a job**
1. Candidate opens Browse Jobs and filters by skill/location. 2. Opens a job's detail modal and reviews the match. 3. Clicks Apply, picks a CV in the picker, sends. 4. The system snapshots the CV, computes a match score, records the application, emails a confirmation, and notifies the recruiter. 5. The candidate sees the application under My Applications with status "Applied".

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-SEC-1 | Security | All data access is governed by PostgreSQL Row-Level Security; users read/write only data they're authorized to. Writes are owner-only. |
| NFR-SEC-2 | Privacy | Sensitive fields (email, phone, DOB) are never exposed publicly; public profile data is served via a column-limited `public_profiles` view. |
| NFR-SEC-3 | Auth | Secure, HTTP-only Supabase auth cookies; protected routes enforced server-side in middleware (authentication gate for all protected prefixes; role-based authorisation gate for the `/candidate` and `/recruiter` portals), with a client-side layout guard as defense in depth. |
| NFR-SEC-4 | Secrets | API keys and SMTP credentials are server-side env vars, never shipped to the client. |
| NFR-PERF-1 | Performance | Feed, lists, and search use pagination/limits; denormalized author data avoids N+1 reads on the feed. |
| NFR-PERF-2 | Realtime | New messages and notifications appear without a manual refresh. |
| NFR-SCAL-1 | Scalability | Stateless app + managed Postgres; indexes on high-traffic foreign keys; horizontally scalable hosting. |
| NFR-USAB-1 | Usability | Consistent two-portal UX with clear empty/loading/error states. |
| NFR-RESP-1 | Responsiveness | Fully responsive (mobile/tablet/desktop); collapsible navigation. |
| NFR-A11Y-1 | Accessibility | Semantic markup, keyboard-usable controls, sufficient colour contrast in both themes. |
| NFR-THEME-1 | Theming | Persistent light/dark mode. |
| NFR-REL-1 | Reliability | Non-critical side-effects (emails) are best-effort and never block core actions. |
| NFR-MAINT-1 | Maintainability | Typed codebase (TypeScript), shared components, single consolidated DB schema with idempotent migrations. |
| NFR-COMPAT-1 | Compatibility | Modern evergreen browsers; WebRTC needs camera/mic permission and works on non-symmetric NATs (STUN). |

---

## 11. System Architecture

### 11.1 Overview
SmartHire AI is a **single Next.js (App Router) application** with role-based route groups, talking to **Supabase** for data, auth, storage, and realtime, and to **Google Gemini** for AI. Server-side **API route handlers** mediate AI calls and email sending (keys never reach the browser). **WebRTC** powers peer-to-peer video, with **Supabase Realtime** as the signalling channel.

```
                ┌─────────────────────────── Browser (React 19) ───────────────────────────┐
                │  Candidate Portal · Recruiter Portal · Public Profiles · Feed · Inbox      │
                │  (Next.js App Router, Tailwind v4, client components + realtime subscribers)│
                └───────────┬───────────────────────────────────────────┬───────────────────┘
                            │ Supabase JS (RLS-scoped)                    │ fetch()
                            ▼                                             ▼
        ┌──────────────────────────────────┐        ┌──────────────────────────────────────┐
        │ Supabase                          │        │ Next.js API Route Handlers (server)   │
        │  • PostgreSQL + RLS + triggers    │        │  • /api/generate-cv, cover-letter     │
        │  • Auth (email/OTP, OAuth)        │        │  • /api/interview-coach (stream)      │
        │  • Storage (avatars, post-media)  │        │  • /api/recruiter/* (screen/kit/...)  │
        │  • Realtime (messages, notifs)    │        │  • /api/apply, /api/inbox (email)     │
        └──────────────────────────────────┘        │  • /api/external-jobs (Jooble)        │
                            ▲                          └───────────────┬──────────────────────┘
                            │ WebRTC signalling (broadcast)            │
                            ▼                                          ▼
                   ┌──────────────────┐                   ┌───────────────────────────┐
                   │ Peer ↔ Peer RTC  │                   │ Google Gemini · SMTP · STUN│
                   └──────────────────┘                   └───────────────────────────┘
```

### 11.2 Technology Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.7 |
| Styling | Tailwind CSS v4, Material Symbols, Inter + Sora fonts |
| Backend / DB | Supabase — PostgreSQL, Row-Level Security, Auth, Storage, Realtime |
| AI | Google Gemini (`gemini-2.5-flash`, structured JSON output, streaming) |
| Video | WebRTC (browser-native P2P) + Supabase Realtime signalling + Google STUN |
| Email | Nodemailer over SMTP |
| External jobs | Jooble API (with Adzuna + demo fallback) |
| Hosting | Vercel (frontend) + Supabase (managed backend) |
| Notable libraries | `@supabase/ssr`, `react-easy-crop`, `react-to-print`, `docx`, `react-markdown`, `remark-gfm`, `date-fns` |

---

## 12. Data Model

### 12.1 Table Catalogue
| Table / View | Purpose |
|---|---|
| `profiles` | One per user: role, name, `@username`, headline, bio (summary), location, social links; company fields for recruiters |
| `skills`, `languages` | Candidate skills and languages |
| `education`, `certifications`, `courses`, `awards`, `projects`, `custom_sections` | Candidate profile sections |
| `cvs` | Generated CVs (content, ATS score, suggestions, favourite) |
| `cover_letters` | Generated cover letters |
| `interview_sessions` | AI coach chat sessions |
| `jobs` | Recruiter job postings (skills, salary, deadline, open/closed) |
| `applications` | Candidate applications (status, match score, CV snapshot, rating, notes) |
| `saved_jobs` | Bookmarked jobs |
| `interviews` | Interview lifecycle records (stage, schedule, link) |
| `conversations` | One thread per participant pair (denormalized names/emails, unread counts, `is_hiring`) |
| `messages` | Chat messages (kind: text / system / interview / offer / rejection / post) |
| `follows` | Follower graph (follower_id, following_id) |
| `posts` | Feed posts (content, image, file, like/comment counts, repost reference + snapshot) |
| `post_likes` | Post likes |
| `post_comments` | Post comments (denormalized author) |
| `reports` | Moderation reports (target type/id, reason, status) |
| `notifications` | In-app notifications |
| `public_profiles` (view) | Safe public columns + follower/following counts |

### 12.2 Key Relationships
- `auth.users (1) → (1) profiles` (created by the signup trigger).
- `profiles (1) → (N)` profile sections, CVs, cover letters, jobs (recruiter), posts.
- `jobs (1) → (N) applications`; `applications (1) → (0..N) interviews`.
- `conversations (1) → (N) messages`; a conversation links two participants.
- `follows (follower_id, following_id)` forms the social graph.
- `posts (1) → (N) post_likes`, `posts (1) → (N) post_comments`; a post may reference another via `repost_of`.

### 12.3 Security Model
- **RLS enabled** on every table; owner-only writes.
- Transactional data (applications, CVs, messages, interviews, notifications) is private to its participants.
- Social data (profiles via the public view, follows, posts, comments, likes, profile sections) is readable by any authenticated user; email/phone/DOB remain private.
- Privileged cross-user operations use **SECURITY DEFINER** functions (conversation creation, follow/notification triggers, count maintenance).

### 12.4 Storage Buckets
- **avatars** — profile + company photos (public read, owner write).
- **post-media** — feed images + documents (public read, owner write).

---

## 13. AI Integration

- **Providers:** Google Gemini (free tier) is the primary AI provider for document and screening features, invoked only from server-side route handlers. The conversational recruiter copilot is served via the Anthropic SDK (Claude), also server-side only.
- **Use cases:** CV generation (structured JSON: content, ATS score, breakdown, suggestions, missing keywords), cover letters, interview coach (streaming), applicant ranking (structured), interview kits (structured), job-description drafting, outreach email drafting — all via Gemini. Recruiter copilot (multi-turn streaming chat) — via Anthropic SDK.
- **Structured output:** JSON-schema-constrained responses for deterministic parsing.
- **Resilience:** multiple API keys with automatic rotation/fallback on quota (HTTP 429) and model fallback.
- **Privacy:** prompts are built only from the requesting user's authorized data; keys never reach the client.

---

## 14. External Integrations

| Service | Purpose | Notes |
|---|---|---|
| Supabase | DB, Auth, Storage, Realtime | Core backend |
| Google Gemini | All AI features | Server-side only |
| Google OAuth | Social sign-in | Optional |
| SMTP (e.g. Gmail) | Transactional emails | Best-effort; app works without it |
| Jooble (+ Adzuna) | External job listings | Optional; demo fallback |
| Google STUN | WebRTC NAT traversal | No TURN (P2P on non-symmetric NATs) |

---

## 15. UX & Design System

- **Typography:** Inter (body/UI) + Sora (headings).
- **Colour:** Material-Design-style tokens; brand gradient (indigo→purple); full **light/dark** support with a persistent toggle.
- **Icons:** Material Symbols Outlined.
- **Layout:** two-portal shell with a collapsible sidebar + topbar; dashboards use a 60/40 feed + detail split; consistent cards, modals, and empty/loading/error states.
- **Social patterns:** profiles and feed follow familiar social-network conventions for a low learning curve.
- **Responsiveness:** mobile-first; sidebars collapse; multi-pane views collapse to single-pane on small screens.

---

## 16. Success Metrics & KPIs

### 16.1 Academic Success Criteria
- All Must-have (M) functional requirements implemented and demonstrable.
- The end-to-end hiring cycle works (post → apply → screen → interview → offer → accept).
- The social layer works (post → like/comment/repost/share → follow → message).
- Security demonstrated via RLS (a user cannot access another's private data).
- Clean, responsive, theme-aware UI; a successful production build.

### 16.2 Product KPIs (proposed targets)
| KPI | Definition | Target |
|---|---|---|
| Activation | New candidates who complete a profile + generate a CV | ≥ 60% |
| Application conversion | Job views that lead to an application | ≥ 15% |
| Recruiter efficiency | Time to shortlist with AI ranking vs. manual | ↓ 50% |
| Time-to-hire | Avg. days from application to offer | Track & reduce |
| Social engagement | Posts/likes/comments per active user per week | Track & grow |
| Network growth | Follows per active user in the first month | Track & grow |
| Retention | 4-week returning-user rate | ≥ 30% |
| Interview completion | Accepted interviews actually conducted | ≥ 70% |

*(Targets are indicative for evaluation; replace with measured values where available.)*

---

## 17. Assumptions & Constraints

**Assumptions**
- Users have a modern browser and (for interviews) a working camera/mic.
- Third-party services (Supabase, Gemini) are available and within free-tier limits.
- A Postgres-compatible managed backend is used.

**Constraints**
- AI features depend on Gemini free-tier quota (mitigated by key rotation/model fallback).
- WebRTC uses STUN only (no TURN); symmetric-NAT users may fail to connect P2P (external link fallback).
- Email delivery requires SMTP configuration.
- Built and tested as a web application (no native mobile build).

---

## 18. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| AI quota exhaustion (429) | AI features fail | Medium | Multiple keys + rotation + model fallback; graceful errors |
| RLS misconfiguration exposes data | High | Low | Owner-only policies, public data via limited view, SECURITY DEFINER for cross-user ops, testing |
| WebRTC fails on some networks | Medium | Medium | External meeting-link fallback; document STUN/TURN limitation |
| Email not configured | Low | Medium | Emails are best-effort; in-app notifications always fire |
| Inappropriate user content | Medium | Medium | Reporting + hide-post; service-role review; logged-in-only visibility |
| Scope creep (large feature set) | Medium | Medium | Prioritized requirements (M/S/C); phased delivery |

---

## 19. Testing & Validation

- **Type safety:** the codebase compiles with zero TypeScript errors; the production build succeeds.
- **Functional testing:** manual end-to-end flows for the full hiring cycle and the social layer.
- **Security testing:** verify RLS by attempting cross-user data access; confirm private fields are not exposed via the public view.
- **AI testing:** validate structured outputs (CV score, ranking) and graceful handling of quota errors.
- **Cross-device testing:** responsive layouts and light/dark themes.
- **Acceptance:** each Must-have requirement demonstrated against its acceptance criteria.

---

## 20. Deployment & Environments

- **Frontend:** Vercel (Next.js); environment variables set in the hosting dashboard.
- **Backend:** Supabase project; schema applied via the SQL editor (consolidated `schema.sql`, or phased social SQL + optional seed scripts).
- **Configuration:** `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `GEMINI_API_KEY(S)`, SMTP settings, optional `JOOBLE_API_KEY`.
- **Auth config:** Supabase URL configuration + redirect URLs; branded email templates; optional Google OAuth.
- **Environments:** Local (dev) and Production; URLs resolved from `window.location.origin` / `NEXT_PUBLIC_APP_URL`.

---

## 21. DevOps, CI/CD & Quality Engineering

### 21.1 Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) executes a `lint-and-build` job on every push to a non-main branch and on every pull request targeting `main`. The job installs dependencies with `npm ci` (a clean, reproducible install from the lockfile), runs the Next.js production build with the required environment secrets injected from GitHub Actions secrets, and includes a package-manager guard step that fails the pipeline if a non-npm package manager (pnpm or Yarn) is detected.

### 21.2 Branch Protection & Merge Gate

The `main` branch is protected by a GitHub repository ruleset with the following requirements enforced before any merge:

- A pull request is required; direct pushes to `main` are blocked.
- The `lint-and-build` status check must pass on the PR head commit.
- The branch must be up to date with `main` before merge.
- Force-pushes and branch deletion are blocked.

This gate was validated empirically: a pull request with a deliberately introduced build failure was blocked from merging until the CI check passed.

### 21.3 Package-Manager Enforcement

Reproducibility of the dependency graph is enforced at three levels: an `only-allow npm` preinstall script rejects install commands issued with pnpm or Yarn; the `packageManager` field in `package.json` pins the exact npm version; and engine-strict configuration prevents use of an unsupported Node.js version.

### 21.4 Secrets & Security Posture

- All AI provider keys and SMTP credentials are server-side environment variables; no secret is bundled into the client.
- `.env*` files are gitignored across the repository.
- The repository history was scanned with `gitleaks` and confirmed free of committed secrets prior to the repository being made public.
- Security response headers are configured via `vercel.json`.

### 21.5 Deployment Pipeline

The application is deployed via Vercel's native Next.js build pipeline, with the `frontend/` directory configured as the project root. The `main` branch is the production branch; merges trigger an automatic production deployment. Each branch and pull request receives an automatic preview deployment, enabling pre-merge verification in an environment identical to production.

### 21.6 Quality Assurance Methodology

A claimed-versus-actual verification practice is applied throughout development: Must-have requirements are audited against the live codebase — confirming implementation at the file level, verifying zero TypeScript compiler errors (`npx tsc --noEmit`), and performing manual end-to-end checks — rather than assumed from documentation. This keeps the specification continuously aligned with the implemented system.

### 21.7 Linting

An ESLint lint stage is wired into the CI pipeline. Full ESLint rule integration is documented as deferred work, pending stabilisation of the ESLint v9-to-v10 ecosystem with Next.js config tooling. Type safety is the primary static-analysis gate, enforced by the TypeScript compiler with a zero-error build requirement.

---

## 22. Future Work & Roadmap

- Native mobile apps (iOS/Android) or full PWA.
- Subscriptions / billing for premium recruiter features.
- Group messaging and team-hiring collaboration.
- Recorded interviews + AI evaluation of video answers; TURN server for universal connectivity.
- In-app admin/moderation dashboard and content policies.
- Embeddings-based job/candidate matching and feed ranking.
- Endorsements, skill assessments, and verified badges.
- Hashtags, trending topics, and saved searches.
- Candidate-side analytics (profile views, post reach).

---

## 23. Project Team & Methodology

### 23.1 Team
| Contributor | Project |
|---|---|
| **Shanza Iftikhar** | SmartHire AI — Final Year Project |
| **Zayyam Siddiqui** | SmartHire AI — Final Year Project |
| **Sufiyan Khan** | SmartHire AI — Final Year Project |

**Institution:** University of Karachi — **UBIT** (Department of Computer Science).

### 23.2 Development Methodology
The project followed an **iterative, incremental** approach: requirements and design first, then feature modules delivered and integrated in phases, each verified by type-checking and a successful production build before moving on.

| Phase | Focus |
|---|---|
| 1 | Requirements, design, database schema, and design system |
| 2 | Authentication, candidate profile builder, AI CV + cover-letter generator |
| 3 | Jobs, applications, and the recruiter portal (jobs, applicants, AI screening, analytics, company profile) |
| 4 | Interview lifecycle, WebRTC video room, and the messaging inbox |
| 5 | Social layer — public profiles, feed, follows, posts, likes/comments/reposts/shares, and moderation |
| 6 | Merged dashboards, profile redesign, unified inbox, polish, testing, deployment, and documentation |

---

## 24. Requirements Traceability Matrix

| ID | Feature | Priority |
|---|---|---|
| FR-AUTH-1…8 | Sign up, OTP, login, Google OAuth, reset password, role gating, route protection, sign out | M / S |
| FR-PROF-1…7 | Personal info, photo crop, skills, languages, card sections, custom sections, validation/save | M / S |
| FR-CV-1…7 | CV generation, ATS scoring, customization, inline edit, PDF/Word, cover letters, library | M / S |
| FR-JOB-1…9 | Browse filters, match %, save, apply (snapshot), tracking, confirmation email, web jobs, widgets, pagination | M / S / C |
| FR-COACH-1…4 | Coach config, sessions, streaming chat, starters/save | M / S |
| FR-RJOB-1…4 | Post (AI draft), tabs, actions/repost, sidebar | M / S |
| FR-APP-1…6 | List/Kanban, filters, cards, ratings/notes, CV view, outreach | M / S |
| FR-SCR-1…3 | Rank applicants, interview kit, copilot | M / S |
| FR-ANALYTICS | Stat cards + funnel + distribution + top jobs | S |
| FR-COMPANY | Company profile (logo, fields, preview) | M |
| FR-INT-1…6 | Scheduling, lifecycle, candidate/recruiter actions, sync, reminders, inbox tab | M / S |
| FR-RTC | WebRTC room (media, signalling, controls, status, errors) | M |
| FR-MSG-1…6 | Realtime DM, message anyone, hiring actions, shared posts, profile avatars, emails | M / S / C |
| FR-SOC-1…10 | Public profiles, posts, like/comment/repost/share, feed tabs, follow, search/who-to-follow, moderation | M / S |
| FR-NOTIF-1…2 | Notification generation + bell/page | M |
| FR-SET-1…2 | Settings (name, password, sign out) | M |

---

## 25. Glossary

| Term | Meaning |
|---|---|
| ATS | Applicant Tracking System; "ATS score" = how well a CV passes automated screening |
| RLS | Row-Level Security (PostgreSQL per-row access control) |
| WebRTC | Web Real-Time Communication (browser P2P audio/video) |
| STUN | Server that helps peers discover their public address for NAT traversal |
| OTP | One-Time Password (email verification code) |
| OAuth | Open standard for delegated sign-in (used for Google login) |
| Feed | The social stream of posts |
| Repost | Re-sharing another user's post, optionally with a quote |
| Public profile | A user's `@handle` page visible to signed-in users |
| Snapshot (CV) | A copy of a CV captured at apply time so recruiters see what was submitted |
| SECURITY DEFINER | A DB function that runs with its owner's privileges (controlled cross-user operations) |
| Denormalization | Storing copied fields (e.g., author name on a post) to avoid extra reads |

---

*End of document — SmartHire AI PRD v1.0.*
