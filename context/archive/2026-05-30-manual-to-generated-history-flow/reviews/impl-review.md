<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Manual to generated history flow

- **Plan**: context/changes/manual-to-generated-history-flow/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-05-30
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS ✅ |
| Scope Discipline | PASS ✅ |
| Safety & Quality | PASS ✅ |
| Architecture | PASS ✅ |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Unbounded draft history query

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/generated-outputs.ts:73–77
- **Detail**: `listProjectDraftHistory` selects `*` on all drafts with no limit. Full `content`/`edited_content` is fetched for every row though the list UI only needs a ~120-char snippet plus metadata.
- **Fix**: Narrow the select to list columns and add pagination or a reasonable cap (e.g. 50 rows) before draft volume grows.
  - Strength: Matches performance note in plan (“single-query per page load”) without transferring unbounded text.
  - Tradeoff: Requires UI for “show more” or paging if cap is hit.
  - Confidence: HIGH — list page only uses snippet helpers today.
  - Blind spot: Haven’t measured typical draft count in prod.
- **Decision**: FIXED

### F2 — GenerateForm missing try/finally on submit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/generation/GenerateForm.tsx:45–83
- **Detail**: `handleSubmit` awaits fetch calls without `try/catch/finally`. A thrown network error (offline, aborted fetch) leaves `isSubmitting === true` and the form disabled until page reload. Discriminated `{ ok: false }` paths are handled correctly.
- **Fix**: Wrap the async block in `try/catch/finally`; set a generic error in `catch`; always `setIsSubmitting(false)` in `finally`.
- **Decision**: FIXED

### F3 — GenerateForm uses Button instead of planned SubmitButton

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/generation/GenerateForm.tsx:184–200
- **Detail**: Plan specified reuse of `SubmitButton`; implementation uses raw `Button` with inline pending spinner. Behavior matches intent; differs from sibling form pattern.
- **Fix**: Swap to `SubmitButton` for parity with `ProjectForm` and other shadcn form flows.
- **Decision**: FIXED

### F4 — Unused draft-history.ts re-export

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/projects/draft-history.ts:1
- **Detail**: Plan allowed this as an optional re-export location, but nothing imports it — `drafts-page.ts` imports directly from `@/lib/services/generated-outputs`.
- **Fix**: Remove the dead file or wire `drafts-page.ts` through it for consistent layering.
- **Decision**: FIXED (removed dead file)

### F5 — TONE_LABELS duplicated in ProjectForm

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/generation/labels.ts:12–17; src/components/projects/ProjectForm.tsx:13–19
- **Detail**: `labels.ts` centralizes tone labels for generation UI; `ProjectForm` still defines an identical copy. Plan allowed mirroring but drift risk remains.
- **Fix**: Import shared `TONE_LABELS` from `labels.ts` in `ProjectForm`.
- **Decision**: FIXED

### F6 — generate.astro omits apiBase prop

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/app/projects/[id]/generate.astro:36–42
- **Detail**: Plan contract named `apiBase` props passed to `GenerateForm`; paths are hardcoded in `client-api.ts` instead. Functionally equivalent today.
- **Fix**: Pass explicit API path props from the page, or document the hardcoded-client-api deviation in the plan.
- **Decision**: SKIPPED (acceptable deviation)

## Success Criteria Verification

### Automated

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |

### Manual (Progress section)

All Phase 1–3 manual items marked `[x]` with commit SHAs (`d6ca7cf`, `77067c7`, `24e40d1`). User confirmed manual flow before Phase 3 commit. No evidence of rubber-stamping beyond normal MVP manual verification.

## Plan Drift Summary

- **14/14 planned contracts implemented** — 0 MISSING
- **2 minor DRIFT**: `SubmitButton` vs `Button`; `apiBase` prop not wired
- **Benign EXTRA**: `prompt-snapshot.ts`, `draft-text.ts`, typed service getters, `OUTPUT_TYPE_OPTIONS`/`TONE_OPTIONS` — all support planned behavior

## Notes

- Orphan `change_inputs` on generation failure is **plan-accepted MVP behavior** (Critical Implementation Details) — not flagged as a finding.
- Auth, XSS, IDOR guards, and dev-mock gating reviewed clean across middleware, loaders, and API routes.
