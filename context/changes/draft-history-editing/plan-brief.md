# Draft history editing — Plan Brief

> Full plan: `context/changes/draft-history-editing/plan.md`

## What & Why

Close roadmap **S-04** and PRD **FR-006**: after S-03’s generate-and-save flow, users can **edit saved draft bodies** in project history without re-running AI. Keeps AI output immutable in `content`; human edits live in `edited_content`.

## Starting Point

S-03 ships read-only drafts list + detail, `draftBody()` display helpers, and `updateGeneratedOutput()` in services — but no HTTP route or UI calls update. Classification panel stays read-only on detail.

## Desired End State

Draft detail has an inline textarea with Save, Cancel, and Revert. Save PATCHes `edited_content`, redirects to drafts list with `?success=saved`. List shows an **Edited** badge on touched rows. Empty saves blocked.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Scope | Body edit only (`edited_content`) | FR-006 minimum; status/archive/delete deferred | Plan |
| API | JSON PATCH route | Matches GenerateForm + long text; not HTML form POST | Plan |
| Edit UX | Inline on detail page | One screen; classification stays visible | Plan |
| Post-save | Redirect to drafts list `?success=saved` | User choice; reinforces “saved to history” | Plan |
| Revert | PATCH `edited_content: null` | Restores AI `content` via `draftBody()` | Plan |
| Empty save | Block client + server | Prevents blank history rows | Plan |
| List signal | **Edited** badge when override exists | User choice; quick scan of touched drafts | Plan |
| Unsaved edits | Cancel resets textarea | User choice; explicit escape without leaving page | Plan |

## Scope

**In scope:** PATCH API, client helper, `DraftEditForm`, detail page wiring, list badge, saved success banner.

**Out of scope:** Title edit, status workflow, archive/delete, migrations, separate edit route, automated E2E.

## Architecture / Approach

New `PATCH /api/projects/[id]/drafts/[draftId]` validates auth + ownership, delegates to `updateGeneratedOutput`. React island on existing detail page calls client helper; list page reads `edited_content` already present in history query. RLS unchanged.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. API + client helper | PATCH save/revert boundary | IDOR if project/draft match skipped |
| 2. Inline edit UI | Textarea, Save/Cancel/Revert, redirect | Dirty-state / revert confirm UX |
| 3. List polish | Edited badge + saved banner | Banner query collision with `success=generated` |

**Prerequisites:** S-03 on `master`; Supabase env.  
**Estimated effort:** ~1–2 implementation sessions across 3 phases.

## Open Risks & Assumptions

- Revert uses browser `confirm()` — acceptable MVP; no modal component in repo yet.
- Large drafts load fully in textarea — same as current `<pre>` display assumption.
- Milestone 9 status/archive/delete remain future slices.

## Success Criteria (Summary)

- Signed-in user edits a saved draft, saves, sees list banner + **Edited** badge, reopens with persisted text.
- Revert restores AI original; Cancel discards unsaved typing.
- `npm run lint` and `npm run build` pass after Phase 3.
