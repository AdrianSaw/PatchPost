# Bootstrap runner and auth boundaries — Plan Brief

> Full plan: `context/changes/testing-bootstrap-auth-rls/plan.md`
> Research: `context/changes/testing-bootstrap-auth-rls/research.md`

## What & Why

Test-plan Phase 1 adds the first automated safety net for PatchPost: **Vitest + local Supabase integration tests** covering cross-owner access (IDOR) and unauthenticated API mutations — the two risks the team flagged in `/10x-test-plan` interview.

## Starting Point

Zero test infrastructure today (`AGENTS.md`: no `test` script). Auth is middleware + per-handler `getUser()`; authorization is **RLS-first** with services filtering by id only. Research mapped all 5 mutation routes and verified middleware already returns **401 JSON** for unauthenticated `/api/*`.

## Desired End State

Developers run `npm test` (with local Supabase) and get regression signal on: (1) unauthenticated mutations blocked, (2) User B cannot touch User A's project-scoped rows, (3) form POST update/delete on another owner's project id fails at DB layer. Test-plan §6.1–6.2 cookbook documents how to add more tests.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Test runner | Vitest | Matches product plan; fast Node integration | Research / Plan |
| Test location | `tests/integration/` + `tests/helpers/` | Keeps `src/` product-only; matches README plan | Plan |
| User provisioning | Auth API in `beforeAll` (unique emails) | No committed credentials; works after `db reset` | Plan (closes research open Q1) |
| RLS testing | Real JWTs, no mocked Supabase | Only way to catch IDOR; research anti-pattern | Research |
| API handler testing | Manual `APIContext` helper | Simpler than `@astrojs/node` for Phase 1 | Research / Plan |
| CI | Not in this change | Test-plan Phase 4 | Test-plan |
| Child table coverage | `change_inputs` + `projects` | Minimum signal for Risk #1 without full suite | Plan |

## Scope

**In scope:** Vitest, harness, Risk #1 and #2 integration tests, AGENTS.md + README test notes, test-plan §6.1–6.2 cookbook.

**Out of scope:** Playwright, CI wiring, generation tests, dev smoke routes, `createClient` refactor.

## Architecture / Approach

```
npm test → Vitest → tests/setup (env + Supabase gate)
                  → helpers (session, middleware, APIContext)
                  → integration tests → real local Supabase (RLS on)
```

Phase 2 tests middleware 401 matrix. Phase 3 tests two-user RLS via services + form POST on `projects/[id].ts`.

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Vitest bootstrap and harness | `npm test`, helpers, docs | Vitest + `astro:env/server` wiring |
| 2. Unauthenticated API tests | Risk #2 middleware matrix | Tests that don't assert DB unchanged |
| 3. Cross-owner + cookbook | Risk #1 RLS + API; §6 updated | Flaky tests if Supabase not isolated |

**Prerequisites:** F-02 migrations applied locally; `npm run supabase:start`; `.env.local` wired.  
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Integration tests assume local Supabase Docker — not run in CI until Phase 4.
- `astro:env/server` stub in Vitest may need iteration if Astro env API changes.
- Auth API sign-up in tests requires local Supabase auth enabled (default in local stack).

## Success Criteria (Summary)

- `npm test` passes with Supabase running and fails clearly when not.
- All 5 mutation routes reject unauthenticated calls without DB changes.
- Two-user test proves cross-owner project + change_input isolation.
