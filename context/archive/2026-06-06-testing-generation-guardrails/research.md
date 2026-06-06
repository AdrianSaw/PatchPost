---
date: 2026-06-06T14:26:28+00:00
researcher: Cursor Agent
git_commit: 252b9df
branch: test/testing-bootstrap-auth-rls
repository: PatchPost
topic: "Rollout Phase 3 — generation guardrails (Risks #3, #4)"
tags: [research, codebase, generation, guardrails, mock-provider, classification]
status: complete
last_updated: 2026-06-06
last_updated_by: Cursor Agent
last_updated_note: "Resolved planning decisions for multi-line fixture, wrapProviderError unit tests, and tagged Gemini smoke"
---

# Research: Rollout Phase 3 — Generation Guardrails (Risks #3, #4)

**Date**: 2026-06-06T14:26:28+00:00  
**Researcher**: Cursor Agent  
**Git Commit**: `252b9df`  
**Branch**: `test/testing-bootstrap-auth-rls`  
**Repository**: PatchPost

## Research Question

Ground test-plan rollout **Phase 3 (Generation guardrails)** for risks **#3** (generated copy must not invent claims beyond manual input) and **#4** (mock vs live provider behavior and user-safe failures). Verify or correct test-plan response guidance; locate failure paths, test oracles, and gaps versus Phase 2 API contracts.

## Summary

PatchPost generation is a **classify → snapshot → generate → persist** pipeline. `changeInput.raw_content` reaches the LLM only in classification; generation consumes `classifiedItems` from the prompt snapshot. **No runtime code** validates that output text is grounded in manual input — guardrails are prompt rules (`src/lib/ai/prompts.ts`) plus Zod structural validation (`src/lib/ai/classification.ts`).

**Mock provider** is deterministic and echoes the first non-empty line of input into classification and generated copy (`src/lib/ai/mock-provider.ts`). **Live Gemini** uses the same prompt guardrails but has no post-hoc hallucination check.

Phase 2 tests prove HTTP 201 + DB row persistence with `x-dev-mock-provider: 1` but **explicitly omit output text** (`context/archive/2026-06-06-testing-api-handler-contracts/plan.md`). Phase 3 should add:

1. **Risk #3 (mock path):** substring oracles that persisted `content` and classification `source`/`suggested_public_summary` derive from fixture `raw_content`; prompt unit tests that classify prompt includes raw input and generate prompt does not.
2. **Risk #4:** unit tests on `getGenerationProvider()` resolution and prod fail-closed; optional tagged live smoke (not default CI) for structural validity under Gemini.

**Correction to test-plan assumption:** Phase 3 can fully prove #3 for the **mock** path only. Proving #3 for live Gemini requires tagged manual/smoke or future validation logic — not snapshotting full LLM prose.

## Detailed Findings

### Pipeline architecture

| Step | Location | Behavior |
|------|----------|----------|
| Load project + change input | `src/lib/services/generation-workflow.ts:90-104` | FK check: change input belongs to project |
| Detect language | `generation-workflow.ts:107` | `detectOutputLanguage(changeInput.raw_content)` |
| Create run | `generation-workflow.ts:109-122` | `status: "draft"`, stores `output_type`, `tone` |
| Classify | `generation-workflow.ts:124-131` | `provider.classify({ project, changeInput })` |
| Snapshot | `generation-workflow.ts:133-147` | JSON `prompt_snapshot` with `classifiedItems`, `outputLanguage`, provider metadata |
| Generate | `generation-workflow.ts:149-170` | `provider.generate({ classifiedItems, outputType, tone, … })` |
| Persist output | `generation-workflow.ts:172-186` | `createGeneratedOutput` with formatted content |

Classification is **not** a separate table — items live inside `generation_runs.prompt_snapshot` (`src/lib/generation/prompt-snapshot.ts:17-38`).

### Manual input → output data flow

```
raw_content
  → buildClassifyPrompt (prompts.ts:73-94, line 80 embeds raw_content)
  → ClassificationItem[] { source, suggested_public_summary, … }
  → prompt_snapshot (generation-workflow.ts:133-143)
  → buildGeneratePrompt (prompts.ts:130-151, classified items only)
  → generatedOutput.content
```

Mock path: `firstChangeLine(raw_content)` → `source` and `suggested_public_summary` → joined into `[Mock …]` content (`mock-provider.ts:10-28, 34-65`).

### Guardrails today

| Layer | File | What it enforces |
|-------|------|------------------|
| Prompt rules | `src/lib/ai/prompts.ts:10-54` | "Do not invent features/content"; "Use only provided input/classified changes" |
| Classification Zod | `src/lib/ai/classification.ts:16-26` | Shape, enums, 1–50 items — **no** semantic match to `raw_content` |
| Output Zod | `src/types.ts:122-129` | Non-empty `content` only |
| Gemini parse | `src/lib/ai/gemini-provider.ts:140-157` | JSON + `classificationResultSchema.safeParse`; one retry on invalid classify |

**Gap:** No post-generation comparison of output to input. PRD guardrail ("nie halucynuje") is implemented as prompts + mock echo behavior, not automated verification for live AI.

### Mock vs live provider selection

**Factory** (`src/lib/ai/factory.ts:13-32`):

| Condition | Provider |
|-----------|----------|
| `AI_PROVIDER === "mock"` | `mockProvider` |
| `GEMINI_API_KEY` set | `createGeminiProvider(...)` |
| No key + `import.meta.env.PROD` | **Throws** `GenerationProviderError` (fail-closed) |
| No key + dev | Warn + `mockProvider` |

**HTTP override** (`src/pages/api/projects/[id]/generation-runs.ts:61-62`):

```typescript
const useMockProvider = import.meta.env.DEV && context.request.headers.get("x-dev-mock-provider") === "1";
const provider = useMockProvider ? mockProvider : getGenerationProvider();
```

Vitest sets `import.meta.env.DEV = true` (`vitest.config.ts:5-7`). Tests use header `x-dev-mock-provider: 1` or inject `mockProvider` via `seed-fixtures.ts:66-75`.

**Live smoke (manual only):** `src/pages/api/dev/f01-gemini-smoke.ts` — excluded from default test suite per test-plan §7.

### Error mapping (Risk #4 — user-safe failures)

| Layer | File | Mapping |
|-------|------|---------|
| Provider | `src/lib/ai/gemini-provider.ts` | HTTP 429 → `rate_limit`; parse/Zod fail → `invalid_response` |
| Workflow | `generation-workflow.ts:74-81` | `wrapProviderError` → `provider_rate_limit` or `provider_error` |
| HTTP | `generation-runs.ts:82-99` | `provider_rate_limit` → 503; `provider_error` → 502 (DEV exposes underlying message via `workflowErrorMessage`) |

No generation **failure** tests exist today (only 422 validation cases in `generation-runs-api-contracts.test.ts`).

### Existing test coverage vs gaps

**Covered (Phase 2):**

- `tests/integration/generation-runs-api-contracts.test.ts` — 201 + IDs + FK; 422 for bad `output_type` / UUID; **no content/classification assertions**
- `tests/integration/drafts-api-contracts.test.ts` — PATCH contracts; `content.length > 0` only after seed

**Gaps for Phase 3:**

| Risk | Gap |
|------|-----|
| #3 | No substring oracle linking `raw_content` → `content` or `classifiedItems` |
| #3 | No prompt separation test (classify includes raw, generate excludes raw) |
| #3 | No multi-line fixture (invented second bullet would go undetected) |
| #4 | `getGenerationProvider()` untested |
| #4 | No provider error → HTTP status tests |
| #4 | No tagged live Gemini smoke in repo tests |

### Pure functions — cheapest unit targets

| Function | File | Test value |
|----------|------|------------|
| `mockProvider.classify` / `generate` | `mock-provider.ts` | Echo behavior, output shape per `outputType` |
| `detectOutputLanguage` | `output-language.ts:7-15` | PL vs EN from input |
| `getGenerationProvider` | `factory.ts:13-32` | Mock/key/prod/dev resolution |
| `buildClassifyPrompt` / `buildGeneratePrompt` | `prompts.ts` | Input visibility in prompts |
| `parsePromptSnapshot` | `prompt-snapshot.ts:17-38` | Snapshot round-trip |
| `formatGeneratedContent` | `generation-workflow.ts:51-64` | Instagram hashtag merge |
| `wrapProviderError` | `generation-workflow.ts:74-81` | Error code mapping |

### Recommended test layers (cost × signal)

1. **Unit:** `tests/unit/mock-provider.test.ts`, `tests/unit/factory.test.ts`, `tests/unit/output-language.test.ts`, `tests/unit/prompt-snapshot.test.ts`, `tests/unit/wrap-provider-error.test.ts` (export or test via workflow module as needed)
2. **Integration extend:** Multi-line fixture with **accepted token** (first line) and **ignored token** (second line); assert persisted `content` includes accepted, excludes ignored; assert `classifiedItems[0].source` matches first line only
3. **Tagged live smoke:** `tests/integration/generation-live-smoke.test.ts` with `describe.skipIf(!process.env.GEMINI_API_KEY)` — schema + non-empty classified items + tagged token preservation only; manual dev routes remain for ad-hoc debugging

**Anti-patterns (test-plan):** full LLM output snapshots; oracles copied from prompt implementation strings; running live Gemini in default `npm test`; claiming live smoke proves full hallucination detection.

## Code References

- `src/lib/services/generation-workflow.ts:84-196` — orchestration entry
- `src/lib/ai/mock-provider.ts:10-65` — deterministic mock classify/generate
- `src/lib/ai/factory.ts:13-32` — provider resolution
- `src/lib/ai/prompts.ts:10-54` — no-hallucination prompt rules
- `src/lib/ai/classification.ts:16-26` — classification Zod schema
- `src/lib/generation/prompt-snapshot.ts:17-38` — snapshot parse
- `src/pages/api/projects/[id]/generation-runs.ts:61-62,82-99` — mock header + HTTP errors
- `tests/integration/generation-runs-api-contracts.test.ts:29-52` — Phase 2 contract (no content)
- `tests/helpers/seed-fixtures.ts:61-80` — workflow seed with injected mock
- `vitest.config.ts:5-7` — `import.meta.env.DEV` pinned for tests

## Architecture Insights

- **Two-phase provider contract** (`src/lib/ai/provider.ts`) keeps classification and generation independently testable.
- **Mock is safe by construction** — output only references classified summaries that echo input line; tests prove derivability for mock, not for Gemini.
- **DEV header override** is the integration-test switch for mock without stubbing factory env vars.
- **Prod fail-closed** in factory prevents silent mock copy in production when key missing (F-01 impl-review fix).

## Historical Context (from prior changes)

- `context/archive/2026-05-30-generation-workflow-api-backbone/plan.md` — mock-first CI; Gemini when keyed; classify-before-generate; prompt rules from README §14
- `context/archive/2026-05-30-manual-to-generated-history-flow/` — manual `raw_content` only; dev mock header mirrors F-01
- `context/archive/2026-06-06-testing-api-handler-contracts/plan.md` — explicitly deferred output text to Phase 3
- `context/foundation/prd.md` — guardrail: generator uses only supplied input; classify before generate
- `context/foundation/test-plan.md:53-54` — response guidance for #3 and #4; §6.5 cookbook TBD

## Response guidance verification

| Risk | Test-plan guidance | Research verdict |
|------|-------------------|------------------|
| #3 | Output derivable from manual input | **Valid for mock path** via echo chain; **partial for live** — prompts only, no runtime check |
| #3 | Must challenge "prompt says don't hallucinate" | **Confirmed** — no automated grounding beyond mock |
| #3 | Unit + integration on mock | **Recommended** — unit on mock-provider/prompts; integration substring oracle |
| #4 | Mock structurally valid; live smoke separate | **Confirmed** — factory + error mapping unit/integration; live tagged optional |
| #4 | Must challenge mock-green → prod-green | **Confirmed** — CI uses mock exclusively today |

## Related Research

- `context/archive/2026-06-06-testing-api-handler-contracts/reviews/impl-review.md` — Phase 2 scope; DEV env fix for mock header
- No prior `research.md` in generation archive folders (plans only)

## Planning decisions (resolved)

User decisions for `/10x-plan` — lock these; do not re-open without explicit scope change.

### 1. Multi-line fixture with must-not-appear token

**Decision: Yes.**

Add a deterministic fixture with one **accepted** section (first non-empty line) and one **ignored** section (subsequent line). Assert generated output **includes** the accepted token and **excludes** the ignored token. This is the main Phase 3 no-hallucination regression test for the **mock path**.

Note: mock `firstChangeLine` only classifies the first line — the ignored-token assertion proves second-line content does not leak into mock output; it does not prove Gemini ignores extra lines.

### 2. Provider failure tests

**Decision: Unit-only `wrapProviderError` to start.**

Cover mapping for provider timeout/error, config error, and unknown error paths. Add API-level fake-provider test **only if** provider injection is already cheap at the call site. **Do not** refactor the generation route solely for this in Phase 3.

### 3. In-repo tagged Gemini smoke

**Decision: Add in-repo tagged smoke, skipped by default.**

File: `tests/integration/generation-live-smoke.test.ts` (or equivalent) gated with `describe.skipIf(!process.env.GEMINI_API_KEY)`. Keep existing manual dev routes (`/api/dev/f01-gemini-smoke`, etc.) for ad-hoc debugging.

Smoke assertions only:

- Response/run schema valid
- Non-empty `classifiedItems`
- Tagged fixture token preserved in output (substring oracle)

Do **not** claim full live hallucination detection in docs or test names.

## Open Questions

None — see **Planning decisions** above.
