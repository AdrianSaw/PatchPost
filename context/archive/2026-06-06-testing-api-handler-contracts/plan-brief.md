# Testing api handler contracts — Plan Brief

> Full plan: `context/changes/testing-api-handler-contracts/plan.md`

## What & Why

Test-plan **Rollout Phase 2** adds integration tests proving mutation API handlers **persist data and surface validation failures** — closing **Risk #5** (form POST appears to succeed but nothing is saved, or errors hide behind redirects) and deepening **Risk #2** owner happy paths beyond Phase 1's unauth/cross-owner gates.

## Starting Point

Phase 1 (`context/archive/2026-06-03-testing-bootstrap-auth-rls/`) shipped Vitest + local Supabase harness, middleware 401 matrix, cross-owner RLS, and cross-owner form POST on `projects/[id]`. **No owner happy-path** or **validation redirect** tests exist. Five mutation handlers: two form+redirect routes and three JSON routes (including `generation-runs` with `x-dev-mock-provider: 1`).

## Desired End State

With local Supabase running, `npm test` includes owner contract suites that assert: successful POST/PATCH → correct redirect or JSON status **and** matching DB rows; invalid input → `?error=` redirect or 422 JSON **with row unchanged**. Test-plan **§6.4** documents the endpoint cookbook pattern. §3 Phase 2 row marked complete.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Route scope | All five mutation handlers | Matches test-plan Phase 2 row | Plan |
| Generation depth | Mock provider persistence only | Proves multi-table write without Gemini | Plan |
| Validation oracle | Presence only (`?error=` / 422, row unchanged) | Stable against copy changes | Plan |
| File layout | One integration file per route family | Matches Phase 1 flat layout | Plan |
| Cross-owner delete | Test current behavior (redirect + row persists) | Documents false-success shape without handler fix | Plan |
| Helpers | Shared seed + redirect helpers + §6.4 closeout | DRY; completes cookbook | Plan |
| CI gate | Deferred to test-plan Phase 4 | Same as Phase 1 skip policy | Test-plan |

## Scope

**In scope:** Shared test helpers; four integration suites; test-plan §6.4 + Phase 2 status; AGENTS.md pointer.

**Out of scope:** Playwright, CI wiring, exact error message strings, output text guardrails (Phase 3), handler refactors (e.g. delete error redirect), unauth matrix duplication, new unit tests.

## Architecture / Approach

```
npm test → existing Vitest harness (Phase 1)
        → new helpers (seed, redirect/json assertions)
        → import APIRoute handlers via createApiContext
        → assert redirects[] OR Response status/body
        → verify DB via owner's Supabase client (services)
```

Form routes use `FormData` + `redirects`. JSON routes set `Content-Type: application/json`. Generation uses `x-dev-mock-provider: 1` header in DEV.

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Shared helpers | Seed fixtures, redirect/JSON helpers | JSON body wiring in `createApiContext` |
| 2. Form POST contracts | Create/update/delete + validation | Missing `?error=` on silent validation skip |
| 3. JSON API contracts | change-inputs, generation-runs, drafts | Generation workflow flakiness without mock header |
| 4. Cookbook closeout | §6.4, test-plan status | Docs drift from actual file names |

**Prerequisites:** Phase 1 harness archived; local Supabase + `.env.local`; Node 22+ for build verification.

**Estimated effort:** ~2 sessions across 4 phases.

## Open Risks & Assumptions

- Suites use `describe.skipIf(!hasLocalSupabaseConfig())` like Phase 1 — green CI without Docker still skips contract tests until Phase 4.
- `import.meta.env.DEV` must be true in Vitest for mock provider header path (verify in Phase 3).
- Cross-owner delete still redirects to `/app/projects` when RLS blocks — documented, not fixed.

## Success Criteria (Summary)

- Owner form POST create/update/delete persists and validation failures leave DB unchanged with `?error=`.
- JSON create/generate/patch returns 201/200 with DB rows; invalid body returns 422 with no row change.
- test-plan §6.4 filled; Phase 2 rollout row complete.
