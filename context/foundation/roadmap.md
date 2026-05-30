---
project: PatchPost
version: 1
status: draft
created: 2026-05-27
updated: 2026-05-30
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: PatchPost

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

PatchPost skraca drogę od technicznych zmian do komunikatu dla gracza tuż przed publikacją update'u. Wyróżnikiem — cechą, która odróżnia produkt od zwykłego generatora tekstu — jest klasyfikacja zmian i ocena ich widoczności dla gracza przed generowaniem treści.

Dostęp do aplikacji jest invite-only: logowanie tak, publiczna rejestracja nie; allowlist utrzymywana ręcznie poza UI.

## North star

**S-03: Manual input → generacja → zapis do historii** — najmniejszy end-to-end przepływ potwierdzający Primary Success Criteria (login → projekt → manual → generacja → zapis → historia); przy celu speed idzie jak najwcześniej po odblokowaniu bramki dostępu i fundamentów danych/API.

> „North star” tutaj oznacza pierwszą pionową funkcję, która samodzielnie udowadnia hipotezę produktu — umieszczoną jak najwcześniej, jak pozwalają zależności, bo reszta ma sens dopiero gdy ten flow działa.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | generation-workflow-api-backbone | (foundation) backend/API ma spójny przepływ dla wejścia zmian, klasyfikacji i generacji | — | FR-003, FR-004, Business Logic | ready |
| F-02 | project-and-draft-data-foundation | (foundation) warstwa danych wspiera projekty, źródła zmian i trwały zapis draftów | — | FR-002, FR-005 | implementing |
| F-03 | local-supabase-dev-scripts | (foundation) dev ma jawne komendy local vs cloud Supabase (Docker vs hosted) | — | — | proposed |
| S-01 | invite-only-signin-gated-access | user on allowlist can sign in and reach gated workspace; non-allowlisted emails are rejected; public registration is unavailable | — | FR-001, Access Control | done |
| S-02 | projects-crud-core | user can create and manage own projects | S-01, F-02 | FR-002 | proposed |
| S-03 | manual-to-generated-history-flow | user can add manual changes, generate content, and save result in history | S-02, F-01, F-02 | US-01, FR-003, FR-004, FR-005 | proposed |
| S-04 | draft-history-editing | user can open saved drafts and edit them in history | S-03 | FR-006 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Invite-only access & value path | `S-01` → `F-02` → `S-02` → `S-03` → `S-04` | Główny szlak pod cel speed; S-01 naprawia rozjazd z Access Control w PRD. |
| B | Generation runtime contract | `F-01` | Dołącza do Stream A przy `S-03`; może iść równolegle z `F-02` i `S-01`. |
| C | Local dev workflow | `F-03` | Skrypty Supabase + profile env; równolegle po pierwszej migracji (F-02 p1); nie blokuje S-02/S-03. |

## Baseline

What's already in place in the codebase as of `2026-05-27` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 6 + React 19 + Tailwind 4; routing plikowy w `src/pages/`; strony auth w `src/pages/auth/`.
- **Backend / API:** partial — SSR i endpointy auth (`src/pages/api/auth/`); brak API domenowego (projekty, generacja, drafty).
- **Data:** partial — klient Supabase + migracja `projects` (F-02 p1); pełny schemat domenowy w toku.
- **Auth:** present — invite-only via Supabase Auth dashboard; middleware catch-all (S-01 done).
- **Deploy / infra:** present — Cloudflare SSR (`astro.config.mjs`, `wrangler.jsonc`); CI/deploy w `.github/workflows/`.
- **Observability:** partial — `observability.enabled` w Wrangler; brak aplikacyjnego logowania/monitoringu w `src/`.

## Foundations

### F-01: Generation workflow API backbone

- **Outcome:** (foundation) backend/API ma spójny kontrakt obsługi manualnego wejścia, klasyfikacji i generacji treści.
- **Change ID:** generation-workflow-api-backbone
- **PRD refs:** FR-003, FR-004, Business Logic
- **Unlocks:** S-03; verification path: pełny przepływ US-01 bez ręcznego łączenia kroków
- **Prerequisites:** —
- **Parallel with:** F-02, S-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez tego fundamentu przepływ generacji będzie składany ad hoc i opóźni north star mimo celu speed.
- **Status:** ready

### F-02: Project and draft data foundation

- **Outcome:** (foundation) warstwa danych wspiera cykl życia projektu, wejścia zmian i trwały zapis draftów.
- **Change ID:** project-and-draft-data-foundation
- **PRD refs:** FR-002, FR-005
- **Unlocks:** S-02, S-03, S-04
- **Prerequisites:** —
- **Parallel with:** F-01, S-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez trwałego zapisu projektów i draftów north star nie potwierdzi wartości end-to-end.
- **Status:** implementing

### F-03: Local Supabase dev scripts

- **Outcome:** (foundation) developer ma jednoznaczne komendy: Supabase lifecycle (`start` / `stop` / `reset` / `push`) oraz dev przeciw lokalnemu Dockerowi vs hosted (`dev:local` / `dev:cloud` lub równoważne profile `.env.local` / `.env.cloud` + README).
- **Change ID:** local-supabase-dev-scripts
- **PRD refs:** —
- **Unlocks:** szybsze testy migracji/RLS bez ręcznego przełączania URL; mniej pomyłek local vs cloud przy `main_goal: speed`.
- **Prerequisites:** co najmniej jedna migracja w repo (F-02 p1+); sensowne po pierwszym `db push` workflow.
- **Parallel with:** F-01, F-02 (fazy 2–3), S-02
- **Blockers:** —
- **Unknowns:** czy wystarczą skrypty npm bez `dotenv-cli`, czy dodać zależność pod `dev:local` / `dev:cloud`.
- **Risk:** Bez tego dev nadal działa, ale kosztem czasu na ręczne env i mylenie Docker vs hosted (osobne auth users, osobne dane).
- **Status:** proposed

## Slices

### S-01: Invite-only signin and gated access

- **Outcome:** user on allowlist can sign in and reach gated workspace; non-allowlisted emails are rejected; public registration is unavailable.
- **Change ID:** invite-only-signin-gated-access
- **PRD refs:** FR-001, Access Control
- **Prerequisites:** —
- **Parallel with:** F-01, F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Kod nadal ma publiczny signup; bez tego slice reszta ścieżki buduje się na modelu sprzecznym z PRD.
- **Status:** done

### S-02: Projects CRUD core

- **Outcome:** user can create and manage own projects.
- **Change ID:** projects-crud-core
- **PRD refs:** FR-002
- **Prerequisites:** S-01, F-02
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez spójnego CRUD projektu nie ma kontekstu do manual input ani historii generacji.
- **Status:** proposed

### S-03: Manual to generated history flow

- **Outcome:** user can add manual changes, generate content, and save result in history.
- **Change ID:** manual-to-generated-history-flow
- **PRD refs:** US-01, FR-003, FR-004, FR-005, Business Logic
- **Prerequisites:** S-02, F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To slice walidacyjny produktu; każda luka w jednym kroku osłabia dowód wartości.
- **Status:** proposed

### S-04: Draft history editing

- **Outcome:** user can open saved drafts and edit them in history.
- **Change ID:** draft-history-editing
- **PRD refs:** FR-006
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Nice-to-have poza MVP; zbyt wczesne priorytetyzowanie opóźni north star przy blokerze time.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | generation-workflow-api-backbone | Define generation workflow API contract | yes | Równolegle z S-01/F-02; wymagane przed S-03 |
| F-02 | project-and-draft-data-foundation | Establish project and draft data lifecycle | yes | W toku (p1 done); przed S-02/S-03 |
| F-03 | local-supabase-dev-scripts | Add npm scripts and env profiles for local vs cloud Supabase | yes | Po F-02 p1; równolegle z resztą F-02; `/10x-plan local-supabase-dev-scripts` |
| S-01 | invite-only-signin-gated-access | Enforce invite-only signin and remove public signup | yes | Done — archived |
| S-02 | projects-crud-core | Deliver core project CRUD for owner | no | Czeka na S-01 i F-02 |
| S-03 | manual-to-generated-history-flow | Deliver manual-to-generated end-to-end flow | no | North star; czeka na S-02, F-01, F-02 |
| S-04 | draft-history-editing | Add draft history editing experience | no | Nice-to-have po S-03 |

## Open Roadmap Questions

1. **Brak otwartych pytań roadmapowych.** — Owner: user. Block: roadmap-wide.

## Parked

- **Automatyczna publikacja na platformach social media** — Why parked: PRD `## Non-Goals`; poza ścieżką must-have przy celu speed.
- **Publiczna rejestracja kont** — Why parked: PRD `## Non-Goals` + `## Access Control` (invite-only); S-01 usuwa ją z produktu.
- **Edycja draftów w historii (FR-006)** — Why parked: nice-to-have w PRD; sekwencjonowane jako S-04 dopiero po north star, pierwsze do odcięcia przy presji time.

## Done

- **S-01: user on allowlist can sign in and reach gated workspace; non-allowlisted emails are rejected; public registration is unavailable.** — Archived 2026-05-30 → `context/archive/2026-05-27-invite-only-signin-gated-access/`. Lesson: —.
