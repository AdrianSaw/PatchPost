---
change_id: testing-generation-guardrails
title: Testing generation guardrails
status: implementing
created: 2026-06-06
updated: 2026-06-06
archived_at: null
---

## Notes

Planning decisions (2026-06-06):

1. **Multi-line fixture:** accepted token on line 1, ignored token on line 2; assert include/exclude in mock output (main #3 regression).
2. **Provider failures:** unit-only `wrapProviderError` mapping; no route refactor for fake provider unless injection is already trivial.
3. **Live smoke:** in-repo `skipIf(!GEMINI_API_KEY)` smoke; schema + classified items + token preservation only; dev routes stay for debugging.
