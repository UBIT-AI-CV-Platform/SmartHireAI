# SmartHireAI — QA Phase 1 Findings

> **Scope:** `dev` branch, read-only audit. No fixes applied.
> **Date:** 2026-06-22
> **Sections:** 1.1 Type/Lint · 1.2 API Routes · 1.3 Supabase & RLS · 1.4 Secrets · 1.5 Auth & Access Control

---

## 1.1 Type / Lint Audit

### 1.1-A — ESLint not installed; `npm run lint` fails

`frontend/package.json` — `devDependencies`

`eslint` is absent from `devDependencies`. `package.json` defines `"lint": "eslint ."` but running it throws `Error: Cannot find module 'eslint'`. Next.js 16 removed the bundled ESLint runner (`next lint`), so there is currently no working lint command.

---

### 1.1-B — TypeScript error: unsafe cast of query result

`frontend/app/api/generate-cv/route.ts:226`

```ts
const cs = (await supabase.from('cvs').select(...)).data as CvRow[]
```

TS2352: The Supabase query can return `null` on error; casting `null` to `CvRow[]` bypasses the type system. If the query fails, downstream code reads `.length` / iterates on `null` at runtime.

---

### 1.1-C — TypeScript cascade from dynamic table prop

`frontend/components/candidate/ProfileCardSection.tsx:52, 55, 63`

The component accepts `table: string` and passes it to `.from(table)`. Because `table` is an untyped string rather than a typed `keyof Database['public']['Tables']`, TypeScript infers the row type as `never`, causing TS2769 / TS2345 errors on every subsequent `.update()`, `.insert()`, and `.delete()` call on lines 52, 55, and 63.

---

## 1.2 API Route Audit

### 1.2-A — PII logged to server stdout

**`frontend/app/api/apply/route.ts:34`**
```ts
console.log('[apply] confirmation email sent:', info.messageId, '→', to)
```
Candidate email address written to Vercel log stream on every successful application.

**`frontend/app/api/inbox/route.ts:22`**
```ts
console.log('[inbox] sending email to', recipient)
```
**`frontend/app/api/inbox/route.ts:87, 89`**
```ts
console.error('[inbox] nodemailer error', err)
```
Recipient email and full SMTP error logged on success and failure.

---

### 1.2-B — Raw upstream error body forwarded to the browser

All routes below expose internal Gemini API error text to API consumers. This leaks provider error messages, quota information, and model identifiers to the client.

| File | How it leaks |
|---|---|
| `frontend/app/api/interview-coach/route.ts:148–150` | `errText = await geminiRes.text()` sent as 502 body |
| `frontend/app/api/generate-cover-letter/route.ts` | `errText.slice(0, 300)` in JSON error response |
| `frontend/app/api/generate-cv/route.ts` | `errText.slice(0, 300)` in JSON error response |
| `frontend/app/api/recruiter/copilot/route.ts` | raw `errText` in JSON error response |
| `frontend/app/api/recruiter/interview-kit/route.ts` | `e.message` (contains Gemini body) forwarded |
| `frontend/app/api/recruiter/job-description/route.ts` | `e.message` forwarded |
| `frontend/app/api/recruiter/outreach/route.ts` | `e.message` forwarded |
| `frontend/app/api/recruiter/screen-applicants/route.ts` | `e.message` forwarded |

---

### 1.2-C — Network errors not caught for external job providers

**`frontend/app/api/external-jobs/route.ts`**

`fromJooble()` and `fromAdzuna()` check `!res.ok` but have no `try/catch` around the `fetch()` call itself. A DNS failure, timeout, or network-level error throws an unhandled exception that propagates to a 500 with a raw Node.js error stack.

---

### 1.2-D — Dead Gemini key causes ~1/3 of AI requests to fail

**`frontend/lib/gemini.ts`**

`pickGeminiKey()` round-robins across all keys in `GEMINI_API_KEYS`. Key 1 (`AQ.A…cL7Q`) returns `403 PERMISSION_DENIED` on every call. `geminiGenerate()` does not retry on 403 (correct), so approximately one in three AI route invocations fail with a 503/502 error returned to the user. Keys 2 and 3 are active.

---

## 1.3 Supabase & RLS Audit

### PART A — App Layer

#### 1.3-A1 — Recruiter dashboard fetches all applications with no tenant filter (Critical)

**`frontend/app/recruiter/page.tsx:52`**
```ts
supabase.from('applications')
  .select('id, status, match_score, applied_at, candidate_name, job:jobs(id, title)')
  .order('applied_at', { ascending: false })
```
No `.eq('recruiter_id', ...)` or join-filter. The query relies entirely on RLS to scope results to the logged-in recruiter's jobs. If RLS on `applications` is misconfigured or a bypass is introduced, every recruiter sees the entire applications table.

`appsRes.error` is not checked on line 54 — a failed query is silently treated as an empty result.

---

#### 1.3-A2 — Applicant management page fetches all applications with no tenant filter (Critical)

**`frontend/app/recruiter/applicants/page.tsx:72–76`**
```ts
supabase.from('applications')
  .select('id, status, match_score, applied_at, candidate_name, candidate_email,
           cv_snapshot, recruiter_rating, recruiter_notes, job:jobs(id, title, company)')
  .order('applied_at', { ascending: false })
```
No recruiter-scoped filter. The selected fields include `candidate_email` and `cv_snapshot` (full CV data). If RLS does not enforce tenant isolation, every recruiter reads every other recruiter's candidates' personal data.

---

#### 1.3-A3 — Inbox applications query missing recruiter filter (Critical)

**`frontend/components/shared/Inbox.tsx:265`**
```ts
supabase.from('applications').select(...)
// no .eq('recruiter_id', uid)
```
When a recruiter opens the "new conversation" modal the candidate list is populated from an unfiltered applications query. Solely RLS-dependent for data isolation.

---

#### 1.3-A4 — ProfileCardSection: all three mutations silently discard errors

**`frontend/components/candidate/ProfileCardSection.tsx:52`** — `.update()` error ignored  
**`frontend/components/candidate/ProfileCardSection.tsx:55`** — `.insert()` error ignored  
**`frontend/components/candidate/ProfileCardSection.tsx:63`** — `.delete()` — no destructuring at all

User appears to save successfully when the DB write has silently failed.

---

#### 1.3-A5 — CustomSections: all mutations silently discard errors

**`frontend/components/candidate/CustomSections.tsx`**

Every `.insert()`, `.update()`, and `.delete()` call only destructures `{ data }`, dropping `error`. Failures are invisible to the user.

---

#### 1.3-A6 — Widespread silent mutation failures across pages

The following locations `await` a Supabase mutation but never inspect the returned `error`. In each case the UI proceeds as if the write succeeded.

| File | Line(s) | Operation |
|---|---|---|
| `app/candidate/build-profile/page.tsx` | 162 | `profiles.update({ photo_url })` after avatar upload |
| `app/candidate/build-profile/page.tsx` | 169 | `profiles.update({ photo_url: null })` on remove |
| `app/candidate/build-profile/page.tsx` | 170 | `storage.avatars.remove()` |
| `app/candidate/build-profile/page.tsx` | 181–187 | `skills.update()` and `skills.insert()` |
| `app/candidate/build-profile/page.tsx` | 192 | `skills.delete()` |
| `app/candidate/build-profile/page.tsx` | 206–211 | `languages.update()` and `languages.insert()` |
| `app/candidate/build-profile/page.tsx` | 216 | `languages.delete()` |
| `app/candidate/settings/page.tsx` | 51 | `profiles.update({ full_name })` |
| `app/candidate/my-applications/page.tsx` | 213–214 | `saved_jobs.delete()` / `saved_jobs.insert()` |
| `app/candidate/my-applications/page.tsx` | 250 | `applications.delete()` (withdraw) |
| `app/candidate/notifications/page.tsx` | 63 | `notifications.update()` (mark all read) |
| `app/candidate/notifications/page.tsx` | 70 | `notifications.update()` (toggle read) |
| `app/candidate/notifications/page.tsx` | 76 | `notifications.delete()` |
| `app/candidate/interviews/page.tsx` | 47 | `interviews.update({ stage })` |
| `app/candidate/cv-generator/page.tsx` | 184 | `cvs.update({ content })` |
| `app/candidate/cv-generator/page.tsx` | 261 | `cvs.update({ target_role })` |
| `app/candidate/cv-generator/page.tsx` | 268 | `cvs.delete()` |
| `app/candidate/cv-generator/page.tsx` | 275 | `cvs.update({ is_favorite })` |
| `app/candidate/cv-generator/page.tsx` | 117 | `cover_letters.update({ is_favorite })` |
| `app/candidate/cv-generator/page.tsx` | 292 | `cover_letters.delete()` |
| `app/candidate/cv-generator/page.tsx` | 300 | `cover_letters.update({ is_favorite })` |
| `app/candidate/ai-coach/page.tsx` | 132–135 | `interview_sessions.update()` / `.insert()` |
| `app/candidate/ai-coach/page.tsx` | 133 | `interview_sessions.delete()` |
| `app/recruiter/jobs/page.tsx` | 127 | `jobs.update({ is_open })` (toggle) |
| `app/recruiter/jobs/page.tsx` | 133 | `jobs.delete()` |
| `app/recruiter/applicants/page.tsx` | 121 | `applications.update({ status })` |
| `app/recruiter/applicants/page.tsx` | 126 | `applications.update({ recruiter_rating })` |
| `app/recruiter/applicants/page.tsx` | 132 | `applications.update({ recruiter_notes })` |
| `app/recruiter/interviews/page.tsx` | 68 | `interviews.update({ stage })` |
| `app/recruiter/interviews/page.tsx` | 72 | `applications.update({ status })` |
| `app/recruiter/settings/page.tsx` | 48 | `profiles.update({ full_name })` |
| `app/recruiter/notifications/page.tsx` | — | All three of: mark-all-read, toggle-read, delete |
| `components/shared/Inbox.tsx` | — | `conversations.update()` in realtime handler |
| `components/shared/Inbox.tsx` | — | `.rpc('ensure_conversation')` error ignored |
| `components/candidate/NotificationsBell.tsx` | — | `.update({ is_read })` error ignored |
| `app/auth/select-role/page.tsx` | 22–26 | `profiles.select()` — error not checked |
| `app/auth/select-role/page.tsx` | 43 | `profiles.update({ role, role_selected })` — error not checked, user redirected regardless |

---

#### 1.3-A7 — Partial error checking on parallel data loads

**`frontend/app/candidate/my-applications/page.tsx:127–134`**

In `Promise.all([jobsRes, appsRes, skillsRes, cvRes, savedRes])`, only `jobsRes.error || appsRes.error` is checked. `skillsRes.error`, `cvRes.error`, and `savedRes.error` are silently ignored — the page renders with empty skills/CV/saved state on failure without any user indication.

---

#### 1.3-A8 — No SQL injection risk found

All Supabase interactions use the typed PostgREST client (`.from().select().eq()`). No raw SQL string concatenation exists in the application layer. The dynamic `table: string` prop in `ProfileCardSection.tsx` passes through the SDK, not raw SQL, so it is a type-safety issue (1.1-C) but not an injection vector. SECURITY DEFINER functions in the schema use `$1`-style parameterisation.

---

### PART B — Database Layer

#### 1.3-B1 — `avatars` storage bucket is public (Critical)

**`backend/schema.sql`** — storage bucket definition

```sql
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
```

`public: true` means any request without authentication can read any object in this bucket. All candidate profile photo URLs stored in `profiles.photo_url` are world-readable. Anyone who knows or guesses a storage path can retrieve photos without logging in.

---

#### 1.3-B2 — `profiles` has no DELETE policy

**`backend/schema.sql`** — RLS policies for `profiles`

Policies exist for SELECT, INSERT, and UPDATE (all scoped to `auth.uid() = id`), but there is no DELETE policy. Users cannot delete their own profile row via the client API, making self-service account deletion impossible.

---

#### 1.3-B3 — `jobs` SELECT policy is open to all authenticated users

**`backend/schema.sql`** — RLS policy for `jobs`

```sql
-- policy: "Candidates can view open jobs"
using (is_open = true)
-- roles: authenticated
```

All authenticated users — including recruiters from other companies — can read the full content of every open job posting (description, salary, required skills, company). This is typical for a job board but means competitor recruiters can read each other's job details.

---

#### 1.3-B4 — RLS on `applications` is the sole protection for critical unfiltered queries

**`backend/schema.sql`** — RLS policies for `applications`

The recruiter-facing SELECT policy scopes results to applications for the recruiter's own jobs. Because the app layer queries (`1.3-A1`, `1.3-A2`, `1.3-A3`) apply no client-side filter, **RLS is the only enforcement layer** for multi-tenant isolation on the most sensitive table. Any future policy mistake, function override, or service-role key exposure would immediately expose all candidate data to all recruiters.

---

#### 1.3-B5 — All 18 tables have RLS enabled

**`backend/schema.sql`**

Every table — `profiles`, `jobs`, `applications`, `notifications`, `conversations`, `messages`, `skills`, `languages`, `education`, `certifications`, `courses`, `awards`, `projects`, `custom_sections`, `saved_jobs`, `cvs`, `cover_letters`, `interview_sessions`, `interviews` — has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. No table has RLS disabled. This is the correct baseline.

---

## 1.4 Secrets Audit

### 1.4-A — Dead Gemini key in production rotation

**`frontend/.env.local` — `GEMINI_API_KEYS` (Key 1)**

Key 1 of three in the comma-separated `GEMINI_API_KEYS` value returns `403 PERMISSION_DENIED` against `gemini-2.5-flash`. The key pattern is `AQ.A…cL7Q` (masked). `geminiGenerate()` in `frontend/lib/gemini.ts` correctly does not retry 403s, so every third AI request fails deterministically for end users. Keys 2 and 3 are confirmed active.

---

### 1.4-B — No secrets found in git history or source files

`git log --all --full-history -- "*.env*"` → no output  
`git log --all --full-history -- "backend/seed-demo.sql"` → no output  
Full diff scan of all 9 commits: only matches are `GEMINI_API_KEY=your-gemini-key` placeholder strings in `README.md`  
Grep over all `.ts` / `.tsx` / `.sql` / `.md` for `AQ.`, `AIza`, `sk-`, `ghp_`, Supabase JWT patterns, hardcoded Supabase URLs → no matches outside `process.env`

`.gitignore` (lines 12–14) correctly excludes `.env`, `.env.*` (covers `.env.local`, `.env.production`, etc.) while retaining `.env.example`.

---

## 1.5 Auth & Access Control Audit

### 1.5-A — Middleware is likely dead: `proxy.ts` is not a recognised Next.js filename (Critical)

**`frontend/proxy.ts`**

```ts
// Next.js 16 renamed the "middleware" convention to "proxy".
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}
export const config = { matcher: ['/((?!_next/static|...).*)'] }
```

Next.js recognises a file named `middleware.ts` (at the project root or under `src/`) exporting a function named `middleware`. A file named `proxy.ts` exporting `proxy` does not match this convention. The comment's claim that "Next.js 16 renamed the middleware convention to proxy" is not a documented framework change.

**Consequence if `proxy.ts` is not active:**
- `updateSession()` is never called on any request
- Auth session cookies are never server-side refreshed — sessions degrade silently
- The route guard inside `lib/supabase/middleware.ts:41–45` (which redirects unauthenticated users away from `/candidate`, `/recruiter`, `/interview`) never runs
- The matcher config has no effect

---

### 1.5-B — Role gating is client-side only and runs after the page renders

**`frontend/app/candidate/layout.tsx:51–78`**  
**`frontend/app/recruiter/layout.tsx:20–42`**

Both layouts are `'use client'` components. The role check runs inside a `useEffect` and requires two sequential async calls (getUser + profiles select) before `router.replace()` fires. During that window (typically 200–500ms) the wrong portal has already rendered and its child pages have already mounted and fired their own Supabase data fetches.

- A recruiter visiting `/candidate/*` briefly sees the candidate dashboard and triggers its data queries before being redirected.
- A candidate visiting `/recruiter/*` briefly sees the recruiter dashboard before being redirected.
- No individual page under either portal checks `profile.role` independently.

---

### 1.5-C — Unauthenticated users not redirected from candidate routes

**`frontend/app/candidate/layout.tsx:53–54`**
```ts
supabase.auth.getUser().then(async ({ data: { user } }) => {
  if (!user) return   // no router.replace('/auth')
```

An unauthenticated user who navigates to any `/candidate/*` URL sees the full candidate shell (sidebar, header, daily tip banner) and the page renders its error state ("Couldn't load your dashboard"). They are not redirected to `/auth`.

Compare with `recruiter/layout.tsx:24` which does redirect:
```ts
if (!user) { router.replace('/auth'); return }
```

---

### 1.5-D — `bad_oauth_state` root cause

**`frontend/app/auth/callback/route.ts`**  
**`frontend/lib/supabase/middleware.ts:21–31`**

Supabase's PKCE OAuth flow writes a `code_verifier` + `state` cookie when the user clicks "Sign in with OAuth provider." When the provider redirects to `/auth/callback`, `supabase.auth.exchangeCodeForSession(code)` reads that cookie to verify the state. If the cookie is absent, `bad_oauth_state` is returned.

Root cause: the `setAll` handler in `updateSession` is responsible for writing these cookies to the browser response. Because `proxy.ts` is likely not the active middleware (1.5-A), `updateSession` never runs during the OAuth initiation step, the PKCE state cookie is never persisted to the browser, and the callback finds nothing to verify against.

---

### 1.5-E — Localhost redirect in production is a Supabase dashboard configuration issue

**`frontend/app/auth/callback/route.ts:10–12`**
```ts
const { searchParams, origin } = new URL(request.url)
// ...
return NextResponse.redirect(`${origin}${path}`)
```

The redirect target is derived from the request's own `origin` — it is **not hardcoded**. No localhost URLs appear anywhere in the callback code or in `lib/auth-helpers.ts`.

The production redirect to localhost originates from the Supabase project's **Auth → URL Configuration** settings. If **Site URL** is set to `http://localhost:3000`, Supabase uses it as the base for OAuth callbacks regardless of where the app is actually deployed. Fix is in the Supabase dashboard: update **Site URL** and add the Vercel deployment URL to **Redirect URLs**.

---

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| 1.1-A | `eslint` missing — no working lint command | Medium |
| 1.1-B | Unsafe `null as CvRow[]` cast in generate-cv route | Medium |
| 1.1-C | Dynamic `table: string` prop causes TypeScript cascade errors in ProfileCardSection | Medium |
| 1.2-A | PII (email addresses) logged to Vercel stdout in apply and inbox routes | Medium |
| 1.2-B | Raw Gemini error body forwarded to browser in 8 routes | Medium |
| 1.2-C | Network errors not caught in external-jobs route | Low |
| 1.2-D | Dead Gemini Key 1 causes ~33% of AI requests to fail | High |
| 1.3-A1 | Recruiter dashboard applications query has no tenant filter | Critical |
| 1.3-A2 | Applicant management applications query has no tenant filter; exposes email + CV data | Critical |
| 1.3-A3 | Inbox applications query has no tenant filter | Critical |
| 1.3-A4 | ProfileCardSection: all three mutations silently ignore errors | High |
| 1.3-A5 | CustomSections: all mutations silently ignore errors | High |
| 1.3-A6 | 35 mutation call-sites across pages silently discard errors | High |
| 1.3-A7 | Partial error checking on parallel data load in my-applications | Low |
| 1.3-B1 | `avatars` storage bucket is public — photos readable without auth | Critical |
| 1.3-B2 | `profiles` has no DELETE policy — users cannot self-delete | Low |
| 1.3-B3 | `jobs` SELECT open to all authenticated users including competitor recruiters | Info |
| 1.3-B4 | RLS is the sole enforcement layer for multi-tenant isolation on `applications` | High |
| 1.4-A | Dead Gemini Key 1 in GEMINI_API_KEYS rotation | High |
| 1.4-B | Git history and source files clean — no committed secrets | Pass |
| 1.5-A | `proxy.ts` not a recognised Next.js middleware filename — entire server-side session guard is likely dead | Critical |
| 1.5-B | Role gating is client-side only; wrong portal briefly renders and fires data fetches before redirect | High |
| 1.5-C | Unauthenticated users not redirected from `/candidate/*` routes | High |
| 1.5-D | `bad_oauth_state` root cause: PKCE cookie never set because middleware is likely dead | High |
| 1.5-E | Localhost redirect in production is Supabase dashboard config, not a code bug | Medium |
