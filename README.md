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

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier

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

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

No database tables or migrations are required — this project uses Supabase Auth's built-in `auth.users` table only.

### Invite-only access (no public sign-up)

PatchPost is **invite-only**: only people the product owner adds in Supabase can sign in. The app does not maintain a separate email allowlist in env — **Supabase Auth is the source of truth**.

**Add a user (local or hosted):**

1. Open Supabase Studio (local: `http://localhost:54323` after `npx supabase start`) or [Supabase dashboard](https://supabase.com/dashboard) → **Authentication → Users**.
2. **Invite user** (sends email) or **Add user** (email + password).
3. Ensure the email is listed in Auth before they use `/auth/signin`.

**Disable public registration:**

- **Local:** `supabase/config.toml` sets `enable_signup = false` under `[auth]` and `[auth.email]` (already configured in this repo).
- **Hosted project:** Authentication → **Providers** → **Email** → turn off **Enable sign ups**.

Only `SUPABASE_URL` and `SUPABASE_KEY` are required in `.env` / `.dev.vars` and as Wrangler secrets — no `ALLOWED_EMAILS` variable.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

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
2. Set runtime secrets on the Worker (production Supabase **cloud** URL and **anon** key — not `127.0.0.1`):

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
| `SUPABASE_KEY` | Build-time `astro:env` (anon key) |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (template: Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler account binding (see `account_id` in `wrangler.jsonc`) |

Worker runtime secrets (`SUPABASE_*`) are set once via `wrangler secret put`; CI does not need to rotate them on each deploy.

## CI

GitHub Actions runs lint + build on every push and PR to `master` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets for the build step.

## License

MIT
