# Invite-only signin and gated access — Implementation Plan

## Overview

Align PatchPost authentication with PRD `## Access Control` and roadmap S-01: invite-only login via email allowlist in server env, no public registration, generic rejection for non-allowlisted emails, and catch-all route protection with a small public surface.

## Current State Analysis

Supabase email/password auth is wired with cookie-based SSR (`src/lib/supabase.ts`). Middleware resolves `context.locals.user` and redirects unauthenticated users away from `PROTECTED_ROUTES = ["/dashboard"]` only (`src/middleware.ts:4-21`).

Public signup is fully enabled: `src/pages/api/auth/signup.ts` calls `signUp`, `src/pages/auth/signup.astro` and `SignUpForm.tsx` expose UI, and links exist in `Topbar.astro`, `Welcome.astro`, and `signin.astro`. `supabase/config.toml` sets `enable_signup = true` at lines 169 and 204.

No allowlist exists. No domain migrations. Auth API routes lack `export const prerender = false` (AGENTS.md requires it).

### Key Discoveries:

- `src/pages/api/auth/signin.ts:13` — signs in without pre-check; redirect target is `/` on success.
- `src/middleware.ts:4` — single protected route; does not match user’s catch-all requirement.
- `astro.config.mjs:17-21` — only `SUPABASE_URL` and `SUPABASE_KEY` in env schema today.
- Roadmap baseline (`context/foundation/roadmap.md:58`) — documents signup/allowlist gap explicitly.

## Desired End State

1. Owner provisions access only in **Supabase Auth** (dashboard: invite email or create user with password) — no duplicate allowlist in app env.
2. Public signup is disabled in Supabase (`enable_signup = false`) and removed from the app.
3. User with a Supabase account signs in at `/auth/signin` → can access gated routes.
4. Unknown email or wrong password receives Supabase’s generic **Invalid login credentials** (no app-level email list).
5. `/auth/signup`, `/auth/confirm-email`, and `POST /api/auth/signup` are gone; GET `/auth/signup` redirects to signin.
6. Unauthenticated requests to any non-public path redirect to `/auth/signin`.
7. Local Supabase has signup disabled in `config.toml`; README documents disabling signup in hosted Supabase dashboard.

### Verification (manual)

- Sign in with allowlisted email → lands on app (home or dashboard per existing redirect).
- Sign in with non-allowlisted email → signin page with generic error.
- Visit `/auth/signup` → redirect to signin.
- Logged out visit to `/dashboard` → redirect to signin.
- No “Sign up” links in Topbar, Welcome, or signin page.

## What We're NOT Doing

- Allowlist admin UI or Supabase table + migration
- Supabase invite-email / magic-link provisioning flow
- Per-request allowlist re-validation in middleware (signin-only check)
- New product routes (projects, generation)
- Playwright or other automated tests (no test runner in `package.json`)
- Changing post-signin redirect from `/` to `/dashboard` (unless needed for manual test clarity)

## Implementation Approach

Rely on **Supabase Auth as the allowlist**: only users the owner created or invited exist. Delete signup from the app, disable signup in Supabase config, use standard `signInWithPassword` (no `ALLOWED_EMAILS`), flip middleware to a **public route allowlist** (catch-all protection), and document the dashboard-only owner workflow in README.

**Pivot (2026-05-27):** Phase 1 originally added env allowlist — removed. Duplicating emails in env + Supabase was redundant; hosted Auth user list matches PRD “allowlist outside UI.”

## Critical Implementation Details

**Middleware public-route model:** Replace “protect listed routes” with “allow listed public prefixes, require session everywhere else.” Public set: exact `/`; prefix `/auth/signin`; prefix `/api/auth/signin` and `/api/auth/signout`. Redirect `/auth/signup` and `/auth/confirm-email` to `/auth/signin` before the auth gate. Do not block static asset paths if Astro serves them through middleware — if requests to `/_astro/*` hit middleware, add an exclusion prefix for `/_astro/` and common static paths.

**Access control:** Supabase decides who exists; the app does not maintain a second email list.

## Phase 1: Signin API hygiene

### Overview

Align signin route with AGENTS.md; no app-level allowlist — membership is whoever exists in Supabase Auth after owner invite/create.

### Changes Required:

#### 1. Signin API

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Standard Supabase password sign-in; rely on Auth for “is this user allowed to exist.”

**Contract**:

- Add `export const prerender = false`.
- Keep existing `signInWithPassword` + error redirect flow (no pre-check against env allowlist).

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- User created (or invited) in Supabase Auth dashboard can sign in successfully
- Email with no Supabase account gets invalid-credentials style error from Supabase

**Implementation Note**: Pause for human confirmation before Phase 2. Real invite-only enforcement completes in Phase 2–3 (no signup UI + `enable_signup = false`).

---

## Phase 2: Remove public signup surface

### Overview

Delete signup implementation and remove all navigation/marketing references; redirect legacy signup URLs.

### Changes Required:

#### 1. Delete signup API and UI

**Files to delete**:

- `src/pages/api/auth/signup.ts`
- `src/pages/auth/signup.astro`
- `src/pages/auth/confirm-email.astro`
- `src/components/auth/SignUpForm.tsx`

**Intent**: Remove public registration paths entirely (PRD non-goal).

**Contract**: No remaining imports of deleted modules; `grep` for `signup` under `src/` should only hit middleware redirects, README, or comments.

#### 2. Signin page copy

**File**: `src/pages/auth/signin.astro`

**Intent**: Remove cross-link to signup; optional one-line invite-only hint (non-enumerating, e.g. “Access is by invitation.”).

**Contract**: Remove paragraph linking to `/auth/signup` (lines 17–19). No signup href remains.

#### 3. Global navigation

**File**: `src/components/Topbar.astro`

**Intent**: Logged-out state shows sign-in only.

**Contract**: Remove `/auth/signup` anchor (lines 30–31).

#### 4. Landing hero

**File**: `src/components/Welcome.astro`

**Intent**: Remove signup CTA; adjust auth feature card copy to invite-only (not “sign up”).

**Contract**: Remove second hero button to `/auth/signup` (lines 47–51). Update “Authentication Ready” card text (lines 74–77) to describe invite-only sign-in.

#### 5. Signout API hygiene

**File**: `src/pages/api/auth/signout.ts`

**Intent**: Align with AGENTS.md API route convention.

**Contract**: Add `export const prerender = false`.

### Success Criteria:

#### Automated Verification:

- `npm run lint`
- `npm run build`

#### Manual Verification:

- No `/auth/signup` link visible on home, topbar, or signin
- Visiting `/auth/signup` returns redirect to signin (via Phase 3 middleware if not done yet — complete Phase 3 before final check, or add temporary redirect in Phase 2 via minimal `signup.astro` redirect-only file; **prefer Phase 3 middleware redirect** and run manual test after Phase 3)

**Implementation Note**: Signup URL redirect is verified in Phase 3 manual steps.

---

## Phase 3: Catch-all middleware and Supabase config

### Overview

Invert route protection to public allowlist (user-selected catch-all) and disable Supabase-native signup locally.

### Changes Required:

#### 1. Middleware public-route model

**File**: `src/middleware.ts`

**Intent**: Require authentication for all routes except explicit public entrypoints; redirect legacy auth URLs.

**Contract**:

- Replace `PROTECTED_ROUTES` with `PUBLIC_EXACT` (e.g. `["/"]`) and `PUBLIC_PREFIXES` (e.g. `["/auth/signin", "/api/auth/signin", "/api/auth/signout"]`).
- Optional: `STATIC_PREFIXES` for `/_astro/` if needed after manual test.
- If pathname is `/auth/signup` or starts with `/auth/confirm-email`, `redirect` to `/auth/signin`.
- If path is not public and `!context.locals.user`, redirect to `/auth/signin`.
- Preserve existing `getUser()` / `locals.user` resolution.
- Add brief comment that new public routes must be added explicitly (documents catch-all policy for future agents).

**Note:** AGENTS.md line 11 says “extend PROTECTED_ROUTES” — update `AGENTS.md` in Phase 4 to describe the public-route allowlist pattern so docs match implementation.

#### 2. Supabase local config

**File**: `supabase/config.toml`

**Intent**: Disable native signup in local Supabase (defense in depth).

**Contract**: Set `enable_signup = false` under `[auth]` (line ~169) and `[auth.email]` (line ~204).

### Success Criteria:

#### Automated Verification:

- `npm run lint`
- `npm run build`

#### Manual Verification:

- Logged out: `/` loads; `/dashboard` redirects to signin
- Logged out: `/auth/signup` redirects to signin
- Logged in (allowlisted): `/dashboard` loads
- Direct `POST` to removed signup API returns 404

**Implementation Note**: Pause for human confirmation before Phase 4.

---

## Phase 4: Documentation and operational runbook

### Overview

Document owner workflow and production Supabase settings so invite-only access is operable outside the app.

### Changes Required:

#### 1. README auth section

**File**: `README.md`

**Intent**: Replace signup instructions with invite-only runbook.

**Contract**: Add subsection covering:

1. Create or invite user in Supabase Auth dashboard (Authentication → Users) for each person who should access the app.
2. Local: `enable_signup = false` in `supabase/config.toml` (Phase 3).
3. Hosted Supabase: disable email signup in Authentication → Providers (mirror `config.toml`).
4. Production secrets: only `SUPABASE_URL` and `SUPABASE_KEY` (no app allowlist env).

Remove or update table rows that list signup route as active.

#### 2. AGENTS.md auth architecture

**File**: `AGENTS.md`

**Intent**: Keep agent rules accurate after middleware and route changes.

**Contract**:

- Auth API list: `{signin,signout}` only (no signup).
- Auth UI pages: `{signin}` only (no signup/confirm-email).
- Middleware bullet: describe public-route allowlist / catch-all protection instead of “extend PROTECTED_ROUTES” only.
- Clarify invite-only = Supabase-provisioned users only; no `ALLOWED_EMAILS` env.

#### 3. CI consideration (document only)

**Files**: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

**Intent**: No code change required if `ALLOWED_EMAILS` is optional for build; document that production runtime needs the secret.

**Contract**: If build fails without env, add `ALLOWED_EMAILS` to GitHub secrets with a placeholder test email — only if Phase 1 build proves necessary.

### Success Criteria:

#### Automated Verification:

- `npm run lint`
- `npm run build`

#### Manual Verification:

- New teammate can follow README to add one allowlisted user and sign in locally
- Owner knows hosted Supabase signup disable step

---

## Testing Strategy

### Unit Tests:

- None in repo today; optional small unit tests for `auth-allowlist.ts` parse/normalize if implementer adds vitest later — **not required for this change**.

### Integration Tests:

- None (no test runner).

### Manual Testing Steps:

1. Ensure test user exists in Supabase Auth (dashboard invite or create user).
2. Sign in → success; open `/dashboard` → success.
3. Sign out; attempt signin with `notallowed@example.com` → generic error, no session.
4. While logged out, open `/dashboard` → redirect to signin.
5. Open `/auth/signup` → redirect to signin.
6. Confirm Topbar/Welcome have no signup links.
7. Attempt registration via Supabase client/console with signup disabled (optional sanity check).

## Performance Considerations

Allowlist parse can run once per signin request (small Set from env string). No per-request middleware allowlist check (per decision). Negligible impact.

## Migration Notes

- Existing Supabase users not on allowlist: can still use active sessions until expiry; new signins blocked.
- Remove any bookmarks to `/auth/signup` (redirect handles).
- Production: disable public signup in hosted Supabase before exposing the app.

## References

- PRD Access Control: `context/foundation/prd.md` (lines 89–97)
- Roadmap S-01: `context/foundation/roadmap.md` (lines 92–103)
- Middleware: `src/middleware.ts`
- Signin API: `src/pages/api/auth/signin.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Signin API hygiene

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — f7b2e95
- [x] 1.2 Production build passes: `npm run build` — f7b2e95

#### Manual

- [x] 1.3 Supabase-provisioned user can sign in — f7b2e95
- [x] 1.4 Email with no Supabase account cannot sign in (invalid credentials) — f7b2e95

### Phase 2: Remove public signup surface

#### Automated

- [x] 2.1 Lint passes: `npm run lint` — 629f468
- [x] 2.2 Production build passes: `npm run build` — 629f468

#### Manual

- [x] 2.3 No signup links on home, topbar, or signin page — 629f468

### Phase 3: Catch-all middleware and Supabase config

#### Automated

- [x] 3.1 Lint passes: `npm run lint` — 4f8b625
- [x] 3.2 Production build passes: `npm run build` — 4f8b625

#### Manual

- [x] 3.3 Logged out `/` works; `/dashboard` redirects to signin — 4f8b625
- [x] 3.4 `/auth/signup` redirects to signin — 4f8b625
- [x] 3.5 Allowlisted session reaches `/dashboard` — 4f8b625
- [x] 3.6 Removed signup API returns 404 — 4f8b625

### Phase 4: Documentation and operational runbook

#### Automated

- [x] 4.1 Lint passes: `npm run lint`
- [x] 4.2 Production build passes: `npm run build`

#### Manual

- [x] 4.3 README runbook supports adding one allowlisted user end-to-end
- [x] 4.4 Owner knows hosted Supabase signup disable step
