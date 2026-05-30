# Generation workflow API backbone — Implementation Plan

## Overview

Ship roadmap **F-01**: server-side API contract for manual change input (FR-003), AI classification, and channel-aware content generation (FR-004), persisting `generation_runs` and `generated_outputs` via existing F-02 services. S-03 will add UI; this change delivers the **LLM adapter + orchestration + JSON HTTP routes** only.

Provider default follows `context/changes/generation-workflow-api-backbone/research.md`: **MockProvider** for CI/dev without keys; **Gemini 2.5 Flash-Lite (free tier)** when `GEMINI_API_KEY` is set.

## Current State Analysis

S-01 auth + S-02 project CRUD are done. F-02 provides Supabase tables, RLS, Zod types, and service CRUD for `change_inputs`, `generation_runs`, and `generated_outputs`. No AI client, prompt rendering, or domain generation API exists.

`src/pages/api/dev/f02-service-smoke.ts` proves the persistence chain with static content — no classify/generate steps. `astro.config.mjs` env schema exposes only `SUPABASE_*`. Prompt specs live in `README_PatchPost_plan.md` §13–14 (English system prompts; product PRD in Polish).

### Key Discoveries:

- `context/foundation/prd.md:85-88` — classify **before** generate; no hallucination guardrail.
- `src/types.ts:6-13` — `outputTypeSchema` already lists `changelog`, `instagram_post`, `discord_update`, `steam_news`, `devlog_summary`.
- `src/lib/services/generation-runs.ts:57-91` — `createGenerationRun` accepts `prompt_snapshot`; use JSON blob for classified items + prompt metadata (no new migration).
- `AGENTS.md` — API routes: `export const prerender = false`; Zod validation; secrets server-only via `astro:env/server` + wrangler.
- `README_PatchPost_plan.md:966-974` — Milestone 5: mock AI first, then real generator.

## Desired End State

1. Authenticated owner can `POST` manual change input to a project (JSON API).
2. Authenticated owner can `POST` a generation run for a `change_input_id` + `output_type` + optional `tone`; server runs **classify → generate → persist** and returns run + output + classified items.
3. Workflow uses **MockProvider** when `AI_PROVIDER=mock` or no Gemini key; uses **GeminiProvider** when configured.
4. Classification output validates against a Zod schema aligned with README §14 JSON shape; one retry on invalid JSON from Gemini.
5. Failed runs set `generation_runs.status = failed`; successful runs create `generated_outputs` with `status = draft`.
6. Dev-only smoke route exercises full pipeline with MockProvider (no external API).
7. `npm run lint` and `npm run build` pass.

### Verification

- **Automated:** `npm run lint`, `npm run build`
- **Manual:** curl or REST client against change-input + generation-run endpoints under signed-in session; optional Gemini key smoke

## What We're NOT Doing

- S-03 UI (`/app/projects/[id]/generate`, history list, editor) — separate slice
- GitHub commit import
- New Supabase migrations or schema columns (classification lives in `prompt_snapshot` JSON)
- Streaming responses / SSE
- OpenAI or multi-provider adapters (interface allows later; only mock + Gemini in F-01)
- Playwright or unit test runner (no `test` script in `package.json`)
- Automatic save/history UX (FR-005 persistence happens in API, but no history UI)
- Draft editing (FR-006 / S-04)
- Removing F-02 dev smoke routes

## Implementation Approach

Four vertical phases: (1) AI provider layer + prompts + env, (2) workflow orchestration service, (3) JSON HTTP API, (4) dev smoke + docs touch-ups. Mock-first enables CI and local dev without Gemini quota.

JSON API (not HTML form POST) — generation flow is programmatic; S-03 will use `fetch`. Auth pattern matches existing routes: `createClient` + `getUser()` → 401 JSON.

## Critical Implementation Details

**Provider resolution order:** If `AI_PROVIDER=mock` → MockProvider. Else if `GEMINI_API_KEY` present → GeminiProvider. Else → MockProvider (log warning in dev only; never throw at module load).

**prompt_snapshot JSON shape** (versioned, no migration):

```json
{
  "v": 1,
  "provider": "mock" | "gemini",
  "model": "gemini-2.5-flash-lite",
  "classifiedItems": [ { "source", "classification", "visibility", "reason", "suggested_public_summary" } ],
  "outputLanguage": "pl" | "en"
}
```

Do not store full raw prompts if they contain secrets; store template ids + hashes if needed later. For F-01, storing rendered prompt strings in snapshot is acceptable for debug (invite-only MVP).

**Output language:** Infer from `raw_content` — if majority of words match Polish diacritics/common Polish tokens, instruct model to output Polish; otherwise English. Document heuristic in `src/lib/ai/prompts.ts` (simple, no new dependency).

**Gemini 429:** Retry once with backoff (~1s); return 503 JSON `{ error: "AI rate limit, try again shortly" }`.

## Phase 1: AI provider layer, prompts, and env

### Overview

Introduce provider abstraction, prompt templates from README, classification Zod schema, and server env for Gemini + provider selection.

### Changes Required:

#### 1. Classification types and schema

**File**: `src/lib/ai/classification.ts`

**Intent**: Single source of truth for classify step input/output matching README §14.

**Contract**: Export `classificationItemSchema`, `classificationResultSchema`, and inferred TS types. Enum values for `classification` and `visibility` match README literals exactly.

#### 2. Prompt templates

**File**: `src/lib/ai/prompts.ts`

**Intent**: Render classify and generate prompts from project + change input + classified items + output channel.

**Contract**: Export `buildClassifyPrompt(project, changeInput)` and `buildGeneratePrompt(project, outputType, tone, classifiedItems, outputLanguage)`. Lift system rules verbatim from `README_PatchPost_plan.md` §14. Map `outputTypeSchema` values to the four generate templates (changelog, instagram_post, discord_update, steam_news); `devlog_summary` reuses changelog template with tone hint.

#### 3. Provider interface

**File**: `src/lib/ai/provider.ts`

**Intent**: Provider-agnostic contract for F-01 and future adapters.

**Contract**:

```ts
interface GenerationProvider {
  readonly name: string;
  classify(input: ClassifyRequest): Promise<ClassifyResult>;
  generate(input: GenerateRequest): Promise<GenerateResult>;
}
```

#### 4. Mock provider

**File**: `src/lib/ai/mock-provider.ts`

**Intent**: Deterministic classify/generate for dev, smoke route, and CI build paths without external calls.

**Contract**: Return valid Zod-parsed classification (one item from first line of `raw_content`) and channel-appropriate stub copy referencing only input text. No network I/O.

#### 5. Gemini provider

**File**: `src/lib/ai/gemini-provider.ts`

**Intent**: Call Gemini 2.5 Flash-Lite via REST (`generativelanguage.googleapis.com`) from Workers using `fetch`.

**Contract**: Read `GEMINI_API_KEY` from `astro:env/server`. Model id configurable via optional `GEMINI_MODEL` env (default `gemini-2.5-flash-lite`). Classify: JSON response mode + parse + Zod validate; one retry on parse failure. Generate: text response; parse Title/Body or Caption/Hashtags sections per channel.

#### 6. Provider factory

**File**: `src/lib/ai/factory.ts`

**Intent**: Centralize provider selection per research recommendation.

**Contract**: Export `getGenerationProvider(): GenerationProvider` implementing resolution order above.

#### 7. Env schema and example

**Files**: `astro.config.mjs`, `.env.example`

**Intent**: Register AI secrets server-only; document local setup.

**Contract**: Add optional `GEMINI_API_KEY`, optional `GEMINI_MODEL`, optional `AI_PROVIDER` (`mock` | `gemini`) to `env.schema`. Extend `.env.example` with commented placeholders (no real keys). AGENTS.md secrets bullet: mention `wrangler secret put GEMINI_API_KEY` for production.

#### 8. Barrel export

**File**: `src/lib/ai/index.ts`

**Intent**: Stable import path for workflow and routes.

**Contract**: Re-export factory, types, and schemas used by services.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes (MockProvider default — no Gemini key required in CI)

#### Manual Verification:

- With `AI_PROVIDER=mock`, importing `getGenerationProvider()` in dev returns mock without env key
- With `GEMINI_API_KEY` set locally, factory returns Gemini provider

**Implementation Note**: Pause for human confirmation after manual checks before Phase 2.

---

## Phase 2: Generation workflow orchestration

### Overview

Implement the classify → generate → persist pipeline using F-02 services and the provider layer.

### Changes Required:

#### 1. Output language helper

**File**: `src/lib/ai/output-language.ts`

**Intent**: Pick PL vs EN for generate prompt per plan heuristic.

**Contract**: Export `detectOutputLanguage(rawContent: string): "pl" | "en"`.

#### 2. Generation workflow service

**File**: `src/lib/services/generation-workflow.ts`

**Intent**: Single orchestration entry used by API routes; keeps handlers thin.

**Contract**: Export `runGenerationWorkflow(supabase, userId, input)` where input includes `projectId`, `changeInputId`, `outputType`, optional `tone`. Steps:

1. Load project (`getProjectById`) and change input (`getChangeInputById`); verify same project; 404 if missing.
2. Resolve tone: input tone ?? project.default_tone ?? `professional`.
3. Create `generation_run` with `status: draft` (or intermediate — update to `failed` on error).
4. Call `provider.classify`; on failure update run `status: failed` and return error.
5. Build `prompt_snapshot` JSON; `updateGenerationRun` with snapshot.
6. Call `provider.generate`; on failure update run `status: failed`.
7. Parse generate result into `title` + `content` strings for `generated_outputs`.
8. `createGeneratedOutput` linked to run; return `{ generationRun, generatedOutput, classifiedItems }`.

Use existing service helpers only — no raw Supabase in routes.

#### 3. Service barrel

**File**: `src/lib/services/index.ts`

**Intent**: Export workflow for API consumers.

**Contract**: Re-export `runGenerationWorkflow`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Temporary dev script or node REPL not required — verified via Phase 4 smoke route calling workflow with MockProvider

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: JSON HTTP API routes

### Overview

Expose FR-003/FR-004 contract as authenticated JSON endpoints under `/api/projects/[id]/`.

### Changes Required:

#### 1. Shared API helpers

**File**: `src/lib/api/generation-api.ts`

**Intent**: Consistent JSON error responses and Zod body parsing.

**Contract**: Export `jsonError(status, message)`, `parseJsonBody(request, schema)`, UUID param validation helper.

#### 2. Create change input

**File**: `src/pages/api/projects/[id]/change-inputs.ts`

**Intent**: FR-003 API — owner adds manual change text to a project.

**Contract**: `export const prerender = false`. `POST` only. Body schema: `{ title?: string | null, raw_content: string }`. Auth required. Verify project exists and belongs to user (via RLS + `getProjectById`). Call `createChangeInput`. Return `201` JSON `{ changeInput }`. Errors: 401, 404, 422, 503 (Supabase down).

#### 3. Run generation workflow

**File**: `src/pages/api/projects/[id]/generation-runs.ts`

**Intent**: FR-004 API — classify, generate, persist in one request.

**Contract**: `POST` only. Body schema: `{ change_input_id: uuid, output_type: OutputType, tone?: DefaultTone }`. Call `runGenerationWorkflow`. Return `201` JSON `{ generationRun, generatedOutput, classifiedItems }`. Map provider/rate-limit errors to 502/503 with safe messages (no stack traces). Invalid UUID param → 404 JSON.

#### 4. Middleware

**File**: `src/middleware.ts`

**Intent**: No change expected — `/api/projects/*` already protected by catch-all auth unless listed public.

**Contract**: Confirm no new public-route allowlist entries needed.

**Addendum (impl):** Unauthenticated `/api/*` returns `401` JSON instead of redirect to signin — required for JSON API manual verification (3.4).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Signed-in `POST /api/projects/{id}/change-inputs` creates row visible in Supabase
- Signed-in `POST /api/projects/{id}/generation-runs` returns draft output with classified items
- Unauthenticated requests return 401 JSON
- Wrong project/input UUID returns 404

**Implementation Note**: Pause for human confirmation before Phase 4.

---

## Phase 4: Dev smoke route and verification

### Overview

Add F-01 dev smoke endpoint (mirrors F-02 pattern) and finalize manual verification checklist.

### Changes Required:

#### 1. F-01 generation smoke route

**File**: `src/pages/api/dev/f01-generation-smoke.ts`

**Intent**: One-click manual verification of full pipeline without UI.

**Contract**: `GET`, `import.meta.env.DEV` only else 404. Force `AI_PROVIDER=mock` for test isolation (or always use MockProvider directly). Creates temp project + change input, runs workflow, asserts output content non-empty, deletes project (cleanup). Returns JSON `{ ok: true, ... }` like f02-service-smoke.

#### 2. Change metadata

**File**: `context/changes/generation-workflow-api-backbone/change.md`

**Intent**: Mark change ready for implementation tracking.

**Contract**: `status: planned`, `updated: 2026-05-30`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Dev GET `/api/dev/f01-generation-smoke` returns `ok: true` when signed in
- Optional: repeat generation-runs POST with real `GEMINI_API_KEY` and sample Polish manual input; output language matches input
- Document curl examples in change Notes or impl session (not required in repo docs per scope)

**Implementation Note**: Final human sign-off before `/10x-implement` epilogue.

---

## Testing Strategy

### Unit Tests:

- Not in scope (no test runner). Zod schemas are the primary automated guard.

### Integration Tests:

- Dev smoke routes (`f02-service-smoke`, `f01-generation-smoke`) + manual curl.

### Manual Testing Steps:

1. Set `.env` / `.dev.vars`: `AI_PROVIDER=mock`.
2. Sign in; create project via UI if needed; note `projectId`.
3. `POST /api/projects/{id}/change-inputs` with sample commit bullets (PL and EN cases).
4. `POST /api/projects/{id}/generation-runs` with `output_type: changelog`.
5. Confirm rows in Supabase: `generation_runs.prompt_snapshot` contains classified JSON; `generated_outputs.content` populated.
6. Set `GEMINI_API_KEY`, `AI_PROVIDER=gemini`; repeat one generation; confirm real copy.
7. Run `npm run lint` and `npm run build`.

## Performance Considerations

Two sequential LLM calls per generation (~3–5s with Gemini). Acceptable for MVP manual flow. No streaming. Rate limits handled with single retry (research: free tier ample for solo dev).

## Migration Notes

No migrations. Requires F-02 schema applied. CI continues using mock provider without Gemini secret.

## References

- Research: `context/changes/generation-workflow-api-backbone/research.md`
- PRD: `context/foundation/prd.md` — FR-003, FR-004, Business Logic
- Roadmap: `context/foundation/roadmap.md` — F-01
- Prompt spec: `README_PatchPost_plan.md` §13–14
- F-02 services: `src/lib/services/change-inputs.ts`, `generation-runs.ts`, `generated_outputs.ts`
- Dev smoke pattern: `src/pages/api/dev/f02-service-smoke.ts`
- Project API pattern: `src/pages/api/projects/[id].ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: AI provider layer, prompts, and env

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 618c85a
- [x] 1.2 Production build passes: `npm run build` — 618c85a

#### Manual

- [x] 1.3 Mock provider selected without Gemini key — 618c85a
- [x] 1.4 Gemini provider selected when `GEMINI_API_KEY` set — 618c85a

### Phase 2: Generation workflow orchestration

#### Automated

- [x] 2.1 Lint passes: `npm run lint` — adf38b1
- [x] 2.2 Production build passes: `npm run build` — adf38b1

#### Manual

- [x] 2.3 Workflow completes classify → generate → persist via MockProvider (via smoke or curl) — adf38b1

### Phase 3: JSON HTTP API routes

#### Automated

- [x] 3.1 Lint passes: `npm run lint` — 4206860
- [x] 3.2 Production build passes: `npm run build` — 4206860

#### Manual

- [x] 3.3 POST change-inputs + generation-runs succeed authenticated
- [x] 3.4 Unauthenticated and wrong UUID cases return expected errors — 4206860

### Phase 4: Dev smoke route and verification

#### Automated

- [x] 4.1 Lint passes: `npm run lint` — db3080a
- [x] 4.2 Production build passes: `npm run build` — db3080a

#### Manual

- [x] 4.3 GET `/api/dev/f01-generation-smoke` returns ok when signed in — db3080a
- [x] 4.4 Optional Gemini live smoke with Polish input — verified via `/api/dev/f01-gemini-smoke`: `provider:"gemini"`, `model:"gemini-2.5-flash-lite"`, `outputLanguage:"pl"`, `cleanedUp:true`
