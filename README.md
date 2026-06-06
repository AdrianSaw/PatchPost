# 10x Astro Starter

![](./public/template.png)

A modern, opinionated starter template for building fast, accessible web applications.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase env profiles — see [Supabase Configuration](#supabase-configuration) below.

4. Run the development server (local profile):

```bash
npm run dev:local
```

(`npm run dev` is the same command; use `npm run dev:cloud` when targeting a hosted project.)

## Available Scripts

- `npm run dev` - Start dev server (loads `.env` + `.env.local` when present)
- `npm run dev:local` - Same as `dev` — intended for local Docker Supabase (`.env.local`)
- `npm run dev:cloud` - Dev server using `.env` + `.env.cloud` only (skips `.env.local`)
- `npm run supabase:start` - Start local Supabase stack (Docker)
- `npm run supabase:stop` - Stop local Supabase stack
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier
- `npm test` - Run Vitest integration tests (requires local Supabase — see [Testing](#testing))
- `npm run test:watch` - Vitest watch mode

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

Use **two profiles** so local Docker and hosted cloud credentials are not mixed in one file:

| File | Purpose |
| ---- | ------- |
| `.env` | Optional shared vars (e.g. `GEMINI_*`, `AI_PROVIDER`) — copy from `.env.example` |
| `.env.local` | Local Docker Supabase — copy from `.env.local.example` (gitignored) |
| `.env.cloud` | Hosted Supabase — copy from `.env.cloud.example` (gitignored) |
| `.dev.vars` | Same `SUPABASE_*` as the profile you are actively using (Cloudflare workerd reads this) |

Set `SUPABASE_KEY` to the **Publishable** key (CLI label; same role as the dashboard anon/public key). Never commit real keys or put the **Secret** service-role key in app env.

### Local development (Docker)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM. The `supabase/` folder is already in the repo — no `supabase init` needed.

1. Create the local profile:

```bash
cp .env.local.example .env.local
```

2. Start the stack (downloads images on first run):

```bash
npm run supabase:start
```

3. Copy **Project URL** and **Publishable** from the CLI output into `.env.local`, then mirror the same values into `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<Publishable key from CLI>
```

4. Start the app:

```bash
npm run dev:local
```

5. Stop the stack when done:

```bash
npm run supabase:stop
```

Local Studio: `http://127.0.0.1:54323` (see CLI output after `supabase:start`).

### Cloud development (hosted project)

1. Create the cloud profile:

```bash
cp .env.cloud.example .env.cloud
```

2. Fill `SUPABASE_URL` and `SUPABASE_KEY` from [Supabase dashboard](https://supabase.com/dashboard) → **Project Settings → API** (Publishable / anon key).

3. Mirror the same `SUPABASE_*` values into `.dev.vars`.

4. Start the app (does not load `.env.local`):

```bash
npm run dev:cloud
```

### Database migrations

Schema changes live in `supabase/migrations/`. After pulling new migrations, apply them locally with:

```bash
npx supabase db reset
```

This recreates the local database from migrations (destructive — dev only). Confirm tables and RLS policies in Studio → **Table Editor** / **Authentication → Policies**.

For hosted projects, push migrations with `npx supabase db push` or run the SQL in the dashboard after review.

No domain tables existed before F-02; auth uses Supabase's built-in `auth.users` table.

### Invite-only access (no public sign-up)

PatchPost is **invite-only**: only people the product owner adds in Supabase can sign in. The app does not maintain a separate email allowlist in env — **Supabase Auth is the source of truth**.

**Add a user (local or hosted):**

1. Open Supabase Studio (local: after `npm run supabase:start`) or [Supabase dashboard](https://supabase.com/dashboard) → **Authentication → Users**.
2. **Invite user** (sends email) or **Add user** (email + password).
3. Ensure the email is listed in Auth before they use `/auth/signin`.

**Disable public registration:**

- **Local:** `supabase/config.toml` sets `enable_signup = false` under `[auth]` and `[auth.email]` (already configured in this repo).
- **Hosted project:** Authentication → **Providers** → **Email** → turn off **Enable sign ups**.

Only `SUPABASE_URL` and `SUPABASE_KEY` are required in the active profile and `.dev.vars` (plus Wrangler secrets in production) — no `ALLOWED_EMAILS` variable.

### Email confirmation in local development

Hosted projects often require email confirmation. For local Supabase, `supabase/config.toml` sets `enable_confirmations = false` under `[auth.email]`, so dashboard-created users can sign in immediately.

For a hosted project, toggle **Authentication → Email → Confirm email** if you want the same behavior during development.

### Auth routes

| Route          | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `/auth/signin` | Email/password sign-in (invite-only; account must exist in Supabase Auth)   |
| `/dashboard`   | Example gated page (most routes require a session; `/` is public)         |

Legacy `/auth/signup` and `/auth/confirm-email` redirect to `/auth/signin`.

Route protection is in `src/middleware.ts`: a **public-route allowlist** (catch-all). Only `/`, `/auth/signin`, and auth signin/signout API paths are public; add new public paths explicitly when needed.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/) as the Worker `patchpost` (see `wrangler.jsonc`). Operational details, risks, and rollback: [`context/foundation/infrastructure.md`](context/foundation/infrastructure.md).

### First production deploy (manual)

0. **One-time:** register a `workers.dev` subdomain in the [Cloudflare Workers onboarding](https://dash.cloudflare.com/?to=/:account/workers/onboarding) dashboard (required before the first public URL).

1. Log in: `npx wrangler login`
2. Set runtime secrets on the Worker (production Supabase **cloud** URL and **Publishable** key — not `127.0.0.1`):

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
```

3. Build and deploy:

```bash
npm run deploy
```

4. In **Supabase** → Authentication → URL Configuration, set **Site URL** and **Redirect URLs** to your `https://patchpost.<account>.workers.dev` origin (plus `http://127.0.0.1:4321` if you still develop locally). Disable **Enable sign ups** under Providers → Email.

5. Smoke test: `/` (public), `/dashboard` (redirect when logged out), sign-in with a Supabase-provisioned user → dashboard.

Logs: `npx wrangler tail`. Rollback: `npx wrangler deployments list` then `npx wrangler rollback <version-id>`.

### GitHub Actions auto-deploy

On every push to `master`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs build + `wrangler deploy`.

Repository secrets required:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Build-time `astro:env` (same as production) |
| `SUPABASE_KEY` | Build-time `astro:env` (Publishable / anon key) |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (template: Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler account binding (see `account_id` in `wrangler.jsonc`) |

Worker runtime secrets (`SUPABASE_*`) are set once via `wrangler secret put`; CI does not need to rotate them on each deploy.

## Testing

Auth and RLS integration tests use Vitest against **local Supabase**:

1. `npm run supabase:start`
2. Copy `.env.local.example` → `.env.local` and set the Publishable key from the CLI output
3. `npm test`

If Supabase is stopped or env is missing, integration suites skip locally with a clear prerequisite message. CI runs the full suite with Docker Supabase on every PR (see below). See `context/foundation/test-plan.md` §6 for cookbook patterns (populated as rollout phases land).

## CI

GitHub Actions runs typecheck, full Vitest (ephemeral local Supabase), Playwright e2e (`npm run test:e2e`), lint, and build on every push and PR to `master` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). The test steps use keys from `npx supabase status`; configure hosted `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets for the build step only.

## License

MIT
