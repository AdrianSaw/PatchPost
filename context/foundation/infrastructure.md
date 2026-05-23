---
project: patchpost
researched_at: 2026-05-21
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 SSR + React 19
  runtime: Cloudflare Workers (workerd, @astrojs/cloudflare ^13.5.0, wrangler ^4.90.0)
---

## Recommendation

**Deploy on Cloudflare Workers.**

PatchPost is already scaffolded with `@astrojs/cloudflare`, `output: "server"`, `wrangler.jsonc`, and `nodejs_compat` — switching platforms would mean a new adapter, new runtime semantics, and new secrets wiring with no cost benefit. At 10k–100k requests per month, Workers Free covers request volume (100k requests/day); SSR CPU may require the **Workers Paid** plan ($5/mo) once real auth + Supabase round-trips land in production. Interview constraints (stateless HTTP, minimize cost, single region, external Supabase) all align with Workers plus Supabase, not with always-on PaaS hosts ($7–32/mo).

## Platform Comparison

Hard filters applied: no persistent WebSockets/workers required → Vercel/Netlify serverless remain eligible. All six candidates support TypeScript; only Cloudflare matches the **pinned** adapter without migration.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass (`llms.txt`, markdown docs) | Pass (`wrangler deploy` / `rollback` / `tail`) | Pass (`mcp.cloudflare.com`) | **5/5** |
| Vercel | Pass | Pass | Pass (`llms.txt`) | Pass (`vercel deploy` / `rollback` / `logs`) | Pass (Vercel MCP GA) | 5/5 |
| Netlify | Pass | Pass | Pass (`llms.txt`, Netlify MCP) | Pass (`netlify deploy`) | Pass | 5/5 |
| Railway | Pass | Pass | Partial | Pass (`railway up`) | Pass (`mcp.railway.com`) | 4/5 |
| Render | Pass | Pass | Partial | Pass (API + `render.yaml`) | Partial (MCP: no deploy trigger) | 3.5/5 |
| Fly.io | Pass | Partial (Machines) | Partial (no site-wide `llms.txt`) | Pass (`fly deploy`) | Partial (`fly mcp` beta) | 3.5/5 |

**Cost weighting (interview: minimize cost):** Cloudflare $0–5/mo → Vercel Hobby $0* → Netlify credits → Fly ~$4–8 → Railway ~$5–15 → Render ~$7–32. *Vercel Hobby is personal/non-commercial only.

**Stack weighting:** `tech-stack.md` already sets `deployment_target: cloudflare-pages` (Workers + static assets in adapter v13+).

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Native fit: `astro.config.mjs` uses `adapter: cloudflare()`, secrets via `wrangler secret put` and `.dev.vars`, CI already builds with `SUPABASE_*` GitHub secrets. Free request tier is generous; edge CDN is a bonus even for single-region users. Agent ergonomics: Wrangler CLI, `developers.cloudflare.com/workers/llms.txt`, official Cloudflare MCP.

#### 2. Vercel

Strong docs and Hobby caps cover 10k–100k SSR invocations, but requires `@astrojs/vercel`, full Node serverless (different from workerd), and Hobby terms block commercial/academic production without Pro (~$20/seat). Supabase Marketplace integration is smooth; platform WebSockets remain unsupported on Functions.

#### 3. Netlify

Solid Astro adapter and Netlify MCP, but post–April 2026 **credit-based** billing makes SSR compute unpredictable on the 300-credit free tier; adapter swap required. Better when Netlify-native primitives (Forms, Blobs) are central — not the case for PatchPost.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **CPU limits on Free** — 10 ms CPU per invocation; Astro SSR + Supabase auth often forces **Workers Paid ($5/mo)** for headroom.
2. **workerd ≠ Node** — `nodejs_compat` is partial; native modules and some npm packages fail at runtime without local preview catching them.
3. **Adapter v13+ dropped Pages-only deploy** — production path is Workers + `assets` in `wrangler.jsonc`; outdated guides cause misconfigured deploys.
4. **Per-environment builds** — staging/production need separate `astro build` with `CLOUDFLARE_ENV`; CI must not rely on `wrangler deploy --env` alone.
5. **Supabase over HTTPS only** — no co-located Postgres; latency and connection pooling differ from Node PaaS; Hyperdrive is optional complexity.

### Pre-Mortem — How This Could Fail

The team chose Cloudflare because the free tier advertised 100k requests/day and the starter already shipped with Wrangler. For the first month, traffic stayed low and costs were zero. Then the MVP added dashboard SSR, middleware auth checks on every route, and AI classification API routes. Each request spent 40–80 ms of CPU talking to Supabase — above the free-tier CPU cap. Intermittent 503s appeared only under load, not in local `astro dev`. Nobody had budgeted the mandatory $5/mo upgrade. Meanwhile, a dependency pulled in a Node API unavailable in workerd; fixing it required replacing the library and retesting every API route. CI deployed preview and production from the same workflow but forgot separate `CLOUDFLARE_ENV` builds, so staging briefly served production bindings. Six months in, the team wished they had documented rollback and secret rotation before the first demo — and validated CPU usage with `wrangler tail` under realistic auth flows.

### Unknown Unknowns

- **`astro dev` already runs workerd** (per starter README) — you do not need a separate `wrangler dev` for daily work; use `npm run dev` and `npm run preview` after build.
- **Secrets are dual-surface** — Astro `env.schema` + Wrangler: local `.dev.vars`, production `wrangler secret put SUPABASE_URL` / `SUPABASE_KEY` (see `AGENTS.md`); GitHub Actions needs the same names for `npm run build`.
- **Rollback is version-based** — `wrangler deployments list` then `wrangler rollback [version-id]`; database migrations (Supabase) do not roll back with the Worker.
- **Observability** — `wrangler tail` for live logs; dashboard Observability when enabled in `wrangler.jsonc` (`observability.enabled: true`).
- **Preview deploys** — not wired in CI yet (only lint/build on PR); adding `cloudflare/wrangler-action` creates per-PR preview URLs — plan Cloudflare Access if previews must be private.

## Operational Story

- **Preview deploys**: Not configured today. CI (`.github/workflows/ci.yml`) runs lint + build on PRs only. To add previews: `cloudflare/wrangler-action` on `pull_request` with a Cloudflare API token scoped to Workers; each PR gets a unique `*.workers.dev` or custom preview hostname. Fork PRs need explicit token/secret policy. Optional: Cloudflare Access in front of preview URLs.
- **Secrets**: Production — Cloudflare dashboard **Workers & Pages → Settings → Variables** or `wrangler secret put SUPABASE_URL` / `SUPABASE_KEY` (never commit). Local — `.dev.vars` (from `.env.example`). CI — GitHub repository secrets `SUPABASE_URL`, `SUPABASE_KEY` for build-time `astro:env` validation. Rotation: set new secret via Wrangler, redeploy; revoke old Supabase keys in Supabase dashboard. Agent may run `wrangler secret list` (names only) read-only; human approves `secret put` and production deploy.
- **Rollback**: `wrangler deployments list` → `wrangler rollback <version-id>` (typically minutes). Worker code reverts; Supabase schema/data and R2/KV state do not. Agent may suggest rollback; human confirms production impact.
- **Approval**: Human — first production deploy, `wrangler secret put`, custom domain/DNS, Workers Paid plan upgrade, destructive Supabase migration. Agent unattended — `npm run build`, `wrangler tail`, read-only dashboard/logs, PR CI lint/build.
- **Logs**: `wrangler tail` (live); Cloudflare dashboard → Workers → Logs / Observability. MCP: `https://mcp.cloudflare.com/mcp` for account-aware tooling (OAuth). GitHub Actions logs for CI failures.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Free-tier CPU exhaustion on SSR + Supabase | Devil's advocate / Research | M | H | Load-test auth routes; enable Workers Paid before launch; watch CPU in Observability |
| npm package incompatible with workerd | Devil's advocate | M | M | Stay on `nodejs_compat`; run `npm run build` + `npm run preview` in CI; avoid Node-only APIs |
| Wrong env bindings (staging vs prod) | Pre-mortem / Unknown unknowns | M | H | Separate `CLOUDFLARE_ENV` builds in CI; document env matrix in README |
| Underestimated monthly cost ($5 Workers) | Pre-mortem | M | L | Budget $5/mo; monitor usage dashboard weekly during MVP |
| Secrets leaked via client bundle | Unknown unknowns | L | H | Keep `SUPABASE_*` in `env.schema` server-only (already configured); never `import.meta.env` expose |
| Preview URLs public without auth | Unknown unknowns | L | M | Add Cloudflare Access or disable preview until needed |
| Rollback without DB migration plan | Operational story | M | H | Forward-only Supabase migrations; test rollback on Worker only |

## Getting Started

1. **Install Wrangler** (already in devDependencies): `npm install` in project root; verify with `npx wrangler --version` (v4.x).
2. **Local secrets**: `Copy-Item .env.example .dev.vars` (PowerShell) or `cp .env.example .dev.vars`; fill `SUPABASE_URL` and `SUPABASE_KEY` from `npx supabase start` or Supabase dashboard.
3. **Develop**: `npm run dev` — Astro 6 + Cloudflare adapter uses workerd locally (no separate global Wrangler install required).
4. **Production secrets** (once Cloudflare account exists): `npx wrangler login` then `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`.
5. **Deploy**: `npm run build` then `npx wrangler deploy` — confirm `wrangler.jsonc` `name` matches intended Worker; add `cloudflare/wrangler-action` to GitHub Actions when ready for auto-deploy on merge to `master`.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup (beyond noting current lint/build-only workflow)
- Production-scale architecture (multi-region HA, DR, dedicated support)
