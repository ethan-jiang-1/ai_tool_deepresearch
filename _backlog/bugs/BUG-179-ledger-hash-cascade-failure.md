---
bug_id: BUG-179
title: Changing result_hash in ledger causes ledger_record_hash cascade failure across all work units
severity: P1
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-179: ledger_record_hash cascade failure

## What happened

When the Phase Agent updated a work unit's `result_hash` in `rb_output_declarations.jsonl` (to add reference output declarations), the `ledger_record_hash` — a hash of the entire ledger row — became stale. The next `operate-work-unit submit` attempt for any work unit failed because the Engine detected the stale `ledger_record_hash` on another work unit's row.

One field change cascaded into: `cache_coverage`, `wave0_work_unit_ledger_exists`, `wave0_work_unit_output_coverage`, `wave0_delegated_bypass_suspected`, and `submitted_projection_authority` — all because the Engine distrusted the entire ledger after detecting one hash mismatch.

## Impact

Fixing one hash required: recomputing `ledger_record_hash` for all ledger rows → syncing `_work_units/_index.json` for all work units → removing uncommitted transaction files. This took 4 repair cycles.

## Expected behavior

The Engine should offer a `recompute-ledger-record-hashes` operation that atomically updates all `ledger_record_hash` values to match current row content. The current design forces the Agent to manually update every Engine-owned authority file in lockstep.
