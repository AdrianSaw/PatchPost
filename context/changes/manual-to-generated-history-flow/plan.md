# Manual to generated history flow — Implementation Plan

## Overview

Ship roadmap **S-03** / PRD US-01 and FR-003–005: authenticated project owners paste manual change text (commit messages or bullets), pick a communication channel and tone, run generation through existing F-01 JSON APIs, and see saved drafts in project history with read-only detail views. Backend (`change-inputs`, `generation-runs`, services, RLS) is complete — this change is **UI + page loaders only**.

## Current State Analysis

- **F-01** exposes `POST /api/projects/[id]/change-inputs` and `POST /api/projects/[id]/generation-runs`; workflow auto-persists `generation_runs` + `generated_outputs` on success.
- **F-02** services include `listGeneratedOutputsByProject`, `getGeneratedOutputById`, `getGenerationRunById`.
- **S-02** delivers `/app/projects/*` with SSR reads and HTML form POST for project CRUD; project detail is settings-only (`ProjectForm`).
- **No** product UI for change input, generation, or draft history. README §9 defines `/generate` and `/drafts` routes — not implemented yet.

### Key Discoveries:

- `src/types.ts:6-12` — five `output_type` values already validated end-to-end.
- `runGenerationWorkflow` saves draft on generate — no separate “Save” API; US-01 “save” is satisfied by successful generation.
- `generation_runs.prompt_snapshot` stores JSON with `classifiedItems` — suitable for read-only classification UI on draft detail.
- S-02 pattern for errors: redirect/`?error=` query on forms; generation flow uses client `fetch` + inline/`?success=` banner (no toast library in repo).
- Research + user Notes: **manual paste only**; no GitHub repo fetch.

## Desired End State

1. From project hub (`/app/projects/[id]`), user navigates to **Generate** or **Drafts**.
2. On **Generate**, user pastes change text, optionally sets title, picks output channel + tone, submits; UI shows loading during LLM (~3–5s).
3. On success, browser redirects to **Drafts list** with a visible success banner; new draft appears at top.
4. **Drafts list** shows title/snippet, channel label, tone (if any), created date; links to detail.
5. **Draft detail** (`/drafts/[draftId]`) shows read-only title + body (+ hashtags line for Instagram if stored in content); collapsible **classification** parsed from `prompt_snapshot`.
6. Lint and build pass; manual flow verified signed-in (MockProvider in dev and optional Gemini smoke).

### Verification

- **Automated:** `npm run lint`, `npm run build`
- **Manual:** full flow login → project → paste → generate → drafts list → open draft; unauthenticated `/app/*` → sign-in; invalid UUIDs redirect safely

## What We're NOT Doing

- GitHub commit import / repo history fetch
- Draft **editing** UI (S-04 / FR-006 nice-to-have)
- New Supabase migrations or schema changes
- New domain JSON routes beyond what F-01 shipped (list/detail use SSR + services)
- Separate “classify then confirm” two-step API flow
- Playwright/unit tests (no runner in `package.json`)
- Auto-publish to social platforms
- Removing F-01/F-02 dev smoke routes

## Implementation Approach

Three vertical phases mirroring README Milestones 5 + 8 (generate) and history list (partial Milestone 9 without edit/delete/archive actions).

- **Reads:** Astro SSR frontmatter + `createClient` + service helpers (same as S-02 list page).
- **Generate mutation:** React island with `fetch` + JSON (APIs are JSON-only; HTML forms cannot drive two-step generation).
- **Labels:** Centralize user-facing names for `output_type` and reuse tone labels from `ProjectForm` pattern.
- **Classification UX:** Because post-success navigation goes to drafts **list**, show collapsible classification on **draft detail** (data from `prompt_snapshot`), not on generate page.

## Critical Implementation Details

**Partial failure:** If `change-inputs` succeeds but `generation-runs` fails, a orphan `change_input` row remains. On generation error, **stay on `/generate`** with an error message; do not redirect. Orphan inputs are acceptable for MVP (same as dev smoke).

**Authorization:** Middleware protects `/app/*`. Page loaders must still verify project/draft exists via RLS-backed `getProjectById` / `getGeneratedOutputById`; missing row → redirect to list.

**Instagram content:** Workflow may append hashtags into `content` for `instagram_post`; detail view displays stored `content`/`title` as persisted — no client-side reformat.

## Phase 1: Project hub, labels, and draft list data

### Overview

Add navigation from project detail to Generate/Drafts routes and shared constants/loaders so later phases stay thin.

### Changes Required:

#### 1. Generation display labels

**File**: `src/lib/generation/labels.ts`

**Intent**: Single map from `OutputType` and `DefaultTone` to user-facing strings for selects and history list.

**Contract**: Export `OUTPUT_TYPE_LABELS: Record<OutputType, string>` (e.g. changelog → “Changelog / patch notes”, instagram_post → “Social post (Instagram)”, discord_update → “Team update (Discord)”, steam_news → “Steam news”, devlog_summary → “Devlog summary”). Export `formatOutputType`, `formatTone` helpers; tone labels may mirror `ProjectForm` `TONE_LABELS` or re-export to avoid drift.

#### 2. Draft history query helper

**File**: `src/lib/services/generated-outputs.ts` (or `src/lib/projects/draft-history.ts` re-exporting service)

**Intent**: SSR-friendly list rows with channel metadata for drafts index.

**Contract**: Export `listProjectDraftHistory(supabase, projectId)` returning outputs ordered `created_at desc` with joined `generation_runs(output_type, tone)` via Supabase select embed. Typed row: `GeneratedOutput` + `{ output_type, tone } | null` from run.

#### 3. Project hub navigation

**File**: `src/pages/app/projects/[id]/index.astro`

**Intent**: Project dashboard links into S-03 routes without removing existing settings form.

**Contract**: Below project header (above or beside settings), render nav/actions: link to `/app/projects/{id}/generate`, link to `/app/projects/{id}/drafts`. Match existing glass/cosmic button styles from project list CTAs.

#### 4. Shared project page guard

**File**: `src/lib/projects/project-page.ts` (or extend `project-detail-page.ts`)

**Intent**: DRY loader for all `[id]/*` child pages: validate UUID, require supabase, load project or redirect.

**Contract**: Export `loadProjectPage(astro)` → `{ kind: 'redirect', to } | { kind: 'ok', project: Project }`. Reuse in generate/drafts loaders.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Project detail shows **Generate** and **Drafts** links; URLs resolve (pages may 404 until Phase 2/3 — acceptable at end of Phase 1 only if stub routes added; prefer completing nav after Phase 2 route exists)

**Implementation Note**: Pause for human confirmation after manual checks before Phase 2.

---

## Phase 2: Generate page and client workflow

### Overview

Deliver `/app/projects/[id]/generate` with a React form that calls existing JSON APIs and redirects to drafts list on success.

### Changes Required:

#### 1. Generate page loader

**File**: `src/lib/projects/generate-page.ts`

**Intent**: SSR guard + project context for generate route.

**Contract**: Uses `loadProjectPage`; returns project + optional `error` query param for display.

#### 2. Generate page

**File**: `src/pages/app/projects/[id]/generate.astro`

**Intent**: Authenticated generate screen with back link to project hub.

**Contract**: `AppLayout`; breadcrumb/back to `/app/projects/[id]`; mount `GenerateForm` with `client:load`; pass `projectId`, `defaultTone` from project, `apiBase` paths for the two POST endpoints.

#### 3. Generate form (React)

**File**: `src/components/generation/GenerateForm.tsx`

**Intent**: Manual input UI + channel/tone selection + orchestrated API calls.

**Contract**:

- Fields: optional `title`; required `raw_content` textarea (placeholder/helper: paste commit messages, one per line); `output_type` select (all `outputTypeSchema` values); optional `tone` select (default project `default_tone` or empty → server default).
- Submit handler (prevent default):
  1. `POST /api/projects/{id}/change-inputs` JSON `{ title, raw_content }`
  2. On 201, `POST /api/projects/{id}/generation-runs` JSON `{ change_input_id, output_type, tone? }`
  3. On 201, `window.location.assign(`/app/projects/${id}/drafts?success=generated`)`
  4. On any error, show message via `ServerError` pattern; re-enable form
- Loading: disable submit + show pending label during **both** requests (classify+generate latency).
- Dev-only: if `import.meta.env.DEV`, optional checkbox or env-driven header `x-dev-mock-provider: 1` on generation POST for offline testing (mirrors F-01 smoke).
- Reuse shadcn `Textarea`, `Select`, `Label`, `SubmitButton`, `cn()`.

#### 4. Client fetch helper (optional)

**File**: `src/lib/generation/client-api.ts`

**Intent**: Keep `GenerateForm` thin — typed wrappers for the two POSTs with JSON error parsing.

**Contract**: Export `createChangeInput(projectId, body)` and `runGeneration(projectId, body, options?)` returning discriminated `{ ok, data } | { ok: false, status, message }`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Signed-in user submits sample Polish commit lines; with `AI_PROVIDER=mock` or dev mock header, redirects to drafts list with success query
- Empty `raw_content` blocked client-side and server-side
- Generation failure shows error on generate page (no redirect)
- Unauthenticated access to `/generate` redirects to signin (middleware)

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Draft history list and read-only detail

### Overview

SSR drafts index with success banner; read-only detail with collapsible classification from stored snapshot.

### Changes Required:

#### 1. Drafts list loader

**File**: `src/lib/projects/drafts-page.ts`

**Intent**: Load project + draft history rows for index.

**Contract**: `loadDraftsPage(astro)` → project + `drafts[]` from `listProjectDraftHistory` + parse `success` query (`generated` → banner flag).

#### 2. Drafts list page

**File**: `src/pages/app/projects/[id]/drafts/index.astro`

**Intent**: History list per US-01.

**Contract**:

- Nav: back to project hub; link to Generate
- Success banner when `?success=generated` (dismissible or static for page load)
- Empty state + CTA to Generate when no drafts
- Each row: title or content snippet (~120 chars), `formatOutputType`, date, link to `/app/projects/{id}/drafts/{draftId}`
- SSR only (no client island required for list)

#### 3. Draft detail loader

**File**: `src/lib/projects/draft-detail-page.ts`

**Intent**: Load single draft + run + parsed classification.

**Contract**: Validate `draftId` UUID; `getGeneratedOutputById`; verify `output.project_id === projectId`; load `generation_run` when `generation_run_id` set; parse `prompt_snapshot` JSON safely (Zod or try/catch) into `{ classifiedItems, outputLanguage? }`; redirect to drafts list on any miss.

#### 4. Draft detail page

**File**: `src/pages/app/projects/[id]/drafts/[draftId].astro`

**Intent**: Read-only view of saved draft (S-04 will add edit later).

**Contract**:

- Show title, created date, channel label, tone
- Render `content` in `<pre>` or prose block preserving line breaks; use `edited_content ?? content` if ever set (future S-04)
- Mount `ClassificationPanel` (`client:load`) when classified items exist — collapsed by default, lists classification / visibility / suggested summary per item
- Back link to drafts list
- No edit controls in S-03

#### 5. Classification panel (React)

**File**: `src/components/generation/ClassificationPanel.tsx`

**Intent**: Collapsible disclosure of AI classification results on draft detail.

**Contract**: Props: `items: ClassificationItem[]`, optional `outputLanguage`; accessible toggle; table or list layout matching app styling.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- After generate redirect, new draft visible at top of list with correct channel label
- Draft detail shows full generated text
- Classification panel expands with items from snapshot (verify with mock or Gemini run)
- Invalid `draftId` or other owner's draft (RLS) redirects to drafts list or project list
- Full US-01 path: login → project → generate → list → detail

---

## Testing Strategy

### Manual Testing Steps:

1. Sign in; open project; use **Generate** nav link.
2. Paste 3–5 commit-style lines (PL); pick **Changelog** + tone; submit.
3. Confirm redirect to **Drafts** with success banner; row appears.
4. Open draft detail; expand classification; verify content readable.
5. Repeat with **Social post** output type; confirm different shape still displays.
6. Sign out; hit `/app/projects/{id}/drafts` → signin redirect.
7. Optional: Gemini live generate (Polish input) if key configured.

## Performance Considerations

Two LLM calls per generation (~3–5s). Form must stay in loading state; no double-submit. SSR list/detail stay single-query per page load.

## Migration Notes

None — uses existing tables and RLS.

## References

- Research: `context/changes/manual-to-generated-history-flow/research.md`
- F-01 plan (archived): `context/archive/2026-05-30-generation-workflow-api-backbone/plan.md`
- S-02 patterns: `context/archive/2026-05-30-projects-crud-core/plan.md`
- Product routes: `README_PatchPost_plan.md` §9
- PRD US-01 / FR-003–005: `context/foundation/prd.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Project hub, labels, and draft list data

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — b790729
- [x] 1.2 Production build passes: `npm run build` — b790729

#### Manual

- [x] 1.3 Project detail shows Generate and Drafts navigation links — b790729

### Phase 2: Generate page and client workflow

#### Automated

- [ ] 2.1 Lint passes: `npm run lint`
- [ ] 2.2 Production build passes: `npm run build`

#### Manual

- [ ] 2.3 Generate form submits manual input and redirects to drafts list on success (mock or live provider)
- [ ] 2.4 Generation API failure shows error on generate page without redirect

### Phase 3: Draft history list and read-only detail

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Production build passes: `npm run build`

#### Manual

- [ ] 3.3 Drafts list shows saved outputs with channel labels and success banner after generate
- [ ] 3.4 Draft detail displays read-only content and collapsible classification from prompt snapshot
- [ ] 3.5 Full US-01 flow verified end-to-end while signed in
