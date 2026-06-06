# Testing CI Gates and E2E Implementation Plan

## Overview

Close **test-plan Rollout Phase 4**: wire **Vitest + Supabase** into GitHub Actions (no false-green skips), bootstrap **Playwright** with a **`seed.spec.ts` harness**, generate **`main-flow.spec.ts`** via **`/10x-e2e`**, then add **e2e to CI** and fill **§6.3** cookbook. Builds on Phases 1–3 (Vitest harness, handler contracts, generation guardrails).

## Current State Analysis

| Area | Today | Gap |
|------|-------|-----|
| CI (`.github/workflows/ci.yml`) | `npm ci`, `astro sync`, `lint`, `build` with hosted `SUPABASE_*` | No `typecheck`, no `npm test` |
| Vitest locally | ~57 pass / ~2 skip with Docker + `.env.local` | ~24 integration tests skip without local Supabase |
| Playwright | Not in `package.json`; no `tests/e2e/` | US-01 north-star untested in browser |
| test-plan §6.3 | TBD | No e2e recipe |
| `/10x-e2e` skill | Not in repo manifest yet | Phase 4 falls back to manual flow from research if absent |

**Key discoveries:**

- Full integration CI needs **`npx supabase start`** + three env vars including **`SUPABASE_SERVICE_ROLE_KEY`** (`tests/setup.ts`, `supabase/config.toml` invite-only auth).
- Build job **hosted** `SUPABASE_*` secrets must **not** be reused for test env — separate `env:` block with localhost keys.
- E2e mock path requires **`import.meta.env.DEV`** → `npm run dev:local`, not `preview`, unless `AI_PROVIDER=mock` without header.
- US-01 **“save”** = persist on successful generation — no separate save button on generate screen.

## Desired End State

- **CI (Phase 1):** every PR runs `lint`, **full `npm test`** with local Supabase, then `build` (existing hosted secrets for build only). **`npm run typecheck` deferred to Phase 2** (~25 pre-existing `astro check` errors — do not block PRs).
- **CI (Phase 2+):** typecheck runs before tests once errors are fixed.
- **Local e2e:** `npm run test:e2e` runs `seed.spec.ts` (auth smoke) and `main-flow.spec.ts` (US-01 with mock AI).
- **CI e2e:** optional job runs Playwright after Vitest gate (same Supabase + dev server pattern).
- **Docs:** test-plan §3 Phase 4 `complete`, §6.3 filled, Phase 3 archive pointer fixed, AGENTS.md updated.

### Verification

- Automated: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` (local + CI where wired); `npm run typecheck` after Phase 2.
- Manual: one local run of full US-01 path in browser via Playwright; CI green on a PR.

## What We're NOT Doing

- Live Gemini in CI or default e2e (test-plan anti-pattern).
- Draft edit step in north-star e2e (FR-006 nice-to-have).
- Post-edit agent hooks (test-plan §5 — follow-up change).
- `REQUIRE_LOCAL_SUPABASE=1` strict gate (optional hardening — defer unless CI still skips silently).
- Playwright visual snapshots / full LLM output assertions.
- Changing Vitest integration skip policy for local dev without Docker (local ergonomics unchanged).

## Implementation Approach

**Layered delivery** (cost × signal):

1. **CI Vitest** — highest ROI; unblocks merge confidence for Phases 1–3 (test-plan rollout).
2. **CI typecheck** — fix pre-existing `astro check` errors; wire `npm run typecheck` before tests in CI.
3. **Playwright bootstrap** — install, config, **`seed.spec.ts`** only (proves stack).
4. **North-star test** — **`/10x-e2e`** → `main-flow.spec.ts` (or manual equivalent from research).
5. **E2e in CI** — after local green.
6. **Cookbook closeout** — §6.3 + test-plan Phase 4 row.

## Critical Implementation Details

**CI env separation:** In one workflow job, run `npm test` with `SUPABASE_URL=http://127.0.0.1:54321` and keys from `supabase status` **before** or in a step isolated from `npm run build`, which keeps `${{ secrets.SUPABASE_* }}` for Astro build only.

**GHA Supabase:** Ubuntu runner needs Docker (available on `ubuntu-latest`). Allow ~5–10 min for first-time image pull + `supabase start`. Export keys via `npx supabase status -o env` or documented parse step.

**Playwright + Supabase locally:** Prefer `playwright.config.ts` `webServer` array or documented prerequisite: `npm run supabase:start` then `npm run dev:local` — document in §6.3.

**`/10x-e2e`:** If skill missing at implement time, hand-author `main-flow.spec.ts` using research north-star table (signin → new project → generate with mock checkbox → drafts banner). Do not block Phase 4 on skill install.

**Typecheck deferral (re-plan 2026-05-27):** Phase 1 attempted CI typecheck; `astro check` fails with ~25 pre-existing errors in `src/` and `tests/`. Phase 1 ships Vitest CI only; Phase 2 fixes errors and uncomments the CI typecheck step.

---

## Phase 1: CI Vitest Gate

### Overview

Add full Vitest (Supabase Docker) to `.github/workflows/ci.yml`. **Does not include `npm run typecheck`** — deferred to Phase 2 due to pre-existing errors.

### Changes Required:

#### 1. CI workflow — test steps

**File**: `.github/workflows/ci.yml`

**Intent**: Run full test suite with local Supabase before production build; keep build secrets separate from test env.

**Contract**: After `npm ci` and `npx astro sync`: start Supabase (`npx supabase start` or `npm run supabase:start`); export `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for test step; run `npm test`; then run existing `lint` and `build` with `secrets.SUPABASE_*` only on build step. Leave `npm run typecheck` commented with TODO pointing to Phase 2. Do not run live Gemini smoke (remains skipped).

#### 2. Contributor docs

**File**: `AGENTS.md` (Testing / CI section)

**Intent**: Document that CI runs full Vitest with Docker Supabase; local parity unchanged; note typecheck deferred.

**Contract**: One paragraph: CI runs `npm test` with ephemeral local stack; developers still use `.env.local` locally. Playwright remains not wired yet.

#### 3. Optional README

**File**: `README.md`

**Intent**: Align “CI runs tests” with Milestone 12 if section exists.

**Contract**: Brief note that PR CI includes Vitest — only if README already describes CI pipeline. Mention typecheck follow-up if appropriate.

### Success Criteria:

#### Automated Verification:

- Local: `npm run lint`, `npm test` pass with Supabase running
- Workflow YAML valid (no syntax errors)

#### Manual Verification:

- Push branch or `act` dry-run review: test step receives localhost env; build step still uses secrets
- CI run shows integration suites **not skipped** (expect ~54+ pass, live smoke skipped)

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: CI Typecheck Gate

### Overview

Fix pre-existing `astro check` / TypeScript errors (~25 in `src/` and `tests/`), then wire `npm run typecheck` into CI **before** `npm test`.

### Changes Required:

#### 1. Fix TypeScript errors

**Files**: Errors reported by `npm run typecheck` (e.g. `src/lib/services/*.ts`, `src/lib/projects/*.ts`, `tests/helpers/*.ts`, API routes)

**Intent**: `astro check` exits 0 locally without suppressing real issues.

**Contract**: Minimal fixes per error; no unrelated refactors. Test helper mocks may need typed stubs aligned with Astro 6 / Cloudflare adapter types.

#### 2. CI workflow — enable typecheck

**File**: `.github/workflows/ci.yml`

**Intent**: Uncomment or restore `npm run typecheck` step after Supabase env export, before `npm test`. Remove Phase 2 TODO comment.

**Contract**: Same job ordering as Phase 1 plus typecheck between env export and tests.

#### 3. Docs

**Files**: `AGENTS.md`, `README.md`

**Intent**: Remove “typecheck deferred” notes; document full CI gate including typecheck.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes locally
- CI workflow includes typecheck step before Vitest

#### Manual Verification:

- One green CI run with typecheck + Vitest + build

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Playwright Bootstrap (install + seed.spec.ts)

### Overview

Add Playwright dependency, config, auth fixture, and **`tests/e2e/seed.spec.ts`** — harness only, not US-01.

### Changes Required:

#### 1. Dependencies and scripts

**File**: `package.json`

**Intent**: Add `@playwright/test` devDependency; scripts `test:e2e` and optionally `test:e2e:ui`.

**Contract**: `"test:e2e": "playwright test"`; document Node 22+ alignment with repo.

#### 2. Playwright config

**File**: `playwright.config.ts` (repo root)

**Intent**: Configure `baseURL` `http://127.0.0.1:4321`, `webServer` for `npm run dev:local` (and/or document manual Supabase prerequisite), `reuseExistingServer: !process.env.CI`, reasonable timeout for SSR cold start.

**Contract**: Test directory `tests/e2e/`; single project Chromium for MVP; CI-friendly reporters.

#### 3. Auth fixture / global setup

**File**: `tests/e2e/fixtures/auth.ts` and/or `tests/e2e/global-setup.ts`

**Intent**: Reuse invite-only Auth pattern from `tests/helpers/supabase-session.ts` — Admin API create user when `SUPABASE_SERVICE_ROLE_KEY` set.

**Contract**: Export credentials or storage state path for tests; never commit secrets; read env from process (same vars as Vitest).

#### 4. Seed harness spec

**File**: `tests/e2e/seed.spec.ts`

**Intent**: Prove e2e stack: sign in at `/auth/signin` → land on `/app/projects` with authenticated UI (heading or topbar email).

**Contract**: One test; no project create or generate; name/description states “e2e harness smoke”, not product regression.

#### 5. Gitignore

**File**: `.gitignore`

**Intent**: Ignore Playwright artifacts (`test-results/`, `playwright-report/`, `blob-report/`).

**Contract**: Standard Playwright ignore entries.

### Success Criteria:

#### Automated Verification:

- `npx playwright install chromium` (or document in README) completes
- `npm run test:e2e -- tests/e2e/seed.spec.ts` passes locally with Supabase + dev server

#### Manual Verification:

- Seed spec fails clearly when Supabase or dev server is down (actionable error)

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: North-Star E2E (`/10x-e2e`)

### Overview

Add **`tests/e2e/main-flow.spec.ts`** for US-01 using **`/10x-e2e testing-ci-gates-e2e`** when skill available.

### Changes Required:

#### 1. Generate main flow spec

**File**: `tests/e2e/main-flow.spec.ts`

**Intent**: Cover minimal US-01: login → create project → manual input on `/generate` → mock AI (checkbox on) → **Generate draft** → `/drafts?success=generated` with history banner and snippet containing input line (or `GUARDRAIL_ACCEPTED` token from `tests/helpers/guardrail-fixtures.ts`).

**Contract**: Use `/10x-e2e` skill as primary implement path; fallback: research north-star table. Assert **not** draft PATCH edit. Test title must not claim full regression of Risks #1–#5 (e2e wiring only).

#### 2. Reuse auth fixture

**File**: `tests/e2e/fixtures/auth.ts`

**Intent**: Share login/storage with seed spec and main-flow.

**Contract**: No duplicate Admin API logic in spec file.

### Success Criteria:

#### Automated Verification:

- `npm run test:e2e` passes (seed + main-flow) locally with Supabase + `dev:local`

#### Manual Verification:

- Trace shows `x-dev-mock-provider: 1` on generation-runs request (browser devtools or Playwright network assert optional)

**Implementation Note**: Pause for manual confirmation before Phase 5.

---

## Phase 5: Playwright in CI

### Overview

Wire `npm run test:e2e` into GitHub Actions using Supabase + dev server pattern from Phases 1–3.

### Changes Required:

#### 1. CI workflow — e2e job or steps

**File**: `.github/workflows/ci.yml`

**Intent**: Run Playwright after Vitest (same workflow or dependent job): Supabase start, install browsers, `npm run test:e2e`.

**Contract**: Mock-only (dev server + default mock checkbox); no `GEMINI_API_KEY` in CI; timeout sufficient for Astro + Supabase startup.

#### 2. Playwright CI env

**File**: `playwright.config.ts`

**Intent**: `reuseExistingServer: false` in CI; forbid reuse of stale local servers.

**Contract**: `workers: 1` in CI if flakiness from shared DB state.

### Success Criteria:

#### Automated Verification:

- CI workflow includes e2e step; local `npm run test:e2e` still passes

#### Manual Verification:

- One green CI run on PR with both Vitest and e2e jobs green

**Implementation Note**: Pause for manual confirmation before Phase 6.

---

## Phase 6: Test-Plan and AGENTS Closeout

### Overview

Fill §6.3, mark Rollout Phase 4 complete, fix stale pointers.

### Changes Required:

#### 1. Test-plan §6.3

**File**: `context/foundation/test-plan.md`

**Intent**: Replace TBD with e2e recipe: prerequisites (Supabase, `.env.local`, `dev:local`), `seed.spec.ts` vs `main-flow.spec.ts`, mock AI, `npm run test:e2e`, anti-patterns.

**Contract**: Update §3 Phase 4 row `Status: complete`, change folder pointer; §6.6 Phase 4 note; fix Phase 3 row to `context/archive/2026-06-06-testing-generation-guardrails/`; bump `Last updated`.

#### 2. AGENTS.md

**File**: `AGENTS.md`

**Intent**: Document `test:e2e`, Playwright layout, CI gates wired.

**Contract**: Remove “not wired yet” for CI test gate and Playwright when true.

#### 3. Epilogue

**File**: `context/changes/testing-ci-gates-e2e/change.md`

**Intent**: Set `status: implemented` when all Progress complete (during `/10x-implement` epilogue).

### Success Criteria:

#### Automated Verification:

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e` pass locally

#### Manual Verification:

- §6.3 readable standalone for adding a second e2e spec

**Implementation Note**: Final phase — ready for `/10x-impl-review` and archive.

---

## Testing Strategy

### Unit / Integration (unchanged)

Existing Vitest suites; Phase 1 ensures CI runs them fully.

### E2E

- **seed.spec.ts** — harness; run first when debugging stack.
- **main-flow.spec.ts** — US-01 product path; mock AI only.

### Manual

- Optional: watch `test:e2e:ui` once during Phases 3–4.

## Performance Considerations

- Supabase start dominates CI time — accept ~5–10 min or split jobs later (Strategy C) if painful.
- Playwright single worker in CI reduces Auth/DB flakes.
- Chromium-only for MVP.

## Migration Notes

No database migrations. CI may need no new GitHub secrets for Vitest (ephemeral local keys). Build secrets unchanged.

## References

- Research: `context/changes/testing-ci-gates-e2e/research.md`
- Test plan: `context/foundation/test-plan.md` (§3 Phase 4, §5, §6.3)
- README Milestone 11–12: `README_PatchPost_plan.md`
- Vitest harness: `context/archive/2026-06-03-testing-bootstrap-auth-rls/`
- US-01 semantics: `context/archive/2026-05-30-manual-to-generated-history-flow/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: CI Vitest gate

#### Automated

- [x] 1.1 Local: `npm run lint`, `npm test` pass with Supabase — a4510cb
- [x] 1.2 CI workflow includes Supabase start + full Vitest (typecheck deferred — TODO in workflow) — a4510cb

#### Manual

- [x] 1.3 CI run: integration suites execute (not skipped); build still uses hosted secrets — a4510cb

### Phase 2: CI typecheck gate

#### Automated

- [x] 2.1 `npm run typecheck` passes locally (fix ~25 pre-existing errors)
- [x] 2.2 CI workflow runs typecheck before Vitest

#### Manual

- [ ] 2.3 CI run: typecheck + Vitest + build green

### Phase 3: Playwright bootstrap

#### Automated

- [ ] 3.1 `npm run test:e2e -- tests/e2e/seed.spec.ts` passes locally
- [ ] 3.2 Lint passes on new Playwright files

#### Manual

- [ ] 3.3 Seed spec fails with clear message when Supabase or dev server is down

### Phase 4: North-star e2e

#### Automated

- [ ] 4.1 Full `npm run test:e2e` passes locally (seed + main-flow)
- [ ] 4.2 Lint passes

#### Manual

- [ ] 4.3 Main-flow uses mock provider path (checkbox or network evidence)

### Phase 5: Playwright in CI

#### Automated

- [ ] 5.1 CI workflow runs `npm run test:e2e` successfully

#### Manual

- [ ] 5.2 PR CI shows green Vitest + e2e jobs

### Phase 6: Test-plan closeout

#### Automated

- [ ] 6.1 Full local gate: typecheck, lint, test, build, test:e2e
- [ ] 6.2 test-plan §6.3 and §3 Phase 4 updated

#### Manual

- [ ] 6.3 §6.3 recipe matches file names in repo
