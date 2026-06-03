# Local Supabase dev scripts — Plan Brief

> Full plan: `context/changes/local-supabase-dev-scripts/plan.md`

## What & Why

Developers today switch between Docker Supabase and hosted cloud by manually editing `.env` / `.dev.vars` and remembering raw `npx supabase` commands. **F-03** adds explicit npm scripts and profile env files so local vs cloud is obvious and repeatable — supporting `main_goal: speed` without touching product features.

## Starting Point

- `supabase` CLI is already a devDependency; `supabase/` config and migrations exist.
- README documents `npx supabase start|stop|db reset|db push` and a single `.env` flow.
- No `dev:local` / `dev:cloud`, no committed profile examples, no npm Supabase aliases.

## Desired End State

A developer can run `npm run supabase:start`, copy credentials into gitignored `.env.local`, run `npm run dev:local` (Astro loads `.env` + `.env.local`), or fill `.env.cloud` and run `npm run dev:cloud` (Node launcher loads cloud profile only). README and AGENTS.md describe the workflow; `db reset` / `db push` stay documented as `npx supabase …` (not npm-wrapped).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Local profile mechanism | Astro default: `.env` + gitignored `.env.local` | No extra loader for the common path | Plan |
| Cloud dev command | `dev:cloud` via tiny `scripts/astro-dev-cloud.mjs` | Avoids `.env.local` override without `dotenv-cli` | Plan |
| Supabase npm aliases | `supabase:start` + `supabase:stop` only | Minimal wrap; reset/push stay `npx` in docs | Plan |
| Example files | `.env.local.example` + `.env.cloud.example` | Clear templates; secrets stay gitignored | Plan |
| Docs | README + AGENTS.md + `.gitignore` | Humans and agents share one contract | Plan |
| dotenv-cli | Not added | User chose Astro-native local + Node launcher for cloud | Plan |

## Scope

**In scope:** Example env files, `.gitignore` entries, `package.json` scripts, `scripts/astro-dev-cloud.mjs`, README Supabase section refresh, AGENTS.md secrets/dev commands.

**Out of scope:** App/API/runtime changes, CI workflow changes, `supabase link` automation, new migrations, Playwright, roadmap file edits (separate housekeeping).

## Architecture / Approach

```
Developer
  ├─ npm run supabase:start  →  supabase CLI (Docker)
  ├─ npm run dev:local       →  astro dev (.env + .env.local)
  └─ npm run dev:cloud       →  node script loads .env.cloud → astro dev

Shared optional keys (GEMINI_*, AI_PROVIDER) live in .env; SUPABASE_* profile-specific in .env.local / .env.cloud
.dev.vars mirrors active Supabase profile for Cloudflare workerd (documented, not automated)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Env profiles & examples | Templates + gitignore + `.env` comments | Forgetting `.dev.vars` parity note |
| 2. npm scripts & cloud launcher | `dev:*`, `supabase:*`, Node script | Windows path/spawn quirks |
| 3. Documentation | README + AGENTS alignment | Drift vs old `npx supabase init` step |

**Prerequisites:** Node 22.14+, Docker for local Supabase, existing `supabase/` folder in repo.

**Estimated effort:** ~1 session across 3 small phases.

## Open Risks & Assumptions

- Astro env loading order is unchanged; cloud script must not load `.env.local`.
- Developers still run `npx supabase db reset` manually after pulling migrations (by design).
- CI continues using GitHub `SUPABASE_*` secrets — unaffected.

## Success Criteria (Summary)

- `npm run dev:local` and `npm run dev:cloud` start the app with the intended Supabase URL (verify in logs or a signed-in smoke).
- `npm run supabase:start` / `supabase:stop` wrap the CLI without breaking existing workflows.
- Lint and build still pass; no secrets committed.
