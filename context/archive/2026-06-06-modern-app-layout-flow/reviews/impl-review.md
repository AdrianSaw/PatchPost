<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Modern App Layout and Flow Redesign

- **Plan**: context/changes/modern-app-layout-flow/plan.md
- **Scope**: Full plan (Phases 0–6)
- **Date**: 2026-06-10
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Automated verification (re-run at review)

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:e2e` | PASS (2 tests: seed + main-flow) |

## Findings

### F1 — Overview hub loads full draft history for one snippet

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/app/projects/[id]/index.astro:18-20
- **Detail**: Hub calls `listProjectDraftHistory()` (limit 50, includes full body columns) and uses only `data[0]` for “Latest draft”. Plan said “optional recent-draft snippet if cheap”.
- **Fix**: Add `getLatestProjectDraft(supabase, projectId)` with `.limit(1)` and snippet-only columns, or skip the section until a cheap query exists.
- **Decision**: FIXED — added `getLatestProjectDraft()` (limit 1); hub uses it with error notice

### F2 — Cosmic orbs/starfield on every app page

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/layouts/AppLayout.astro:27
- **Detail**: `CosmicShell` defaults `showOrbs=true` and `showStarfield=true`. Plan §Performance: “Orbs/starfield CSS only on auth/landing shells”.
- **Fix**: Pass `showOrbs={false} showStarfield={false}` from `AppLayout`, or add an `app` variant in `CosmicShell` that disables decorative layers.
- **Decision**: FIXED — AppLayout passes showOrbs={false} showStarfield={false}

### F3 — Hub silently ignores draft list errors

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/app/projects/[id]/index.astro:19
- **Detail**: `listProjectDraftHistory` error is discarded; transient DB failure hides “Latest draft” with no feedback.
- **Fix**: Destructure `error`; show a small inline notice or omit the section only when `data` is empty and `error` is null.
- **Decision**: FIXED — same hub change surfaces load errors inline

### F4 — Layout default title still “10x Astro Starter”

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/layouts/Layout.astro:10
- **Detail**: Default `title` fallback is `"10x Astro Starter"`. Phase 6 rebranded landing via `index.astro` prop; other pages without explicit title still get starter branding in `<title>`.
- **Fix**: Change default to `"PatchPost"`.
- **Decision**: FIXED — default title set to PatchPost

### F5 — Deprecated Topbar.astro unused

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/Topbar.astro
- **Detail**: Marked deprecated; no remaining imports after BrandTopbar migration.
- **Fix**: Delete `Topbar.astro` or re-export `BrandTopbar` if external refs might exist.
- **Decision**: FIXED — deleted Topbar.astro

### F6 — FeatureCard icon via slot, not prop

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/layout/FeatureCard.astro
- **Detail**: Plan listed `icon` as a prop; implementation uses `<slot name="icon">`. Usage is consistent across sign-in and landing.
- **Fix**: Update plan doc only, or add optional `icon` prop wrapper — no functional change required.
- **Decision**: FIXED — plan contract updated to icon slot

### F7 — cn() used in Astro ProjectSubNav

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/layout/ProjectSubNav.astro:29
- **Detail**: Phase 0 contract: `cn()` for TSX consumers; Astro files should prefer `class:list`.
- **Fix**: Replace `cn()` with `class:list` conditional tuple.
- **Decision**: FIXED — replaced cn() with class:list tuple

### F8 — SubmitButton stacks shadcn variant + btn-cosmic-primary

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/auth/SubmitButton.tsx:27-30
- **Detail**: `Button` default variant applies `bg-primary` while `btn-cosmic-primary` adds `bg-purple-600`. Works inside `.cosmic` scope but stacks competing utilities.
- **Fix**: Use `variant="ghost"` on `Button` or render native `<button>` with `btn-cosmic-primary` only.
- **Decision**: FIXED — Button uses variant="ghost"
