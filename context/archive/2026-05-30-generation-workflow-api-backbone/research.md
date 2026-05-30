---
date: 2026-05-30T00:00:00+02:00
researcher: Auto
git_commit: 0b537173c6202671cd6ec21e26e61b51fa8ec14c
branch: master
repository: PatchPost
topic: "Verify Gemini API free tier for PatchPost classify + generate workflow (F-01)"
tags: [research, generation-workflow-api-backbone, gemini, ai-provider, f-01]
status: complete
last_updated: 2026-05-30
last_updated_by: Auto
---

# Research: Gemini free tier for PatchPost generation (F-01)

**Date**: 2026-05-30  
**Researcher**: Auto  
**Git Commit**: `0b537173c6202671cd6ec21e26e61b51fa8ec14c`  
**Branch**: `master`  
**Repository**: PatchPost

## Research Question

Czy **Gemini API (free tier)** nadaje się do PatchPost na etapie testów F-01 — klasyfikacja JSON + generacja changeloga/social z manual input — i czy limity free tier wystarczą na development?

## Summary

**Tak — Gemini free tier jest sensownym wyborem na dev/testy F-01 i wczesne S-03**, pod warunkiem że:

1. Używasz **`gemini-2.5-flash-lite`** (najniższy koszt, największy headroom na free tier).
2. W F-01 budujesz **`ProviderAdapter`** z **mock providerem** (README Milestone 5) obok Gemini — testy i CI nie zależą od API.
3. Akceptujesz **free-tier privacy trade-off** (Google może używać promptów do ulepszania produktów) — nie wklejaj tajnych buildów; na produkcję rozważ paid tier.
4. Klasyfikację JSON walidujesz Zod + retry — structured output Gemini wspiera, ale nie jest tak „twardy” jak OpenAI `json_schema strict`.

**Limity free tier na testy manualne: wi więcej niż wystarczające.** PatchPost robi **2 wywołania API na jedną generację** (classify → generate). Przy typowym dev/testing (~20–100 generacji/dzień) jesteś daleko poniżej dziennych limitów modeli Flash-Lite. RPM (ok. 15/min na Flash-Lite) też nie blokuje ręcznego klikania w UI.

**Rekomendacja dla planu F-01:** default dev provider = **Gemini 2.5 Flash-Lite (free)**; fallback paid = ten sam model z billingiem lub OpenAI `gpt-4o-mini` gdy JSON/copy jakość nie przejdzie smoke testów.

## Detailed Findings

### PatchPost workload (what F-01 must call)

Z PRD i prompt spec ([README §14](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/README_PatchPost_plan.md)) każda generacja to **dwa kroki**:

| Step | Cel | Format wyjścia | Szac. tokeny (typowy manual input) |
|------|-----|----------------|--------------------------------------|
| 1. Classify | `classification`, `visibility`, `reason`, `suggested_public_summary` | JSON | ~1.5k in / ~600 out |
| 2. Generate | changelog / social / Discord / Steam | plain text (Title/Body lub Caption) | ~2k in / ~500 out |

**Na 1 pełny flow:** ~2 requesty, ~3.5k input + ~1.1k output tokenów.

Business logic ([prd.md](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/context/foundation/prd.md)): klasyfikacja **przed** generacją; guardrail „nie halucynuj” — prompt rules już w README.

### Gemini free tier — co dostajesz

Źródło: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

| Aspekt | Free tier | Implikacja dla PatchPost |
|--------|-----------|---------------------------|
| Koszt tokenów | **Free of charge** (input + output) na Gemini 2.5 Flash-Lite | $0 na dev |
| Karta kredytowa | Nie wymagana na start | Szybki start F-01 |
| Limity | RPM / TPM / RPD **per GCP project** (nie per API key) | Wystarczy na solo dev; współdzielony projekt = wspólny limit |
| Structured output | Wspierane (JSON mode / response schema) | OK dla classify step z walidacją Zod |
| Prywatność | **„Used to improve our products: Yes”** na free | Unreleased game content — ryzyko; paid tier = No |
| Stabilność limitów | Google zmieniał free quotas (np. grudzień 2025) | Retry na 429; nie zakładaj stałych liczb w kodzie |

**Gemini 2.5 Flash-Lite (Standard, free tier):** input/output **free of charge**; paid dopiero po włączeniu billing ([pricing table](https://ai.google.dev/gemini-api/docs/pricing)).

Dokładne RPM/RPD **weryfikuj w AI Studio** (oficjalna strona rate limits nie publikuje tabeli per model — tylko odsyła do Studio). Orientacyjnie (third-party + community, maj 2026): Flash-Lite free ~**15 RPM**, ~**1000–1500 RPD**, ~**250k TPM** — warto potwierdzić na koncie.

### Czy limity wystarczą na testy?

| Scenariusz | API calls/dzień | vs free tier (Flash-Lite ~1000 RPD) |
|------------|-----------------|-------------------------------------|
| Lekki dev (10 generacji) | 20 | ~2% RPD |
| Aktywny dzień (50 generacji) | 100 | ~10% RPD |
| Stress manual (200 generacji) | 400 | ~40% RPD |
| Hammer test (7 gen/min × 2 calls) | 14 RPM peak | poniżej ~15 RPM |

**Wniosek:** na invite-only MVP z jednym/two developerami **limity free tier nie są blokerem testów**.

Jedyny realny limit operacyjny: **429 przy burst** (np. szybkie klikanie „Regenerate”). F-01 powinien mieć exponential backoff + czytelny komunikat w UI.

### Jakość pod PatchPost (nie tylko cena)

| Wymaganie | Gemini Flash-Lite free | Ocena |
|-----------|------------------------|-------|
| Klasyfikacja JSON | Structured outputs + Zod parse | **Dobra na MVP**; planuj 1 retry przy invalid JSON |
| Copy graczowski (PL/EN) | Flash-Lite OK na krótkie changelogi | **Wystarczająca na testy**; jakość copy weryfikuj ręcznie |
| 4 kanały (changelog/social/Discord/Steam) | Ten sam model, różne prompty | OK |
| Cloudflare Workers SSR | HTTPS `fetch` do `generativelanguage.googleapis.com` | OK; secret `GEMINI_API_KEY` via wrangler |
| E2E bez zewnętrznego API | Brak — potrzebny **mock provider** | README już sugeruje mock AI |

### Stan codebase (gotowość integracji)

**Istnieje (F-02):** tabele + serwisy + typy — bez wywołań LLM.

- [`src/lib/services/generation-runs.ts`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/src/lib/services/generation-runs.ts) — CRUD runów, FK checks
- [`src/lib/services/generated-outputs.ts`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/src/lib/services/generated-outputs.ts) — zapis draftów
- [`src/types.ts`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/src/types.ts) — `output_type`, `tone`, `prompt_snapshot`
- [`src/pages/api/dev/f02-service-smoke.ts`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/src/pages/api/dev/f02-service-smoke.ts) — smoke bez AI

**Brakuje (F-01):**

- `src/lib/ai/` — provider adapter (Gemini + mock)
- `GEMINI_API_KEY` w [`astro.config.mjs`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/astro.config.mjs) env schema (obecnie tylko Supabase)
- API route classify/generate + prompt rendering z README §13–14

## Code References

- `context/foundation/prd.md:85-88` — classify before generate
- `context/foundation/roadmap.md:66-77` — F-01 scope (API contract classify + generate)
- `README_PatchPost_plan.md:596-683` — prompt spec (classify JSON + generate templates)
- `README_PatchPost_plan.md:966-974` — Milestone 5: mock AI first, then real generator
- `src/lib/services/generation-runs.ts` — persistence layer ready
- `astro.config.mjs:17-21` — secrets schema (needs GEMINI_API_KEY)

## Architecture Insights

1. **Provider abstraction first** — `interface GenerationProvider { classify(); generate(); }` z implementacjami `GeminiProvider` i `MockProvider`.
2. **Dwa endpointy lub jeden orchestrator** — `POST /api/projects/[id]/classify` + `POST /api/projects/[id]/generate` albo jeden `POST .../generation-runs` z krokami; oba kroki = 2 Gemini calls.
3. **Secrets** — `GEMINI_API_KEY` server-only (`astro:env/server` + `wrangler secret put`), analogicznie do `SUPABASE_*`.
4. **Free tier ≠ production** — plan powinien przewidzieć przełączenie na paid Gemini (privacy) lub OpenAI mini (JSON strict) bez zmiany kontraktu API.

## Historical Context (from prior changes)

- [`context/archive/2026-05-30-project-and-draft-data-foundation/plan.md`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/context/archive/2026-05-30-project-and-draft-data-foundation/plan.md) — F-02 zapisuje metadata; **F-01 definiuje semantykę API i LLM**.
- [`context/archive/2026-05-30-projects-crud-core/plan.md`](https://github.com/AdrianSaw/PatchPost/blob/0b537173c6202671cd6ec21e26e61b51fa8ec14c/context/archive/2026-05-30-projects-crud-core/plan.md) — generation pipeline explicitly out of scope for S-02.
- Brak wcześniejszej decyzji o providerze w `context/changes/**` ani `context/archive/**` — **ten research jest pierwszą formalną rekomendacją**.

## Related Research

- (none yet)

## Open Questions

1. **Potwierdź RPM/RPD** na swoim koncie w [Google AI Studio → Rate limits](https://aistudio.google.com/) — liczby mogą się różnić per region.
2. **Smoke test JSON** — jeden skrypt/manual call z przykładowym manual input z README; jeśli parse fail rate > ~5%, rozważ OpenAI mini tylko na classify step.
3. **Język outputu** — czy generacja domyślnie PL, EN, czy `default_tone`/locale z projektu? (wpływa na prompt, nie na limit Gemini)

## Recommendation for `/10x-plan`

| Decyzja | Wybór |
|---------|--------|
| Dev/test provider | **Gemini 2.5 Flash-Lite (free tier)** |
| Test/CI provider | **MockProvider** (stałe JSON + sample copy) |
| Production fallback | Paid Gemini **lub** OpenAI `gpt-4o-mini` (adapter) |
| Secret | `GEMINI_API_KEY` w env schema + wrangler |
| Rate limit handling | Retry 429, surface user-friendly error |

**Next step:** `/10x-plan generation-workflow-api-backbone`
