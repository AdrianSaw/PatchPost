# Testing Generation Guardrails Implementation Plan

## Overview

Add unit and integration tests that prove **Risk #3** (mock-path output derives from manual input; ignored lines do not leak) and **Risk #4** (provider factory resolution, `wrapProviderError` mapping, tagged live Gemini structural smoke). Fills test-plan **§6.5** and marks Rollout Phase 3 complete. Builds on Phase 1–2 Vitest harness and existing `generation-runs-api-contracts.test.ts` (HTTP/DB only).

## Current State Analysis

Phase 2 deferred output-text assertions. Today:

| Area | Covered | Gap |
|------|---------|-----|
| Generation HTTP contract | 201 + row IDs; 422 validation | No `content` / `classifiedItems` oracles |
| Mock workflow | `seedDraftViaGeneration` + mock header | No multi-line include/exclude fixture |
| Unit tests | None (`tests/unit/` absent) | mock-provider, factory, prompts, errors |
| Live Gemini | Dev route `f01-gemini-smoke.ts` only | No in-repo tagged Vitest smoke |
| Error mapping | `wrapProviderError` private (`generation-workflow.ts:74-81`) | Untested |

**Key discoveries:**

- Mock classifies **first non-empty line** only (`mock-provider.ts:10-16`) — ideal for accepted/ignored token fixture.
- Generate step never sees raw `raw_content` (`prompts.ts:130-151`) — prompt unit tests can lock that boundary.
- `wrapProviderError` maps `rate_limit` → `provider_rate_limit`; all other provider/unknown errors → `provider_error` (`generation-workflow.ts:74-81`).
- Vitest pins `import.meta.env.DEV = true` (`vitest.config.ts:5-7`).

## Desired End State

- `tests/unit/` holds fast guardrail tests (mock echo, prompts, factory, snapshot parse, error wrap).
- Integration test proves multi-line fixture: **accepted token in** persisted `content`, **ignored token out**; classification `source` matches first line only.
- `tests/integration/generation-live-smoke.test.ts` runs only when `GEMINI_API_KEY` is set; asserts schema, non-empty classified items, tagged token substring — **not** full hallucination detection.
- `context/foundation/test-plan.md` §6.5 cookbook filled; §3 Phase 3 `complete`.
- Default `npm test` stays green without Gemini key (live suite skipped).

### Verification

- Automated: `npm test`, `npm run lint`, `npm run build` (Node 22+).
- Manual: Optional run with `GEMINI_API_KEY` in `.env.local` to exercise live smoke once.

## What We're NOT Doing

- Full LLM output snapshots or semantic hallucination detectors.
- Oracle strings copied verbatim from prompt implementation (assert behavior/tokens, not prompt prose).
- API-level fake-provider injection or generation-route refactor for failure tests.
- Running live Gemini in default CI / default `npm test`.
- Playwright or CI test gate (test-plan Phase 4).
- Production guardrail code (post-generation validation layer) — tests only.
- Removing or replacing dev smoke routes (`/api/dev/f01-*`).

## Implementation Approach

Follow Phase 2 patterns: cost × signal, presence/substring oracles, `describe.skipIf` for env-gated suites. Export `wrapProviderError` for unit testing (minimal production surface). Centralize fixture tokens in a shared helper to keep integration and live smoke aligned.

Split: unit foundation → integration mock guardrails (main Risk #3) → tagged live smoke (Risk #4) → test-plan/AGENTS closeout.

## Critical Implementation Details

**Fixture tokens:** Use stable literals e.g. `GUARDRAIL_ACCEPTED = "rifle-damage-10pct"` on line 1 and `GUARDRAIL_IGNORED = "internal-only-xyz"` on line 2 of `raw_content`. First line must be non-empty so mock `firstChangeLine` picks accepted text.

**Live smoke gate:** `describe.skipIf(!process.env.GEMINI_API_KEY || !hasLocalSupabaseConfig())` — requires local Supabase **and** key. POST generation **without** `x-dev-mock-provider` so `getGenerationProvider()` resolves to Gemini. Document in §6.5 that this is optional manual/CI job input, not default pipeline.

**wrapProviderError tests:** Export function from `generation-workflow.ts` (named export). Cases: `GenerationProviderError` + `rate_limit` → `provider_rate_limit`; `api_error` / `invalid_response` → `provider_error`; plain `Error` / non-provider → `provider_error`. No HTTP layer tests in this change.

## Phase 1: Unit Guardrail Foundation

### Overview

Fast tests for deterministic mock behavior, prompt boundaries, factory resolution, snapshot parse, and provider error wrapping.

### Changes Required:

#### 1. Export error wrapper for tests

**File**: `src/lib/services/generation-workflow.ts`

**Intent**: Allow unit tests for `wrapProviderError` without faking the full workflow or API route.

**Contract**: Export `wrapProviderError` (keep existing mapping logic unchanged).

#### 2. Shared fixture constants

**File**: `tests/helpers/guardrail-fixtures.ts`

**Intent**: Single source for accepted/ignored tokens and multi-line `raw_content` builder used by integration and live smoke.

**Contract**: Exports `GUARDRAIL_ACCEPTED`, `GUARDRAIL_IGNORED`, `buildMultiLineGuardrailInput()` returning `{ raw_content, accepted, ignored }`.

#### 3. Mock provider unit suite

**File**: `tests/unit/mock-provider.test.ts`

**Intent**: Lock mock classify/generate echo behavior independent of Supabase.

**Contract**: Multi-line input → classify `source`/`suggested_public_summary` from first line only; generate `content` includes accepted substring, excludes ignored; output shape valid per `outputType` (one case, e.g. `changelog`).

#### 4. Prompt boundary unit suite

**File**: `tests/unit/generation-prompts.test.ts`

**Intent**: Prove classify prompt embeds `raw_content`; generate prompt does not (uses classified items only).

**Contract**: Use `buildClassifyPrompt` / `buildGeneratePrompt` with fixture project + change input + sample classified items; substring assertions on user-facing prompt parts, not full system prompt snapshots.

#### 5. Factory unit suite

**File**: `tests/unit/generation-provider-factory.test.ts`

**Intent**: Lock Risk #4 provider selection without network.

**Contract**: Stub `AI_PROVIDER`, `GEMINI_API_KEY`, `import.meta.env.PROD` via `vi.stubEnv` / vi.mock as needed; assert mock vs gemini name, prod fail-closed throw, dev fallback to mock.

#### 6. Supporting unit suites

**Files**: `tests/unit/output-language.test.ts`, `tests/unit/prompt-snapshot.test.ts`, `tests/unit/wrap-provider-error.test.ts`

**Intent**: Cover language detection, snapshot round-trip, and error code mapping per planning decision.

**Contract**: `output-language` — PL diacritics → `"pl"`, English fixture → `"en"`. `prompt-snapshot` — valid v1 JSON parses; invalid returns null. `wrap-provider-error` — rate_limit, api_error, invalid_response, unknown Error cases.

#### 7. Vitest include path

**File**: `vitest.config.ts` (only if needed)

**Intent**: Ensure `tests/unit/**/*.test.ts` is picked up (already `tests/**/*.test.ts` — verify, no change if redundant).

### Success Criteria:

#### Automated Verification:

- `npm test` passes (unit suites only; no Supabase required for unit files)
- `npm run lint` passes on new files

#### Manual Verification:

- Unit tests run in isolation quickly (`npm test -- tests/unit`)

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Integration Mock Guardrails (Risk #3)

### Overview

End-to-end mock generation via HTTP with multi-line fixture; main no-hallucination regression for mock path.

### Changes Required:

#### 1. Extend generation runs contract suite

**File**: `tests/integration/generation-runs-api-contracts.test.ts`

**Intent**: Add guardrail case using `buildMultiLineGuardrailInput()` and `x-dev-mock-provider: 1`.

**Contract**: After 201: load `generatedOutput` via `getGeneratedOutputById`; assert `content` matches accepted token (substring); assert `content` does not contain ignored token; parse response JSON `classifiedItems[0].source` equals first line text; optional: `parsePromptSnapshot` on run row shows `provider: "mock"`.

**Do not** remove existing Phase 2 HTTP/422 tests.

#### 2. Optional workflow-level guardrail test

**File**: `tests/integration/generation-workflow-guardrails.test.ts` (add only if HTTP test is awkward for snapshot assertions)

**Intent**: Call `runGenerationWorkflow(..., mockProvider)` with multi-line fixture when direct service assertion is clearer.

**Contract**: Same include/exclude oracles on persisted output. Prefer extending existing file unless implementer needs service-only path — **one** integration guardrail path required, not both duplicated.

### Success Criteria:

#### Automated Verification:

- `npm test` passes with local Supabase (guardrail integration runs, not skipped)
- `npm run lint` passes

#### Manual Verification:

- After `npx supabase db reset`, guardrail test creates run/output rows; Studio shows content containing accepted token only

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Tagged Live Gemini Smoke (Risk #4)

### Overview

In-repo optional live smoke; skipped by default unless `GEMINI_API_KEY` present.

### Changes Required:

#### 1. Live smoke integration suite

**File**: `tests/integration/generation-live-smoke.test.ts`

**Intent**: Structural validation under real Gemini without mock header.

**Contract**: `describe.skipIf(!process.env.GEMINI_API_KEY || !hasLocalSupabaseConfig())`; seed project + multi-line change input with tagged accepted token; POST generation-runs **without** `x-dev-mock-provider`; assert 201; response has non-empty `classifiedItems` passing `classificationResultSchema`; persisted output content includes accepted token (substring). Test name/description must **not** claim full hallucination detection.

#### 2. Env documentation

**File**: `.env.local.example`

**Intent**: Note optional `GEMINI_API_KEY` for live smoke only (not required for default `npm test`).

**Contract**: One-line comment; no secrets.

### Success Criteria:

#### Automated Verification:

- `npm test` passes **without** `GEMINI_API_KEY` (live suite skipped)
- `npm run lint` passes

#### Manual Verification:

- With `GEMINI_API_KEY` set locally, live smoke passes once; ignored token not asserted as excluded (live path may classify differently — only assert accepted token preservation + schema)

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Cookbook and Test-Plan Closeout

### Overview

Document §6.5 pattern; mark Rollout Phase 3 complete.

### Changes Required:

#### 1. Test-plan §6.5

**File**: `context/foundation/test-plan.md`

**Intent**: Replace TBD with recipe: fixture tokens, unit vs integration vs live smoke gates, anti-patterns.

**Contract**: Update §3 Phase 3 row Status `complete`, Change folder pointer; §6.6 Phase 3 note; `Last updated` date.

#### 2. AGENTS.md

**File**: `AGENTS.md`

**Intent**: List new unit suites and live smoke under Testing (one line each); note optional `GEMINI_API_KEY`.

**Contract**: No change to secrets rules beyond pointer.

#### 3. Epilogue

**File**: `context/changes/testing-generation-guardrails/change.md`

**Intent**: Set `status: implemented` when all Progress complete.

### Success Criteria:

#### Automated Verification:

- `npm test`, `npm run lint`, `npm run build` pass

#### Manual Verification:

- §6.5 readable standalone for adding a guardrail test to a new output type

**Implementation Note**: Final phase — ready for `/10x-impl-review` and archive.

---

## Testing Strategy

### Unit Tests

Mock provider echo, prompt boundaries, factory resolution, snapshot parse, `wrapProviderError` mapping, output language.

### Integration Tests

Multi-line mock guardrail via HTTP (required); optional workflow file if cleaner.

### Manual / Optional

Live smoke with `GEMINI_API_KEY`; dev routes unchanged for debugging.

## Performance Considerations

Unit tests dominate CI time (fast). One integration guardrail case reuses full mock workflow — avoid duplicate full workflows in same file.

## Migration Notes

No database migrations. Optional export of `wrapProviderError` is the only production code touch.

## References

- Research: `context/changes/testing-generation-guardrails/research.md`
- Test plan: `context/foundation/test-plan.md` (§2 Risks #3/#4, §3 Phase 3, §6.5)
- Phase 2 archive: `context/archive/2026-06-06-testing-api-handler-contracts/`
- Mock provider: `src/lib/ai/mock-provider.ts`
- Workflow: `src/lib/services/generation-workflow.ts`
- Dev live smoke reference: `src/pages/api/dev/f01-gemini-smoke.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Unit guardrail foundation

#### Automated

- [x] 1.1 Unit tests pass: `npm test -- tests/unit` — 8ad94ea
- [x] 1.2 Lint passes: `npm run lint` — 8ad94ea

#### Manual

- [x] 1.3 `wrapProviderError` exported and covered without API/route changes — 8ad94ea

### Phase 2: Integration mock guardrails

#### Automated

- [x] 2.1 `npm test` passes (includes multi-line guardrail case with local env) — cfec1ca
- [x] 2.2 Lint passes: `npm run lint` — cfec1ca

#### Manual

- [x] 2.3 Studio spot-check: generated content includes accepted token, excludes ignored token — cfec1ca

### Phase 3: Tagged live Gemini smoke

#### Automated

- [x] 3.1 `npm test` passes without `GEMINI_API_KEY` (live suite skipped) — 4731448
- [x] 3.2 Lint passes: `npm run lint` — 4731448

#### Manual

- [x] 3.3 Optional: live smoke passes once with `GEMINI_API_KEY` set locally — 4731448

### Phase 4: Cookbook and test-plan closeout

#### Automated

- [ ] 4.1 Full suite + lint + build pass: `npm test`, `npm run lint`, `npm run build`
- [ ] 4.2 §6.5 and §3 Phase 3 status updated in test-plan

#### Manual

- [ ] 4.3 §6.5 recipe matches helper and file names in repo
