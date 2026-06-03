<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Local Supabase dev scripts

- **Plan**: context/changes/local-supabase-dev-scripts/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-05-30
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS ✅ |
| Scope Discipline | PASS ✅ |
| Safety & Quality | WARNING ⚠️ |
| Architecture | PASS ✅ |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — dev:cloud can still pick up local Supabase from .env.local

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: scripts/astro-dev-cloud.mjs:41-56
- **Detail**: Launcher preloads `.env` + `.env.cloud` into `process.env`, then spawns `astro dev`. Vite still loads `.env.local` for keys **not** already set in `process.env`. If `.env.cloud` exists but omits `SUPABASE_*` while `.env.local` has local keys, `dev:cloud` may silently hit Docker Supabase — contradicting the “skips `.env.local`” intent in README/AGENTS.
- **Fix**: After parsing `.env.cloud`, exit 1 unless `SUPABASE_URL` and `SUPABASE_KEY` are non-empty; optionally document that unset keys may still fall through from `.env.local`.
  - Strength: Fail-fast prevents the most common profile-mix mistake.
  - Tradeoff: Stricter than “file exists” check; empty template values need filling before dev:cloud runs.
  - Confidence: HIGH — Astro/Vite dotenv layering is documented behavior.
  - Blind spot: Haven’t verified every Astro 6 env load order edge case in this repo.
- **Decision**: FIXED

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: scripts/astro-dev-cloud.mjs:51-64
- **Detail**: `spawn` has `child.on("exit")` but no `child.on("error")`. If `npx`/`npx.cmd` fails to start, Node can emit an unhandled `error` event.
- **Fix**: Add `child.on("error", (err) => { console.error(err.message); process.exit(1); });`
- **Decision**: FIXED

### F3 — eslint ignore for scripts/*.mjs (unplanned)

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: eslint.config.js:75
- **Detail**: `ignores: ["scripts/**/*.mjs"]` added in p2 so lint passes without a Node globals block. Not in plan; reasonable for a one-off launcher.
- **Fix**: None required — or add a small `scripts` ESLint override with `globals.node` instead of ignore.
- **Decision**: SKIPPED

### F4 — supabase npm scripts use bare CLI not npx

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: package.json:11-12
- **Detail**: `supabase:start` / `supabase:stop` invoke `supabase` directly. README still documents `npx supabase db reset`. User verified `npm run supabase:start` on Windows; works when CLI is on PATH via devDependency hoisting.
- **Fix**: Change to `npx supabase start` / `npx supabase stop` for consistency with docs and PATH portability.
- **Decision**: FIXED
