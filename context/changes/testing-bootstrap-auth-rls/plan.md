# Bootstrap runner and auth boundaries — Implementation Plan

## Overview

Implement test-plan Phase 1 (`context/foundation/test-plan.md`): add Vitest, a local-Supabase test harness, and integration tests for **Risk #1** (cross-owner IDOR via RLS) and **Risk #2** (unauthenticated API mutation). No Playwright, no CI wiring (test-plan Phase 4), no dev smoke route tests (test-plan §7).

## Current State Analysis

- **Test base:** none — no `test` script, no Vitest/Playwright config, zero `*.test.ts` files (`AGENTS.md` § Testing).
- **CI:** lint + build only (`.github/workflows/ci.yml`).
- **Auth model:** middleware returns **401 JSON** for unauthenticated `/api/*` (`src/middleware.ts:46-51`); each mutation handler calls `getUser()` again.
- **Authorization model:** RLS enforces ownership; services filter by `id` / `project_id` only (`src/lib/services/projects.ts` et al.).
- **Mutation routes:** 5 production routes (4 POST + 1 PATCH) — see `context/changes/testing-bootstrap-auth-rls/research.md`.

### Key Discoveries:

- `POST /api/projects/[id]` update/delete has **no `getProjectById` pre-check** — highest handler gap; RLS is the enforcement (`research.md`).
- Form routes redirect on missing auth; JSON routes return `401` — tests must cover **middleware first** (401 JSON), not handler redirect alone.
- `createClient` reads `astro:env/server` — Vitest needs env stub + `.env.local` values from local Supabase.

## Desired End State

1. `npm test` runs Vitest against local Supabase (documented prerequisite).
2. Unauthenticated POST/PATCH to all 5 mutation routes → **401** and **no DB mutation**.
3. Two-user integration tests prove User B cannot read/update/delete User A's project (and at least one child row type).
4. `projects/[id]` form POST cross-owner update/delete blocked at DB layer.
5. `context/foundation/test-plan.md` §6.1–6.2 filled with cookbook patterns; `AGENTS.md` § Testing updated.

### Verification

- **Automated:** `npm test`, `npm run lint`, `npm run build`
- **Manual:** run tests with fresh `supabase db reset` + two users; confirm failures if Supabase stopped

## What We're NOT Doing

- Playwright / E2E (test-plan Phase 4)
- CI test gate (test-plan Phase 4)
- Generation guardrail tests (test-plan Phase 3)
- Dev smoke routes (`/api/dev/*`) — test-plan §7
- Refactoring `createClient` for testability beyond Vitest env alias
- Service-role bypass tests (production uses user JWT + RLS)

## Implementation Approach

Three vertical phases: (1) runner + harness, (2) Risk #2 unauthenticated matrix, (3) Risk #1 cross-owner + cookbook closeout. Use **real local Supabase + real JWTs** (not mocked RLS). Provision two users per test file via Auth API (`signUp` / `signInWithPassword`) with unique emails — no committed passwords.

Test layout: top-level `tests/` (matches product plan convention in `README_PatchPost_plan.md`):

- `tests/setup.ts` — load `.env.local`, skip suite with clear message if Supabase unreachable
- `tests/helpers/supabase-session.ts` — sign in user, return `{ client, accessToken, cookies }`
- `tests/helpers/api-context.ts` — build minimal Astro `APIContext` for route handler imports
- `tests/helpers/middleware-request.ts` — invoke `onRequest` from `src/middleware.ts`
- `tests/integration/auth-api-unauthenticated.test.ts`
- `tests/integration/rls-cross-owner.test.ts`
- `tests/integration/projects-api-cross-owner.test.ts`

## Critical Implementation Details

- **Prerequisite gate:** Integration tests require `npm run supabase:start` and `.env.local` with `SUPABASE_URL` + publishable `SUPABASE_KEY`. `tests/setup.ts` must fail fast with a one-line instruction, not opaque connection errors.
- **Vitest + `astro:env/server`:** Configure Vitest alias or `vi.stubEnv` so `createClient` receives the same vars as dev. Do not commit secrets.
- **Middleware vs handler:** Unauthenticated API tests call **middleware** with bare `Request` — expect 401 JSON before importing handlers. Handler-only tests with empty cookies are a secondary check for routes that might bypass middleware in future refactors.
- **Cross-owner assertions:** Expect `null` data, empty lists, or zero row updates — not HTTP 403. Match product semantics (no existence leak).

## Phase 1: Vitest bootstrap and test harness

### Overview

Add test runner, env wiring, shared helpers, and documentation so later phases only add test files.

### Changes Required:

#### 1. Vitest dependency and scripts

**File**: `package.json`

**Intent**: Make `npm test` the canonical test entry.

**Contract**: Add `vitest` devDependency; scripts `"test": "vitest run"`, `"test:watch": "vitest"`. Do not add Playwright yet.

#### 2. Vitest configuration

**File**: `vitest.config.ts`

**Intent**: Run Node integration tests with `@/*` path alias and env compatible with `createClient`.

**Contract**: `test.environment: "node"`; resolve `@` → `./src`; include `tests/**/*.test.ts`; setupFiles `tests/setup.ts`; load env from `.env.local` (and optional `.env`); alias or define `astro:env/server` exports for `SUPABASE_URL`, `SUPABASE_KEY` (optional empty for GEMINI in tests).

#### 3. Test setup and helpers

**Files**: `tests/setup.ts`, `tests/helpers/supabase-session.ts`, `tests/helpers/api-context.ts`, `tests/helpers/middleware-request.ts`

**Intent**: Shared primitives for auth sessions and invoking middleware/handlers.

**Contract**:

- `setup.ts` — verify `SUPABASE_URL` / `SUPABASE_KEY` present; optional ping to Supabase.
- `supabase-session.ts` — `createTestUser(label)`, `signInAs(email, password)`, return Supabase client with user session.
- `api-context.ts` — build `APIContext` with `request`, `params`, `cookies`, `redirect` capture for handler tests.
- `middleware-request.ts` — call `onRequest` with synthetic `context.url.pathname` and headers.

#### 4. Agent onboarding

**File**: `AGENTS.md`

**Intent**: Replace "No test script yet" with accurate commands and local Supabase prerequisite.

**Contract**: Document `npm test`, `npm run test:watch`, prerequisite `supabase:start` + `.env.local`, integration tests live under `tests/integration/`.

#### 5. Human setup note

**File**: `README.md` (Testing subsection only — minimal addition)

**Intent**: Developers know how to run auth integration tests locally.

**Contract**: Short bullet: start Supabase, copy env, `npm test`. Link to test-plan §6 when populated.

### Success Criteria:

#### Automated Verification:

- `npm test` executes (may skip or pass zero tests if harness-only — prefer one smoke test asserting setup loads env)
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- With Supabase running, harness smoke test passes
- With Supabase stopped, tests fail with clear prerequisite message

**Implementation Note**: Pause for human confirmation before Phase 2.

---

## Phase 2: Unauthenticated API boundary tests

### Overview

Lock **Risk #2**: direct mutation without session must not change data.

### Changes Required:

#### 1. Middleware auth matrix

**File**: `tests/integration/auth-api-unauthenticated.test.ts`

**Intent**: Assert middleware blocks unauthenticated mutation on all production API paths.

**Contract**: For each route below, send request **without** session cookies via `middleware-request` helper; expect status **401** and body `{ error: "Not authenticated" }`:

| Method | Path pattern |
|--------|----------------|
| POST | `/api/projects` |
| POST | `/api/projects/{uuid}` |
| POST | `/api/projects/{uuid}/change-inputs` |
| POST | `/api/projects/{uuid}/generation-runs` |
| PATCH | `/api/projects/{uuid}/drafts/{uuid}` |

Use random valid UUIDs where needed. Snapshot DB row counts or seed marker row before/after — no net change.

#### 2. Handler-level unauthenticated checks (subset)

**File**: same test file or `tests/integration/auth-api-unauthenticated-handlers.test.ts`

**Intent**: Guard against future middleware bypass — handlers must not mutate without user.

**Contract**: Invoke at least **one JSON route** (`change-inputs`) and **one form route** (`projects/[id]`) handler directly with empty cookies; expect 401 JSON or redirect without DB side effect. Document that middleware is primary gate; handler check is regression guard.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes

#### Manual Verification:

- Temporarily comment middleware 401 block locally — test fails (proves test has signal)

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Cross-owner access and cookbook closeout

### Overview

Lock **Risk #1** at RLS + highest-gap handler; update test-plan cookbook.

### Changes Required:

#### 1. RLS cross-owner service tests

**File**: `tests/integration/rls-cross-owner.test.ts`

**Intent**: Prove User B cannot access User A's data through service layer + RLS.

**Contract**: In `beforeAll`, create User A and User B; User A creates a project (+ one `change_input` via service or API). As User B's client:

- `getProjectById` → `null`
- `listProjects` → does not include A's project id
- `updateProject` / `deleteProject` on A's id → no row change (verify row still exists as A)
- `getChangeInputById` on A's input → `null` (or list by A's project id empty)

Use services from `@/lib/services/projects` and `@/lib/services/change-inputs` with session-scoped Supabase clients.

#### 2. Projects API cross-owner form POST

**File**: `tests/integration/projects-api-cross-owner.test.ts`

**Intent**: Exercise `POST /api/projects/[id]` update/delete without `getProjectById` — user's top fear.

**Contract**: User A creates project; User B session POSTs form with `_action=update` and `_action=delete` to A's project id; assert A's project unchanged (name/row exists); delete does not remove row.

#### 3. Test-plan cookbook update

**File**: `context/foundation/test-plan.md` §6.1 and §6.2

**Intent**: Fulfill test-plan requirement that final sub-phase updates cookbook.

**Contract**: Replace TBD placeholders with: test file locations, `npm test` command, mocking policy (real Supabase local only; no internal module mocks), reference test file paths from this change.

#### 4. Test-plan Phase 1 status

**File**: `context/foundation/test-plan.md` §3 row 1

**Intent**: Mark rollout phase complete after implementation.

**Contract**: Status → `complete`; note change folder path. (Done during `/10x-implement` phase-end ritual or epilogue.)

### Success Criteria:

#### Automated Verification:

- `npm test` passes (full integration suite)
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Run `npx supabase db reset` then `npm test` — still passes (tests self-provision users)
- Spot-check in Supabase Studio: User B has zero rows in A's project

**Implementation Note**: Phase 1 of test-plan rollout complete after this phase.

---

## Testing Strategy

### Unit Tests:

- None in this change — integration tests are the signal for auth/RLS (per test-plan cost × signal).

### Integration Tests:

- `auth-api-unauthenticated.test.ts` — Risk #2 middleware matrix
- `rls-cross-owner.test.ts` — Risk #1 services + RLS
- `projects-api-cross-owner.test.ts` — Risk #1 handler gap

### Manual Testing Steps:

1. Stop Supabase → `npm test` prints prerequisite error.
2. Start Supabase → full suite green.
3. In Studio, confirm two test users and isolated project ownership.

## Performance Considerations

Integration tests hit local Docker Supabase — acceptable for MVP. Keep suite under ~30s; use single `beforeAll` provisioning per file, not per test.

## Migration Notes

No database migrations. Tests must run against F-02 schema already in `supabase/migrations/`.

## References

- Test plan: `context/foundation/test-plan.md`
- Research: `context/changes/testing-bootstrap-auth-rls/research.md`
- Middleware: `src/middleware.ts`
- RLS migrations: `supabase/migrations/20260530103000_create_projects.sql`, `20260530120000_create_project_children.sql`, `20260530143000_harden_child_insert_created_by.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Vitest bootstrap and test harness

#### Automated

- [x] 1.1 `npm test` runs with setup/harness — 2e95aa5
- [x] 1.2 Lint passes: `npm run lint` — 2e95aa5
- [x] 1.3 Production build passes: `npm run build` — 2e95aa5

#### Manual

- [x] 1.4 Harness works with Supabase up; clear error when Supabase down

### Phase 2: Unauthenticated API boundary tests

#### Automated

- [x] 2.1 `npm test` passes (includes unauthenticated matrix) — 94ca577
- [x] 2.2 Lint passes: `npm run lint` — 94ca577

#### Manual

- [x] 2.3 Middleware 401 test fails if auth gate removed locally

### Phase 3: Cross-owner access and cookbook closeout

#### Automated

- [x] 3.1 Full `npm test` passes — e52d4fd
- [x] 3.2 Lint passes: `npm run lint` — e52d4fd
- [x] 3.3 Production build passes: `npm run build`

#### Manual

- [x] 3.4 Cross-owner isolation verified after `db reset` + test run
