# Testing API Handler Contracts Implementation Plan

## Overview

Add integration tests for all five mutation API handlers, proving **Risk #5** protection: authenticated owner actions persist to Supabase and validation failures surface safely (redirect `?error=` or JSON 422) without mutating data. Reuses Phase 1 Vitest harness; fills test-plan **§6.4** and marks Rollout Phase 2 complete.

## Current State Analysis

Phase 1 covers unauthenticated middleware matrix (`auth-api-unauthenticated.test.ts`), cross-owner RLS via services (`rls-cross-owner.test.ts`), and cross-owner form POST on `POST /api/projects/[id]` (`projects-api-cross-owner.test.ts`). Gaps:

| Handler | Phase 1 | Phase 2 need |
|---------|---------|--------------|
| `POST /api/projects` | Middleware 401 only | Owner create + validation redirect + DB row |
| `POST /api/projects/[id]` | Cross-owner update/delete | Owner update/delete happy path + invalid `_action` |
| `POST .../change-inputs` | Handler 401 guard | Owner 201 + 422 + DB |
| `POST .../generation-runs` | Middleware 401 only | Mock provider 201 + rows; 422 + no rows |
| `PATCH .../drafts/[draftId]` | Middleware 401 only | Owner 200 + DB; 422 + unchanged |

**Key discoveries:**

- Form routes redirect on success/error (`src/pages/api/projects/index.ts`, `[id].ts`); JSON routes use `jsonResponse` / `jsonError` (`change-inputs.ts`, `generation-runs.ts`, `drafts/[draftId].ts`).
- Project form fields parsed in `src/lib/api/project-form.ts:30-36`; empty `name` flows to service validation.
- Generation mock path: `import.meta.env.DEV && x-dev-mock-provider: 1` → `mockProvider` (`generation-runs.ts:61-62`).
- `createApiContext` already supports `body` + `headers` (`tests/helpers/api-context.ts`); JSON tests must set `Content-Type: application/json`.
- Cross-owner delete: handler redirects to `/app/projects` even when RLS deletes 0 rows — **document in tests**, do not fix handler in this change.

## Desired End State

- Four new integration files under `tests/integration/` exercise owner happy paths and validation failures per handler.
- Shared helpers under `tests/helpers/` reduce duplication for seeding and redirect/JSON assertions.
- `npm test` passes locally with Supabase; contract suites skip without `.env.local` (Phase 1 policy).
- `context/foundation/test-plan.md` §6.4 filled; §3 Phase 2 status `complete` with change folder pointer.

### Verification

- Automated: `npm test`, `npm run lint`, `npm run build` (Node 22+).
- Manual: Run full suite after `npx supabase db reset` with `.env.local`; spot-check one form redirect in browser optional.

## What We're NOT Doing

- Playwright or CI test gate (test-plan Phase 4).
- Exact error message string matching (presence-only oracle).
- Output text / hallucination guardrails (Phase 3).
- Handler refactors (e.g. error redirect on failed delete).
- Duplicating Phase 1 unauth matrix or cross-owner RLS service tests.
- Unit tests or MSW mocks for internal modules.
- Dev smoke routes (`/api/dev/...`).

## Implementation Approach

Extend Phase 1 patterns: `describe.skipIf(!hasLocalSupabaseConfig())`, `beforeAll` → `assertSupabaseReachable()` → `createTestUser()`, invoke handlers via `createApiContext` with real session cookies, assert **HTTP contract + DB state** via the owner's Supabase client and existing service read functions.

Split work: helpers first, form contracts (highest Risk #5 signal for redirects), JSON contracts (including mock generation), then cookbook/docs.

## Critical Implementation Details

**Vitest `import.meta.env.DEV`:** The mock provider branch in `generation-runs.ts` requires `import.meta.env.DEV` to be truthy. Confirm in Phase 3 that Vitest runs with DEV=true (default for `vitest run` in this project) before relying on `x-dev-mock-provider: 1`. If false, set `env` in `vitest.config.ts` for integration tests only.

**JSON requests:** Handlers call `parseJsonBody` which reads `request.json()`. Tests must pass `JSON.stringify(body)` as `body` and set header `Content-Type: application/json` in `createApiContext({ headers: { "Content-Type": "application/json" } })`.

**Project create redirect target:** Success redirect is `/app/projects/${uuid}` — extract UUID from redirect path for DB lookup, do not assume redirect order beyond last push to `redirects[]`.

## Phase 1: Shared Test Helpers

### Overview

Add reusable seed and assertion helpers so route contract tests stay focused on behavior, not setup boilerplate.

### Changes Required:

#### 1. Seed fixtures

**File**: `tests/helpers/seed-fixtures.ts`

**Intent**: Provide `seedProject(session)`, `seedChangeInput(session, projectId)`, and `seedDraftViaGeneration(session, projectId)` (or equivalent) returning ids for downstream tests.

**Contract**: Uses existing service functions (`createProject`, `createChangeInput`, optionally `runGenerationWorkflow` with mock provider or direct service inserts). Accepts `TestUserSession` from `supabase-session.ts`.

#### 2. Redirect assertions

**File**: `tests/helpers/redirect-assertions.ts`

**Intent**: Centralize presence-only redirect checks aligned with the validation oracle decision.

**Contract**: Exports at minimum: `expectFormErrorRedirect(redirects, pathPrefix)` (URL contains `?error=`), `expectRedirectToProject(redirects, projectId)`, `expectRedirectToProjectsList(redirects)`. No exact message decoding.

#### 3. JSON API context helper

**File**: `tests/helpers/json-api-context.ts` (or extend `api-context.ts`)

**Intent**: Wrap `createApiContext` for JSON POST/PATCH with correct headers and serialized body.

**Contract**: `createJsonApiContext(session, { method, pathname, params, body, extraHeaders? })` returns same `{ context, redirects }` shape.

#### 4. Optional authenticated wrapper

**File**: `tests/helpers/authenticated-api-context.ts`

**Intent**: Thin convenience: `cookieHeader` from session pre-applied.

**Contract**: Delegates to form or JSON helper; optional if inline is clearer — implementer may fold into json helper only.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on new helper files
- Existing `npm test` suites still pass (no regressions)

#### Manual Verification:

- Helpers are importable from integration tests without circular deps

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Form POST Route Contracts

### Overview

Owner happy-path and validation tests for HTML form mutation routes — core **Risk #5** redirect + persistence coverage.

### Changes Required:

#### 1. Projects form contract suite

**File**: `tests/integration/projects-form-post-contracts.test.ts`

**Intent**: Authenticated owner tests for `POST /api/projects` and `POST /api/projects/[id]` importing handlers from `src/pages/api/projects/index.ts` and `[id].ts`.

**Contract**: Cases (minimum):

| Case | Assert |
|------|--------|
| Valid create | Last redirect matches `/app/projects/{uuid}`; `getProjectById` fields match form |
| Invalid create (empty `name`) | Redirect to `/app/projects/new?error=`; project count unchanged for user |
| Valid update (`_action=update`) | Redirect to `/app/projects/{id}` without `error=`; name updated in DB |
| Valid delete (`_action=delete`) | Redirect to `/app/projects`; row gone for owner |
| Invalid/missing `_action` | Redirect to `/app/projects/{id}?error=`; row unchanged |

Use `FormData`, `createApiContext({ cookieHeader: session.cookieHeader, body: form })`, and redirect assertion helpers.

**Do not duplicate** tests in `auth-api-unauthenticated.test.ts` or `projects-api-cross-owner.test.ts`.

#### 2. Cross-owner delete behavior note

**File**: `tests/integration/projects-form-post-contracts.test.ts` (comment) or reference existing `projects-api-cross-owner.test.ts`

**Intent**: Document that cross-owner delete redirect shape is covered in Phase 1; owner delete happy path is new here.

**Contract**: No handler changes; optional one-line comment linking to Phase 1 false-success behavior.

### Success Criteria:

#### Automated Verification:

- `npm test` passes (including new suite when local env configured)
- `npm run lint` passes

#### Manual Verification:

- Invalid create shows `?error=` in redirect URL when exercised locally

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: JSON API Route Contracts

### Overview

Authenticated owner persistence and validation for JSON mutation handlers, including mock generation workflow.

### Changes Required:

#### 1. Change inputs contract suite

**File**: `tests/integration/change-inputs-api-contracts.test.ts`

**Intent**: Test `POST` handler in `src/pages/api/projects/[id]/change-inputs.ts`.

**Contract**:

- Happy: valid JSON `{ raw_content: "..." }` → `response.status === 201`; body has `changeInput.id`; `getChangeInputById` matches content.
- Validation: empty/missing `raw_content` → `422`; `{ error: string }` in body; no new row in `listChangeInputsByProject`.

#### 2. Generation runs contract suite

**File**: `tests/integration/generation-runs-api-contracts.test.ts`

**Intent**: Test `POST` handler in `src/pages/api/projects/[id]/generation-runs.ts` with mock AI.

**Contract**:

- `beforeAll`: seed project + change input via helpers.
- Happy: POST with valid body + header `x-dev-mock-provider: 1` → `201`; response includes `generationRun` and `generatedOutput` ids; rows exist via `getGenerationRunById` / `getGeneratedOutputById`.
- Validation: invalid `output_type` or bad UUID → `422`; no new generation run for project (count or idempotency check).

Do **not** assert output text content (Phase 3 guardrails).

#### 3. Drafts PATCH contract suite

**File**: `tests/integration/drafts-api-contracts.test.ts`

**Intent**: Test `PATCH` handler in `src/pages/api/projects/[id]/drafts/[draftId].ts`.

**Contract**:

- `beforeAll`: seed project + draft (via generation helper or direct service insert).
- Happy: PATCH `{ edited_content: "updated" }` → `200`; `getGeneratedOutputById` shows new content.
- Validation: `{ edited_content: "" }` → `422`; draft content unchanged.
- Optional: PATCH `{ edited_content: null }` revert → `200`; field null in DB.

### Success Criteria:

#### Automated Verification:

- `npm test` passes with all contract suites
- `npm run lint` passes
- `npm run build` passes (Node 22+)

#### Manual Verification:

- After `npx supabase db reset`, full test run creates expected rows in Studio for one generation case

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Cookbook and Test-Plan Closeout

### Overview

Document patterns for future endpoint tests and mark Rollout Phase 2 complete in the test plan.

### Changes Required:

#### 1. Test-plan §6.4

**File**: `context/foundation/test-plan.md`

**Intent**: Replace TBD with step-by-step recipe: prerequisites → `createTestUser` → form vs JSON context → assert redirects/response → assert DB → link to the four new test files and helpers.

**Contract**: Update §3 Phase 2 row: Status `complete`, Change folder `context/changes/testing-api-handler-contracts` (or archive path after close). Add §6.6 Phase 2 note mirroring Phase 1 format.

#### 2. AGENTS.md testing section

**File**: `AGENTS.md`

**Intent**: List new integration suites under Testing (one line each).

**Contract**: No change to secrets/env rules; pointer only.

#### 3. Epilogue

**File**: `context/changes/testing-api-handler-contracts/change.md`

**Intent**: Set `status: implemented` and `updated` date when all Progress checkboxes complete.

**Contract**: Follow `/10x-implement` epilogue convention.

### Success Criteria:

#### Automated Verification:

- `npm test` and `npm run lint` pass

#### Manual Verification:

- §6.4 readable standalone by a developer adding a new endpoint test

**Implementation Note**: Final phase — ready for `/10x-impl-review` and archive.

---

## Testing Strategy

### Integration Tests (primary)

All new coverage is integration: real Supabase, real JWT sessions, handler imports, DB verification via services.

### Unit Tests

None in this change.

### Manual Testing Steps

1. `npm run supabase:start` + `.env.local`
2. `npx supabase db reset`
3. `npm test` — expect contract suites to run (not skip)
4. Optional: trigger invalid project create in UI and confirm `?error=` matches redirect pattern

## Performance Considerations

Generation mock workflow is the slowest test — keep one happy path per file; avoid redundant full workflow runs in validation cases.

## Migration Notes

No database migrations. Requires F-02 schema from existing `supabase/migrations/`.

## References

- Test plan: `context/foundation/test-plan.md` (§2 Risks #2/#5, §3 Phase 2, §6.4)
- Phase 1 archive: `context/archive/2026-06-03-testing-bootstrap-auth-rls/`
- Form handlers: `src/pages/api/projects/index.ts`, `src/pages/api/projects/[id].ts`
- JSON handlers: `src/pages/api/projects/[id]/change-inputs.ts`, `generation-runs.ts`, `drafts/[draftId].ts`
- Harness: `tests/helpers/api-context.ts`, `tests/helpers/supabase-session.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Shared test helpers

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 368d045
- [x] 1.2 Existing suites still pass: `npm test` — 368d045

#### Manual

- [x] 1.3 Helpers import cleanly from a scratch integration test import — 368d045

### Phase 2: Form POST route contracts

#### Automated

- [ ] 2.1 `npm test` passes (includes `projects-form-post-contracts.test.ts`)
- [ ] 2.2 Lint passes: `npm run lint`

#### Manual

- [ ] 2.3 Invalid create redirect includes `?error=` when run locally

### Phase 3: JSON API route contracts

#### Automated

- [ ] 3.1 `npm test` passes (all four contract suites)
- [ ] 3.2 Lint passes: `npm run lint`
- [ ] 3.3 Production build passes: `npm run build`

#### Manual

- [ ] 3.4 Generation mock run visible in Supabase Studio after test run

### Phase 4: Cookbook and test-plan closeout

#### Automated

- [ ] 4.1 `npm test` passes
- [ ] 4.2 Lint passes: `npm run lint`

#### Manual

- [ ] 4.3 §6.4 recipe matches actual helper and file names
