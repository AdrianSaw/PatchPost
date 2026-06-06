---
date: 2026-06-03T12:00:00+02:00
researcher: Auto
git_commit: 0c1339f5ec44c3af7ec12bc8c797b2b15790f971
branch: master
repository: PatchPost
topic: "Ground test-plan Phase 1 — auth boundaries and cross-owner access (Risks #1, #2)"
tags: [research, testing, auth, rls, idor, api-routes, vitest]
status: complete
last_updated: 2026-06-03
last_updated_by: Auto
---

# Research: Test-plan Phase 1 — auth boundaries and cross-owner access

**Date**: 2026-06-03  
**Researcher**: Auto  
**Git Commit**: [`0c1339f`](https://github.com/AdrianSaw/PatchPost/commit/0c1339f5ec44c3af7ec12bc8c797b2b15790f971)  
**Branch**: master  
**Repository**: AdrianSaw/PatchPost

## Research Question

Ground rollout Phase 1 of [`context/foundation/test-plan.md`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/context/foundation/test-plan.md) for **Risks #1 and #2**:

- **#1** — User A reads or mutates User B's project-scoped resources by swapping UUIDs.
- **#2** — Unauthenticated clients mutate data via direct POST to API routes despite page middleware.

Verify or correct the test-plan response guidance; locate real failure paths, auth layers, and the cheapest useful test layer.

## Summary

PatchPost uses a **defense-in-depth** model: catch-all middleware blocks unauthenticated `/api/*` with **401 JSON**, then each mutation handler calls `supabase.auth.getUser()` again. **Authorization for other users' rows is almost entirely RLS** — services filter by `id` / `project_id` only, not `owner_id`. Cross-owner access should return empty/`null` results, not 403.

**Good news for Risk #2:** Middleware already returns 401 for unauthenticated `/api/*` POSTs ([`middleware.ts:46-51`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/middleware.ts#L46-L51)). All six production mutation handlers re-check auth. No handler relies on middleware alone, but middleware is the first gate.

**Core work for Risk #1:** Integration tests with **two authenticated Supabase users** and local RLS must prove User B cannot SELECT/UPDATE/DELETE User A's `projects`, `change_inputs`, `generation_runs`, or `generated_outputs`. SSR pages already treat missing and forbidden the same (redirect to `/app/projects`) — tests should assert **API + DB behavior**, not page redirects alone.

**Vitest bootstrap:** No test runner exists (`AGENTS.md` § Testing). Phase 1 should add Vitest, use **local Supabase** (`npm run supabase:start`), and invoke Astro `APIRoute` handlers with synthetic `Request` + cookie jars — not Playwright (Phase 4).

**Test-plan correction:** Risk #2 "Must challenge" is valid, but middleware **already** blocks unauthenticated API mutation with 401 JSON (not only page redirect). Phase 1 tests should assert middleware + handler, and guard against **future routes** that skip `getUser()`.

## Detailed Findings

### Middleware and public allowlist

Public paths are explicit ([`middleware.ts:5-11`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/middleware.ts#L5-L11)):

| Constant | Values |
|----------|--------|
| `PUBLIC_EXACT` | `/`, `/favicon.ico` |
| `PUBLIC_PREFIXES` | `/auth/signin`, `/api/auth/signin`, `/api/auth/signout` |
| `STATIC_PREFIXES` | `/_astro/`, `/sitemap` |

All other paths require `context.locals.user` from `getUser()` ([`middleware.ts:36-44`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/middleware.ts#L36-L44)).

Unauthenticated behavior ([`middleware.ts:46-53`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/middleware.ts#L46-L53)):

- **`/api/*`** → `401` JSON `{ "error": "Not authenticated" }`
- **Pages** → redirect `/auth/signin`

**Implication for tests:** Risk #2 is partially mitigated today. Regression tests must POST to each mutation route without session cookies and assert **401 + no DB change**. Do not only test `/app/*` page redirects.

### Production mutation API inventory

No `PUT` or `DELETE` HTTP methods. Deletes use `POST` + `_action=delete`.

| Route | Method | Auth in handler | Unauthenticated response | Pre-mutation ownership check |
|-------|--------|-----------------|--------------------------|------------------------------|
| [`/api/projects`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/index.ts) | POST | `getUser()` L19-26 | redirect `/auth/signin` (middleware 401 first) | N/A (create); sets `owner_id` via `createProject(..., user.id, ...)` |
| [`/api/projects/[id]`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id].ts) | POST | `getUser()` L29-36 | redirect sign-in | UUID only; **no `getProjectById`** — relies on RLS for update/delete |
| [`/api/projects/[id]/change-inputs`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id]/change-inputs.ts) | POST | `getUser()` L26-33 | `401` JSON | `getProjectById` → 404 if missing |
| [`/api/projects/[id]/generation-runs`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id]/generation-runs.ts) | POST | `getUser()` L38-45 | `401` JSON | `getProjectById` → 404 if missing |
| [`/api/projects/[id]/drafts/[draftId]`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id]/drafts/[draftId].ts) | PATCH | `getUser()` L27-34 | `401` JSON | `getProjectById` + draft `project_id` match |

Public mutation endpoints: only auth sign-in/sign-out ([`signin.ts`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/auth/signin.ts), [`signout.ts`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/auth/signout.ts)).

**Dev smoke routes** (`/api/dev/*`) are GET-only and middleware-protected — excluded from test budget per test-plan §7.

### RLS policies (database layer)

All four tables have RLS enabled with full CRUD for `authenticated` role.

**`projects`** ([`20260530103000_create_projects.sql`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/supabase/migrations/20260530103000_create_projects.sql)):

- Direct `owner_id = auth.uid()` on SELECT, INSERT, UPDATE, DELETE.

**Child tables** ([`20260530120000_create_project_children.sql`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/supabase/migrations/20260530120000_create_project_children.sql)):

- Access via `exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())`.
- INSERT on `change_inputs` and `generation_runs` also requires `created_by = auth.uid()` after harden migration ([`20260530143000_harden_child_insert_created_by.sql`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/supabase/migrations/20260530143000_harden_child_insert_created_by.sql)).

**Known RLS gaps (not IDOR, but worth noting for later phases):**

- RLS does not enforce that `generation_runs.change_input_id` belongs to the same `project_id`.
- `generated_outputs` has no `created_by`; ownership is project-scoped only.

For Risk #1, the critical assertion is: **User B's JWT cannot read or write User A's rows** on any of the four tables.

### Service layer (application)

Services in [`src/lib/services/`](https://github.com/AdrianSaw/PatchPost/tree/0c1339f/src/lib/services) do **not** add `.eq("owner_id", userId)` on reads/updates/deletes. They rely on RLS:

- [`getProjectById`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/services/projects.ts#L20-L25) — `.eq("id", projectId).maybeSingle()` → `null` for other owner's row.
- [`updateProject`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/services/projects.ts#L50-L61) / [`deleteProject`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/services/projects.ts#L63-L65) — filter by id only; RLS blocks wrong owner.

App-level checks (not owner checks):

- [`generation-workflow.ts`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/services/generation-workflow.ts) — `changeInput.project_id === input.projectId`.
- Draft PATCH — [`draftId].ts`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id]/drafts/[draftId].ts) checks `draft.project_id !== projectId`.

### SSR pages (not sufficient alone for Phase 1)

[`loadProjectPage`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/projects/project-page.ts#L9-L33) redirects to `/app/projects` for invalid UUID, missing project, or RLS-hidden project — **same response for forbidden and not found** (no leak). Phase 1 should **not** stop at middleware/page tests; API + DB integration is the signal.

## Risk Response Guidance — verified / corrected

| Risk | Test-plan intent | Research verdict | Recommended test focus |
|------|-------------------|------------------|------------------------|
| **#1** | B cannot read/mutate A's rows | **Confirmed.** RLS is the real enforcement; handlers often skip explicit owner check. | Two-user Supabase local: list/get/update/delete across owners on `projects` + one child type (e.g. `change_inputs`). Assert empty/null/error, not 403. |
| **#2** | Direct POST without session must not mutate | **Mostly covered today.** Middleware 401 on `/api/*`; handlers double-check. | Matrix: unauthenticated POST/PATCH to all 5 mutation routes → 401, zero row count change. Guard: new route template must call `getUser()`. |

**Anti-patterns to avoid (unchanged):**

- Testing only middleware redirect on `/app/projects` (misses API).
- Happy-path owner-only tests (misses IDOR).
- Mocking Supabase client internals instead of exercising RLS with real JWTs.

## Cheapest test layer for Phase 1

1. **Add Vitest** (`vitest` devDependency, `npm test` script, `vitest.config.ts`).
2. **Test harness helpers** (new, e.g. `src/test/` or `tests/helpers/`):
   - `createSupabaseClientAsUser(jwt)` — anon key + user access token.
   - `invokeApiRoute(handler, { method, url, formData, cookies })` — wrap Astro `APIRoute` context.
   - `seedTwoUsersAndProject()` — via Supabase admin or pre-seeded SQL fixture after `db reset`.
3. **Integration test files** (suggested order):
   - `auth-api-unauthenticated.test.ts` — Risk #2, all mutation routes.
   - `rls-cross-owner.test.ts` — Risk #1, service + RLS direct (faster than full HTTP).
   - `projects-api-cross-owner.test.ts` — Risk #1, POST update/delete on [`projects/[id].ts`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id].ts) without `getProjectById` (highest handler gap).

**Do not** add Playwright or live Gemini in Phase 1 (test-plan §3 Phase 4).

**CI note:** Current workflow ([`.github/workflows/ci.yml`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/.github/workflows/ci.yml)) runs lint + build only. Phase 4 wires tests; Phase 1 can run locally + document `supabase start` prerequisite.

## Code References

- [`src/middleware.ts:46-51`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/middleware.ts#L46-L51) — 401 JSON for unauthenticated `/api/*`
- [`src/pages/api/projects/[id].ts:18-61`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id].ts#L18-L61) — update/delete without explicit owner lookup
- [`src/lib/services/projects.ts:20-65`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/services/projects.ts#L20-L65) — RLS-only project access
- [`supabase/migrations/20260530103000_create_projects.sql`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/supabase/migrations/20260530103000_create_projects.sql) — project RLS
- [`supabase/migrations/20260530120000_create_project_children.sql`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/supabase/migrations/20260530120000_create_project_children.sql) — child RLS
- [`src/lib/projects/project-page.ts:9-33`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/lib/projects/project-page.ts#L9-L33) — SSR missing/forbidden handling

## Architecture Insights

- **Two auth styles in handlers:** form routes redirect to sign-in; JSON API routes return `401` via `jsonError`. Tests must accept both where middleware does not short-circuit.
- **RLS-first design:** Application code assumes `getProjectById` returning null means "not found" — intentional to avoid IDOR leaks in UI.
- **Highest-risk handler pattern:** [`projects/[id].ts`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/src/pages/api/projects/[id].ts) mutates by UUID without pre-fetch — exactly the pattern the user fears; RLS must stay correct.

## Historical Context (from prior changes)

- [`context/archive/2026-05-30-project-and-draft-data-foundation/plan.md`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/context/archive/2026-05-30-project-and-draft-data-foundation/plan.md) — established RLS + services pattern.
- [`context/archive/2026-05-27-invite-only-signin-gated-access/plan.md`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/context/archive/2026-05-27-invite-only-signin-gated-access/plan.md) — middleware catch-all auth model.
- [`context/archive/2026-05-30-projects-crud-core/plan.md`](https://github.com/AdrianSaw/PatchPost/blob/0c1339f/context/archive/2026-05-30-projects-crud-core/plan.md) — form POST API routes under `/api/projects`.

## Related Research

- None yet under `context/changes/**/research.md` for testing.

## Open Questions

1. **Test user provisioning** — sign up two users via Supabase Auth admin API in `beforeAll`, or SQL seed + known passwords? Needs decision in `/10x-plan` (local-only, no committed credentials).
2. **Astro APIRoute test context** — use `@astrojs/node` adapter test utilities vs manual mock `APIContext`? Research suggests manual context + real Supabase is enough for Phase 1.
3. **Whether to backport test-plan §2** — note middleware already returns 401 JSON for `/api/*` (clarifies Risk #2 response guidance). Optional `/10x-test-plan` backport after plan review.
