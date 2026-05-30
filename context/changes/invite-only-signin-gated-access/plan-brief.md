# Invite-only signin and gated access — Plan Brief

> Full plan: `context/changes/invite-only-signin-gated-access/plan.md`

## What & Why

PatchPost must match the PRD access model: login only for people the owner invited or created in Supabase — no public registration, no duplicate email list in app env.

## Starting Point

Supabase SSR auth works. Public signup is still in the app and Supabase config. Phase 1 briefly added `ALLOWED_EMAILS` — **removed**; Supabase Auth is the single source of truth for who may exist.

## Desired End State

Owner adds users only via Supabase dashboard (invite or create). App signup is gone; Supabase `enable_signup = false`. Sign-in uses normal `signInWithPassword`. Catch-all middleware protects routes. Unknown emails fail at Supabase with generic credentials error.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Who is “allowlisted” | Supabase Auth users only | Matches PRD “outside UI”; no double maintenance | Plan (pivot) |
| App env allowlist | **Not used** | Redundant with dashboard; risk of drift | Plan (pivot) |
| User provisioning | Supabase dashboard invite/create | Owner workflow already there | Plan |
| Signup removal | Delete files + redirect | PRD non-goal | Plan |
| Route protection | Catch-all public allowlist | User choice | Plan |

## Scope

**In scope:** `prerender = false` on signin; remove signup; middleware; Supabase disable signup; README/AGENTS runbook.

**Out of scope:** `ALLOWED_EMAILS` env; `auth-allowlist.ts`; in-app admin UI; DB allowlist table.

## Architecture / Approach

```
Owner → Supabase Auth (invite/create user)
User  → POST /api/auth/signin → signInWithPassword
        → fails if no account / bad password
Public signup → disabled (config + no UI)
```

## Phases at a Glance

| Phase | Delivers | Risk |
| --- | --- | --- |
| 1. Signin hygiene | `prerender = false`; trust Supabase for membership | Invite-only not complete until Phases 2–3 |
| 2. Remove signup | No public registration surface | Missed nav links |
| 3. Middleware + Supabase config | Catch-all gate; `enable_signup = false` | Prod dashboard not updated |
| 4. Docs | Dashboard-only runbook | — |

**Prerequisites:** Supabase project; at least one test user in Auth.

**Estimated effort:** ~1–2 sessions across 4 phases.

## Open Risks & Assumptions

- If hosted Supabase still allows signup, anyone can self-register despite app UI removal — Phase 3 mitigates.
- Users created before pivot with signup enabled remain in Auth until removed manually.

## Success Criteria (Summary)

- Only Supabase-provisioned users sign in successfully.
- No signup UI or API.
- Unauthenticated users cannot reach gated routes.
