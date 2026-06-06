# Testing CI Gates and E2E — Plan Brief

> Full plan: `context/changes/testing-ci-gates-e2e/plan.md`
> Research: `context/changes/testing-ci-gates-e2e/research.md`

## What & Why

Close test-plan **Rollout Phase 4**: stop false-green CI (lint/build only while ~24 Vitest integration tests skip), then add Playwright proof of the **US-01** north-star path (login → project → manual input → generate → history) with **mock AI** only.

## Starting Point

Vitest harness from Phases 1–3 (~57 tests locally with Docker). `.github/workflows/ci.yml` has no `npm test` or `typecheck`. No Playwright in `package.json`. test-plan §6.3 is TBD.

## Desired End State

Every PR runs **typecheck + full Vitest + build**; **`npm run test:e2e`** runs **`seed.spec.ts`** (harness) and **`main-flow.spec.ts`** (US-01); CI includes both gates; test-plan §6.3 documents how to add e2e tests.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| CI integration | Strategy B — Supabase in GHA every PR | Full Vitest signal, no skip false-green | Research / User |
| Playwright order | Bootstrap then product test | seed.spec.ts isolates stack failures | User |
| seed.spec.ts | Auth smoke only | Proves webServer + cookies before US-01 | User |
| main-flow.spec.ts | Via `/10x-e2e` (manual fallback) | Skill generates from live app | User |
| E2e scope | Minimal US-01 | Save = persist-on-generate | Research |
| Mock AI | `dev:local` + mock checkbox | Needs `import.meta.env.DEV` | Research |
| Live Gemini / hooks | Out of scope | test-plan anti-patterns | Research |

## Scope

**In scope:** CI Vitest + typecheck; Playwright install/config; `seed.spec.ts`; `main-flow.spec.ts`; e2e in CI; §6.3 cookbook; AGENTS.md CI/e2e notes.

**Out of scope:** Live Gemini in CI; draft edit e2e; post-edit hooks; `REQUIRE_LOCAL_SUPABASE` strict gate (optional later).

## Architecture / Approach

```
Phase 1: ci.yml → supabase start → typecheck + npm test → lint + build (hosted secrets)
Phase 2: playwright.config + seed.spec.ts (signin → /app/projects)
Phase 3: /10x-e2e → main-flow.spec.ts (US-01 mock path)
Phase 4: ci.yml → npm run test:e2e
Phase 5: test-plan §6.3 + Phase 4 complete
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. CI Vitest gate | Full integration tests in GHA | Supabase start time / RAM on runner |
| 2. Playwright bootstrap | install + seed.spec.ts | webServer + Supabase coordination |
| 3. North-star e2e | main-flow via /10x-e2e | Skill absent → manual fallback |
| 4. Playwright in CI | e2e job green on PR | Flaky startup / shared DB |
| 5. Cookbook closeout | §6.3 + test-plan Phase 4 | Doc drift from paths |

**Prerequisites:** Phases 1–3 Vitest on branch `test/rollout-phases` (or merged master); Docker locally and in GHA.

**Estimated effort:** ~4–5 implementation sessions across 5 phases.

## Open Risks & Assumptions

- GHA `ubuntu-latest` may be tight on RAM for Supabase + Astro + Playwright concurrently — may need job split.
- `/10x-e2e` skill may arrive via 10x-cli update; plan includes manual fallback.
- E2e does not replace integration tests for RLS/API — wiring proof only.

## Success Criteria (Summary)

- CI runs full Vitest (integration suites not skipped) on every PR.
- `npm run test:e2e` passes locally with seed + main-flow.
- test-plan §6.3 gives copy-paste recipe for next e2e spec.
