# Draft history editing — Implementation Plan

## Overview

Ship roadmap **S-04** / PRD **FR-006**: authenticated project owners open a saved draft from history and edit its body inline. Saves persist to `edited_content` only (AI `content` stays immutable). Includes revert-to-original, cancel unsaved edits, post-save redirect to drafts list with success banner, and an **Edited** badge on list rows.

Backend schema, RLS, and `updateGeneratedOutput()` already exist from F-02; S-03 delivers read-only list/detail and `draftBody()` (`edited_content ?? content`). This change adds **one JSON PATCH route**, a **client fetch helper**, and **React edit UI** on the existing detail page.

## Current State Analysis

- **S-03 (done):** `/app/projects/[id]/drafts` list + `/drafts/[draftId]` read-only detail; `draftSnippet` / `draftBody` in `src/lib/projects/draft-text.ts`; classification panel from `prompt_snapshot`.
- **F-02 service:** `updateGeneratedOutput()` in `src/lib/services/generated-outputs.ts` validates via `updateGeneratedOutputSchema` but is **never called** from app code.
- **No product API** for draft updates under `src/pages/api/` — only projects, change-inputs, generation-runs, auth.
- **Generate pattern:** React + JSON `fetch` (`GenerateForm`, `client-api.ts`). **Project settings:** HTML form POST + redirect — poor fit for long draft bodies.

### Key Discoveries:

- `src/types.ts:132-143` — `updateGeneratedOutputSchema` accepts `edited_content` (string or null) without requiring `content` mutation.
- `src/lib/projects/draft-text.ts:11-13` — display path already prefers `edited_content ?? content`; list query includes `edited_content` column.
- S-03 archived plan deferred edit explicitly: detail uses `<pre>` today; `edited_content ?? content` was pre-wired for S-04.
- Milestone 9 README tasks 4–5 (status workflow, archive/delete) are **out of scope** for this slice per planning decisions.

## Desired End State

1. User opens draft detail; body appears in an editable textarea (inline on same page; classification stays read-only above).
2. **Save** PATCHes `{ edited_content: "<trimmed non-empty body>" }`; on success redirects to `/app/projects/{id}/drafts?success=saved`.
3. **Cancel** resets textarea to last saved body (`draftBody(draft)`) without API call.
4. **Revert to original** PATCHes `{ edited_content: null }`; redirects to drafts list (or reloads detail — implementer may redirect to list for consistency with Save).
5. Drafts list shows **Edited** badge on rows where `edited_content` is non-null; `?success=saved` shows a distinct success banner.
6. Empty trimmed body blocked client- and server-side on save.
7. Lint and build pass; manual flow verified signed-in.

### Verification

- **Automated:** `npm run lint`, `npm run build`
- **Manual:** edit → save → list banner + badge → reopen detail; cancel; revert; invalid draft id → 404/redirect

## What We're NOT Doing

- Editing `title` or AI `content` directly
- Draft status workflow (`draft` / `accepted` / `archived`) — Milestone 9 task 4
- Archive or delete draft API/UI — Milestone 9 task 5
- New Supabase migrations or RLS changes
- Separate `/edit` route or modal-only flow
- Playwright/unit tests (no runner in `package.json`)
- HTML form POST for save (JSON PATCH only)

## Implementation Approach

Three vertical phases: API boundary first, detail edit UI second, list polish third. Reuse F-01 JSON helpers (`jsonResponse`, `parseJsonBody`, `parseUuidParam` from `src/lib/api/generation-api.ts`), auth pattern from `change-inputs.ts`, and React form components from Generate/Project flows (`SubmitButton`, `ServerError`, `Textarea`, `cn()`).

**Persistence contract:** Only `edited_content` mutates. `content` remains the immutable AI snapshot from generation.

## Critical Implementation Details

**Revert semantics:** PATCH `{ edited_content: null }` clears the override; display falls back to `content` via `draftBody()`. Do not delete the row or overwrite `content`.

**Post-save redirect:** User chose list redirect (not stay-on-detail). Success query `success=saved` must be parsed in `loadDraftsPage` separately from `success=generated` so banner copy differs.

**List badge data:** `listProjectDraftHistory` already selects `edited_content`; badge is a template conditional — no new query.

## Phase 1: Draft update API and client helper

### Overview

Expose PATCH for draft body updates and revert; thin typed client wrapper for the React form.

### Changes Required:

#### 1. Draft PATCH API route

**File**: `src/pages/api/projects/[id]/drafts/[draftId].ts`

**Intent**: Authenticated JSON endpoint to update `edited_content` on an owned draft.

**Contract**: `export const prerender = false`. Export `PATCH` only. Parse `projectId` and `draftId` UUIDs via `parseUuidParam`. Auth via `createClient` + `getUser()` (401 if missing). Load project via `getProjectById` (404 if missing). Load draft via `getGeneratedOutputById`; verify `draft.project_id === projectId` (404 if mismatch — IDOR guard). Body schema:

```typescript
z.object({
  edited_content: z.union([z.string().trim().min(1), z.null()]),
});
```

Call `updateGeneratedOutput(supabase, draftId, { edited_content })`. Map validation errors to 422; other errors to 503. Return 200 `{ draft: GeneratedOutput }` on success. Reuse `jsonError` / `jsonResponse` from `@/lib/api/generation-api`.

#### 2. Client fetch helper

**File**: `src/lib/projects/draft-client-api.ts`

**Intent**: Keep edit UI thin — typed PATCH wrapper with JSON error parsing.

**Contract**: Export discriminated result type matching `client-api.ts` pattern. Export `updateDraftBody(projectId, draftId, editedContent: string)` and `revertDraftToOriginal(projectId, draftId)` (sends `{ edited_content: null }`). Target URL: `/api/projects/${projectId}/drafts/${draftId}` with `method: "PATCH"`, `Content-Type: application/json`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- PATCH with valid session updates `edited_content` in DB (verify via Supabase dashboard or reopen detail after manual reload)
- PATCH `{ edited_content: null }` clears override
- PATCH with empty string returns 422
- Unauthenticated or wrong-project draft returns 401/404

**Implementation Note**: Pause for human confirmation after manual checks before Phase 2.

---

## Phase 2: Inline edit UI on draft detail

### Overview

Replace read-only `<pre>` with a React island: textarea, Save, Cancel, Revert, validation, and redirect on success.

### Changes Required:

#### 1. Draft edit form (React)

**File**: `src/components/generation/DraftEditForm.tsx`

**Intent**: Inline editor for draft body on detail page.

**Contract**:

- Props: `projectId`, `draftId`, `initialBody` (string from `draftBody(draft)`), `showRevert` (boolean — `draft.edited_content != null`).
- State: textarea value initialized to `initialBody`; `submitError`; `isSubmitting`.
- **Save:** client validate non-empty trim; call `updateDraftBody`; on success `window.location.assign(`/app/projects/${projectId}/drafts?success=saved`)`; on error show `ServerError`.
- **Cancel:** reset textarea to `initialBody`; clear errors (no API).
- **Revert to original:** confirm via `window.confirm` (simple MVP); call `revertDraftToOriginal`; redirect to drafts list on success.
- Disable Save until value differs from `initialBody` (dirty check).
- Use `Textarea`, `SubmitButton` (with `pending` override like `GenerateForm`), `Button` variant for Cancel/Revert, `cn()`.
- Wrap in `<form onSubmit>` for Save; Cancel/Revert as `type="button"`.

#### 2. Draft detail page wiring

**File**: `src/pages/app/projects/[id]/drafts/[draftId].astro`

**Intent**: Mount edit form instead of static `<pre>`.

**Contract**: Import `DraftEditForm`; pass `projectId`, `draftId`, `initialBody={body}`, `showRevert={draft.edited_content != null}`; `client:load`. Keep header metadata and `ClassificationPanel` unchanged above the form.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Edit body → Save → redirects to drafts list with success banner
- Cancel restores textarea without saving
- Revert clears manual edits and shows original AI content on reopen
- Empty save blocked with inline validation
- Classification panel still works above editor

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Drafts list badge and saved success banner

### Overview

Surface edited state on list rows and distinct post-save messaging on the index page.

### Changes Required:

#### 1. Drafts page loader

**File**: `src/lib/projects/drafts-page.ts`

**Intent**: Parse `success=saved` query for banner flag distinct from `success=generated`.

**Contract**: Extend return type with `showSavedBanner: boolean` (`searchParams.get("success") === "saved"`). Keep existing `showSuccessBanner` for `generated` unchanged.

#### 2. Drafts list page

**File**: `src/pages/app/projects/[id]/drafts/index.astro`

**Intent**: Show **Edited** badge and saved success message.

**Contract**:

- When `showSavedBanner`, render banner e.g. “Draft changes saved.” (distinct copy from generated banner).
- On each row, if `draft.edited_content != null`, show small **Edited** label/badge near title or metadata (match glass/cosmic styling).
- Snippet continues using `draftSnippet(draft)` — no change needed.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- After save redirect, list shows saved banner (not generated banner)
- Edited draft row shows **Edited** badge; untouched draft does not
- Snippet reflects edited text
- Full flow: generate → edit → save → badge persists on list

---

## Testing Strategy

### Manual Testing Steps:

1. Sign in; open project with an existing draft (or generate one via S-03 flow).
2. Open draft detail; change body text; Save → lands on drafts list with “saved” banner and **Edited** badge.
3. Reopen draft; confirm edited text; Cancel after local changes → no save.
4. Revert to original → badge disappears on list; detail shows AI `content`.
5. Attempt empty save → blocked.
6. Sign out; PATCH API → 401.

## Performance Considerations

Single PATCH per save/revert; no N+1. Textarea holds full draft body in memory — acceptable for MVP changelog/social sizes already stored in `text` column.

## Migration Notes

None — uses existing `edited_content` column and RLS update policy.

## References

- S-03 archived plan: `context/archive/2026-05-30-manual-to-generated-history-flow/plan.md`
- F-02 service: `src/lib/services/generated-outputs.ts`
- PRD FR-006: `context/foundation/prd.md`
- Roadmap S-04: `context/foundation/roadmap.md`
- API pattern: `src/pages/api/projects/[id]/change-inputs.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Draft update API and client helper

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — c8a1461
- [x] 1.2 Production build passes: `npm run build` — c8a1461

#### Manual

- [x] 1.3 PATCH saves and reverts edited_content with correct auth and validation — c8a1461

### Phase 2: Inline edit UI on draft detail

#### Automated

- [x] 2.1 Lint passes: `npm run lint` — 9b8023a
- [x] 2.2 Production build passes: `npm run build` — 9b8023a

#### Manual

- [x] 2.3 Draft detail supports save, cancel, revert, and empty-body validation — 9b8023a
- [x] 2.4 Save redirects to drafts list with success query — 9b8023a

### Phase 3: Drafts list badge and saved success banner

#### Automated

- [x] 3.1 Lint passes: `npm run lint` — e3aa040
- [x] 3.2 Production build passes: `npm run build` — e3aa040

#### Manual

- [x] 3.3 List shows Edited badge and distinct saved success banner after edit flow — e3aa040
