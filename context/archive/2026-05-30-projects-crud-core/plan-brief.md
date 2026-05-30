# Projects CRUD core — Plan Brief

> Full plan: `context/changes/projects-crud-core/plan.md`

## What & Why

Deliver FR-002: signed-in users can create, list, view, update, and delete their own projects. F-02 already provides Supabase schema, RLS, types, and `src/lib/services/projects.ts` — S-02 adds the first product-facing HTTP and UI layer so the primary flow can continue login → **project** → manual input (S-03).

## Starting Point

- Auth gate and invite-only sign-in (S-01) protect all non-public routes via catch-all middleware.
- F-02 services validate with Zod and enforce owner scope through RLS.
- `/dashboard` is a placeholder; product plan defines `/app/projects/*`.
- No domain API routes yet (only dev smoke under `/api/dev/`).

## Desired End State

An authenticated user lands on `/app/projects` after sign-in, sees their projects (or an empty state), creates a project with name/description/repo URL/default tone, opens a project detail page, edits fields inline, and deletes a project with confirmation — understanding that delete removes child rows via CASCADE. Unauthenticated users cannot reach these pages; RLS prevents cross-owner access.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Route prefix | `/app/projects/*` | Matches product plan and separates app workspace from marketing/auth | Plan |
| Mutations | HTML form POST + API redirect | Consistent with auth routes; works without client fetch layer | Plan |
| Edit UX | Inline on detail page | Fewer routes; faster MVP | Plan |
| Delete UX | Confirm + POST on detail | Prevents accidental CASCADE delete | Plan |
| Form fields | name, description, repo_url, default_tone | Full F-02 project model exposed in UI | Plan |
| Post-login redirect | `/app/projects` | Aligns with PRD primary success path | Plan |
| List rendering | Astro SSR | Server fetch + HTML; no client list state | Plan |
| App shell | `AppLayout.astro` + Topbar | Reusable for future `/app/*` slices | Plan |
| Validation errors | Redirect with `?error=` | Matches auth pattern | Plan |

## Scope

**In scope:** AppLayout, project list/create/detail pages, project API POST handlers, React `ProjectForm`, Topbar + sign-in redirect updates, shadcn inputs as needed, manual verification.

**Out of scope:** change_inputs / generation / drafts UI (S-03), GitHub import, new migrations, pagination, Playwright/unit tests, profiles/project_members, removing dev smoke routes (optional follow-up).

## Architecture / Approach

SSR Astro pages under `src/pages/app/projects/` call `createClient` + `listProjects` / `getProjectById` in frontmatter. Mutations POST to `src/pages/api/projects/` handlers that call service helpers with `user.id`, then redirect with flash-style query errors. React islands handle interactive forms reusing auth form components where possible. RLS remains the authorization boundary.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. App shell & list | Layout, nav, sign-in redirect, SSR project list | Route wiring / empty-state UX |
| 2. Create project | New page, form, POST API, redirect to detail | Zod URL validation on repo_url |
| 3. Detail, edit & delete | Detail page, inline edit, confirm delete | CASCADE delete messaging |

**Prerequisites:** S-01 + F-02 merged; Supabase env configured locally/hosted.  
**Estimated effort:** ~2–3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- Squash-merged F-02 on master includes services + migrations; hosted DB has all three F-02 migrations applied.
- `repo_url` empty string must preprocess to null (already in `createProjectSchema`).
- No automated E2E in CI — manual verification is the gate.

## Success Criteria (Summary)

- Signed-in user completes full project CRUD through the UI.
- Unauthenticated access to `/app/projects` redirects to sign-in.
- `npm run lint` and `npm run build` pass after Phase 3.
