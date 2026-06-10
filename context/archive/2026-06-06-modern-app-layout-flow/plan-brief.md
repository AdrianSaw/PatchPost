# Modern app layout and view-by-view flow redesign — Plan Brief

> Full plan: `context/changes/modern-app-layout-flow/plan.md`
> Research: `context/changes/modern-app-layout-flow/research.md`

## What & Why

PatchPost works functionally but the UI flow is hard to follow: duplicated glass styling, back-link-only navigation, and a project detail page that mixes settings with the generate/drafts workflow. This change delivers a **modern cosmic/glass/purple design** view-by-view, starting from the sign-in mockup, while keeping the north-star e2e path green.

## Starting Point

Cosmic aesthetic already exists in `Welcome.astro` and inline classes on app pages; sign-in is a minimal centered card. Two layouts (`Layout`, `AppLayout`), no shared layout primitives, `max-w-3xl` app shell. Research mapped all routes and e2e label contracts.

## Desired End State

Shared design-system layout components and tokens; sign-in matches mockup (logo bar, welcome card, feature cards); app shell with BrandTopbar and **project sub-nav tabs**; project **settings on `/settings`** with a workflow-focused overview hub; clearer CTAs across projects → generate → drafts; landing rebranded to PatchPost. `npm run test:e2e` passes with **unchanged accessible names**.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Project detail structure | Split `/settings` route | Separates workflow from edit/delete | Plan |
| Post-generate landing | Keep drafts list + banner | E2e-safe; no redirect change | Plan |
| Layout width | Wider auth shell; app stays max-w-3xl for now | Mockup room without rewiring all pages early | Plan |
| In-project navigation | Sub-nav tabs (Overview \| Generate \| Drafts \| Settings) | Discoverable workflow | Plan |
| Design foundation | Astro layout primitives + CSS tokens | Reuse Welcome patterns; AGENTS `cn()` rule | Research / Plan |
| Landing | Rebrand Welcome + shared components | Brand consistency on `/` | Plan |
| Auth scope | Sign-in only | Invite-only; no signup pages | Plan |
| Mobile sign-in | Stack feature cards below card on small screens | Mockup on desktop, usable on phone | Plan |
| E2e strategy | Freeze role names/labels | CI guardrail per phase | Plan |

## Scope

**In scope:** Phase 0–6 as in full plan; layout/flow/navigation/styling; new `/app/projects/[id]/settings`; shared components; landing rebrand.

**Out of scope:** Sign-up/confirm-email pages; post-generate redirect to draft detail; `data-testid` e2e migration; dashboard rebuild; MSW; accessibility audit beyond baseline labels; i18n.

## Architecture / Approach

Extract **CosmicShell**, **GlassCard**, **BrandTopbar**, **FeatureCard** under `src/components/layout/` with tokens in `global.css`. Astro pages compose shells; React islands keep POST/fetch contracts. **AppLayout** gains optional `projectId` + active tab for sub-nav. Settings form moves off overview hub. Visual-only changes must preserve `getByRole` names used in `main-flow.spec.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 0. Design foundation | Tokens + layout primitives | Token drift vs inline legacy |
| 1. Sign-in mockup | Mockup parity, mobile stack | Breaking e2e labels |
| 2. App shell | Logo Topbar, shell refactor | Regressions on all app pages |
| 3. Projects list + new | CTA hierarchy, empty state | Minor; mostly visual |
| 4. Hub + settings split | Tabs + `/settings` route | Route moves break bookmarks/e2e links |
| 5. Generate + drafts | Sub-nav + step cues | Generate link must stay findable |
| 6. Draft edit + landing | PatchPost branding on `/` | Scope creep on marketing copy |

**Prerequisites:** Branch with Playwright e2e wired (`test/rollout-phases` or merged master).  
**Estimated effort:** ~7 implementation sessions (one per phase) + manual visual pass each phase.

## Open Risks & Assumptions

- Mockup logo asset may need new SVG/component (no brand kit in repo yet).
- `max-w-3xl` may feel tight once tabs land — widen app shell in a follow-up if needed.
- Project overview hub content (beyond Generate/Drafts links) is minimal MVP unless expanded in Phase 4.

## Success Criteria (Summary)

- Sign-in visually matches mockup direction; feature cards responsive.
- User can follow Projects → create → Generate → drafts without relying on back links alone.
- Settings/edit/delete live on `/settings`; overview is workflow-first.
- `npm run lint`, `npm run typecheck`, `npm run test:e2e` green after each phase.
