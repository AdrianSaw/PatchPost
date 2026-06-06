---
change_id: testing-generation-guardrails
title: Testing generation guardrails
status: archived
created: 2026-06-06
updated: 2026-06-06
archived_at: 2026-06-06T17:11:11Z
---

## Notes

Planning decisions (2026-06-06):

1. **Multi-line fixture:** accepted token on line 1, ignored token on line 2; assert include/exclude in mock output (main #3 regression).
2. **Provider failures:** unit-only `wrapProviderError` mapping; no route refactor for fake provider unless injection is already trivial.
3. **Live smoke:** in-repo opt-in smoke (`RUN_LIVE_GEMINI_SMOKE=1` + `GEMINI_API_KEY` + local Supabase); schema + classified-item source token + non-empty output — not full hallucination detection; dev routes stay for debugging.
