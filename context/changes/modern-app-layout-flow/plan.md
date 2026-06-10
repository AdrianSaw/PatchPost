# Modern App Layout and Flow Redesign Implementation Plan

## Overview

Redesign PatchPost **view-by-view** with a shared modern cosmic/glass/purple design system, clearer product flow (projects → generate → drafts), and sign-in mockup parity—without changing API/POST behavior or breaking `tests/e2e/main-flow.spec.ts` accessible names.

## Current State Analysis

| Area | Today | Gap |
|------|-------|-----|
| Design tokens | Inline Tailwind duplicated 7+ times | No `GlassCard`, brand purple not in `--primary` |
| Sign-in | Small centered card | No logo bar, welcome copy, or feature side cards |
| App shell | `AppLayout` + email Topbar, `max-w-3xl` | No logo, no project sub-nav, weak CTA hierarchy |
| Project detail | Settings + delete + Generate/Drafts on one page | Flow buried in settings |
| Landing | Rich `Welcome.astro` but "10x Astro Starter" copy | Brand mismatch |
| E2e | `main-flow` encodes role names | Must stay stable per plan decision |

**Key discoveries:**

- Richest UI reference: `src/components/Welcome.astro` (orbs, star field, feature cards).
- Auth kit: `src/components/auth/*` — preserve labels **Email**, **Password**, button **Sign in**.
- Invite-only: no signup pages; middleware redirects signup/confirm to sign-in.

## Desired End State

- **Phase 0–1:** Shared layout primitives; sign-in matches mockup (wider auth shell; feature cards stack on mobile).
- **Phase 2–5:** BrandTopbar with logo; project **tabs** (Overview | Generate | Drafts | Settings); `/app/projects/[id]/settings` holds edit/delete; overview hub is workflow-first; generate still redirects to drafts list with success banner.
- **Phase 6:** Draft edit polished; `/` rebranded PatchPost using shared components.
- **Verification:** `npm run lint`, `npm run typecheck`, `npm run test:e2e` after each phase.

## What We're NOT Doing

- Sign-up / confirm-email UI (invite-only unchanged).
- Redirect after generate to draft detail (keep list + `?success=generated`).
- `data-testid` migration for e2e.
- Dashboard rebuild (middleware redirect stays).
- New dependencies without justification.
- Changing API routes, middleware auth rules, or Supabase schema.

## Implementation Approach

**View-by-view vertical slices** with a **foundation-first** Phase 0. Each phase ends with automated gates + manual visual check against mockup/sign-off. Extract Astro layout components before restyling pages to avoid copy-paste drift.

**Flow architecture decision:** split project **settings** onto `/app/projects/[id]/settings`; overview at `/app/projects/[id]` becomes workflow hub with prominent **Generate** link (e2e) and sub-nav tabs across project routes.

## Critical Implementation Details

**E2e contract (frozen):** Do not rename accessible names used in `tests/e2e/main-flow.spec.ts`: textboxes **Email**, **Password**, **Project name**, **Changes**; buttons **Sign in**, **Create project**, **Generate draft**; link **Generate**; text **Draft saved to history.**; URL `/drafts?success=generated`. Layout/CSS may change freely.

**Settings route split:** Move `ProjectForm` (update) and `DeleteProjectForm` from `[id]/index.astro` to new `[id]/settings.astro`. Overview hub retains navigation to Generate/Drafts and tab highlight.

**Sub-nav tabs:** Implement as Astro component (e.g. `ProjectSubNav.astro`) taking `projectId`, `projectName`, `activeTab: 'overview' | 'generate' | 'drafts' | 'settings'`. Render from `AppLayout` when `projectId` prop set, or from each project page consistently.

**Auth shell width:** `CosmicShell` variant `wide` for sign-in/landing (`max-w-5xl` or similar); app pages keep `max-w-3xl` until a follow-up widens shell.

---

## Phase 0: Design Foundation (tokens + layout primitives)

### Overview

Centralize cosmic/glass/purple styling and create reusable layout building blocks before touching product pages.

### Changes Required:

#### 1. CSS tokens and utilities

**File**: `src/styles/global.css`

**Intent**: Promote repeated inline patterns to named utilities/variables; align shadcn `--primary` with brand purple for future Button use.

**Contract**: Add utilities or CSS vars for glass panel border/bg/blur, brand purple, muted text (`blue-100/60` equivalents). Set `:root` or scoped vars without breaking existing pages. Optional: enable `.dark` on `<html>` only if shadcn components need it—do not regress light config banners.

#### 2. Layout components

**Files**: `src/components/layout/CosmicShell.astro`, `GlassCard.astro`, `BrandTopbar.astro`, `FeatureCard.astro` (new directory)

**Intent**: Single source for background orbs/star field (from Welcome), glass card wrapper, top bar with PatchPost logo/wordmark, feature marketing card.

**Contract**: `CosmicShell` props: `variant?: 'auth-wide' | 'app'`, optional `showOrbs`, `showStarfield`. `GlassCard` wraps slot with standard padding/radius. `BrandTopbar` shows logo + optional right slot (email/nav). `FeatureCard` props: `icon`, `title`, `description`. Use `cn()` where class merging needed in TSX consumers only.

#### 3. Document usage

**File**: `context/changes/modern-app-layout-flow/plan.md` (this file) — no code; implementers reference components in later phases.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes
- `npm run lint` passes
- New components compile (import from a throwaway dev page or existing Welcome refactor stub—not required to wire all pages yet)

#### Manual Verification:

- Storybook not required; visually inspect one page importing each primitive locally or via temporary Welcome refactor

**Implementation Note**: Pause for manual confirmation before Phase 1.

---

## Phase 1: Sign-in mockup parity

### Overview

Rebuild `/auth/signin` to match mockup: logo header, welcome copy, central glass card, flanking feature cards (stack on mobile), purple CTA—using Phase 0 primitives.

### Changes Required:

#### 1. Sign-in page shell

**File**: `src/pages/auth/signin.astro`

**Intent**: Replace inline cosmic/card markup with `CosmicShell` (auth-wide), `BrandTopbar`, two `FeatureCard`s (e.g. Projects & Drafts, AI Draft Generation), central `GlassCard` with welcome heading/subtitle.

**Contract**: Copy aligned with mockup tone ("Welcome back", workspace subtitle). Keep `SignInForm` with `client:load`. Preserve invitation footnote. Layout: `md:` grid with side cards; stacked on small screens.

#### 2. Auth form styling (minimal)

**Files**: `src/components/auth/SubmitButton.tsx`, `FormField.tsx` (if needed for icon/spacing only)

**Intent**: Align button with mockup (arrow + Sign in) **without changing** button accessible name **Sign in** or field labels **Email** / **Password**.

**Contract**: Visual/styling only; POST `action="/api/auth/signin"` unchanged.

#### 3. Logo asset

**File**: `src/components/layout/BrandLogo.astro` or inline SVG in BrandTopbar

**Intent**: PatchPost stacked-diamond logo per mockup (SVG, no external image host).

**Contract**: Accessible `aria-label="PatchPost"` on logo link (href `/` or `/auth/signin`).

### Success Criteria:

#### Automated Verification:

- `npm run lint` and `npm run typecheck` pass
- `npm run test:e2e -- tests/e2e/main-flow.spec.ts` passes (sign-in step unchanged semantically)

#### Manual Verification:

- Desktop layout matches mockup direction (logo bar, 3-column auth, purple CTA)
- Mobile: feature cards stack below login card
- Sign-in still redirects to `/app/projects` on success

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: App shell and BrandTopbar

### Overview

Refactor `AppLayout` to use `CosmicShell` + `BrandTopbar`; replace generic Topbar on authenticated pages.

### Changes Required:

#### 1. AppLayout refactor

**File**: `src/layouts/AppLayout.astro`

**Intent**: Compose `CosmicShell` (app variant, max-w-3xl), `BrandTopbar` with email + Projects + Sign out; wrap page content in `GlassCard` optionally (or let pages use GlassCard—pick one pattern and document).

**Contract**: Props: `title`, optional `projectId`, `projectName`, `activeTab` for future sub-nav (wire fully in Phase 4). Preserve `Layout` title passthrough.

#### 2. Deprecate old Topbar usage

**Files**: `src/components/Topbar.astro`, `src/components/Welcome.astro`

**Intent**: Migrate Welcome to `BrandTopbar` where applicable; keep Welcome working until Phase 6 or partial migrate here.

**Contract**: Authenticated app pages use AppLayout only—not duplicate Topbar.

#### 3. Page pass (minimal)

**Files**: All `src/pages/app/**/*.astro`

**Intent**: Remove duplicated outer glass wrapper if AppLayout provides it; keep inner content structure stable.

**Contract**: No route or handler changes.

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass

#### Manual Verification:

- Logo visible on app pages; sign-out and Projects links work
- No double glass cards or broken spacing

**Implementation Note**: Pause before Phase 3.

---

## Phase 3: Projects list and new project

### Overview

Improve first authenticated views: clearer primary CTAs, empty-state guidance toward create → generate flow.

### Changes Required:

#### 1. Projects index

**File**: `src/pages/app/projects/index.astro`

**Intent**: Primary purple **New project** CTA (solid); secondary list styling; empty state with short copy explaining next steps (create project, then generate draft).

**Contract**: Link text **New project** / **Create your first project** may stay or improve copy but keep obvious CTAs; no rename of e2e-unrelated elements that would confuse tests (e2e uses **Create project** on form, not list).

#### 2. New project page

**File**: `src/pages/app/projects/new.astro`

**Intent**: Page header hierarchy, back navigation styled consistently; `ProjectForm` inside `GlassCard` if not layout-wrapped.

**Contract**: `ProjectForm` submit button remains **Create project**; POST unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass

#### Manual Verification:

- Empty and populated list states readable; new project form clear

**Implementation Note**: Pause before Phase 4.

---

## Phase 4: Project hub, settings route, and sub-nav tabs

### Overview

Split settings from workflow; add project sub-nav tabs across project routes.

### Changes Required:

#### 1. Settings route (new)

**File**: `src/pages/app/projects/[id]/settings.astro`

**Intent**: Host `ProjectForm` (update) and `DeleteProjectForm`; page title "Project settings"; tab active **Settings**.

**Contract**: Same API actions as today; danger zone styling preserved.

#### 2. Overview hub

**File**: `src/pages/app/projects/[id]/index.astro`

**Intent**: Remove edit/delete forms; show workflow hub—project name, meta, prominent links/buttons to Generate and Drafts, optional recent-draft snippet if cheap.

**Contract**: Must include `getByRole('link', { name: 'Generate' })` for e2e—visible link or tab labeled **Generate** that navigates to generate route.

#### 3. Project sub-nav

**File**: `src/components/layout/ProjectSubNav.astro`

**Intent**: Tabs: Overview | Generate | Drafts | Settings with active state.

**Contract**: Integrate in AppLayout or each of `[id]/index`, `generate`, `drafts/index`, `settings` pages.

#### 4. Update generate and drafts pages

**Files**: `src/pages/app/projects/[id]/generate.astro`, `drafts/index.astro`, `drafts/[draftId].astro`

**Intent**: Replace back links with sub-nav; keep headings and content.

**Contract**: Draft detail back navigation via tabs to Drafts; no API changes.

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass (Generate link still discoverable from hub)

#### Manual Verification:

- Settings only on `/settings`; overview feels workflow-first
- Tabs highlight correctly on all four sections

**Implementation Note**: Pause before Phase 5.

---

## Phase 5: Generate and drafts list polish

### Overview

Strengthen workflow cues on generate and drafts list; keep post-generate redirect to drafts list.

### Changes Required:

#### 1. Generate page

**File**: `src/pages/app/projects/[id]/generate.astro`, `src/components/generation/GenerateForm.tsx` (styling only)

**Intent**: Step cue copy ("Step 2 of 3" or breadcrumb via tabs); primary **Generate draft** button visually dominant; mock AI checkbox visible in dev.

**Contract**: Button name **Generate draft** unchanged; client redirect `window.location.assign(...drafts?success=generated)` unchanged.

#### 2. Drafts list

**File**: `src/pages/app/projects/[id]/drafts/index.astro`

**Intent**: Success banners styled consistently; **Generate new** as primary CTA; list rows clearer hierarchy.

**Contract**: Banner text **Draft saved to history.** unchanged for e2e.

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass

#### Manual Verification:

- Full happy path feels guided via tabs, not back links
- Success banner visible after generate

**Implementation Note**: Pause before Phase 6.

---

## Phase 6: Draft edit and landing rebrand

### Overview

Polish draft detail page; rebrand landing to PatchPost using shared layout components.

### Changes Required:

#### 1. Draft detail

**File**: `src/pages/app/projects/[id]/drafts/[draftId].astro`, `DraftEditForm.tsx`, `ClassificationPanel.tsx` (visual)

**Intent**: Consistent GlassCard sections; primary **Save changes** vs secondary Cancel/Revert hierarchy.

**Contract**: Button labels unchanged unless e2e updated (prefer unchanged).

#### 2. Landing rebrand

**File**: `src/components/Welcome.astro`, `src/pages/index.astro`

**Intent**: PatchPost hero copy, shared `CosmicShell`/`FeatureCard`/`BrandTopbar`; CTA to sign-in.

**Contract**: Remove "10x Astro Starter" branding; keep `/auth/signin` link.

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass

#### Manual Verification:

- Landing and product UI feel like one brand
- Draft edit usable on mobile width

**Implementation Note**: Final phase — ready for `/10x-impl-review` and archive when Progress complete.

---

## Testing Strategy

### Automated (each phase)

- `npm run lint`
- `npm run typecheck`
- `npm run test:e2e` (full suite: seed + main-flow)

### Manual

- Visual compare sign-in to mockup (Phase 1+)
- Walk US-01 path without Playwright after Phases 4–5
- Spot-check mobile width for sign-in and project tabs

### E2e policy

Update `tests/e2e/main-flow.spec.ts` **only** if product intentionally changes labels—default is frozen names per Critical Implementation Details.

## Performance Considerations

- Orbs/starfield CSS only on auth/landing shells; avoid duplicating heavy backgrounds on every app navigation.
- No new client JS bundles beyond layout composition.

## Migration Notes

- Bookmarks to old project detail with forms still work for overview URL; settings moved to new path—acceptable breaking URL for settings-only bookmarks (document in change notes).
- No DB migration.

## References

- Research: `context/changes/modern-app-layout-flow/research.md`
- Change notes: `context/changes/modern-app-layout-flow/change.md`
- E2e rules: `tests/e2e/E2E-RULES.md`
- Mockup reference: user-provided sign-in visualization; code reference `src/components/Welcome.astro`
- Archived US-01: `context/archive/2026-05-30-manual-to-generated-history-flow/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 0: Design foundation

#### Automated

- [x] 0.1 `npm run typecheck` passes — 349335a
- [x] 0.2 `npm run lint` passes — 349335a

#### Manual

- [x] 0.3 Layout primitives render correctly (CosmicShell, GlassCard, BrandTopbar, FeatureCard) — 349335a

### Phase 1: Sign-in mockup parity

#### Automated

- [x] 1.1 `npm run lint` and `npm run typecheck` pass — a4c85ae
- [x] 1.2 `npm run test:e2e -- tests/e2e/main-flow.spec.ts` passes — a4c85ae

#### Manual

- [x] 1.3 Sign-in matches mockup direction on desktop and mobile stack layout — a4c85ae

### Phase 2: App shell and BrandTopbar

#### Automated

- [x] 2.1 `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass — a2517c1

#### Manual

- [x] 2.2 Logo Topbar and app shell consistent across `/app/*` — a2517c1

### Phase 3: Projects list and new project

#### Automated

- [x] 3.1 `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass — 99042ff

#### Manual

- [x] 3.2 Projects empty/populated states and new project form clear — 99042ff

### Phase 4: Project hub, settings route, and sub-nav tabs

#### Automated

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass — 9bd6c49

#### Manual

- [x] 4.2 Settings on `/settings`; tabs work; Generate link reachable from hub — 9bd6c49

### Phase 5: Generate and drafts list polish

#### Automated

- [x] 5.1 `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass — 3fd9bd5

#### Manual

- [x] 5.2 Workflow feels guided; success banner after generate — 3fd9bd5

### Phase 6: Draft edit and landing rebrand

#### Automated

- [x] 6.1 `npm run lint`, `npm run typecheck`, `npm run test:e2e` pass

#### Manual

- [x] 6.2 Landing shows PatchPost brand; draft edit polished
