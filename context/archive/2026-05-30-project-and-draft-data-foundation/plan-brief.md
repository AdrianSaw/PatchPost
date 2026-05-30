# Project and draft data foundation — Plan Brief

> Full plan: `context/changes/project-and-draft-data-foundation/plan.md`

## What & Why

PatchPost needs persistent storage before project CRUD (S-02) and the north-star flow (S-03). F-02 delivers the **data layer**: four related tables, owner-only RLS, shared TypeScript types, and service helpers — so later slices plug into a tested foundation instead of ad hoc SQL.

## Starting Point

Auth and middleware work (S-01 done). `supabase/migrations/` is empty; no `src/types.ts` or `src/lib/services/`. `README_PatchPost_plan.md` describes a 7-table model; F-02 implements the **MVP core four** only.

## Desired End State

A signed-in owner can create/read/update/delete their projects and related rows (change inputs, generation runs, saved drafts) through `src/lib/services/*` against Supabase with RLS enforcing `projects.owner_id = auth.uid()`. S-02 can add API/UI without new schema work; S-03 can persist manual input and draft history.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Tables in F-02 | Core 4: projects, change_inputs, generation_runs, generated_outputs | Covers FR-002/003/005 without dead GitHub/commit tables | Plan |
| profiles / members / commits | Deferred | Fastest path; dashboard uses auth email today | Plan |
| RLS pattern | Child rows gated via `projects.owner_id` | Single source of truth; extendable later | Plan |
| Delete strategy | Hard delete + CASCADE from projects | Matches FR-002; simplest MVP | Plan |
| change_inputs shape | Manual-only columns now | FR-003 manual-first; no nullable GitHub noise | Plan |
| Enum enforcement | TEXT + Zod in services/types | Flexible iteration without enum migrations | Plan |
| F-02 deliverables | Migrations + types + services (no HTTP) | Clear boundary vs S-02 UI/API | Plan |
| Seed data | Optional `seed.sql` + README note | Helps local RLS smoke tests without mandatory fixtures | Plan |

## Scope

**In scope:** Two SQL migrations (projects, then children), RLS on all four tables, `src/types.ts`, Zod schemas, `src/lib/services/` CRUD helpers, optional seed stub, README note for `supabase db reset`.

**Out of scope:** profiles, project_members, commits, GitHub columns on change_inputs, HTTP API routes, UI pages, F-01 generation logic, Playwright tests.

## Architecture / Approach

```
auth.users
    └── projects (owner_id)
            ├── change_inputs (manual source_type, raw_content)
            ├── generation_runs (output_type, tone, status, prompt_snapshot)
            └── generated_outputs (content, edited_content, status)
```

Services accept the SSR Supabase client from callers (same pattern as auth routes). All writes validate enums with Zod before insert/update. RLS is the security boundary; services assume an authenticated session.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Projects + RLS | `projects` table, indexes, owner policies | Forgetting UPDATE policy or `updated_at` trigger |
| 2. Child tables + RLS | Three child tables, FK CASCADE, EXISTS policies | Policy gaps on INSERT without owner check |
| 3. Types + services | DTOs, Zod, service modules | Service API drift from future S-02/S-03 needs |

**Prerequisites:** Local Supabase (`npx supabase start`), signed-in test user from dashboard invite/create.

**Estimated effort:** ~2–3 focused sessions across 3 phases.

## Open Risks & Assumptions

- F-01 may refine `generation_runs.prompt_snapshot` semantics — column stays nullable TEXT.
- CI does not apply migrations; manual `supabase db reset` required to verify SQL.
- Hosted Supabase needs migrations pushed separately (`supabase db push` or dashboard) before prod use.

## Success Criteria (Summary)

- Owner can CRUD own projects; another user's JWT cannot read/write them.
- Child rows cascade-delete with project; manual change input and draft rows persist per project.
- `npm run lint` and `npm run build` pass after TypeScript layer lands.
