---
bug_id: BUG-185
title: Work-unit index and ledger independently store result_hash and ledger_record_hash — no sync operation
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-185: Dual hash storage with no sync

## What happened

Both `_work_units/_index.json` and `rb_output_declarations.jsonl` store `result_hash` and `ledger_record_hash` for each submitted work unit. When the ledger was updated (to add reference outputs), the index became stale. The gate detected `ledger/index mismatch` and failed multiple rules.

There is no Engine operation to sync index hashes from the ledger. The Phase Agent had to manually edit both files.

## Expected behavior

`operate-work-unit sync-index` should read the ledger and update the index to match. Alternatively, the index should not store hashes — it should derive them from the ledger.
