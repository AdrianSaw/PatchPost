# PatchPost — plan projektu zaliczeniowego

## 1. Opis projektu

**PatchPost** to aplikacja webowa dla twórców gier, która pomaga zamieniać techniczne zmiany z projektu na czytelne komunikaty dla graczy i społeczności.

Aplikacja pozwala użytkownikowi utworzyć projekt gry, dodać źródło zmian ręcznie albo zaimportować ostatnie commity z repozytorium GitHub, a następnie wygenerować na ich podstawie:

- changelog,
- post na Instagram / social media,
- Discord update,
- Steam news,
- krótkie podsumowanie devlogowe.

Wygenerowane treści są zapisywane w historii projektu, dzięki czemu zespół może do nich wracać, edytować je i wykorzystywać przy komunikacji marketingowej.

---

## 2. Główne zdanie produktowe

> PatchPost analizuje zmiany w projekcie gry, klasyfikuje je według typu i widoczności dla gracza, a następnie generuje dopasowaną treść komunikacyjną dla wybranego kanału.

---

## 3. Problem

Twórcy gier często wykonują dużo technicznych zmian w repozytorium, ale później trudno im szybko przygotować z tego zrozumiały changelog, post social media albo devlog.

Typowe problemy:

- commity są techniczne i niezrozumiałe dla graczy,
- część zmian nie nadaje się do komunikacji marketingowej,
- trzeba ręcznie przepisywać zmiany na język gracza,
- historia przygotowanych komunikatów ginie w notatkach lub czatach,
- małe zespoły indie nie mają osobnej osoby od community/marketingu.

PatchPost ma rozwiązywać ten problem przez połączenie importu zmian, klasyfikacji i generowania treści.

---

## 4. Użytkownicy

Docelowi użytkownicy MVP:

- solo game developer,
- mały zespół indie,
- osoba prowadząca community gry,
- osoba przygotowująca changelogi i posty social media.

---

## 5. Stack technologiczny

| Warstwa | Technologia | Rola |
|---|---|---|
| Meta-framework | Astro 6 | Routing, layouty, strony, endpointy API |
| UI | React 19 | Interaktywne komponenty, formularze, dashboard |
| Typy | TypeScript | Jawne kontrakty i bezpieczeństwo typów |
| Style | Tailwind CSS 4 | Szybkie stylowanie UI |
| Backend / Baza | Supabase | PostgreSQL, Auth, RLS, historia danych |
| Deployment | Cloudflare Pages / Workers | Hosting i deployment |
| Testy | Playwright + Vitest | E2E i testy jednostkowe |
| CI/CD | GitHub Actions | Build, testy, typecheck |
| Walidacja | Zod albo Valibot | Walidacja formularzy i endpointów |
| Integracja | GitHub API | Pobieranie commitów |

---

## 6. Wymagania zaliczeniowe i sposób ich spełnienia

| Wymaganie | Jak projekt je spełnia |
|---|---|
| Kontrola dostępu | Supabase Auth, projekty przypisane do użytkownika, opcjonalne role w projekcie |
| CRUD / zarządzanie danymi | Projekty, źródła zmian, commity, generacje i zapisane drafty |
| Logika biznesowa | Klasyfikacja zmian, ocena widoczności dla gracza, generowanie treści dla kanału |
| Artefakty projektowe | PRD, user stories, model danych, AI context, prompt spec, plan implementacji |
| Test użytkownika | Playwright E2E: login → projekt → zmiany → generacja → historia |
| CI/CD | GitHub Actions: install, typecheck, test, build, opcjonalnie deploy |

---

## 7. Zakres MVP

### Must have

- Logowanie użytkownika.
- Tworzenie, odczyt, edycja i usuwanie projektów.
- Ręczne dodanie listy zmian.
- Dodanie linku do repozytorium GitHub.
- Import ostatnich commitów z repozytorium.
- Wybór commitów / zmian do generowania.
- Wybór typu treści:
  - changelog,
  - Instagram / social media post,
  - Discord update,
  - Steam news.
- Generowanie draftu.
- Edycja wygenerowanego draftu.
- Zapis draftu w historii projektu.
- Lista historii wygenerowanych treści.
- Jeden test E2E kluczowego przepływu.
- CI/CD uruchamiające build i testy.

### Should have

- Klasyfikacja zmian:
  - bugfix,
  - gameplay,
  - balance,
  - UI/UX,
  - art/audio,
  - content,
  - technical,
  - unknown.
- Ocena widoczności dla gracza:
  - player-facing,
  - internal,
  - unclear.
- Filtrowanie zmian technicznych przy treściach marketingowych.
- Wybór tonu komunikacji.

### Could have

- Limited diff summary dla małego zakresu commitów.
- Eksport do Markdown.
- Prosty system członków projektu.
- Role:
  - owner,
  - editor,
  - viewer.
- Zapis prompt snapshot dla każdej generacji.
- Oznaczanie draftów jako accepted / archived.

### Won't have in MVP

- Automatyczne publikowanie na Instagramie.
- Integracja z API Steam / Discord / X.
- Harmonogram publikacji.
- Pełna analiza dużych diffów.
- Płatności.
- Rozbudowane organizacje / workspace.
- Obsługa wielu providerów AI jako główny cel.
- Zaawansowany system zaproszeń mailowych.

---

## 8. Główny przepływ użytkownika

```text
Użytkownik loguje się
↓
Tworzy projekt gry
↓
Dodaje link do repozytorium albo wkleja zmiany ręcznie
↓
Importuje ostatnie commity albo zapisuje manual input
↓
Wybiera zmiany do przetworzenia
↓
Wybiera typ treści
↓
Aplikacja klasyfikuje zmiany
↓
Aplikacja generuje draft
↓
Użytkownik edytuje draft
↓
Użytkownik zapisuje draft
↓
Draft jest widoczny w historii projektu
```

---

## 9. Ekrany aplikacji

### Publiczne

```text
/
```

Landing page albo przekierowanie do logowania.

```text
/auth/login
```

Logowanie użytkownika.

---

### Aplikacja po zalogowaniu

```text
/app/projects
```

Lista projektów użytkownika.

```text
/app/projects/new
```

Tworzenie nowego projektu.

```text
/app/projects/[id]
```

Dashboard projektu.

```text
/app/projects/[id]/sources
```

Źródła zmian: manual input, GitHub commits.

```text
/app/projects/[id]/generate
```

Generator treści.

```text
/app/projects/[id]/drafts
```

Historia wygenerowanych treści.

```text
/app/projects/[id]/drafts/[draftId]
```

Szczegóły i edycja draftu.

---

## 10. Model danych

### `profiles`

Dodatkowe dane użytkownika.

```text
id uuid primary key references auth.users(id)
display_name text
created_at timestamp
```

---

### `projects`

Projekt gry.

```text
id uuid primary key
owner_id uuid references auth.users(id)
name text not null
description text
repo_url text
default_tone text
created_at timestamp
updated_at timestamp
```

Przykładowe wartości `default_tone`:

```text
professional
friendly
hype
indie_devlog
technical
```

---

### `project_members`

Opcjonalna tabela do współpracy zespołowej.

```text
id uuid primary key
project_id uuid references projects(id)
user_id uuid references auth.users(id)
role text
created_at timestamp
```

Role:

```text
owner
editor
viewer
```

Na MVP można zacząć wyłącznie od `owner_id` w tabeli `projects`.

---

### `change_inputs`

Źródła zmian.

```text
id uuid primary key
project_id uuid references projects(id)
source_type text not null
title text
raw_content text
repo_url text
branch text
commit_from text
commit_to text
created_by uuid references auth.users(id)
created_at timestamp
```

Typy źródeł:

```text
manual
github_commits
github_diff_limited
```

---

### `commits`

Zaimportowane commity.

```text
id uuid primary key
project_id uuid references projects(id)
change_input_id uuid references change_inputs(id)
sha text
message text
author_name text
author_email text
commit_date timestamp
url text
is_selected boolean
classification text
visibility text
created_at timestamp
```

Przykładowe wartości `classification`:

```text
bugfix
gameplay
balance
ui_ux
art_audio
technical
content
unknown
```

Przykładowe wartości `visibility`:

```text
player_facing
internal
unclear
```

---

### `generation_runs`

Jedno uruchomienie generatora.

```text
id uuid primary key
project_id uuid references projects(id)
change_input_id uuid references change_inputs(id)
created_by uuid references auth.users(id)
output_type text
tone text
status text
prompt_snapshot text
created_at timestamp
```

Typy wyjścia:

```text
changelog
instagram_post
discord_update
steam_news
devlog_summary
```

Statusy:

```text
draft
accepted
archived
failed
```

---

### `generated_outputs`

Wyniki generacji.

```text
id uuid primary key
generation_run_id uuid references generation_runs(id)
project_id uuid references projects(id)
title text
content text
edited_content text
status text
created_at timestamp
updated_at timestamp
```

---

## 11. Kontrola dostępu

### Minimalne MVP

Każdy projekt należy do właściciela:

```text
projects.owner_id = auth.uid()
```

Użytkownik może odczytywać i modyfikować tylko swoje projekty oraz powiązane z nimi dane.

### Rozszerzenie zespołowe

Docelowo dostęp może być oparty o `project_members`.

Uprawnienia:

```text
owner:
- edycja projektu
- usuwanie projektu
- generowanie treści
- edycja draftów
- zarządzanie członkami

editor:
- generowanie treści
- edycja draftów

viewer:
- odczyt historii
```

---

## 12. Logika biznesowa

Główna logika aplikacji:

```text
Aplikacja bierze listę zmian technicznych, klasyfikuje je według typu i widoczności dla gracza, a następnie generuje dopasowaną treść dla wybranego kanału komunikacji.
```

Pipeline:

```text
1. Pobierz źródło zmian:
   - manual input
   - GitHub commits

2. Przetwórz zmiany do wspólnego formatu.

3. Sklasyfikuj zmiany:
   - bugfix
   - gameplay
   - balance
   - UI/UX
   - art/audio
   - content
   - technical
   - unknown

4. Oceń widoczność:
   - player_facing
   - internal
   - unclear

5. Odfiltruj zmiany niepasujące do kanału.

6. Wygeneruj treść:
   - changelog
   - Instagram post
   - Discord update
   - Steam news

7. Zapisz wynik w historii.
```

Przykład decyzji:

```text
Commit:
fix shop item action menu fallback

Classification:
UI/UX + bugfix

Visibility:
player_facing

Use in changelog:
yes

Use in Instagram post:
probably no
```

Drugi przykład:

```text
Commit:
add smoke test for weapon upgrade

Classification:
technical

Visibility:
internal

Use in changelog:
no, unless technical changelog

Use in social post:
no
```

---

## 13. AI context

Aplikacja powinna przekazywać AI jasny kontekst:

```text
You are a game development communication assistant.
Your task is to transform technical project changes into clear player-facing communication.
Do not invent features.
Use only provided changes.
If a change is vague, mark it as unclear.
Avoid overpromising.
Do not mention release dates unless provided.
```

Typy treści:

### Changelog

- konkretny,
- uporządkowany kategoriami,
- bez przesadnego marketingu,
- zrozumiały dla gracza.

### Instagram / social media post

- krótki,
- z mocnym początkiem,
- bardziej emocjonalny,
- skupiony na widocznych zmianach,
- z opcjonalnymi hashtagami.

### Discord update

- bezpośredni,
- społecznościowy,
- ton „dev mówi do graczy”,
- może być luźniejszy.

### Steam news

- bardziej profesjonalny,
- dłuższy,
- uporządkowany,
- nadający się jako oficjalny update.

---

## 14. Prompt spec

### Prompt klasyfikacji

```text
System:
You are a game development communication assistant.
Your task is to classify technical project changes into player-facing communication categories.

Rules:
- Do not invent features.
- If a commit is vague, mark it as unclear.
- Distinguish internal technical work from player-facing changes.
- Use only the provided input.

Input:
Project name: {{projectName}}
Project description: {{projectDescription}}

Changes:
{{changes}}

Return JSON:
{
  "items": [
    {
      "source": "...",
      "classification": "bugfix | gameplay | balance | ui_ux | art_audio | content | technical | unknown",
      "visibility": "player_facing | internal | unclear",
      "reason": "...",
      "suggested_public_summary": "..."
    }
  ]
}
```

---

### Prompt generowania changeloga

```text
System:
You are a game communication assistant creating player-facing changelogs.

Rules:
- Use only provided classified changes.
- Group changes by category.
- Keep it clear and honest.
- Do not invent content.
- Do not mention internal implementation details unless relevant to players.

Input:
Project: {{projectName}}
Tone: {{tone}}
Classified changes:
{{classifiedChanges}}

Output:
Title:
Body:
```

---

### Prompt generowania posta social media

```text
System:
You write short social media posts for indie game development updates.

Rules:
- Use a strong opening line.
- Keep it concise.
- Focus on visible player-facing changes.
- Avoid fake hype.
- Do not invent features.
- Include optional hashtags.

Input:
Project: {{projectName}}
Tone: {{tone}}
Selected changes:
{{classifiedChanges}}

Output:
Caption:
Hashtags:
```

---

## 15. Integracja z GitHubem

### MVP

Na start obsługiwane są publiczne repozytoria GitHub.

Minimalny import:

```text
- URL repozytorium
- branch, domyślnie main
- ostatnie 10 commitów
```

Dane pobierane z commitów:

```text
- SHA
- message
- author
- date
- URL
```

### Parser URL

Aplikacja powinna obsługiwać formaty:

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
```

### Ograniczenia MVP

W MVP nie trzeba obsługiwać:

```text
- prywatnych repozytoriów,
- tokenów GitHub,
- pull requestów,
- pełnej analizy diffów,
- importu wielu branchy,
- porównywania zakresu commitów.
```

### Bonus

Później można dodać:

```text
- GitHub token dla prywatnych repo,
- wybór brancha,
- zakres dat,
- commit_from / commit_to,
- limited diff summary,
- ignorowanie plików binarnych i wygenerowanych.
```

---

## 16. Limited diff summary — przyszłe rozszerzenie

Diff nie powinien być głównym celem MVP, ponieważ może być duży i trudny do analizy.

Jeżeli zostanie dodany, powinien mieć ograniczenia:

```text
- maksymalnie 20 commitów,
- maksymalnie 10 plików na commit,
- ignorowanie assetów binarnych,
- ignorowanie lockfile,
- ignorowanie plików generowanych,
- analiza głównie plików:
  - .gd
  - .ts
  - .json
  - .tres
  - .tscn
  - .md
```

Dla projektu Godot szczególnie warto ignorować:

```text
- .import
- .uid
- pliki png/webp/ogg/wav
- wygenerowane asset metadata
```

---

## 17. Proponowana struktura katalogów

```text
patchpost/
  docs/
    prd.md
    user-stories.md
    screens.md
    database-schema.md
    access-control.md
    business-logic.md
    ai-context.md
    prompt-spec.md
    tech-stack.md

  src/
    pages/
      index.astro
      auth/
        login.astro
      app/
        projects/
          index.astro
          new.astro
          [id]/
            index.astro
            sources.astro
            generate.astro
            drafts.astro
            drafts/
              [draftId].astro

      api/
        projects/
        github/
        generate/

    components/
      auth/
      projects/
      commits/
      generator/
      drafts/
      ui/

    lib/
      supabase/
      github/
      ai/
      validation/
      auth/
      db/

    types/
      database.types.ts
      domain.ts

  supabase/
    migrations/
    seed.sql

  tests/
    e2e/
      main-flow.spec.ts
    unit/

  .github/
    workflows/
      ci.yml

  package.json
  astro.config.mjs
  tsconfig.json
```

---

## 18. Plan implementacji krok po kroku

### Milestone 1 — Bootstrap projektu

Cel: pusta aplikacja działa lokalnie.

Zadania:

```text
1. Utworzyć projekt Astro.
2. Dodać React.
3. Dodać TypeScript.
4. Dodać Tailwind.
5. Dodać podstawowy layout.
6. Dodać routing:
   - /
   - /auth/login
   - /app/projects
7. Dodać `.env.example`.
8. Dodać podstawowy README.
```

Kryterium akceptacji:

```text
Aplikacja startuje lokalnie i ma podstawowy layout.
```

---

### Milestone 2 — Supabase Auth

Cel: użytkownik może się zalogować.

Zadania:

```text
1. Utworzyć projekt Supabase.
2. Skonfigurować Auth.
3. Dodać zmienne środowiskowe.
4. Dodać klienta Supabase.
5. Dodać login page.
6. Dodać logout.
7. Dodać ochronę tras /app.
8. Dodać redirect niezalogowanego użytkownika.
```

Kryterium akceptacji:

```text
Niezalogowany użytkownik nie widzi /app/projects.
Zalogowany użytkownik widzi dashboard.
```

---

### Milestone 3 — CRUD projektów

Cel: użytkownik może tworzyć i widzieć swoje projekty.

Zadania:

```text
1. Dodać tabelę projects.
2. Dodać RLS dla owner_id.
3. Dodać formularz tworzenia projektu.
4. Dodać listę projektów.
5. Dodać stronę szczegółów projektu.
6. Dodać edycję projektu.
7. Dodać usuwanie projektu.
```

Kryterium akceptacji:

```text
Użytkownik może stworzyć projekt "Scrapwars" i wejść w jego dashboard.
```

---

### Milestone 4 — Manual input jako fallback

Cel: generator może działać nawet bez GitHuba.

Zadania:

```text
1. Dodać tabelę change_inputs.
2. Dodać widok "Add manual changes".
3. Dodać pole tekstowe na listę zmian.
4. Zapisać input w bazie.
5. Wyświetlić listę źródeł zmian w projekcie.
```

Kryterium akceptacji:

```text
Użytkownik może wkleić listę zmian i zapisać ją w projekcie.
```

---

### Milestone 5 — Generator bez GitHuba

Cel: core aplikacji działa end-to-end.

Zadania:

```text
1. Dodać mock AI albo prosty generator.
2. Dodać prompt spec w kodzie.
3. Wygenerować changelog z manual input.
4. Zapisać generation_run.
5. Zapisać generated_output.
6. Pokazać wynik w edytorze.
7. Zapisać wynik w historii.
```

Kryterium akceptacji:

```text
Użytkownik może wkleić zmiany, wygenerować changelog i zobaczyć go w historii.
```

---

### Milestone 6 — GitHub commits import

Cel: użytkownik może podać repo i pobrać commity.

Zadania:

```text
1. Dodać parser GitHub URL.
2. Dodać endpoint API do pobierania commitów.
3. Pobrać ostatnie 10 commitów z branch main.
4. Zapisać import jako change_input.
5. Zapisać commity do tabeli commits.
6. Wyświetlić commity na liście.
7. Pozwolić zaznaczać commity do generowania.
```

Kryterium akceptacji:

```text
Użytkownik wpisuje repo URL i widzi listę ostatnich commitów.
```

---

### Milestone 7 — Klasyfikacja zmian

Cel: aplikacja podejmuje decyzje domenowe.

Zadania:

```text
1. Dodać klasyfikację regułową albo AI.
2. Przypisać classification do zmian.
3. Przypisać visibility do zmian.
4. Dodać filtrowanie internal/player-facing.
5. Pokazać klasyfikację w UI.
```

Przykładowe reguły startowe:

```text
message contains "fix" => bugfix
message contains "balance" => balance
message contains "ui" => ui_ux
message contains "weapon" => gameplay
message contains "test" => technical
message contains "refactor" => technical
```

Kryterium akceptacji:

```text
Commity dostają classification i visibility.
```

---

### Milestone 8 — Generator treści z commitów

Cel: użytkownik generuje treść z wybranych commitów.

Zadania:

```text
1. Dodać ekran /generate.
2. Umożliwić wybór źródła zmian.
3. Umożliwić zaznaczanie zmian.
4. Umożliwić wybór output_type.
5. Umożliwić wybór tone.
6. Wygenerować treść.
7. Zapisać wynik.
8. Pokazać wynik w edytorze.
```

Kryterium akceptacji:

```text
Użytkownik wybiera commity i dostaje wygenerowany changelog lub post.
```

---

### Milestone 9 — Edycja i historia

Cel: aplikacja jest narzędziem zespołowym, a nie jednorazowym generatorem.

Zadania:

```text
1. Dodać listę draftów.
2. Dodać szczegóły draftu.
3. Dodać edycję edited_content.
4. Dodać status:
   - draft
   - accepted
   - archived
5. Dodać archiwizację albo usuwanie draftu.
```

Kryterium akceptacji:

```text
Zapisane treści są widoczne w historii projektu.
```

---

### Milestone 10 — Minimalny team access

Cel: wzmocnić wymaganie kontroli dostępu.

Wariant prosty:

```text
Każdy projekt należy do jednego użytkownika.
```

Wariant lepszy:

```text
Owner może dodać innego użytkownika jako viewer/editor.
Viewer może oglądać historię.
Editor może generować i edytować drafty.
```

Na MVP wystarczy wariant prosty, ale docelowa struktura może być opisana w dokumentacji.

---

### Milestone 11 — Testy

Cel: spełnić wymaganie testu użytkownika.

Minimalny test E2E:

```text
Given user is logged in
When user creates a project
And adds a manual change input
And generates changelog
Then generated draft is visible in history
```

Plik:

```text
tests/e2e/main-flow.spec.ts
```

Narzędzie:

```text
Playwright
```

W testach warto użyć mocka AI, aby test nie zależał od zewnętrznego modelu.

---

### Milestone 12 — CI/CD

Cel: pipeline buduje aplikację i uruchamia testy.

Plik:

```text
.github/workflows/ci.yml
```

Pipeline:

```text
1. checkout
2. setup node
3. npm ci
4. npm run typecheck
5. npm run lint
6. npm run test
7. npm run build
```

Przykładowe skrypty:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint ."
  }
}
```

Deployment na Cloudflare Pages jako bonus:

```text
Build command:
npm run build

Output directory:
dist
```

---

## 19. Najbezpieczniejsza kolejność pracy

Rekomendowana kolejność:

```text
1. Dokumenty projektowe.
2. Bootstrap Astro.
3. Supabase Auth.
4. CRUD projektów.
5. Manual input.
6. Generator z manual input.
7. Historia draftów.
8. GitHub commits import.
9. Klasyfikacja zmian.
10. Generowanie z commitów.
11. Test E2E.
12. CI/CD.
13. Deployment.
```

Najważniejsza zasada:

```text
Najpierw manual input, potem GitHub.
```

Dzięki temu projekt ma działający core nawet wtedy, gdy integracja z GitHubem okaże się trudniejsza.

---

## 20. Minimalna wersja do oddania

Jeżeli zabraknie czasu, projekt nadal powinien mieć:

```text
Auth:
- login/logout

Projects:
- create/list/view/update/delete project

Data:
- manual change input

Business logic:
- classify changes
- generate changelog/social draft

History:
- save generated output
- edit generated output
- list generated outputs

Test:
- one E2E user flow

CI/CD:
- build + test pipeline

Docs:
- PRD
- user stories
- database schema
- business logic
- AI context
- prompt spec
```

GitHub import jest bardzo wartościowy, ale manual input powinien być fundamentem.

---

## 21. Idealna wersja MVP

Idealny zakres MVP:

```text
- Supabase Auth
- CRUD Projects
- Manual changes
- GitHub recent commits import
- Select commits
- Classify changes
- Generate changelog
- Generate social post
- Save/edit history
- One Playwright E2E test
- GitHub Actions CI
- Cloudflare deployment
```

---

## 22. Ryzyka i sposoby ograniczania

### Ryzyko: GitHub integracja zajmie za dużo czasu

Rozwiązanie:

```text
Najpierw zbudować manual input.
GitHub dodać dopiero po działającym generatorze.
```

---

### Ryzyko: AI będzie wymyślać funkcje

Rozwiązanie:

```text
W promptach wymusić:
- używaj tylko podanego inputu,
- nie wymyślaj funkcji,
- nie obiecuj dat,
- oznacz niejasne zmiany jako unclear.
```

---

### Ryzyko: diff będzie za duży

Rozwiązanie:

```text
W MVP analizować tylko tytuły i opisy commitów.
Limited diff dodać jako bonus.
```

---

### Ryzyko: projekt zrobi się za szeroki

Rozwiązanie:

```text
Nie dodawać w MVP:
- publikowania do social media,
- kalendarza,
- pełnych integracji z platformami,
- płatności,
- rozbudowanych organizacji.
```

---

### Ryzyko: brak testu na koniec

Rozwiązanie:

```text
Test E2E zaplanować wcześniej i oprzeć go o manual input oraz mock AI.
```

---

## 23. Proponowana historia commitów

```text
docs: add PRD and MVP scope
docs: add user stories and screen map
docs: add database schema and business logic
docs: add AI context and prompt spec
chore: initialize Astro project
chore: configure React and Tailwind
feat: add base layout and app routes
feat: configure Supabase client
feat: add authentication flow
feat: protect app routes
feat: add projects CRUD
feat: add manual change inputs
feat: add generation run data model
feat: add mock changelog generator
feat: save generated drafts
feat: add draft history and edit view
feat: import recent GitHub commits
feat: select commits for generation
feat: classify changes
feat: generate content by output type
test: add main user flow e2e test
ci: add GitHub Actions pipeline
docs: add final README summary
```

---

## 24. Definicja ukończenia MVP

Projekt można uznać za ukończony, gdy:

```text
1. Użytkownik może się zalogować.
2. Użytkownik może utworzyć projekt gry.
3. Użytkownik może dodać ręcznie listę zmian.
4. Użytkownik może opcjonalnie zaimportować commity z GitHuba.
5. Użytkownik może wygenerować changelog albo post.
6. Użytkownik może edytować wygenerowany draft.
7. Użytkownik może zobaczyć draft w historii.
8. Aplikacja ma przynajmniej jeden test E2E.
9. Pipeline CI buduje projekt i uruchamia testy.
10. W repozytorium są artefakty projektowe.
```

---

## 25. Future scope

Po MVP można dodać:

```text
- obsługę prywatnych repozytoriów GitHub,
- wybór zakresu commitów,
- analizę pull requestów,
- limited diff summary,
- publikację do Discorda,
- eksport Markdown,
- kalendarz publikacji,
- szablony komunikacji dla różnych gier,
- generowanie promptów do grafik social media,
- integrację ze Steam news,
- organizacje i zespoły,
- komentarze do draftów,
- wersjonowanie draftów.
```

---

## 26. Podsumowanie

PatchPost jest dobrym projektem zaliczeniowym, ponieważ spełnia wszystkie kluczowe wymagania:

- ma kontrolę dostępu,
- ma realne dane i CRUD,
- ma logikę biznesową,
- ma sensowne użycie AI,
- ma artefakty projektowe,
- może mieć test E2E,
- może mieć CI/CD,
- rozwiązuje realny problem związany z tworzeniem gry.

Najważniejsze założenie techniczne:

```text
Manual input jest bezpiecznym fundamentem.
GitHub commits import jest głównym wyróżnikiem.
Diff analysis jest bonusem, nie fundamentem MVP.
```
