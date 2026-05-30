# Manual to generated history flow — Plan Brief

> Full plan: `context/changes/manual-to-generated-history-flow/plan.md`  
> Research: `context/changes/manual-to-generated-history-flow/research.md`

## What & Why

Close roadmap **S-03** and PRD **US-01**: signed-in users paste commit messages or change bullets manually, pick a communication channel, generate player-facing copy via existing F-01 APIs, and see saved drafts in project history — proving the product north star without GitHub repo access.

## Starting Point

F-01 JSON APIs (`change-inputs`, `generation-runs`) and F-02 persistence are done. S-02 delivers project CRUD at `/app/projects/*`. No generate or drafts UI exists. User intent: **manual paste only** (private repos; no git history import).

## Desired End State

From a project hub, user opens **Generate**, pastes changes, selects channel/tone, waits for AI, lands on **Drafts** with a success banner, opens a **read-only draft detail** with collapsible classification. No backend migrations required.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Routes | Separate `/generate` + `/drafts` (+ detail) | Matches README §9; clear mental model | Plan |
| Input model | Manual textarea (paste commits) | User intent + FR-003; no GitHub API | Research / Notes |
| Generate transport | React + `fetch` JSON | F-01 APIs are JSON-only; two-step orchestration | Plan |
| Post-success UX | Redirect to drafts list + banner | User choice; reinforces “saved to history” | Plan |
| Classification display | Collapsible on draft detail | User choice; data lives in `prompt_snapshot` after redirect | Plan |
| History depth | List + read-only detail | US-01 open draft; edit deferred to S-04 | Plan |
| Project hub | Nav links on existing detail page | Discoverability without new settings route | Plan |
| Backend scope | No new API routes | SSR reads via services; reuse F-01 POST | Research |

## Scope

**In scope:** Labels/helpers, draft history query with run join, project hub nav, generate page + form, drafts list + detail, classification panel, manual verification.

**Out of scope:** GitHub import, draft editing (S-04), migrations, new generation endpoints, auto-publish, automated E2E.

## Architecture / Approach

SSR Astro pages load projects and draft lists via Supabase services (S-02 pattern). A React island on `/generate` POSTs to existing JSON APIs in sequence, then redirects. Draft detail parses `generation_runs.prompt_snapshot` for classification UI. RLS remains the auth boundary.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Hub & data helpers | Nav links, label maps, draft list query | Join select shape / typing |
| 2. Generate UI | Paste form, channel/tone, client API orchestration | Partial failure (orphan change_input); long LLM wait |
| 3. Draft history | List + success banner + read-only detail + classification | Snapshot JSON parse edge cases |

**Prerequisites:** S-01, S-02, F-01, F-02 on `master`; Supabase env local/hosted.  
**Estimated effort:** ~2–3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- Orphan `change_inputs` if generation fails after input create — acceptable MVP; show error on generate page.
- No toast library — success via `?success=generated` query banner (matches existing `?error=` pattern).
- Classification panel depends on valid `prompt_snapshot` JSON from F-01 runs.

## Success Criteria (Summary)

- Signed-in user completes paste → generate → drafts list → draft detail without leaving the app.
- Channel selection maps to all five existing `output_type` values.
- `npm run lint` and `npm run build` pass after Phase 3.
