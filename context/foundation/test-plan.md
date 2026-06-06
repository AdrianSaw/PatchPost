# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-06

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic assertion that already catches the
   regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about cross-tenant access via UUID" or "API routes may skip
   auth while middleware looks sufficient" carry the same weight as PRD
   lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. The Source column cites the *evidence that
surfaced this risk* — never a specific file as "where the failure lives".

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | User A reads or mutates User B's project, change input, run, or draft by swapping UUIDs while authenticated | High | High | interview Q1; PRD Access Control + FR-002; hot-spot dir `src/pages/api/` (sustained churn) |
| 2 | Unauthenticated or session-less client calls a mutation API via direct POST despite catch-all page protection | High | High | interview Q2; AGENTS.md middleware allowlist pattern; hot-spot dir `src/lib/services/` |
| 3 | Generated player-facing copy includes claims not present in the user's manual change input | High | Medium | PRD guardrails + FR-004 + Business Logic; archive S-03 / F-01 plans |
| 4 | Generation/classification behaves correctly under mock AI but fails or degrades under live Gemini in production | Medium | Medium | PRD FR-004; tech-stack `has_ai`; hot-spot dir `src/lib/ai/` |
| 5 | Form POST create/update/generate appears to succeed but nothing is persisted, or errors redirect without surfacing a safe message | Medium | High | interview Q3; US-01 acceptance criteria; hot-spot dirs `src/pages/api/` + `src/pages/app/` |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Authenticated user B cannot read, update, delete, or list A's project-scoped rows; invalid UUID returns same not-found shape as foreign UUID | "Logged in" equals "authorized for this resource" | RLS policies per table; service query filters; every `/api/projects/[id]/…` handler; session cookie shape | integration (Supabase + handler) | happy-path-only as owner; testing middleware redirect instead of API boundary |
| #2 | Direct POST without session returns sign-in redirect or 401-equivalent; no row mutation occurs | "Middleware protects `/app/*`" protects mutations | Public allowlist in middleware; which API routes exist; whether handlers call `getUser()` | integration per mutation route | assuming Astro page gate covers API; testing GET only |
| #3 | Output text is derivable from submitted manual input; classification labels do not invent features | "Prompt says don't hallucinate" means tests pass | Manual input → classification → generation chain; mock vs live provider boundary; persisted draft content | unit on pure functions + integration on mock provider | asserting snapshot of full LLM output; oracle copied from implementation |
| #4 | Same fixture input produces structurally valid output under mock and live smoke path; failures surface user-safe errors | mock green implies prod green | Provider factory; env gating; error mapping to redirects | integration (mock) + tagged manual/smoke for live | running live Gemini in CI by default |
| #5 | Successful POST redirects to a resource that exists on reload; validation errors return with `?error=`; DB row matches form | redirect status code equals success | Form fields per route; Zod messages; redirect targets | integration (handler + DB) | testing React form only without POST handler |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Bootstrap runner and auth boundaries | Add Vitest + first integration tests for session auth and cross-owner access | #1, #2 | unit + integration | complete | context/changes/testing-bootstrap-auth-rls |
| 2 | API handler contracts | Cover form POST mutation routes for auth, validation redirects, and persistence | #2, #5 | integration | complete | context/changes/testing-api-handler-contracts |
| 3 | Generation guardrails | Lock no-hallucination and mock-provider behavior for classification + generation | #3, #4 | unit + integration | not started | — |
| 4 | Quality gates and north-star e2e | Wire tests into CI; optional Playwright for login → project → manual → generate → save | cross-cutting | gates + e2e | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | ^3.2.4 | `npm test` / `npm run test:watch`; integration tests require local Supabase |
| API / DB boundary | Supabase local + test client | CLI 2.x | Use `npm run supabase:start` profile; reset between integration files |
| HTTP mocking | MSW (optional) | none yet | Prefer real handler + local Supabase over mocking internal modules |
| e2e | Playwright | none yet | Planned in AGENTS.md; land in Phase 4 for US-01 path only |
| accessibility | none | — | Out of scope until core auth/generation floor exists |

**Stack grounding tools (current session):**
- Docs: none (Context7 / framework docs MCP not exposed this session) — skipped; checked: 2026-06-03
- Search: agent WebSearch available (no Exa.ai MCP) — used for stack conventions only; checked: 2026-06-03
- Runtime/browser: cursor-ide-browser MCP available — candidate for Phase 4 exploratory e2e, not Phase 1; checked: 2026-06-03
- Provider/platform: Cloudflare MCP listed in AGENTS.md `.mcp.json` but not connected this session — CI gate relevance only; checked: 2026-06-03

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI | required | syntactic / type drift (already in `.github/workflows/ci.yml`) |
| unit + integration | local + CI | required after §3 Phase 1 | logic and auth regressions |
| e2e on critical flows | CI on PR | required after §3 Phase 4 | broken north-star user path |
| production build | local + CI | required | SSR/env wiring regressions (already in CI) |
| post-edit hook | local (agent loop) | planned after Phase 4 | regressions at edit time |
| pre-prod smoke | manual | optional | Cloudflare + hosted Supabase env mismatches |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships.

### 6.1 Adding a unit test

No dedicated unit-test files yet — Phase 1 rollout focused on auth/RLS **integration** tests (Risk #1–#2). When adding a unit test:

1. Place pure-function tests next to the module or under `tests/unit/` (convention TBD in Phase 3 generation guardrails).
2. Run `npm test` — Vitest picks up `tests/**/*.test.ts`.
3. Do **not** mock Supabase or RLS for auth boundaries; use integration tests in `tests/integration/` instead.

Reference: `context/changes/testing-bootstrap-auth-rls/` (Vitest bootstrap).

### 6.2 Adding an integration test

Integration tests use **real local Supabase** (Docker via `npm run supabase:start`) and real JWT sessions — no internal module mocks for auth/RLS.

**Prerequisites**

1. `npm run supabase:start`
2. Copy `.env.local.example` → `.env.local` with Publishable `SUPABASE_KEY` from CLI output
3. `npm test`

**Layout**

| Path | Purpose |
|------|---------|
| `tests/setup.ts` | Loads `.env` + `.env.local`; `assertSupabaseReachable()` fails fast with one-line instructions |
| `tests/helpers/supabase-session.ts` | `createTestUser()`, `signInAs()` — Admin API when `SUPABASE_SERVICE_ROLE_KEY` set (invite-only local) |
| `tests/helpers/api-context.ts` | Build minimal Astro `APIContext` for handler imports |
| `tests/helpers/json-api-context.ts` | JSON POST/PATCH with `Content-Type` + serialized body |
| `tests/helpers/authenticated-api-context.ts` | Form POST with session cookies pre-applied |
| `tests/helpers/seed-fixtures.ts` | `seedProject`, `seedChangeInput`, `seedDraftViaGeneration` |
| `tests/helpers/redirect-assertions.ts` | Presence-only `?error=` and success redirect helpers |
| `tests/helpers/middleware-request.ts` | Invoke `src/middleware.ts` without dev server |
| `tests/integration/*.test.ts` | Integration suites |

**Commands:** `npm test` (single run), `npm run test:watch`.

**Existing suites (Risk #1–#2)**

- `tests/integration/auth-api-unauthenticated.test.ts` — unauthenticated middleware matrix + handler guards
- `tests/integration/rls-cross-owner.test.ts` — two-user RLS via services
- `tests/integration/projects-api-cross-owner.test.ts` — cross-owner form POST on `POST /api/projects/[id]`
- `tests/integration/harness-smoke.test.ts` — env + middleware smoke

**Existing suites (Risk #2, #5 — handler contracts)**

- `tests/integration/projects-form-post-contracts.test.ts` — owner form POST create/update/delete + validation redirects
- `tests/integration/change-inputs-api-contracts.test.ts` — JSON create + 422 validation
- `tests/integration/generation-runs-api-contracts.test.ts` — mock provider persistence + 422 validation
- `tests/integration/drafts-api-contracts.test.ts` — PATCH persistence + 422 validation
- `tests/integration/helpers-import.test.ts` — helper import smoke

**Pattern:** `beforeAll` → `assertSupabaseReachable()` → `createTestUser()` × 2 → act as User B → assert `null`/empty/no row change (not HTTP 403).

**Vitest env:** `vitest.config.ts` aliases `astro:env/server` to `tests/mocks/astro-env-server.ts` (reads `process.env.SUPABASE_*`). `tests/setup.ts` polyfills `WebSocket` via `ws` on Node versions below 22.

**Skip policy:** Cross-owner suites use `describe.skipIf(!hasLocalSupabaseConfig())` when `.env.local` is missing or points at hosted Supabase; auth boundary tests still run. With local config but Docker stopped, `assertSupabaseReachable()` fails with the prerequisite message.

### 6.3 Adding an e2e test

TBD — see §3 Phase 4.

### 6.4 Adding a test for a new API endpoint

Use this recipe when adding integration coverage for a new mutation route (form POST or JSON). See `context/changes/testing-api-handler-contracts/` for reference implementations.

**Prerequisites**

1. `npm run supabase:start`
2. `.env.local` with local `SUPABASE_URL`, Publishable `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Secret from `npx supabase status`) — required for invite-only local Auth (`enable_signup = false`)
3. `npm test`

**Steps**

1. **Pick the handler style**
   - **Form POST + redirects:** `createAuthenticatedFormContext(session, { method: "POST", pathname, params, body: formData })` — capture `redirects[]`; assert `?error=` with `expectFormErrorRedirect` (presence only) or success path with `expectRedirectToProject`.
   - **JSON POST/PATCH:** `createJsonApiContext(session, { pathname, params, body, method?, extraHeaders? })` — assert `response.status` and `await response.json()`; validation failures expect `422` and `{ error: string }`.

2. **Provision data** — `beforeAll`: `assertSupabaseReachable()` → `vi.stubEnv("SUPABASE_URL"|"SUPABASE_KEY", …)` → `createTestUser()` → `seedProject` / `seedChangeInput` as needed. For generation routes, pass `x-dev-mock-provider: 1` in DEV.

3. **Invoke handler** — import `POST`/`PATCH` from `src/pages/api/...` and call with `context` (no dev server).

4. **Assert HTTP contract** — redirects or status/body per step 1.

5. **Assert DB state** — read back via owner's `session.client` and existing `@/lib/services/*` getters (`getProjectById`, `listChangeInputsByProject`, etc.). Validation cases: row count or field unchanged.

6. **File placement** — add `tests/integration/<feature>-api-contracts.test.ts`; wrap in `describe.skipIf(!hasLocalSupabaseConfig())` when the suite needs Docker.

**Do not** duplicate unauthenticated middleware matrix tests (`auth-api-unauthenticated.test.ts`) or cross-owner RLS suites unless the new route introduces a new authorization shape.

### 6.5 Adding a test for generation output guardrails

TBD — see §3 Phase 3 for manual-input-only output and mock-provider contract.

### 6.6 Per-rollout-phase notes

**Phase 1 — `context/archive/2026-06-03-testing-bootstrap-auth-rls` (complete):** Vitest + local Supabase harness; integration coverage for Risks #1 (cross-owner IDOR) and #2 (unauthenticated API mutation). Supporting extras: `ws` WebSocket polyfill (Node below 22), `mock-cookies.ts`, `astro-middleware.ts` mock. No Playwright, no CI test gate yet (test-plan Phase 4).

**Phase 2 — `context/changes/testing-api-handler-contracts` (complete):** Owner happy-path + validation contracts for all five mutation handlers (form + JSON); shared seed/redirect/json helpers; §6.4 cookbook. Invite-only local Auth: tests use Admin API via `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. CI test gate still deferred (test-plan Phase 4).

## 7. What We Deliberately Don't Test

Exclusions from Phase 2 interview Q5. Re-evaluate if assumptions change.

- **Marketing / landing pages** — low blast radius, rarely change. (Source: Phase 2 interview Q5.)
- **shadcn UI component styling** — snapshot churn with little product signal. (Source: Phase 2 interview Q5.)
- **Dev smoke routes (`/api/dev/...`)** — internal-only, not user-facing prod paths. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-03
- Stack versions last verified: 2026-06-03
- AI-native tool references last verified: 2026-06-03

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
