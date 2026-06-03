# Repository Guidelines

**Canonical rules for AI agents** (Cursor, Codex, Claude Code, and others). Read this file first. Do not duplicate or override it from other instruction stubs.

PatchPost turns game-repo changes into player-facing copy (changelogs, social drafts). Astro 6 SSR, React 19 islands, Tailwind 4, Supabase auth/data, Cloudflare Workers. Product scope: @README_PatchPost_plan.md. Human setup: @README.md.

## Hard rules

- **Secrets & env (only place):** Never commit `.env`, `.env.local`, `.env.cloud`, `.dev.vars`, or real `SUPABASE_*` / `GEMINI_API_KEY`. Profiles: copy @.env.local.example → `.env.local` (local Docker) or @.env.cloud.example → `.env.cloud` (hosted); optional shared vars in `.env` from @.env.example. Mirror active `SUPABASE_*` into `.dev.vars` for workerd. `SUPABASE_KEY` = **Publishable** key from `npm run supabase:start` or dashboard (not the Secret service-role key). Optional generation: `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PROVIDER` (`mock` | leave unset with key for Gemini). Prod: `npx wrangler secret put SUPABASE_URL`, `SUPABASE_KEY`, and `GEMINI_API_KEY` when using live AI — not in git. Variables are server-only (@astro.config.mjs `env.schema`); never expose in client bundles.
- Full SSR (`output: "server"` in @astro.config.mjs). Every `src/pages/api/` route: `export const prerender = false`.
- Auth gates: extend the **public-route allowlist** in @src/middleware.ts (`PUBLIC_EXACT`, `PUBLIC_PREFIXES`) when adding routes that must stay reachable without a session. Default is catch-all protection.
- Preserve @context/ (bootstrap metadata).
- Tailwind: `cn()` from @src/lib/utils.ts — no manual class string concat.
- Supabase migrations: `supabase/migrations/YYYYMMDDHHmmss_short_description.sql`; enable RLS with explicit per-operation policies on new tables.

## Architecture

- @src/lib/supabase.ts — Supabase SSR client (`@supabase/ssr`, cookies); reads `astro:env/server` secrets.
- @src/middleware.ts — resolves `context.locals.user`; catch-all auth via public-route allowlist (unauthenticated requests redirect to signin except listed public paths).
- Auth API: `src/pages/api/auth/{signin,signout}.ts`
- Auth UI: `src/pages/auth/signin.astro`
- Access control: invite-only — users are provisioned in Supabase Auth dashboard only; no public signup and no app-level email allowlist env.
- Protected example: @src/pages/app/projects/index.astro

## Project structure

- `src/pages/` — Astro routes; `src/pages/api/` — server handlers
- `src/components/` — Astro + React; shadcn in `src/components/ui/` (new-york). Add: `npx shadcn@latest add <name>`
- `src/lib/` — clients, helpers; business logic in `src/lib/services/` when extracted
- `src/components/hooks/` — React hooks
- @src/types.ts — shared entities/DTOs
- `supabase/` — migrations and local config

## Build and development

- `npm run dev` / `npm run dev:local` — local dev against `.env` + `.env.local` (Cloudflare workerd)
- `npm run dev:cloud` — dev against `.env` + `.env.cloud` only (see @scripts/astro-dev-cloud.mjs)
- `npm run build` / `npm run preview` — production build and preview
- `npm run lint` / `lint:fix` / `format` — @eslint.config.js + Prettier
- `npm run supabase:start` / `npm run supabase:stop` — local Supabase Docker stack; wire Publishable key per **Secrets & env**
- `npx supabase db reset` / `npx supabase db push` — apply migrations (local destructive reset vs hosted push); not npm-wrapped
- `npm run deploy` — build + `wrangler deploy` (Cloudflare account + Wrangler auth); production auto-deploy on push to `master` via `.github/workflows/deploy.yml`
- **MCP:** project config in @.mcp.json — Cloudflare Code Mode (`https://mcp.cloudflare.com/mcp`); OAuth on first connect in the IDE

Node **22.14+** (@.nvmrc). Husky + lint-staged: ESLint on `*.{ts,tsx,astro}`, Prettier on `*.{json,css,md}` (@package.json).

## Coding style

- `@/*` → `./src/*` (@tsconfig.json)
- Astro for layout/static pages; React only for interactivity — no Next.js directives (`"use client"`, App Router patterns)
- API handlers: uppercase `GET` / `POST`; validate request bodies with Zod
- Do not add dependencies not already justified in @package.json without asking

## Testing

No `test` script in @package.json yet. Planned Playwright E2E per @README_PatchPost_plan.md — do not claim tests pass until the runner exists and CI runs it.

## CI and commits

Gate: @.github/workflows/ci.yml on `master` — `npm ci`, `npx astro sync`, `npm run lint`, `npm run build` (requires `SUPABASE_*` GitHub secrets). After `git init`, use commit prefixes from plan §23 (`feat:`, `fix:`, `docs:`, `ci:`, `test:`).
