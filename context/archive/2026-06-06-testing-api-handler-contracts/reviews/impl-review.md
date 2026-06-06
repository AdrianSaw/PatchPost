<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Testing API Handler Contracts

- **Plan**: context/changes/testing-api-handler-contracts/plan.md
- **Scope**: All phases (1–4)
- **Date**: 2026-06-06
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Phase 3 validation cases partially implemented

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: tests/integration/change-inputs-api-contracts.test.ts:40; tests/integration/generation-runs-api-contracts.test.ts:54
- **Detail**: Plan contract lists "empty/missing `raw_content`" and "invalid `output_type` or bad UUID". Implementation covers empty string and invalid `output_type` only; missing JSON field and bad `change_input_id` UUID cases are omitted. Happy paths and at least one validation path per handler are present.
- **Fix**: Add two focused tests — POST change-inputs without `raw_content` key → 422 + no row; POST generation-runs with malformed `change_input_id` → 422 + no new run.
- **Decision**: FIXED

### F2 — Unplanned auth infrastructure (Admin API + config.toml)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: tests/helpers/supabase-session.ts:24–50; supabase/config.toml; .env.local.example
- **Detail**: Plan assumed Phase 1 `createTestUser()` unchanged and listed no Supabase config edits. Implementation added Admin API provisioning via `SUPABASE_SERVICE_ROLE_KEY`, `[auth.email] enable_signup = true`, and `.env.local.example` docs. Necessary for invite-only local testing; documented post-hoc in test-plan §6.2/§6.4/§6.6 and AGENTS.md but absent from plan "Changes Required".
- **Fix A ⭐ Recommended**: Add a short plan addendum under Phase 2 noting auth-support files and rationale (invite-only local Auth).
  - Strength: Preserves working tests; aligns plan with git truth for future reviews.
  - Tradeoff: Plan becomes a slightly moving target.
  - Confidence: HIGH — matches how prior changes document discovered scope.
  - Blind spot: Reviewers who approved original scope are not re-notified.
- **Fix B**: Revert config/session changes and require public signup for tests only
  - Strength: Strict scope discipline.
  - Tradeoff: Breaks invite-only local workflow; contradicts product auth model.
  - Confidence: LOW — product uses invite-only auth.
  - Blind spot: Whether CI/local docs already assume invite-only everywhere.
- **Decision**: FIXED (Fix A — plan addendum added)

### F3 — Service role Admin client lacks localhost guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/helpers/supabase-session.ts:30–43
- **Detail**: `provisionAuthUser` creates an Admin client whenever `SUPABASE_SERVICE_ROLE_KEY` is set, without verifying `SUPABASE_URL` is local. Current call sites gate via `hasLocalSupabaseConfig()`, but the helper itself has no guard against misconfigured remote URLs.
- **Fix**: Before Admin client creation, require `isLocalSupabaseUrl(url)` (reuse from `tests/setup.ts`); throw if service role key is present but URL is not local.
- **Decision**: FIXED

### F4 — Prerequisite message omits service role key

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: tests/setup.ts:9–10
- **Detail**: `SUPABASE_PREREQUISITE_MESSAGE` mentions only the publishable key. With invite-only Auth and Admin API provisioning, contract suites effectively require `SUPABASE_SERVICE_ROLE_KEY` (documented in `.env.local.example` and test-plan §6.4, not in fail-fast message).
- **Fix**: Extend `SUPABASE_PREREQUISITE_MESSAGE` to mention `SUPABASE_SERVICE_ROLE_KEY` when local invite-only Auth is enabled.
- **Decision**: FIXED

### F5 — Progress marks lint complete; full-repo lint fails

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/testing-api-handler-contracts/plan.md:352–353; .cursor/hooks/*.mjs
- **Detail**: Progress checkbox 4.2 claims `npm run lint` passes. Full `npm run lint` exits 1 due to pre-existing ESLint parsing errors in `.cursor/hooks/lint-after-edit.mjs` and `typecheck-after-edit.mjs` (from commit f5c0656, not this change). Changed test/helper files lint clean in isolation.
- **Fix A ⭐ Recommended**: Exclude `.cursor/hooks/` from ESLint project scope or add allowDefaultProject so CI/repo lint passes again.
  - Strength: Restores truth of lint gate for all future changes.
  - Tradeoff: Touches ESLint config outside test scope.
  - Confidence: HIGH — errors are unrelated parsing/config, not code quality.
  - Blind spot: Whether CI currently runs full lint or scoped lint.
- **Fix B**: Leave lint as-is; amend Progress note that lint applies to changed test paths only
  - Strength: No config churn in this change.
  - Tradeoff: Misleading checkbox; CI may still fail on push.
  - Confidence: MEDIUM — depends on CI workflow.
  - Blind spot: `.github/workflows/ci.yml` lint step scope.
- **Decision**: FIXED (Fix A — ignore .cursor/hooks in ESLint)

### F6 — §6.4 prerequisite wording vs config.toml split

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/test-plan.md:173
- **Detail**: Cookbook prerequisite says invite-only local Auth (`enable_signup = false`) without noting `[auth.email].enable_signup = true` in `supabase/config.toml`. Behavior matches implementation; wording may confuse developers reading config directly.
- **Fix**: Clarify prerequisite: global `[auth].enable_signup = false` with `[auth.email].enable_signup = true` for Admin-created test users.
- **Decision**: FIXED

### F7 — Vitest DEV env not explicit for mock provider

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: vitest.config.ts; tests/integration/generation-runs-api-contracts.test.ts:34
- **Detail**: Mock provider header is honored only when `import.meta.env.DEV` is true in the handler. Tests pass today (Vitest default), but `vitest.config.ts` does not explicitly set `env.DEV`. If DEV were false and `GEMINI_API_KEY` present, tests could hit live AI.
- **Fix**: Set `env: { DEV: "true" }` in `vitest.config.ts` test block (or document constraint in test-plan §6.4).
- **Decision**: FIXED (define import.meta.env.DEV in vitest.config.ts)

### F8 — Auth user accumulation in local Supabase

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/helpers/supabase-session.ts:53–56
- **Detail**: `createTestUser` provisions real auth users via Admin API with no teardown. Acceptable for local integration tests; users accumulate across runs.
- **Fix**: Document cleanup policy in test-plan §6.4 optional note; no code change required now.
- **Decision**: FIXED

## Automated verification log

| Command | Result | Notes |
|---------|--------|-------|
| `npm test` | PASS | 34 passed, 1 skipped (9 files) |
| `npm run build` | PASS | Node 22, Astro build complete |
| `npm run lint` | FAIL | 2 errors in `.cursor/hooks/*.mjs` (pre-existing) |
| `eslint tests/helpers tests/integration/*-contracts.test.ts` | PASS | Change-scoped files clean |

## Manual verification log

| Progress item | Status | Evidence |
|---------------|--------|----------|
| 2.3 Invalid create `?error=` | [x] | User confirmed; test asserts redirect |
| 3.4 Generation rows in Studio | [x] | User confirmed |
| 4.3 §6.4 matches helper names | [x] | Spot-checked §6.4 vs file list — MATCH |
