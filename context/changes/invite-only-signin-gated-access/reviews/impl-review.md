<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Invite-only signin and gated access

- **Plan**: `context/changes/invite-only-signin-gated-access/plan.md`
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-05-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Middleware ignores `getUser()` errors

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/middleware.ts:32-36`
- **Detail**: Only `data.user` is read; network or Supabase errors are ignored. Failed validation could throw or leave ambiguous session state on edge failures.
- **Fix**: Destructure `{ data, error }`; on error set `context.locals.user = null` and log server-side.
  - Strength: Matches Supabase SSR guidance; avoids unhandled rejections.
  - Tradeoff: Minor edit in one file.
  - Confidence: HIGH
  - Blind spot: None significant
- **Decision**: FIXED

### F2 — Signin API lacks Zod validation

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/api/auth/signin.ts:7-9`
- **Detail**: Form fields cast with `as string` and passed to `signInWithPassword` without validation. AGENTS.md requires Zod on API bodies.
- **Fix**: Add Zod schema for email + password; redirect with generic validation error on failure.
- **Decision**: FIXED

### F3 — Raw Supabase error in redirect URL

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/pages/api/auth/signin.ts:17-18`
- **Detail**: `error.message` is reflected in `?error=` query param. Usually generic today, but future provider messages could leak hints.
- **Fix**: Map all auth failures to one client message (e.g. "Invalid login credentials"); log provider detail server-side only.
  - Strength: Aligns with invite-only non-enumeration goal in plan.
  - Tradeoff: Loses specific Supabase messages in UI (acceptable for auth).
  - Confidence: HIGH
  - Blind spot: None significant
- **Decision**: FIXED (applied with F2 — same signin.ts edit)

### F4 — Signout when Supabase client is null

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/api/auth/signout.ts:6-11`
- **Detail**: When `createClient()` returns null, `signOut()` is skipped but cookies may remain; middleware treats user as logged out on next request inconsistently.
- **Fix**: Clear known Supabase auth cookies in null-client branch, or redirect with explicit error like signin does.
- **Decision**: FIXED

### F5 — Public prefix matching without path boundary

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: `src/middleware.ts:20`
- **Detail**: `startsWith("/auth/signin")` would also match hypothetical `/auth/signin-foo`.
- **Fix**: Match exact path or `prefix + '/'` boundary.
- **Decision**: FIXED

### F6 — Limited static asset exclusions

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Reliability
- **Location**: `src/middleware.ts:11`
- **Detail**: Only `/_astro/` is excluded; `/favicon.ico` and sitemap paths may hit auth redirect when logged out.
- **Fix**: Extend `STATIC_PREFIXES` after verifying which paths pass middleware in dev.
- **Decision**: FIXED

### F7 — Foundation docs lag implementation pivot

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `context/foundation/prd.md`, `shape-notes.md` (not in PR diff)
- **Detail**: PRD/shape may still describe env allowlist; code uses Supabase Auth only per plan pivot.
- **Fix**: Update PRD Access Control prose in a separate docs PR (out of scope for auth PR #1).
- **Decision**: SKIPPED (deferred to follow-up docs PR)

## Success criteria verification

- `npm run lint` — PASS
- `npm run build` — PASS
- All Progress manual items — `[x]` with SHAs (user-confirmed)
