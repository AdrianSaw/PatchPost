<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Testing CI Gates and E2E

- **Plan**: context/changes/testing-ci-gates-e2e/plan.md
- **Scope**: All 6 phases (full plan)
- **Date**: 2026-05-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated verification (local, 2026-05-27)

| Command | Result |
|---------|--------|
| `npm run typecheck` | PASS (0 errors) |
| `npm run lint` | PASS |
| `npm test` | PASS (57 passed, 2 skipped) |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS (2 passed, ~30s) |

## Findings

### F1 — Phase 6 epilogue incomplete (`change.md` status)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: context/changes/testing-ci-gates-e2e/change.md:4
- **Detail**: Plan Phase 6 requires `status: implemented` when all Progress checkboxes are `[x]`. Progress is fully complete, but `change.md` still reads `status: implementing`.
- **Fix**: Set `status: implemented`, bump `updated: 2026-05-27`, add Phase 6 epilogue note — then archive via `/10x-archive` when ready.
  - Strength: Matches every other completed rollout change in this repo.
  - Tradeoff: Marks the change closed before optional triage fixes land — use follow-ups if deferring fixes.
  - Confidence: HIGH — explicit plan contract.
  - Blind spot: None significant.
- **Decision**: FIXED

### F2 — README CI section omits Playwright e2e

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: README.md:248
- **Detail**: README says CI runs "typecheck, full Vitest, lint, and build" but not Playwright. AGENTS.md and test-plan §6.3 correctly document `npm run test:e2e` in CI.
- **Fix**: Extend README CI paragraph to mention Playwright e2e after Vitest (mirror AGENTS.md one-liner).
- **Decision**: FIXED

### F3 — `waitForReactHydration` does not poll

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: tests/e2e/fixtures/auth.ts:28-32
- **Detail**: Helper runs a single `evaluate` and discards the boolean — if React fiber/props are not attached yet, it returns successfully anyway. Tests pass locally today but this is a latent flake on slower CI cold starts.
- **Fix A ⭐ Recommended**: Poll until hydrated using Playwright retry, e.g. wrap evaluate in `expect(async () => …).toPass({ timeout: 15_000 })`.
  - Strength: Eliminates race without changing test flow.
  - Tradeoff: Slightly longer worst-case wait on slow hydrations.
  - Confidence: HIGH — standard Playwright pattern for custom readiness.
  - Blind spot: Haven't reproduced a flake in CI yet (green on PR #9).
- **Fix B**: Rely on Playwright auto-wait (`fill`/`click`) and remove custom hydration check where redundant.
  - Strength: Less custom code.
  - Tradeoff: May not cover fetch-based submit paths that need pre-click readiness.
  - Confidence: MEDIUM — GenerateForm still needs module-load waiter.
  - Blind spot: Island 404 regressions on port reuse.
- **Decision**: FIXED (Fix A)

### F4 — Playwright dev server inherits full `process.env`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: playwright.config.ts:4-8,35
- **Detail**: `devServerEnv` copies every defined env var into the Astro dev child, including `SUPABASE_SERVICE_ROLE_KEY` and CI runner tokens. App code does not read service-role, but this violates least-privilege.
- **Fix A ⭐ Recommended**: Allowlist only vars the dev server needs (`SUPABASE_URL`, `SUPABASE_KEY`, `NODE_ENV`, etc.).
  - Strength: Shrinks blast radius; matches integration test separation.
  - Tradeoff: Must update allowlist if dev server gains new env deps.
  - Confidence: HIGH — service-role is only needed in global-setup/Vitest.
  - Blind spot: Undocumented env vars consumed by Astro plugins.
- **Fix B**: Accept risk and document in E2E-RULES as known dev-only exposure.
  - Strength: No config churn.
  - Tradeoff: Service-role remains in dev process memory/logs scope.
  - Confidence: MEDIUM — local/CI keys are ephemeral dev JWTs, not prod.
  - Blind spot: Future logging of env on startup.
- **Decision**: FIXED (Fix A)

### F5 — CI job timeout may be tight on cold runners

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: .github/workflows/ci.yml:12
- **Detail**: Single 30-minute job covers Supabase Docker start, typecheck, Vitest (~57 tests), Playwright browser install, 180s webServer boot, and e2e with 120s test timeout + 1 retry. PR #9 was green, but cold GHA pulls can approach the budget.
- **Fix A ⭐ Recommended**: Monitor; raise to `timeout-minutes: 45` if a timeout failure appears.
  - Strength: Minimal change; preserves single-job simplicity from plan Strategy B.
  - Tradeoff: Longer hung-job waste if something stalls.
  - Confidence: MED — PR #9 passed within budget.
  - Blind spot: Supabase image pull time variance on GHA.
- **Fix B**: Split e2e into a dependent job (Strategy C from research).
  - Strength: Parallelism and isolated timeouts.
  - Tradeoff: Second Supabase start or artifact handoff complexity — out of plan scope.
  - Confidence: LOW for MVP — plan explicitly chose Strategy B.
  - Blind spot: Cross-job env duplication cost.
- **Decision**: FIXED (Fix A — monitor; no timeout change until CI failure)

### F6 — `waitForGenerateFormReady` couples to Vite chunk name

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/e2e/fixtures/auth.ts:38-44
- **Detail**: Waits on GET URL containing `"GenerateForm"`. Renaming/moving the component or changing code-splitting breaks the waiter silently (30s timeout).
- **Fix**: Replace chunk waiter with `waitForURL(/\/generate/)` + `getByRole('textbox', { name: 'Changes' }).toBeVisible()` after navigation.
- **Decision**: FIXED

### F7 — Plan text still references `seed.spec.ts` and port 4321

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/testing-ci-gates-e2e/plan.md (Phase 3 sections)
- **Detail**: Implementation renamed seed to `00-seed.spec.ts` and moved e2e to port 4322 (documented in AGENTS + §6.3). Original plan.md still says `seed.spec.ts` / `4321`.
- **Fix**: Add a plan addendum note under Phase 3/4 documenting the intentional renames, or update plan file paths in place.
- **Decision**: FIXED

### F8 — `test-plan.md` `Last updated` regressed

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/test-plan.md:9
- **Detail**: Header changed from `2026-06-06` to `2026-05-27` in Phase 6 closeout commit — likely accidental date regression.
- **Fix**: Set `Last updated: 2026-05-27` only if that is the intended closeout date, or restore `2026-06-06` if that reflects the rollout calendar.
- **Decision**: FIXED (2026-05-27 confirmed as closeout date)
