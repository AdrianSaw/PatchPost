---
date: 2026-06-06T17:15:00Z
researcher: Cursor Agent
git_commit: 8b7c89ee91e9769452f15c67cb472de3b3ddad46
branch: test/rollout-phases
repository: PatchPost
topic: "Test-plan Phase 4 — CI gates (Vitest + Supabase) and north-star Playwright e2e"
tags: [research, testing, ci, playwright, vitest, supabase, e2e]
status: complete
last_updated: 2026-06-06
last_updated_by: Cursor Agent
last_updated_note: "Added locked planning decisions (seed.spec.ts, Playwright layering, /10x-e2e)"
---

# Research: Test-plan Phase 4 — CI gates and north-star e2e

**Date**: 2026-06-06T17:15:00Z  
**Researcher**: Cursor Agent  
**Git Commit**: `8b7c89ee91e9769452f15c67cb472de3b3ddad46`  
**Branch**: `test/rollout-phases`  
**Repository**: PatchPost

## Research Question

Ground **test-plan Rollout Phase 4** (`testing-ci-gates-e2e`): wire Vitest into CI with real signal (not false-green skips), and add optional Playwright for the US-01 path **login → project → manual input → generate → history**.

## Summary

1. **CI today** runs `npm ci`, `astro sync`, `lint`, and `build` only — **no `npm test`, no `npm run typecheck`** (`.github/workflows/ci.yml`). Build uses hosted `SUPABASE_*` secrets; that is unrelated to integration test env.
2. **Default `npm test` in GHA without Docker** passes ~34 tests and **skips ~24** integration cases via `hasLocalSupabaseConfig()` — exit code 0, **insufficient** for test-plan §5 once Phase 4 ships.
3. **Recommended CI gate:** start local Supabase in GHA (`npx supabase start`), export `SUPABASE_URL`, `SUPABASE_KEY` (anon), and **`SUPABASE_SERVICE_ROLE_KEY`** (required for invite-only Auth), then `npm test`. Optionally split fast unit job on every PR vs full integration on merge (cost tradeoff).
4. **Also wire** `npm run typecheck` — documented in test-plan §5 but missing from CI.
5. **Playwright** is not in `package.json`. North-star flow is implemented under `/auth/signin` and `/app/projects/.../generate`; **“save” = persist-on-generate** (no separate save button). E2e should use **mock AI** (dev checkbox → `x-dev-mock-provider: 1` or `AI_PROVIDER=mock`).
6. **Defer** live Gemini smoke in CI (explicit anti-pattern in test-plan). **Post-edit hooks** are test-plan §5 “planned after Phase 4” — not in prior change archives; treat as follow-up, not this change’s MVP.

## Detailed Findings

### Current CI and deploy workflows

| Workflow | Steps | Tests? |
|----------|-------|--------|
| `.github/workflows/ci.yml` | `npm ci` → `astro sync` → `lint` → `build` | No |
| `.github/workflows/deploy.yml` | Same build → `wrangler deploy` | No |

Build step injects hosted `SUPABASE_URL` / `SUPABASE_KEY` from GitHub secrets. Integration tests require **localhost** `127.0.0.1:54321` and different keys from `npx supabase status`.

### Vitest harness and skip policy

- **Runner:** `vitest.config.ts` includes `tests/**/*.test.ts`; `import.meta.env.DEV = true` (needed for mock provider header path in generation).
- **Env:** `tests/setup.ts` loads `.env` + `.env.local`; `hasLocalSupabaseConfig()` is true only for localhost URLs with real keys.
- **Always runs without Docker:** 7 unit files (~20 tests), `auth-api-unauthenticated.test.ts` (7), `helpers-import.test.ts` (4), partial `harness-smoke.test.ts`.
- **Skips without local Supabase:** all RLS, cross-owner, and API contract suites (~24 tests) — `describe.skipIf(!hasLocalSupabaseConfig())`.
- **Live Gemini:** `generation-live-smoke.test.ts` triple-gated (`RUN_LIVE_GEMINI_SMOKE`, key, `AI_PROVIDER !== mock`) — intentionally out of default CI.

### Supabase requirements for full integration CI

| Requirement | Source |
|-------------|--------|
| Docker stack | `npm run supabase:start` → port **54321** (`supabase/config.toml`) |
| `SUPABASE_URL` | `http://127.0.0.1:54321` (must be local for gating + service-role guard) |
| `SUPABASE_KEY` | Publishable/anon from `npx supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret from status — **Admin API** user create (`tests/helpers/supabase-session.ts`) |
| Invite-only auth | `[auth] enable_signup = false` + Admin create (`supabase/config.toml`) |
| Health | `assertSupabaseReachable()` → `GET /auth/v1/health` |

**Hosted Supabase project for CI is not viable** without code changes: local-only guards in `hasLocalSupabaseConfig()` and service-role client.

### CI strategy options (cost × signal)

| Strategy | Description | Signal | Cost |
|----------|-------------|--------|------|
| **A — test only, no Supabase** | Add `npm test` + `typecheck` as-is | Unit + auth partial; **24 skips** | ~1–2 min |
| **B — Supabase Docker (recommended)** | `supabase start` → export env → `npm test` | Full Vitest (~57 pass, live smoke skipped) | ~5–10 min |
| **C — Split jobs** | A on every PR; B on `master` or label | PR fast; merge full | Variable |

**Mitigation for A:** optional `REQUIRE_LOCAL_SUPABASE=1` fail-if-skips (prior art: bootstrap impl-review) — still weaker than B.

**Non-recommendations:** reuse CI build secrets for tests; live Gemini in CI; hosted DB without harness changes.

### North-star e2e path (US-01)

**PRD US-01:** manual input → generate → draft in history → open/edit (`context/foundation/prd.md`).

**Implemented flow:**

| Step | URL | Key UI / API |
|------|-----|----------------|
| Login | `/auth/signin` | `#email`, `#password` → `POST /api/auth/signin` → `/app/projects` |
| Create project | `/app/projects/new` | `#name` → `POST /api/projects` |
| Generate | `/app/projects/{id}/generate` | `#raw_content`, **mock checkbox** (dev), **Generate draft** |
| History | `/app/projects/{id}/drafts?success=generated` | Banner “Draft saved to history.” |
| (Optional) Edit | `/app/projects/{id}/drafts/{draftId}` | `#draft_body`, **Save changes** → PATCH |

**Mock provider in browser:** `GenerateForm` default-checked dev checkbox sets `x-dev-mock-provider: 1` via `client-api.ts`. Server uses mock only when `import.meta.env.DEV && header` (`generation-runs.ts`).

**Save semantics:** generation workflow persists draft on success — no separate save on generate screen (`context/archive/2026-05-30-manual-to-generated-history-flow/`).

**Stale docs:** README mentions `/auth/login` and `/app/projects/[id]/sources` — use `/auth/signin` and `/generate`.

### Playwright setup (greenfield)

- Add `@playwright/test`; scripts per README plan: `test:e2e`, target `tests/e2e/main-flow.spec.ts`.
- **webServer:** Astro docs recommend `npm run dev` or `preview` after build; this app uses Cloudflare adapter — **dev (`npm run dev:local`)** matches `import.meta.env.DEV` mock header path; preview is prod-like (no mock header unless `AI_PROVIDER=mock`).
- **baseURL:** `http://127.0.0.1:4321` (Astro default).
- **Auth setup:** mirror `createTestUser()` Admin API in global setup; reuse invite-only local Supabase.
- **Assertions:** mock path — snippet contains first line of `raw_content` or guardrail token from `tests/helpers/guardrail-fixtures.ts`.

Playwright supports **multiple webServer** entries (Supabase start + Astro dev) — useful in CI e2e job.

## Code References

- `.github/workflows/ci.yml:18-24` — lint + build only; no tests
- `package.json:16-19` — `test`, `typecheck` scripts (typecheck not in CI)
- `tests/setup.ts:57-86` — `hasLocalSupabaseConfig`, `assertSupabaseReachable`
- `tests/helpers/supabase-session.ts:31-49` — Admin API requires service role
- `supabase/config.toml:169,206` — invite-only auth
- `src/middleware.ts` — public allowlist; `/app/*` protected
- `src/pages/api/projects/[id]/generation-runs.ts:61-62` — mock header gate
- `src/lib/generation/client-api.ts:76-78` — sets `x-dev-mock-provider`
- `src/components/generation/GenerateForm.tsx` — dev mock checkbox + generate flow
- `context/foundation/test-plan.md:68,93-95,164` — Phase 4 scope and gates

## Architecture Insights

- **Two env profiles:** CI build uses **hosted** Supabase secrets; tests need **local** stack keys — never conflate in one job without separate `env:` blocks.
- **False-green is by design** in Phases 1–3 (skip when no Docker); Phase 4 must **flip** that for merge gate or add strict skip detection.
- **E2e complements, not replaces, integration:** Risks #1–#5 are already covered at handler/RLS layer; Playwright proves **wiring** (middleware + forms + client API + redirects) for US-01 only (test-plan §6.3 TBD → fill in Phase 4).
- **Cost × signal:** full Playwright + Supabase + Astro in CI is the heaviest job — plan may split **CI Vitest first**, **Playwright second** (still both Phase 4 rollout).

## Historical Context (from prior changes)

- **Phase 1** (`context/archive/2026-06-03-testing-bootstrap-auth-rls/`): explicitly deferred Playwright and CI gate to test-plan Phase 4; Vitest + handler-level integration only.
- **Phase 2** (`context/archive/2026-06-06-testing-api-handler-contracts/`): handler contracts; skip-without-`.env.local` policy; no CI wiring.
- **Phase 3** (`context/archive/2026-06-06-testing-generation-guardrails/`): guardrails + optional live smoke; CI gate still deferred.

All three archives quote: **“Playwright or CI test gate (test-plan Phase 4)”** in plan out-of-scope / defer lists.

## Related Research

- `context/archive/2026-06-03-testing-bootstrap-auth-rls/research.md` — Vitest + local Supabase handler pattern; CI deferral
- `context/archive/2026-06-06-testing-api-handler-contracts/plan.md` — contract suite patterns for §6.4
- `context/archive/2026-06-06-testing-generation-guardrails/reviews/impl-review.md` — live smoke / `AI_PROVIDER=mock` gate (relevant to e2e mock strategy)

## Recommended planning split

| Sub-deliverable | Scope | Depends on |
|-----------------|-------|------------|
| **4a — CI Vitest gate** | `typecheck` + `npm test` with Supabase in GHA; optional split jobs; update `ci.yml`; fix test-plan §3 row + §6.2 note on CI | None |
| **4b — Playwright US-01** | `@playwright/test`, `tests/e2e/main-flow.spec.ts`, global auth setup, §6.3 cookbook | Local Supabase + dev server pattern proven |
| **4c — E2e in CI** | Playwright job with webServer(s); mock-only | 4a Supabase recipe |

Post-edit agent hooks (test-plan §5) → **separate follow-up** after this change.

## Planning decisions (locked 2026-06-06)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CI integration | **Strategy B** — Supabase Docker in GHA on every PR | Full Vitest signal (~57 pass); avoids false-green skips |
| CI extras | Add `npm run typecheck` before lint | test-plan §5 documents it; not wired today |
| Playwright layering | **Bootstrap first**, product test second | Install + config + `seed.spec.ts` harness before north-star flow |
| `seed.spec.ts` | Auth/smoke only: Admin user → sign-in → `/app/projects` | Proves webServer + SSR + cookies without full US-01 |
| North-star test | `main-flow.spec.ts` via **`/10x-e2e`** when skill is in repo; else manual from this research | Skill generates flow from live app; fallback documented in plan Phase 3 |
| E2e scope | **Minimal US-01:** login → project → manual → generate → history banner | “Save” = persist-on-generate; draft edit (FR-006) out of scope |
| Mock AI in e2e | `npm run dev:local` + default mock checkbox (`x-dev-mock-provider`) | Requires `import.meta.env.DEV`; no live Gemini in e2e |
| E2e CI timing | After seed + main-flow pass locally | Heaviest job; reuses Supabase recipe from Phase 1 |
| Live Gemini / hooks | Out of scope | test-plan anti-pattern + §5 hooks deferred |

## Open Questions (resolved for planning)

1. **CI B vs C** → **B on every PR** (locked above).
2. **E2e scope** → minimal US-01 only (locked above).
3. **Playwright runtime** → `dev:local` (locked above).
4. **Branch merge** → implement on current rollout branch or fresh branch after merge; plan does not block on merge order.
5. **test-plan hygiene** → Phase 5 closeout updates Phase 3 archive pointer + marks Phase 4 complete.
