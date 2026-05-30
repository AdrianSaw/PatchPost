---
change_id: manual-to-generated-history-flow
title: Manual to generated history flow
status: impl_reviewed
created: 2026-05-30
updated: 2026-05-30
archived_at: null
---

## Notes

User intent (2026-05-30): change input is **manual** — user pastes/types commit messages or bullet list themselves. **No** GitHub repo fetch/import (private repos make API import undesirable anyway). Multi-channel generation (changelog, social, Discord, etc.) is chosen at generate time; backend already supports this via F-01 `output_type`.
