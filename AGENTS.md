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

- `npm test` — Vitest integration suite (`vitest run`)
- `npm run test:watch` — Vitest watch mode
- `npm run test:e2e` — Playwright e2e (`tests/e2e/`; Chromium via `playwright.config.ts`)
- `npm run test:e2e:ui` — Playwright UI mode
- **Prerequisite (Vitest + e2e):** local Docker Supabase (`npm run supabase:start`) and `.env.local` with `SUPABASE_URL` + Publishable `SUPABASE_KEY` (see @.env.local.example). Add `SUPABASE_SERVICE_ROLE_KEY` (Secret from `npx supabase status`) for integration tests and e2e global setup — invite-only Auth uses Admin API to provision users. Cross-owner and contract suites skip when local env is missing; with local env configured, `assertSupabaseReachable()` fails fast if Docker is stopped. Reset local DB between long test runs: `npx supabase db reset`.
- Integration tests live under `tests/integration/`; unit tests under `tests/unit/`; e2e under `tests/e2e/` (`00-seed.spec.ts` harness, `main-flow.spec.ts` US-01 with mock AI). Shared helpers under `tests/helpers/` (including `guardrail-fixtures.ts` for generation oracles). Uses real local Supabase + JWT sessions (no RLS mocks). Contract suites: `projects-form-post-contracts`, `change-inputs-api-contracts`, `generation-runs-api-contracts` (includes mock-path guardrail regression), `drafts-api-contracts` (Risk #5 persistence + validation). Auth/RLS suites from Phase 1: `auth-api-unauthenticated`, `rls-cross-owner`, `projects-api-cross-owner`. Generation guardrails (Phase 3): unit suites `mock-provider`, `generation-prompts`, `generation-provider-factory`, `prompt-snapshot`, `wrap-provider-error`, `output-language`; optional live smoke `generation-live-smoke.test.ts` runs only when `RUN_LIVE_GEMINI_SMOKE=1` and `GEMINI_API_KEY` are set in `.env.local` (skipped by default — see @.env.local.example).
- **E2e:** Playwright starts its own Astro dev server on `127.0.0.1:4322` — do not occupy that port manually. One-time: `npx playwright install chromium`. Recipe: @context/foundation/test-plan.md §6.3.
- **CI:** every PR runs @.github/workflows/ci.yml — local Supabase start, `npm run typecheck`, full `npm test`, Playwright `npm run test:e2e`, `npm run lint`, then `npm run build` (build uses hosted `SUPABASE_*` GitHub secrets only). Local dev is unchanged — use `.env.local` with your own Docker Supabase.

## CI and commits

Gate: @.github/workflows/ci.yml on `master` — `npm ci`, `npx astro sync`, local Supabase start, `npm run typecheck`, `npm test`, Playwright install + `npm run test:e2e`, `npm run lint`, `npm run build` (build step uses hosted `SUPABASE_*` GitHub secrets only). After `git init`, use commit prefixes from plan §23 (`feat:`, `fix:`, `docs:`, `ci:`, `test:`).
