# Prompt to give Claude (to generate the final, formatted PRD)

> **How to use:** Start a new Claude chat. Paste the prompt below, then paste the **entire contents of `docs/PRD.md`** where indicated (or attach the file). Claude will return a polished, presentation-ready PRD.

---

## THE PROMPT (copy everything below this line)

You are a **senior technical product manager and documentation specialist** who writes professional, university-grade Product Requirements Documents (PRDs) for software Final Year Projects.

I will give you the **source content** of a PRD for a project called **SmartHire AI**. Your job is to transform it into a **final, polished, professional, presentation-ready PRD document** that I can submit and post publicly. Treat the source as the source of truth for *what the product does* — do not invent features that aren't there — but you may rewrite, restructure, and expand it for clarity, flow, and professionalism.

### Document facts (use exactly these — do not add others)
- **Product name:** SmartHire AI
- **Document type:** Product Requirements Document (PRD) for a Final Year Project (Bachelor's in Computer Science)
- **Institution:** University of Karachi — UBIT (Department of Computer Science)
- **Contributors:** Shanza Iftikhar, Zayyam Siddiqui, Sufiyan Khan
- **Do NOT include:** a supervisor name, project start/end dates, or any placeholder like "[Your Name]". Remove every placeholder.
- Always call it a **PRD** (never "PID").

### What to produce
A single, clean, **well-formatted document in Markdown** that is print/export-ready (so it converts cleanly to PDF or Google Docs / Word). It should be **comprehensive and detailed — roughly 25–30 pages when exported.**

### Formatting & structure requirements
1. **Title page block** at the top: product name as the main title, a one-line subtitle/tagline, "Product Requirements Document", institution (University of Karachi — UBIT), the three contributors, and a version line (Version 1.0).
2. **Automatic-style Table of Contents** with numbered sections.
3. **Consistent heading hierarchy:** `#` title, `##` numbered sections (1, 2, 3…), `###` sub-sections (8.1, 8.2…), `####` sub-features where needed. Number sections and sub-sections consistently.
4. **Tables** for: roles & permissions, functional requirements, non-functional requirements, KPIs, risks, the data-model catalogue, and the requirements traceability matrix. Keep tables tidy and aligned.
5. Preserve the **architecture diagram** (keep it inside a fenced code block so it renders as monospace) and the lifecycle/status tables.
6. Use **blockquotes** for the vision statement, problem statement, and important callouts.
7. Use **bold** for feature names and priority tags (M / S / C).
8. Add short connecting/intro sentences between sections so it reads as a cohesive document, not a list dump.
9. Professional, formal, academic tone. Fix all grammar, spelling, and consistency issues. Use consistent terminology and one spelling convention throughout.
10. Make it **page-break friendly** (logical section breaks; don't split a table awkwardly).

### Content rules
1. **Keep every feature and sub-feature** from the source — do not drop or merge anything. The Detailed Functional Specification (Section 8) must remain exhaustive: every main feature with its sub-features and sub-sub-features.
2. Where a section is thin, **elaborate** (clear explanations, acceptance-criteria-style detail, edge cases) — but only about features that exist in the source. Do **not** fabricate new modules, integrations, or numbers.
3. Keep all requirement IDs (FR-… / NFR-…) and the priority levels (M/S/C); ensure they're consistent between the detailed spec and the traceability matrix.
4. Keep the proposed KPI targets but clearly label them as "indicative".
5. Keep technical accuracy: Next.js 16 / React 19 / TypeScript, Supabase (PostgreSQL + RLS + Auth + Storage + Realtime), Google Gemini for AI, WebRTC for video, two roles (Candidate & Recruiter), a unified inbox, and the social layer (public profiles, feed, follows, posts, likes/comments/reposts/shares, moderation). Note that recruiters show a **Company card** on their profile (they don't have personal sections like skills/education).
6. End with a clean closing line and the document version.

### Output
- Output **only the final PRD document** in Markdown — no commentary before or after, no "here is your document" preamble.
- Make it self-contained and immediately usable.

When you're ready, here is the source content to transform:

```
<PASTE THE ENTIRE CONTENTS OF docs/PRD.md HERE>
```

---

*(End of prompt. Replace the placeholder line above with the full `PRD.md` text, then send.)*
