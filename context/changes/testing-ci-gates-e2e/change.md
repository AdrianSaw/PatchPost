---
change_id: testing-ci-gates-e2e
title: Testing CI gates and e2e
status: implementing
created: 2026-06-06
updated: 2026-05-27
archived_at: null
---

## Notes

Planning decisions (2026-06-06): CI Strategy B (Supabase in GHA); Playwright bootstrap with `seed.spec.ts` before `/10x-e2e` for `main-flow.spec.ts`; minimal US-01 with mock AI via `dev:local`. See `research.md` Planning decisions table.

**Re-plan (2026-05-27):** Phase 1 implementation attempted `npm run typecheck` in CI; `astro check` reports ~25 pre-existing TypeScript errors in `src/` and `tests/`. Typecheck is **intentionally deferred** to **Phase 2 (CI typecheck gate)** so PRs are not blocked. Phase 1 ships Vitest + Supabase CI only; `.github/workflows/ci.yml` has a TODO comment where typecheck will return.
