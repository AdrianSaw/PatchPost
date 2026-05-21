---
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
---

## Why this stack

PatchPost is a web app for indie game creators: auth-gated projects, CRUD, GitHub commit import, AI classification, and multi-channel draft generation — all already specified in the plan as Astro 6, React 19, TypeScript, Tailwind, Supabase, and Cloudflare. The recommended `(web, js)` default, **10x-astro-starter**, matches that stack line-for-line and clears all four agent-friendly gates (typed boundaries, familiar layout, strong training-data coverage, current docs). Auth and AI are in MVP scope; payments, realtime, and background jobs are explicitly out. Deployment on Cloudflare Pages and CI via GitHub Actions with auto-deploy on merge align with the academic project plan and keep scaffolding friction low at first-class bootstrapper confidence.
