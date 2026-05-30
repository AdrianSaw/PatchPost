# Repository Guidelines

**Canonical rules for AI agents** (Cursor, Codex, Claude Code, and others). Read this file first. Do not duplicate or override it from other instruction stubs.

PatchPost turns game-repo changes into player-facing copy (changelogs, social drafts). Astro 6 SSR, React 19 islands, Tailwind 4, Supabase auth/data, Cloudflare Workers. Product scope: @README_PatchPost_plan.md. Human setup: @README.md.

## Hard rules

- **Secrets & env (only place):** Never commit `.env`, `.dev.vars`, or real `SUPABASE_*`. Local: duplicate @.env.example as `.env` and `.dev.vars` (`cp .env.example .env` in Git Bash/macOS/Linux; `Copy-Item .env.example .env` in PowerShell). Same `SUPABASE_URL` / `SUPABASE_KEY` names; values from `npx supabase start` or the Supabase dashboard. Prod: `npx wrangler secret put SUPABASE_URL` and `SUPABASE_KEY` — not in git. Variables are server-only (@astro.config.mjs `env.schema`); never expose in client bundles.
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
- Protected example: @src/pages/dashboard.astro

## Project structure

- `src/pages/` — Astro routes; `src/pages/api/` — server handlers
- `src/components/` — Astro + React; shadcn in `src/components/ui/` (new-york). Add: `npx shadcn@latest add <name>`
- `src/lib/` — clients, helpers; business logic in `src/lib/services/` when extracted
- `src/components/hooks/` — React hooks
- @src/types.ts — shared entities/DTOs
- `supabase/` — migrations and local config

## Build and development

- `npm run dev` — local dev (Cloudflare workerd)
- `npm run build` / `npm run preview` — production build and preview
- `npm run lint` / `lint:fix` / `format` — @eslint.config.js + Prettier
- `npx supabase start` — local Supabase (Docker); wire keys per **Secrets & env** above
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
