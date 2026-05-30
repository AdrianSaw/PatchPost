---
project: "PatchPost"
context_type: greenfield
created: 2026-05-27
updated: 2026-05-27
checkpoint:
  current_phase: 3
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: access model
      decision: invite-only login with manual email allowlist; no public signup; flat project-owner roles in-app
  frs_drafted: 6
  quality_check_status: accepted
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: null
  after_hours_only: true
---

# Seed

Źródło wejścia: `README_PatchPost_plan.md`

## Vision & Problem Statement

PatchPost wspiera twórcę gry w momencie przygotowania komunikacji o update po serii commitów. Zamiast ręcznie tłumaczyć techniczne zmiany na język gracza, użytkownik wybiera zmiany i generuje dopasowaną treść na wybrany kanał.

Najważniejszy koszt bez narzędzia to strata czasu na ręczne opracowanie komunikatu. Wyróżnikiem produktu jest klasyfikacja zmian i ocena ich widoczności dla gracza przed generowaniem treści.

## User & Persona

Primary persona: solo game developer lub mały zespół indie, który samodzielnie przygotowuje komunikację update'ów i changelogów.

Moment użycia: tuż przed publikacją update/changeloga po serii commitów.

## Access Control

Użytkownik loguje się przez konto (email + hasło) w modelu invite-only.

Publiczna rejestracja jest wyłączona. Dostęp mają wyłącznie adresy email wcześniej dopuszczone przez właściciela produktu (allowlist).

Na MVP allowlist jest utrzymywana ręcznie poza UI aplikacji (decyzja operacyjna właściciela produktu), bez roli admin w interfejsie.

Model uprawnień in-app pozostaje płaski: owner projektu bez dodatkowych ról zespołowych.

## Success Criteria

### Primary

- Użytkownik przechodzi flow: login -> projekt -> manual changes -> generacja -> zapis -> historia.

### Secondary

- Klasyfikacja zmian i ocena visibility są użyteczne jakościowo przy generowaniu treści.

### Guardrails

- Generator nie halucynuje: używa wyłącznie dostarczonych zmian wejściowych.

## Functional Requirements

- FR-001: Użytkownik może zalogować się do aplikacji. Priority: must-have
  > Socrates: Kontrargument rozważony: "Za ciężkie na MVP, można zacząć bez auth."
  > Resolution: Odrzucony; dostęp do projektów i danych wymaga minimalnej kontroli.
- FR-002: Użytkownik może tworzyć, przeglądać, edytować i usuwać własne projekty. Priority: must-have
  > Socrates: Kontrargument rozważony: "Pełny CRUD jest za szeroki; wystarczy create/list/view."
  > Resolution: Odrzucony; dla użyteczności MVP potrzebna jest pełna kontrola nad projektem.
- FR-003: Użytkownik może dodać manualny input zmian w projekcie. Priority: must-have
  > Socrates: Kontrargument rozważony: "Lepiej zacząć od GitHub importu."
  > Resolution: Odrzucony; manual input zostaje bezpiecznym fundamentem core flow.
- FR-004: Użytkownik może wygenerować treść na podstawie manualnego inputu. Priority: must-have
  > Socrates: Kontrargument rozważony: "Najpierw szablony ręczne albo obowiązkowa klasyfikacja."
  > Resolution: Odrzucony; generacja to rdzeń wartości MVP.
- FR-005: Użytkownik może zapisać wygenerowany draft do historii projektu. Priority: must-have
  > Socrates: Kontrargument rozważony: "Historia nie musi być MVP, wystarczy jednorazowy output."
  > Resolution: Częściowo odrzucony; zapis draftu zostaje w MVP, bo zamyka flow wartości.
- FR-006: Użytkownik może edytować i przeglądać zapisane drafty w historii projektu. Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "Edycja może być po MVP."
  > Resolution: Przyjęty; edycja przesunięta poza MVP jako nice-to-have.

## User Stories

### US-01: Manual input do gotowego draftu w historii

- **Given** zalogowany użytkownik ma utworzony projekt
- **When** dodaje manualny input zmian i uruchamia generowanie treści
- **Then** otrzymuje draft, może go zapisać i widzi go na liście historii projektu

#### Acceptance Criteria

- Użytkownik może zapisać wygenerowany draft bez opuszczania flow generacji.
- Zapisany draft jest widoczny na liście historii projektu.
- Użytkownik może otworzyć zapisany draft i edytować jego treść.

## Business Logic

Aplikacja najpierw klasyfikuje zmianę i ocenia jej widoczność dla gracza, a dopiero potem generuje treść dopasowaną do wybranego kanału komunikacji.

Wejściem reguły są zmiany dostarczone przez użytkownika w projekcie. Wynikiem jest treść komunikacyjna, która odpowiada kanałowi publikacji i nie opiera się na domysłach poza dostarczonym materiałem.

## Non-Functional Requirements

- Treść generowana przez aplikację musi bazować wyłącznie na dostarczonych zmianach wejściowych.

## Non-Goals

- Brak automatycznej publikacji na platformach social media.
- Brak publicznej rejestracji kont.

## Quality cross-check

- Access Control: present.
- Business Logic: present.
- Project artifacts: present.
- Timeline-cost acknowledgment: present.
- Non-Goals: present.
- Preserved behavior: n/a (greenfield).

