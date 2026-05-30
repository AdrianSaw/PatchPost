<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Generation workflow API backbone

- **Plan**: context/changes/generation-workflow-api-backbone/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-05-30
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 5 warnings, 3 observations — all triaged FIXED

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Production mock fallback without explicit opt-in

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/ai/factory.ts:24-25
- **Detail**: When `GEMINI_API_KEY` is unset and `AI_PROVIDER` is not `"mock"`, `getGenerationProvider()` silently returns `mockProvider` (dev-only `console.warn`). Production deploy without Wrangler secret serves deterministic mock copy while API returns 201 as if generation succeeded.
- **Fix**: Fail closed in production (`import.meta.env.PROD`) unless `AI_PROVIDER === "mock"`, returning 503 from workflow or throwing at factory resolution.
  - Strength: Prevents silent quality regression on prod misconfiguration.
  - Tradeoff: Requires explicit `AI_PROVIDER=mock` in CI/staging if mock is desired outside dev.
  - Confidence: HIGH — matches invite-only MVP expectation for real AI on prod.
  - Blind spot: None significant.
- **Decision**: FIXED — fail-closed in prod unless `AI_PROVIDER=mock` or `GEMINI_API_KEY` set

### F2 — Gemini API key passed in URL query string

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/ai/gemini-provider.ts:87
- **Detail**: `?key=${encodeURIComponent(apiKey)}` embeds the secret in the request URL. URLs are more likely to appear in proxy/platform logs than headers.
- **Fix**: Pass the key via `x-goog-api-key` header per Google REST docs; remove query param.
- **Decision**: FIXED — API key moved to `x-goog-api-key` header

### F3 — `markRunFailed` ignores update failures

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/generation-workflow.ts:66-68
- **Detail**: `markRunFailed` awaits `updateGenerationRun` but does not check `{ error }`. On DB/RLS failure after a provider error, the row can remain `status: "draft"` with partial `prompt_snapshot` while the client receives 502/503.
- **Fix**: Check `updateGenerationRun` result; log secondary failure or include run id in error response for support.
- **Decision**: FIXED — logs secondary failure in dev when status update fails

### F4 — Unbounded `raw_content` and classification items

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/projects/[id]/change-inputs.ts:12-13, src/lib/ai/classification.ts:24-25
- **Detail**: `raw_content` has only `min(1)` — no max length. `classificationResultSchema.items` has `min(1)` but no max. Large payloads inflate Gemini cost (two calls) and `prompt_snapshot` / API response size.
- **Fix**: Add shared Zod `.max()` on `raw_content` (e.g. 32–64 KB) and `.max(50)` on classification items array.
- **Decision**: FIXED — 64 KB cap on raw_content; max 50 classification items

### F5 — Manual success criterion 3.3 not verified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: plan.md Progress 3.3
- **Detail**: Progress marks 3.4 and smoke (4.3) done, but authenticated `POST .../change-inputs` + `POST .../generation-runs` via HTTP was not exercised. Smoke route calls services directly, not the JSON API surface S-03 will use.
- **Fix**: Run one authenticated curl session against both endpoints before archive; mark 3.3 `[x]` with evidence.
- **Decision**: FIXED — smoke route now exercises HTTP change-inputs + generation-runs with session cookies

### F6 — `prompt_snapshot.model` hardcoded, ignores `GEMINI_MODEL`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/generation-workflow.ts:132
- **Detail**: Snapshot records `"gemini-2.5-flash-lite"` when provider is gemini, regardless of `GEMINI_MODEL` resolved in `factory.ts`.
- **Fix**: Expose resolved model on provider instance or pass from `getGenerationProvider()` into snapshot builder.
- **Decision**: FIXED — `GenerationProvider.model` recorded in prompt_snapshot

### F7 — Middleware change vs plan "no change expected"

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/middleware.ts:47-51
- **Detail**: Plan Phase 3 said middleware needs no change, but implementation adds 401 JSON for unauthenticated `/api/*`. Intentional and required for manual 3.4; plan text is stale.
- **Fix**: Add one-line addendum to plan Phase 3 noting intentional middleware behavior change.
- **Decision**: FIXED — addendum added to Phase 3 middleware section

### F8 — `generation-runs` route skips explicit project preflight

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/projects/[id]/generation-runs.ts:16-39
- **Detail**: `change-inputs.ts` calls `getProjectById` before body parse; `generation-runs.ts` delegates to workflow. RLS keeps this safe; error mapping differs slightly.
- **Fix**: Mirror `change-inputs.ts` preflight for consistent 404/503 before `parseJsonBody`.
- **Decision**: FIXED — getProjectById preflight added to generation-runs route

## Automated verification (re-run 2026-05-30)

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run build` | PASS |

## Manual verification status

| Item | Status |
|------|--------|
| 1.3–1.4, 2.3, 3.4, 4.3 | Verified (smoke + 401 curl) |
| 3.3 | Pending — HTTP POST endpoints not curl-tested |
| 4.4 | Pending — optional Gemini PL smoke |

## Plan adherence summary

All planned files present. No missing phases. Supporting EXTRA files (`projects.ts`, `change-inputs.ts`, `project-detail-page.ts`) add typed return types only — benign scope.
