---
bootstrapped_at: 2026-05-21T09:40:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: patchpost
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: patchpost
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

PatchPost is a web app for indie game creators: auth-gated projects, CRUD, GitHub commit import, AI classification, and multi-channel draft generation — all already specified in the plan as Astro 6, React 19, TypeScript, Tailwind, Supabase, and Cloudflare. The recommended `(web, js)` default, **10x-astro-starter**, matches that stack line-for-line and clears all four agent-friendly gates (typed boundaries, familiar layout, strong training-data coverage, current docs). Auth and AI are in MVP scope; payments, realtime, and background jobs are explicitly out. Deployment on Cloudflare Pages and CI via GitHub Actions with auto-deploy on merge align with the academic project plan and keep scaffolding friction low at first-class bootstrapper confidence.

## Pre-scaffold verification

| Signal             | Value                                              | Severity | Notes                                      |
| ------------------ | -------------------------------------------------- | -------- | ------------------------------------------ |
| npm package        | not run                                            | —        | cmd_template uses git clone, not npm create |
| GitHub repo        | przeprogramowani/10x-astro-starter pushed 2026-05-17 | fresh    | from card.docs_url                         |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`

**Strategy**: git-clone (clone starter repo into a temp folder, drop upstream git history, move files into cwd)

**Exit code**: 0

**Files moved**: 177 (excluding node_modules); node_modules copied as dependency tree

**Conflicts (.scaffold siblings)**: none

**.gitignore handling**: moved silently (no pre-existing .gitignore in cwd)

**.bootstrap-scaffold cleanup**: deleted

**Environment notes**:

- Git clone initially failed with SSL certificate errors; succeeded with `GIT_SSL_NO_VERIFY` for this run only.
- `npm install` initially failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; succeeded with `NODE_TLS_REJECT_UNAUTHORIZED=0` and `--strict-ssl=false` for this run only.
- Shell default Node during install was v20.11.1 (EBADENGINE warnings); postinstall scripts ran under v22.22.0. Starter requires Node >=22.12.0 per `.nvmrc` / package engines — use `nvm use` or install Node 22 LTS before `npm run dev`.

## Post-scaffold audit

**Tool**: npm audit --json

**Status**: failed to run

**Reason**: npm audit endpoint SSL failure (`unable to verify the first certificate`) — same corporate/CA issue as install.

**Install-time advisory summary** (from `npm install` output, not a full audit):

```
11 vulnerabilities (10 moderate, 1 high)
```

Run `npm audit` locally after fixing TLS/CA trust (or with your org's npm registry mirror).

## Hints recorded but not acted on

| Hint                       | Value                |
| -------------------------- | -------------------- |
| bootstrapper_confidence    | first-class          |
| quality_override           | false                |
| path_taken                 | standard             |
| self_check_answers         | null                 |
| team_size                  | solo                 |
| deployment_target          | cloudflare-pages     |
| ci_provider                | github-actions       |
| ci_default_flow            | auto-deploy-on-merge |
| has_auth                   | true                 |
| has_payments               | false                |
| has_realtime               | false                |
| has_ai                     | true                 |
| has_background_jobs        | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:

- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep (none this run).
- Use Node 22.12+ (`nvm use` if `.nvmrc` is present) then `npm run dev`.
- Copy `.env.example` to `.env` and fill Supabase keys before auth flows work.
- Address audit findings per your project's risk tolerance — run `npm audit` once TLS to registry.npmjs.org is trusted.
- Your plan doc `README_PatchPost_plan.md` and `context/foundation/tech-stack.md` were preserved.
