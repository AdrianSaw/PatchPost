# Generation workflow API backbone — Plan Brief

> Full plan: `context/changes/generation-workflow-api-backbone/plan.md`
> Research: `context/changes/generation-workflow-api-backbone/research.md`

## What & Why

Deliver roadmap **F-01**: the backend contract for manual change input, AI classification, and channel-aware generation (FR-003/FR-004), persisting runs and drafts through existing F-02 services. This unlocks **S-03** (UI flow) without ad-hoc LLM wiring.

## Starting Point

F-02 provides Supabase tables, RLS, Zod types, and service CRUD for `change_inputs`, `generation_runs`, and `generated_outputs`. S-02 project CRUD is done. Prompt specs exist in README §13–14, but there is no `src/lib/ai/`, no generation HTTP API, and no `GEMINI_API_KEY` in env schema.

## Desired End State

An authenticated project owner can `POST` manual change text and `POST` a generation run; the server classifies changes, generates channel-specific copy, saves a draft output, and returns JSON — using **MockProvider** by default and **Gemini 2.5 Flash-Lite (free tier)** when configured.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| LLM provider (dev) | Gemini 2.5 Flash-Lite free tier | $0 + enough quota for solo testing | Research |
| LLM provider (CI/no key) | MockProvider | README Milestone 5; CI has no Gemini secret | Research |
| Provider pattern | `GenerationProvider` interface + factory | Swap Gemini/OpenAI later without API churn | Research |
| API style | JSON POST (not HTML forms) | S-03 will use fetch; generation is programmatic | Plan |
| Orchestration | Single `POST .../generation-runs` | Classify → generate → persist in one contract | Plan |
| Manual input API | `POST .../change-inputs` | FR-003 backbone separate from UI | Plan |
| Classification storage | JSON in `prompt_snapshot` | Avoid new migration; F-02 column already exists | Plan |
| Output language | Heuristic PL/EN from `raw_content` | PRD Polish product; prompts English in README | Plan |
| JSON reliability | Zod validate + 1 retry | Gemini structured output good but not strict-mode | Research |
| Scope boundary | No UI, no GitHub, no migrations | F-01 = API backbone only | Roadmap |

## Scope

**In scope:** `src/lib/ai/*`, workflow service, `POST /api/projects/[id]/change-inputs`, `POST /api/projects/[id]/generation-runs`, env schema, dev smoke route, manual curl verification.

**Out of scope:** Generate UI, history list, draft editor (S-03/S-04), GitHub import, OpenAI adapter, streaming, Playwright tests, new migrations.

## Architecture / Approach

```
Client (curl / future S-03)
  → POST change-inputs → change_inputs service
  → POST generation-runs → generation-workflow service
       → getGenerationProvider() → classify → generate
       → generation_runs + generated_outputs services
```

Mock and Gemini share the same orchestration path; only the provider differs.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. AI layer + env | Provider interface, prompts, mock + Gemini, secrets | Gemini JSON parse failures |
| 2. Workflow service | classify → generate → persist | Error handling / failed run status |
| 3. HTTP API | JSON routes for input + generation | Auth/error response consistency |
| 4. Dev smoke | `/api/dev/f01-generation-smoke` | None — follows F-02 pattern |

**Prerequisites:** S-02 + F-02 merged; Supabase env configured; optional `GEMINI_API_KEY` for live AI.  
**Estimated effort:** ~3–4 implementation sessions across 4 phases.

## Open Risks & Assumptions

- Gemini free-tier quotas may change; 429 retry + user message required.
- Free tier allows Google to use prompts for product improvement — acceptable for dev only.
- Polish copy quality on Flash-Lite must be validated manually before production.
- CI builds without `GEMINI_API_KEY` — must always default to mock.

## Success Criteria (Summary)

- Owner can create change input and generation run via API; draft saved in DB.
- Mock path works with no external API (smoke route + CI build).
- Optional Gemini path produces real classified + generated content.
- `npm run lint` and `npm run build` pass.
