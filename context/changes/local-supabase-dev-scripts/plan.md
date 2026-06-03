# Local Supabase dev scripts Implementation Plan

## Overview

Implement roadmap **F-03** by making local Docker Supabase vs hosted cloud development explicit through committed example env profiles, npm scripts, and a small Node launcher for cloud dev. No changes to `src/` application logic, database schema, or CI workflows.

## Current State Analysis

- `package.json` has `dev`, `build`, `preview`, `lint`, `deploy` only; `supabase` CLI is in `devDependencies` but unused by npm scripts.
- README (`README.md` § Supabase Configuration) documents manual `cp .env.example .env`, `npx supabase start|stop`, and hosted credentials in the same `.env` file — easy to mix profiles.
- Root `.gitignore` ignores `.env` and `.dev.vars` but not `.env.local` / `.env.cloud`.
- `AGENTS.md` duplicates the manual env story; agents may run `npm run dev` without the right Supabase target.
- `astro.config.mjs` env schema unchanged — still `SUPABASE_URL` / `SUPABASE_KEY` server secrets.

### Key Discoveries:

- Astro dev automatically loads `.env` then `.env.local` (local profile fits `dev:local` = `astro dev` with no wrapper).
- Cloud dev must **not** load `.env.local`; a dedicated launcher reading `.env.cloud` avoids `dotenv-cli`.
- Roadmap F-03 mentions `reset` / `push` npm aliases; planning decision limits npm wrap to **start/stop** — reset/push remain `npx supabase db reset|push` in docs.

## Desired End State

1. Committed `.env.local.example` and `.env.cloud.example` with Supabase placeholders; developers copy to gitignored `.env.local` / `.env.cloud`.
2. `npm run dev:local` starts Astro with default env loading (local Supabase when `.env.local` is set).
3. `npm run dev:cloud` starts Astro using only `.env.cloud` (plus shared keys from `.env` if the launcher merges both — see Phase 2 contract).
4. `npm run supabase:start` and `npm run supabase:stop` wrap `supabase start` / `supabase stop`.
5. README and AGENTS.md describe the two-profile workflow and `.dev.vars` mirroring.
6. `npm run lint` and `npm run build` pass unchanged.

### Verification

- **Automated:** `npm run lint`, `npm run build`
- **Manual:** start local stack, `dev:local` sign-in works; with `.env.cloud` filled, `dev:cloud` hits hosted project (different Studio URL in network or dashboard)

## What We're NOT Doing

- `dotenv-cli` or other new runtime dependencies
- npm aliases for `supabase db reset`, `db push`, `status`, `link`
- Changing `astro.config.mjs` env schema or `src/lib/supabase.ts`
- CI/GitHub Actions secret layout changes
- Auto-syncing `.dev.vars` from profiles (document manual copy only)
- Roadmap / Backlog Handoff table edits (optional follow-up after archive)

## Implementation Approach

Three phases: (1) profile files and gitignore, (2) scripts + launcher, (3) documentation. Keep the Node launcher minimal — parse `KEY=VALUE` lines, skip comments/blanks, set `process.env`, spawn `astro dev` with inherited stdio.

## Critical Implementation Details

**Cloud launcher env merge order:** Load `.env` first (shared optional `GEMINI_*`, `AI_PROVIDER`), then `.env.cloud` so Supabase URL/key from cloud override any stale values. Do **not** read `.env.local`. If `.env.cloud` is missing, exit with a clear error message pointing to `.env.cloud.example`.

**Windows:** Use `node scripts/astro-dev-cloud.mjs` with `child_process.spawn` and `shell: true` on win32 if needed for `astro` resolution, or use `npm exec astro dev` — follow whichever pattern already works in the repo for cross-platform npm scripts (prefer `astro dev` via `npx astro dev` from project bin).

## Phase 1: Env profiles and examples

### Overview

Establish the two-profile file layout and prevent accidental commits of real credentials.

### Changes Required:

#### 1. Example profile files

**File**: `.env.local.example`

**Intent**: Template for Docker Supabase credentials used during everyday local dev.

**Contract**: Document `SUPABASE_URL=http://127.0.0.1:54321` and `SUPABASE_KEY=<anon key from npm run supabase:start output>`. Optional comment that shared AI keys may live in `.env` instead.

**File**: `.env.cloud.example`

**Intent**: Template for hosted Supabase project credentials.

**Contract**: Document `SUPABASE_URL=https://<project-ref>.supabase.co` and `SUPABASE_KEY=<anon key from dashboard>`. Note invite-only user provisioning unchanged.

#### 2. Root `.env.example` cross-link

**File**: `.env.example`

**Intent**: Point developers to profile examples instead of implying a single ambiguous `###` placeholder for all targets.

**Contract**: Short comment block: copy `.env.local.example` → `.env.local` for local; `.env.cloud.example` → `.env.cloud` for hosted; keep optional generation vars in `.env` or profile files.

#### 3. Gitignore

**File**: `.gitignore`

**Intent**: Ensure profile secrets are never committed.

**Contract**: Add `.env.local` and `.env.cloud` under the environment variables section (aligned with `supabase/.gitignore` convention).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- `.env.local.example` and `.env.cloud.example` exist and contain no real secrets
- `.env.local` / `.env.cloud` are gitignored

**Implementation Note**: Pause for human confirmation after manual checks before Phase 2.

---

## Phase 2: npm scripts and cloud launcher

### Overview

Wire npm commands for dev profiles and thin Supabase lifecycle wrappers.

### Changes Required:

#### 1. Cloud dev launcher

**File**: `scripts/astro-dev-cloud.mjs`

**Intent**: Start `astro dev` with cloud Supabase credentials without loading `.env.local`.

**Contract**: ESM script; read and parse `.env` then `.env.cloud` from project root; on missing `.env.cloud`, `console.error` + `process.exit(1)`; spawn `astro dev` (use `import { spawn } from "node:child_process"` and project-local `astro` binary via `node_modules/.bin/astro` or `npm run astro -- dev`); forward exit code.

#### 2. package.json scripts

**File**: `package.json`

**Intent**: Expose the agreed command surface in `scripts`.

**Contract**: Add (names exact):

- `"dev:local": "astro dev"` — same as default dev; documents local profile intent
- `"dev:cloud": "node scripts/astro-dev-cloud.mjs"`
- `"supabase:start": "supabase start"`
- `"supabase:stop": "supabase stop"`

Keep existing `"dev": "astro dev"` for backwards compatibility (alias of local path). Do not add new dependencies.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- `npm run supabase:start` prints local URLs/keys (Docker running)
- With `.env.local` populated, `npm run dev:local` serves app; sign-in works against local Studio
- With `.env.cloud` populated, `npm run dev:cloud` serves app; session uses hosted project (verify URL in Supabase dashboard or network to `*.supabase.co`)
- Missing `.env.cloud` causes `dev:cloud` to fail fast with helpful message

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Documentation

### Overview

Align human and agent docs with the new workflow; remove stale `supabase init` guidance.

### Changes Required:

#### 1. README Supabase section

**File**: `README.md`

**Intent**: Replace the single-path env story with a two-profile workflow.

**Contract**:

- **Local workflow:** `cp .env.local.example .env.local`, `npm run supabase:start`, paste keys, `cp` same values to `.dev.vars`, `npm run dev:local`.
- **Cloud workflow:** `cp .env.cloud.example .env.cloud`, fill dashboard keys, mirror to `.dev.vars`, `npm run dev:cloud`.
- **Available Scripts** table: add `dev:local`, `dev:cloud`, `supabase:start`, `supabase:stop`.
- Keep `npx supabase db reset` and `npx supabase db push` as documented CLI commands (not npm scripts).
- Remove or fix step that says `npx supabase init` when `supabase/` already exists in repo.

#### 2. AGENTS.md

**File**: `AGENTS.md`

**Intent**: Agents use the same commands as humans for local vs cloud dev.

**Contract**: Update **Secrets & env** and **Build and development** bullets: profile files (`.env.local`, `.env.cloud`), `npm run dev:local` / `dev:cloud`, `npm run supabase:start` / `supabase:stop`; retain never-commit rules for `.env`, `.dev.vars`, real keys.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- New contributor can follow README only and run local OR cloud dev without editing wrong file
- AGENTS.md commands match `package.json` script names exactly

---

## Testing Strategy

### Manual Testing Steps:

1. Fresh clone mindset: copy both examples to gitignored profiles; confirm `git status` does not show `.env.local` / `.env.cloud`.
2. Local: `npm run supabase:start` → fill `.env.local` + `.dev.vars` → `npm run dev:local` → sign in.
3. Cloud: fill `.env.cloud` + `.dev.vars` → `npm run dev:cloud` → sign in (hosted user).
4. `npm run supabase:stop` stops Docker stack.
5. Run `npm run dev` — still works (same as local default).

## Performance Considerations

None — DX-only change; no runtime hot path impact.

## Migration Notes

Existing developers with a working single `.env` should:

1. Move local `SUPABASE_*` into `.env.local` (gitignored).
2. Optionally create `.env.cloud` for hosted testing.
3. Keep optional AI keys in `.env` or duplicate into profiles as preferred.

No database migration.

## References

- Roadmap F-03: `context/foundation/roadmap.md` (lines 92–103, 161)
- Prior env rules: `AGENTS.md`
- Supabase local ports: `supabase/config.toml` (`api` 54321, Studio 54323)
- Similar doc-only foundation slice: `context/archive/2026-05-30-project-and-draft-data-foundation/plan.md` (README migration notes)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Env profiles and examples

#### Automated

- [x] 1.1 Lint passes: `npm run lint`
- [x] 1.2 Production build passes: `npm run build`

#### Manual

- [x] 1.3 Example env files exist; profile paths are gitignored

### Phase 2: npm scripts and cloud launcher

#### Automated

- [ ] 2.1 Lint passes: `npm run lint`
- [ ] 2.2 Production build passes: `npm run build`

#### Manual

- [ ] 2.3 supabase:start/stop and dev:local/dev:cloud behave as specified

### Phase 3: Documentation

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Production build passes: `npm run build`

#### Manual

- [ ] 3.3 README and AGENTS describe two-profile workflow accurately
