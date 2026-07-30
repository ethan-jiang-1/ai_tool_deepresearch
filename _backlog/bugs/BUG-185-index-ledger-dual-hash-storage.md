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

## C4 Disposition (2026-07-31)

- Implemented path (`DEW-024`): every new claim binds `work-unit.submission.v1`; after acceptance its ledger
  row is the sole current source of `result_hash`, `ledger_record_hash`, and coverage. The marked index keeps
  only immutable `accepted_ledger_record_hash` acceptance evidence, and marked index/status records keep no
  current hash mirrors. Submit, duplicate/replay checks, inspect, and Gate share the same ledger-first evaluator.
- Residual boundary: markerless historical attempts retain their explicit legacy mirror representation and
  fail closed on disagreement. C4 adds no `sync-index` or recompute command and never migrates or rewrites those
  immutable legacy bytes; incomplete/mixed/unknown marker representations remain `missing_contract`.
