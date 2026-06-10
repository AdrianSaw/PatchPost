---
change_id: modern-app-layout-flow
title: Modern app layout and view-by-view flow redesign
status: implementing
created: 2026-06-06
updated: 2026-06-10
archived_at: null
---

## Notes

Chciałbym przerobić layouty i flow w całej aplikacji — widok po widoku. Obecnie funkcjonalnie działa, ale flow nie jest wystarczająco klarowny. Kierunek: **modern design** (glassmorphism, ciemny motyw, purple accent — mockup logowania już jest).

**Pierwszy widok:** sign-in (`/auth/signin`) — referencja wizualna w rozmowie (PatchPost login mockup: welcome card, feature side cards, purple CTA).

**Kolejność do rozpisania (draft):**
1. Auth — sign-in, sign-up, confirm-email
2. App shell — projects list, navigation/topbar
3. Projects — new, detail, edit, delete flows
4. Generate — manual input, mock AI toggle, submit
5. Drafts — history list, detail/edit, success states
6. Dashboard / landing (public) jeśli w scope

Deliverable per view: spójny layout, czytelna hierarchia, mobile-friendly, bez regresji funkcji (e2e `main-flow` jako guardrail).
