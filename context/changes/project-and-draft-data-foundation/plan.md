# Project and draft data foundation — Implementation Plan

## Overview

Establish the Supabase data layer for PatchPost roadmap F-02: four core tables (`projects`, `change_inputs`, `generation_runs`, `generated_outputs`), owner-only Row Level Security, shared TypeScript entity types, and service-layer helpers. This unlocks S-02 (project CRUD UI/API) and S-03 (manual input → generate → save history) without shipping UI or HTTP routes in F-02.

## Current State Analysis

Authentication and catch-all middleware are complete (S-01 archived). The app uses cookie-based Supabase SSR via `src/lib/supabase.ts`. `src/pages/dashboard.astro` is a placeholder — no domain data access exists.

There are **no** files in `supabase/migrations/`. No `src/types.ts`. No `src/lib/services/`. CI runs `npm run lint` and `npm run build` only — it does not apply migrations.

`README_PatchPost_plan.md` (§10) defines seven tables including `profiles`, `project_members`, and `commits`. PRD FR-002 and FR-005 require project lifecycle and persistent draft history; FR-003 requires manual change input storage.

### Key Discoveries:

- `AGENTS.md:14` — migrations must use `YYYYMMDDHHmmss_short_description.sql` with RLS enabled and explicit per-operation policies.
- `AGENTS.md:29-31` — business logic belongs in `src/lib/services/`; shared entities in `src/types.ts`.
- `README_PatchPost_plan.md:300` — MVP can start with `projects.owner_id` only (no `project_members`).
- `README_PatchPost_plan.md:436-438` — access rule: `projects.owner_id = auth.uid()`.
- Roadmap F-01 runs in parallel — F-02 stores generation metadata; F-01 defines API semantics later.

## Desired End State

1. Four tables exist in Supabase with FK relationships and `ON DELETE CASCADE` from `projects` to all child tables.
2. RLS enabled on every table; authenticated users can only access rows belonging to projects they own.
3. `change_inputs` supports manual input only (`source_type = 'manual'`, `title`, `raw_content`).
4. `generation_runs` holds minimal run metadata (`output_type`, `tone`, `status`, nullable `prompt_snapshot`) for S-03 persistence before F-01 API is complete.
5. `generated_outputs` stores saved draft content (`content`, optional `edited_content`, `status`).
6. `src/types.ts` exports entity interfaces and Zod schemas for allowed TEXT enum values.
7. `src/lib/services/` exposes typed create/read/update/delete helpers per entity, accepting the SSR Supabase client from callers.
8. Optional `supabase/seed.sql` stub and README note document local verification after `npx supabase db reset`.

### Verification

- **Automated:** `npm run lint`, `npm run build` pass after Phase 3.
- **Manual:** `npx supabase db reset` applies migrations; signed-in user A cannot SELECT/INSERT/UPDATE/DELETE user B's project rows; deleting a project removes child rows.

## What We're NOT Doing

- `profiles`, `project_members`, `commits` tables
- GitHub-related columns on `change_inputs` (`repo_url`, `branch`, `commit_from`, `commit_to`)
- HTTP API routes under `src/pages/api/` (S-02 / S-03)
- Astro/React UI for projects or drafts (S-02 / S-03)
- F-01 generation pipeline logic or LLM integration
- PostgreSQL ENUM types or CHECK constraints for status fields (Zod validates in app layer)
- Soft delete / `deleted_at` columns
- Playwright or unit test runner (not in `package.json` yet)
- Supabase type codegen (`supabase gen types`) — hand-written DTOs for MVP speed

## Implementation Approach

Three incremental phases: (1) root `projects` table with owner RLS, (2) child tables with EXISTS-based policies referencing `projects.owner_id`, (3) TypeScript types and service modules mirroring the schema. Split migrations so Phase 1 can be verified in isolation before child FK complexity.

Services follow the existing auth pattern: callers pass `createClient(requestHeaders, cookies)` result; services never read env directly. Errors from Supabase propagate as `{ data, error }` tuples or thrown `Error` with message — pick one pattern and use it consistently across all four service modules (recommend returning `{ data, error }` like Supabase client for predictable S-02 wiring).

## Critical Implementation Details

**RLS INSERT on child tables:** Policies must verify the referenced `project_id` belongs to `auth.uid()` — not only SELECT/UPDATE. A common miss is allowing INSERT when `created_by = auth.uid()` but `project_id` points at another owner's project.

**Service role key:** Use the anon/authenticated client only (same as SSR today). Do not introduce service-role bypass in F-02.

**Timestamps:** Use `timestamptz` with `default now()` for all `created_at` columns. Add `updated_at` on `projects` and `generated_outputs`; consider a shared `set_updated_at()` trigger function in the projects migration if the team wants automatic bumps (optional — manual `updated_at` in UPDATE services is acceptable for MVP).

## Phase 1: Projects table and RLS

### Overview

Create the root entity and owner-only policies. Nothing else depends on this migration completing first.

### Changes Required:

#### 1. Projects migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_projects.sql`

**Intent**: Define the project root table and enable owner-scoped access.

**Contract**:

- Table `projects`:
  - `id uuid primary key default gen_random_uuid()`
  - `owner_id uuid not null references auth.users(id) on delete cascade`
  - `name text not null`
  - `description text`
  - `repo_url text` (optional project metadata for future GitHub slice)
  - `default_tone text`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Index on `owner_id`.
- `alter table projects enable row level security`
- Policies (one per operation): SELECT, INSERT, UPDATE, DELETE where `owner_id = auth.uid()`; INSERT additionally requires `owner_id = auth.uid()` in WITH CHECK.

#### 2. Optional seed stub

**File**: `supabase/seed.sql`

**Intent**: Document local verification pattern without brittle hard-coded auth UUIDs.

**Contract**: Comment-only or guarded example INSERT explaining that seed rows require a known `auth.users` id from local sign-in. Do not enable mandatory seed in `config.toml` unless a stable local user id is documented.

#### 3. README migration note

**File**: `README.md`

**Intent**: Tell developers how to apply and verify migrations locally.

**Contract**: Short subsection under Supabase setup: run `npx supabase db reset` after pulling new migrations; confirm tables in Studio.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- `npx supabase db reset` applies Phase 1 migration without error
- Authenticated user can INSERT a project via Supabase Studio SQL editor with `owner_id = auth.uid()`
- Second test user cannot SELECT the first user's project row

**Implementation Note**: Pause for human confirmation before Phase 2.

---

## Phase 2: Child tables and RLS

### Overview

Add manual change input, generation run, and draft output tables with foreign keys and cascading deletes from projects.

### Changes Required:

#### 1. Child tables migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_project_children.sql`

**Intent**: Persist change inputs, generation runs, and saved drafts under a project.

**Contract**:

- Table `change_inputs`:
  - `id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references projects(id) on delete cascade`
  - `source_type text not null default 'manual'`
  - `title text`
  - `raw_content text not null`
  - `created_by uuid not null references auth.users(id)`
  - `created_at timestamptz not null default now()`
- Table `generation_runs`:
  - `id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references projects(id) on delete cascade`
  - `change_input_id uuid references change_inputs(id) on delete set null`
  - `created_by uuid not null references auth.users(id)`
  - `output_type text`
  - `tone text`
  - `status text`
  - `prompt_snapshot text`
  - `created_at timestamptz not null default now()`
- Table `generated_outputs`:
  - `id uuid primary key default gen_random_uuid()`
  - `generation_run_id uuid references generation_runs(id) on delete cascade`
  - `project_id uuid not null references projects(id) on delete cascade`
  - `title text`
  - `content text not null`
  - `edited_content text`
  - `status text`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Indexes on `project_id` for each child table; index on `change_input_id` and `generation_run_id` where useful.
- Enable RLS on all three tables.
- Policies for SELECT, INSERT, UPDATE, DELETE using EXISTS subquery:

```sql
exists (
  select 1 from projects p
  where p.id = <table>.project_id
    and p.owner_id = auth.uid()
)
```

- INSERT WITH CHECK must use the same EXISTS guard on `project_id`.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- `npx supabase db reset` applies both migrations cleanly
- Insert chain project → change_input → generation_run → generated_output succeeds for owner
- Cross-user read/update/delete on any child row fails under RLS
- Deleting a project removes all child rows (CASCADE)

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Types and service layer

### Overview

Expose the schema to application code through shared types, Zod validation, and service modules S-02/S-03 will call.

### Changes Required:

#### 1. Shared types and Zod schemas

**File**: `src/types.ts`

**Intent**: Single source of truth for entity shapes and allowed TEXT enum values.

**Contract**:

- Export TypeScript interfaces: `Project`, `ChangeInput`, `GenerationRun`, `GeneratedOutput` (and optional `Insert`/`Update` partial types).
- Export Zod schemas validating:
  - `sourceType`: literal `'manual'` for now
  - `outputType`: e.g. `changelog`, `instagram_post`, `discord_update`, `steam_news`, `devlog_summary` (from plan)
  - `generationRunStatus`: `draft`, `accepted`, `archived`, `failed`
  - `defaultTone`: `professional`, `friendly`, `hype`, `indie_devlog`, `technical`
- Export inferred types from Zod where helpful (`z.infer<typeof …>`).

#### 2. Projects service

**File**: `src/lib/services/projects.ts`

**Intent**: Owner-scoped project CRUD without HTTP coupling.

**Contract**:

- Functions: `listProjects`, `getProjectById`, `createProject`, `updateProject`, `deleteProject`
- Each accepts `SupabaseClient` (from `@supabase/supabase-js`) as first argument
- `createProject` / `updateProject` validate input with Zod (name required, optional description/repo_url/default_tone)
- `deleteProject` relies on DB CASCADE for children
- Return `{ data, error }` matching Supabase conventions

#### 3. Change inputs service

**File**: `src/lib/services/change-inputs.ts`

**Intent**: CRUD for manual change entries within a project.

**Contract**:

- Functions: `listChangeInputsByProject`, `getChangeInputById`, `createChangeInput`, `updateChangeInput`, `deleteChangeInput`
- Force `source_type: 'manual'` on create
- Validate `raw_content` non-empty via Zod

#### 4. Generation runs service

**File**: `src/lib/services/generation-runs.ts`

**Intent**: Persist generation run metadata for S-03.

**Contract**:

- Functions: `listGenerationRunsByProject`, `getGenerationRunById`, `createGenerationRun`, `updateGenerationRun`, `deleteGenerationRun`
- Validate `output_type`, `tone`, `status` against Zod enums when present
- `prompt_snapshot` optional string

#### 5. Generated outputs service

**File**: `src/lib/services/generated-outputs.ts`

**Intent**: Persist and list saved drafts (FR-005).

**Contract**:

- Functions: `listGeneratedOutputsByProject`, `getGeneratedOutputById`, `createGeneratedOutput`, `updateGeneratedOutput`, `deleteGeneratedOutput`
- `content` required on create; `edited_content` optional
- Set `updated_at` on update (explicit in UPDATE payload or DB trigger if added in Phase 1)

#### 6. Service barrel (optional)

**File**: `src/lib/services/index.ts`

**Intent**: Convenient re-exports for S-02 importers.

**Contract**: Re-export all public functions from the four service modules.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- Temporary dev script or Studio-adjacent smoke test (document in plan notes / README): signed-in session calls `createProject` then `createChangeInput` then `createGenerationRun` then `createGeneratedOutput` via services imported from a one-off route or local script — all succeed and `list*` returns rows
- Invalid enum value rejected by Zod before Supabase call
- Services compile with strict TypeScript (no `any` on entity payloads)

**Implementation Note**: Pause for human confirmation. F-02 complete — proceed to `/10x-plan projects-crud-core` (S-02) when ready.

---

## Testing Strategy

### Unit Tests:

- Not in scope for F-02 (no test runner). Zod schemas are the primary input-validation test surface.

### Integration Tests:

- Manual only: `supabase db reset` + service smoke calls under two authenticated users.

### Manual Testing Steps:

1. Start Supabase locally; sign in as user A.
2. Run service calls to create project + child chain; verify rows in Studio.
3. Sign in as user B; confirm list/get/update/delete on A's ids fail or return empty/error.
4. Delete A's project; confirm child rows gone.
5. Run `npm run lint` and `npm run build`.

## Performance Considerations

Low volume MVP (PRD: small users/data). Indexes on `owner_id` and `project_id` are sufficient. No pagination in services yet — S-02 can add `limit`/`offset` when project lists grow.

## Migration Notes

- Apply locally: `npx supabase db reset` (destructive — dev only).
- Hosted: `npx supabase db push` or run SQL in dashboard after review.
- No backfill required — greenfield tables.

## References

- PRD: `context/foundation/prd.md` — FR-002, FR-003, FR-005
- Roadmap: `context/foundation/roadmap.md` — F-02, unlocks S-02/S-03
- Product schema reference: `README_PatchPost_plan.md` §10–11
- Supabase client pattern: `src/lib/supabase.ts`
- Auth route Zod pattern: `src/pages/api/auth/signin.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Projects table and RLS

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 4b246d9
- [x] 1.2 Production build passes: `npm run build` — 4b246d9

#### Manual

- [x] 1.3 `npx supabase db reset` applies Phase 1 migration without error — 4b246d9
- [x] 1.4 Owner can insert project; other user cannot read it — 4b246d9

### Phase 2: Child tables and RLS

#### Automated

- [x] 2.1 Lint passes: `npm run lint`
- [x] 2.2 Production build passes: `npm run build`

#### Manual

- [x] 2.3 `npx supabase db reset` applies both migrations cleanly
- [x] 2.4 Child insert chain succeeds for owner; cross-user access denied
- [x] 2.5 Project delete cascades to all child rows

### Phase 3: Types and service layer

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Production build passes: `npm run build`

#### Manual

- [ ] 3.3 Service smoke: create/list project + children under authenticated session
- [ ] 3.4 Zod rejects invalid enum before Supabase call
