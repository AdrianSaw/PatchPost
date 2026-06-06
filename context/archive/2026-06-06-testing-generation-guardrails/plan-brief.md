# Testing Generation Guardrails — Plan Brief

> Full plan: `context/changes/testing-generation-guardrails/plan.md`
> Research: `context/changes/testing-generation-guardrails/research.md`

## What & Why

PatchPost must prove generated player copy stays tied to manual change input (Risk #3) and that mock vs live AI boundaries are testable without false confidence (Risk #4). Phase 2 tested HTTP persistence only; this change adds guardrail oracles, unit coverage, and optional tagged Gemini smoke.

## Starting Point

Vitest harness + local Supabase integration tests exist. `generation-runs-api-contracts.test.ts` asserts 201/422 and row IDs but not output text. Mock provider echoes the first line of `raw_content`; no unit tests yet; no in-repo live smoke.

## Desired End State

Developers can run `npm test` and get mock-path guardrail regression (accepted token in, ignored token out), fast unit tests for factory/prompts/errors, and an optional live smoke gated on `GEMINI_API_KEY`. Test-plan §6.5 documents how to extend guardrails for new output types.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Multi-line fixture | Accepted + ignored tokens | Main mock-path #3 regression | Research / User |
| Provider failures | Unit-only `wrapProviderError` | No route refactor in Phase 3 | User |
| Live Gemini | In-repo smoke, skip by default | Structural check without CI cost | User |
| Hallucination scope | Mock full; live partial | No runtime grounding for Gemini | Research |
| Production code | Export `wrapProviderError` only | Minimal surface for error tests | Plan |

## Scope

**In scope:** Unit suites under `tests/unit/`; shared `guardrail-fixtures` helper; integration multi-line mock test; optional live smoke; §6.5 cookbook; `wrapProviderError` export.

**Out of scope:** LLM snapshots; semantic judges; API fake provider; CI gate; production validation layer; Playwright.

## Architecture / Approach

```
raw_content (multi-line fixture)
  → unit: mock-provider + prompts (fast oracles)
  → integration: POST generation-runs + mock header → DB content include/exclude
  → optional live: POST without mock header when GEMINI_API_KEY set
  → docs: test-plan §6.5
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Unit foundation | mock, prompts, factory, errors, snapshot | Over-testing prompt strings |
| 2. Integration mock guardrails | Multi-line include/exclude on persisted content | Duplicating Phase 2 HTTP tests |
| 3. Tagged live smoke | SkipIf GEMINI; schema + token preservation | Flaky live API / cost |
| 4. Cookbook closeout | §6.5 + Phase 3 complete | Docs drift from file names |

**Prerequisites:** Phase 1–2 test harness; `.env.local` for integration; optional `GEMINI_API_KEY` for Phase 3 manual check.

**Estimated effort:** ~3–4 implementation sessions across 4 phases.

## Open Risks & Assumptions

- Live smoke may not exclude ignored tokens (Gemini may summarize both lines) — plan only asserts accepted token preservation live.
- Mock guardrail does not prove Gemini behavior; documented in tests and §6.5.
- Exporting `wrapProviderError` is acceptable public test surface for this repo.

## Success Criteria (Summary)

- Default `npm test` green without Gemini key; guardrail integration proves accepted in / ignored out on mock path.
- Factory and error mapping covered in unit tests.
- §6.5 gives a copy-paste recipe for the next guardrail test.
