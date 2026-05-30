<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Projects CRUD core

- **Plan**: context/changes/projects-crud-core/plan.md
- **Mode**: Deep
- **Date**: 2026-05-30
- **Verdict**: SOUND
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

Grounding: 5/5 planned new paths correctly absent (to be created), 4/4 existing symbols ✓ (`listProjects`, `createProject`, `createProjectSchema`, `defaultToneSchema`), brief↔plan ✓. Progress↔Phase: 3 phases matched; all Success Criteria items covered in Progress; no checkboxes outside `## Progress`.

## Findings

### F1 — `_action` must not reach `updateProject` input

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — `src/pages/api/projects/[id].ts`
- **Detail**: Plan specifies hidden `_action=update|delete` in formData. `updateProjectSchema` is a strict Zod object — passing `_action` through to `updateProject()` will fail validation. Critical Details mention `_action` but the API route contract does not say to strip it before calling the service.
- **Fix**: Add to Phase 3 API contract: parse `_action` first; for `update`, build input from only `name`, `description`, `repo_url`, `default_tone` keys before `updateProject`.
- **Decision**: FIXED

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 — `src/pages/app/projects/index.astro`
- **Detail**: Plan calls `listProjects(createClient(...))` but does not specify behavior when `createClient` returns null (missing Supabase env) or when Supabase returns `{ error }`. Dashboard today only reads `Astro.locals.user`; no page-level Supabase fetch precedent exists. Implementer may ship a blank page or throw.
- **Fix A ⭐ Recommended**: Add Phase 1 contract lines — null client → redirect or error banner matching auth config pattern; DB error → user-safe message with retry link, not silent empty list
  - Strength: Matches `signin.ts:28-29` null-client handling; avoids masking outages as empty state.
  - Tradeoff: Slightly more UI work in Phase 1.
  - Confidence: HIGH — same env failure mode as auth.
  - Blind spot: None significant.
- **Fix B**: Treat any list error as empty state
  - Strength: Minimal Phase 1 code.
  - Tradeoff: Hides misconfiguration and DB failures.
  - Confidence: MED — poor ops/debug UX.
  - Blind spot: CI build uses secrets; local dev without env may confuse.
- **Decision**: FIXED (Fix A)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Out of phase scope — `AGENTS.md`, `README.md`
- **Detail**: After S-02, `AGENTS.md:23` cites `dashboard.astro` as protected example; README smoke steps mention `/dashboard`. Plan does not include doc updates. Not blocking implementation.
- **Fix**: Optional one-liner in Phase 1 or epilogue: update AGENTS.md protected example to `/app/projects`.
- **Decision**: FIXED
