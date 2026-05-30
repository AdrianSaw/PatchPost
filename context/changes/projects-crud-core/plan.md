# Projects CRUD core — Implementation Plan

## Overview

Ship roadmap S-02 / PRD FR-002: authenticated users manage their own projects through `/app/projects` pages and form-based API routes. F-02 already provides database schema, RLS, Zod types, and service-layer CRUD — this change adds the product HTTP/UI layer only.

## Current State Analysis

S-01 provides invite-only sign-in and catch-all middleware protection. F-02 provides `projects` table with owner RLS, `src/types.ts` project schemas, and `src/lib/services/projects.ts` with `listProjects`, `getProjectById`, `createProject`, `updateProject`, `deleteProject`.

The app has a placeholder `/dashboard` and auth routes using HTML form POST + redirect. No `/app/projects` pages or `/api/projects` handlers exist. `Topbar.astro` links to `/dashboard`. Sign-in success redirects to `/`.

### Key Discoveries:

- `AGENTS.md:14` — API routes need `export const prerender = false`; validate bodies with Zod (services already validate; routes may map errors to redirects).
- `AGENTS.md:29-31` — call services from API handlers; do not duplicate business logic.
- `src/middleware.ts` — catch-all auth; new `/app/*` routes are protected automatically; no `PROTECTED_ROUTES` list to extend unless adding public exceptions.
- `README_PatchPost_plan.md:914-934` — Milestone 3 acceptance: create project (e.g. "Scrapwars") and open project dashboard.
- Product route tree uses `/app/projects`, `/app/projects/new`, `/app/projects/[id]` (child routes deferred to S-03).

## Desired End State

1. Post-login redirect lands on `/app/projects`.
2. List page shows owner projects (newest first) or a clear empty state with CTA to create.
3. Create page submits all project fields; success redirects to project detail.
4. Detail page shows project metadata with inline edit form and delete-with-confirmation.
5. Delete removes project and cascaded child rows; user returns to list.
6. Validation failures redirect back with `?error=` message (auth pattern).
7. Lint and build pass; manual CRUD verified under authenticated session.

### Verification

- **Automated:** `npm run lint`, `npm run build`
- **Manual:** full CRUD as signed-in user; unauthenticated `/app/projects` → sign-in; wrong UUID → not found

## What We're NOT Doing

- `change_inputs`, `generation_runs`, `generated_outputs` UI or API (S-03)
- GitHub repo linking beyond optional `repo_url` text field
- F-01 generation pipeline
- New Supabase migrations or schema changes
- Pagination, search, sorting beyond default `created_at desc`
- Playwright or unit tests (no runner in `package.json`)
- `profiles`, `project_members`, team roles
- Admin allowlist UI
- Replacing or removing F-02 dev smoke routes (optional cleanup outside S-02)

## Implementation Approach

Three vertical phases: (1) authenticated app shell + read-only list, (2) create flow, (3) detail with inline edit and delete. Each phase is manually verifiable before the next.

Use Astro SSR frontmatter for reads (`createClient` + services). Use HTML form POST to API routes for mutations, mirroring `src/pages/api/auth/signin.ts`. React islands for forms only where client interactivity helps (field state, tone select). Reuse cosmic glass styling from auth/dashboard.

## Critical Implementation Details

**Authorization:** RLS enforces ownership — API handlers must still require `context.locals.user` (via middleware) and pass `user.id` to `createProject`. For detail/update/delete, a missing row from `getProjectById` means 404 (RLS hides other owners' rows).

**Delete semantics:** `deleteProject` CASCADE removes child rows. Detail page delete confirmation copy must mention that related inputs/runs/drafts will be removed.

**Form POST for update/delete:** HTML forms only support GET/POST. Use POST to `/api/projects/[id]` with a hidden `_action` field (`update` | `delete`) or separate form elements on the detail page.

**UUID route param:** Validate `[id]` is a UUID before Supabase call; invalid format → 404 redirect to list.

## Phase 1: App shell and project list

### Overview

Introduce authenticated app layout, wire navigation and post-login redirect, and render SSR project list.

### Changes Required:

#### 1. App layout

**File**: `src/layouts/AppLayout.astro`

**Intent**: Shared authenticated shell for `/app/*` pages with Topbar and content slot.

**Contract**: Wraps `Layout.astro`; applies cosmic background consistent with auth pages; renders `Topbar` and `<slot />`.

#### 2. Topbar navigation

**File**: `src/components/Topbar.astro`

**Intent**: Point authenticated users to projects workspace instead of placeholder dashboard.

**Contract**: Replace `/dashboard` link with `/app/projects` labeled "Projects" (or equivalent).

#### 3. Post-login redirect

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Land users on project list after successful sign-in.

**Contract**: Success redirect target changes from `/` to `/app/projects`.

#### 4. Dashboard redirect (optional compatibility)

**File**: `src/pages/dashboard.astro`

**Intent**: Avoid dead-end placeholder for bookmarked `/dashboard` URLs.

**Contract**: Server redirect to `/app/projects` (302) or replace content with redirect meta — prefer Astro `Astro.redirect`.

#### 5. Project list page

**File**: `src/pages/app/projects/index.astro`

**Intent**: SSR list of owner projects.

**Contract**: Requires `Astro.locals.user`; calls `listProjects(createClient(...))`; if `createClient` returns null, render config error message (same class of failure as auth routes); if Supabase returns `{ error }`, show user-safe error banner — do not masquerade as empty list; renders project name + updated date linking to `/app/projects/[id]`; empty state with link to `/app/projects/new`; uses `AppLayout`.

#### 6. Agent onboarding doc

**File**: `AGENTS.md`

**Intent**: Keep protected-route example accurate after projects become the app hub.

**Contract**: Change "Protected example" reference from `dashboard.astro` to `/app/projects` (list page).

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- Signed-in user visiting `/app/projects` sees list or empty state
- Sign-in redirects to `/app/projects`
- Unauthenticated `/app/projects` redirects to `/auth/signin`
- `/dashboard` redirects or links user to projects list

**Implementation Note**: Pause for human confirmation before Phase 2.

---

## Phase 2: Create project

### Overview

Add create form, POST API, and shadcn inputs needed for full project fields.

### Changes Required:

#### 1. shadcn inputs

**Files**: `src/components/ui/textarea.tsx`, `select.tsx`, `label.tsx` (via shadcn CLI)

**Intent**: Form controls for description and default_tone.

**Contract**: Add with `npx shadcn@latest add textarea select label`; follow existing new-york button pattern.

#### 2. Project form component

**File**: `src/components/projects/ProjectForm.tsx`

**Intent**: Reusable create/edit form for project fields.

**Contract**: Fields: `name` (required), `description`, `repo_url`, `default_tone` (select from `defaultToneSchema` values); accepts `action`, `method="POST"`, optional `defaultValues`, `errorMessage` from query; uses `FormField` / auth patterns where applicable; `client:load` on pages.

#### 3. Create page

**File**: `src/pages/app/projects/new.astro`

**Intent**: Page shell for new project form.

**Contract**: Uses `AppLayout`; passes `?error=` from URL to `ProjectForm`; form `action="/api/projects"`.

#### 4. Create API route

**File**: `src/pages/api/projects/index.ts`

**Intent**: Handle POST create.

**Contract**: `export const prerender = false`; `POST` reads `formData()`; requires authenticated user via `createClient` + `getUser()`; calls `createProject(supabase, user.id, input)`; on success redirect to `/app/projects/[id]`; on validation/DB error redirect to `/app/projects/new?error=...` with generic or schema message.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- Create project with all fields succeeds and opens detail page
- Empty name shows error on return to new page
- Invalid `repo_url` rejected with error message
- Created project appears on list

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Detail, edit, and delete

### Overview

Project detail with inline edit and confirmed delete.

### Changes Required:

#### 1. Detail page

**File**: `src/pages/app/projects/[id]/index.astro`

**Intent**: View and edit a single project.

**Contract**: Validates UUID param; `getProjectById`; 404 redirect to `/app/projects` if missing; displays metadata; embeds `ProjectForm` with `defaultValues` for update (`action="/api/projects/[id]"`, hidden `_action=update`); separate delete form with confirm checkbox or confirm button + hidden `_action=delete`; CASCADE warning copy near delete; uses `AppLayout`.

#### 2. Project by id API route

**File**: `src/pages/api/projects/[id].ts`

**Intent**: Handle POST update and delete.

**Contract**: `export const prerender = false`; read `_action` from formData; for `update`, build input object from only `name`, `description`, `repo_url`, `default_tone` (exclude `_action` and other form keys) before calling `updateProject`; for `delete`, call `deleteProject` then redirect to `/app/projects`; errors redirect back to detail with `?error=`; unauthenticated → sign-in redirect.

#### 3. Service error mapping helper (optional, inline)

**File**: `src/pages/api/projects/[id].ts` and `index.ts` (or tiny `src/lib/api/project-errors.ts` if duplicated)

**Intent**: Map `{ data: null, error }` from services to user-safe redirect messages.

**Contract**: Do not expose raw PostgrestError details to client; log or use generic message for DB failures; surface Zod validation messages when `code === 'validation_error'`.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- Edit project fields on detail page; changes persist on reload
- Delete with confirmation removes project from list
- Invalid project UUID or other owner's id shows not found / empty (no leak)
- Child rows removed after delete (verify in Supabase Studio if desired)

**Implementation Note**: S-02 complete — proceed to `/10x-plan manual-to-generated-history-flow` when S-03 is ready (requires F-01 + S-02).

---

## Testing Strategy

### Unit Tests:

- Not in scope (no test runner). Zod + service layer covered by F-02; S-02 relies on manual UI verification.

### Integration Tests:

- Manual only: signed-in CRUD path through browser.

### Manual Testing Steps:

1. Sign in as user A; create two projects; list shows both.
2. Edit one project; verify fields in Studio or reload.
3. Delete one project; confirm gone from list.
4. Sign in as user B; confirm A's project IDs are not accessible.
5. Run `npm run lint` and `npm run build`.

## Performance Considerations

Low volume MVP — `listProjects` without pagination is acceptable. Index on `owner_id` exists from F-02.

## Migration Notes

No migrations in S-02. Requires F-02 migrations already applied on target Supabase project.

## References

- PRD: `context/foundation/prd.md` — FR-002
- Roadmap: `context/foundation/roadmap.md` — S-02
- F-02 archive: `context/archive/2026-05-30-project-and-draft-data-foundation/plan.md`
- Product routes: `README_PatchPost_plan.md` § Milestone 3
- Services: `src/lib/services/projects.ts`
- Auth API pattern: `src/pages/api/auth/signin.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: App shell and project list

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 3c8c460
- [x] 1.2 Production build passes: `npm run build` — 3c8c460

#### Manual

- [ ] 1.3 Signed-in list/empty state; sign-in and dashboard redirect to projects
- [ ] 1.4 Unauthenticated `/app/projects` redirects to sign-in

### Phase 2: Create project

#### Automated

- [x] 2.1 Lint passes: `npm run lint`
- [x] 2.2 Production build passes: `npm run build`

#### Manual

- [ ] 2.3 Create project with all fields; invalid input shows error
- [ ] 2.4 New project appears on list

### Phase 3: Detail, edit, and delete

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Production build passes: `npm run build`

#### Manual

- [ ] 3.3 Edit persists on detail page
- [ ] 3.4 Delete with confirmation removes project; foreign ids inaccessible
