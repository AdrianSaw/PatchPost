<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Project and draft data foundation

- **Plan**: context/changes/project-and-draft-data-foundation/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-05-27
- **Verdict**: NEEDS ATTENTION → triage applied (3 warnings fixed/skipped, 2 observations fixed)
- **Findings**: 0 critical, 3 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS (after F1 fix) |
| Safety & Quality | PASS (after F2/F3 fixes) |
| Architecture | PASS |
| Pattern Consistency | PASS (after F5 fix) |
| Success Criteria | PASS |

## Findings

### F1 — Dev smoke routes ship in production build

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/pages/api/dev/f02-service-smoke.ts:17
- **Detail**: `/api/dev/f02-service-smoke` and `/api/dev/f02-zod-smoke` are included in the production Astro build with no `import.meta.env.DEV` gate. Any authenticated user can hit the service smoke route and perform create/list/delete operations. Plan allowed one-off routes for F-02 manual verification but also lists "HTTP API routes under src/pages/api/" under What We're NOT Doing for product routes.
- **Fix A ⭐ Recommended**: Gate both routes behind `import.meta.env.DEV` (return 404 in production) until S-02 ships real APIs
- **Decision**: FIXED (Fix A — dev-only gate via import.meta.env.DEV)

### F2 — INSERT RLS does not enforce created_by = auth.uid()

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260530120000_create_project_children.sql:67
- **Detail**: `change_inputs_insert_own` and `generation_runs_insert_own` policies verify `project_id` ownership via EXISTS but do not require `created_by = auth.uid()`. A project owner can insert rows attributing `created_by` to another user's UUID. Not a cross-owner data leak, but corrupts audit metadata.
- **Fix**: Add `created_by = (select auth.uid())` to INSERT WITH CHECK on both tables (new migration).
- **Decision**: FIXED (migration `20260530143000_harden_child_insert_created_by.sql`)

### F3 — Cross-project FK references not constrained

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260530120000_create_project_children.sql:18
- **Detail**: `generation_runs.change_input_id` and `generated_outputs.generation_run_id` are single-column FKs with no constraint that the referenced row shares the same `project_id`. RLS only checks the inserting row's `project_id`, so an owner could link a run to another project's change_input UUID (integrity corruption within their writable scope). Services also skip pre-write validation of FK/project alignment.
- **Fix A ⭐ Recommended**: Add service-layer validation in create/update paths — lookup referenced row and reject if `project_id` mismatches
- **Decision**: FIXED (Fix A — validation in generation-runs.ts and generated-outputs.ts)

### F4 — roadmap.md updated with F-03 slice (unplanned in phase file lists)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: context/foundation/roadmap.md
- **Detail**: Phase 2 commit updated roadmap (F-02 → implementing, added F-03 `local-supabase-dev-scripts`). Not listed in any phase "Changes Required" block. Benign progress bookkeeping but outside F-02 deliverable list.
- **Fix**: No action required — acceptable cross-cutting doc update; note in PR description.
- **Decision**: SKIPPED

### F5 — Entity interfaces use loose string for enum columns

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/types.ts:27
- **Detail**: `Project.default_tone`, `GenerationRun.output_type`, etc. are typed as `string | null` while Zod schemas define strict enums. Compile-time drift possible between validated input and row types.
- **Fix**: Narrow interface fields to `DefaultTone`, `OutputType`, `GenerationRunStatus`, `SourceType` inferred from Zod.
- **Decision**: FIXED

### F6 — repo_url validated with z.url() (stricter than plan text column)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/types.ts:69
- **Detail**: Plan describes `repo_url` as optional text metadata; Zod requires a valid URL when present. Empty string fails validation. Stricter but reasonable for MVP.
- **Fix**: Keep `z.url()` but preprocess empty string to null so optional field behaves like plain text.
- **Decision**: FIXED

## Automated verification (re-run 2026-05-27)

| Command | Result |
|---------|--------|
| `npm run lint` | PASS (after triage fixes) |
| `npm run build` | PASS |

## Manual verification (Progress section)

All Phase 1–3 manual Progress items marked `[x]` with commit SHAs. User confirmed Phase 3 smoke routes (`ok: true` responses) in conversation — evidence present.

## Triage summary

| Outcome | Findings |
|---------|----------|
| Fixed | F1 (Fix A), F2, F3 (Fix A), F5, F6 |
| Skipped | F4 |
