---
bug_id: BUG-204
status: closed; reclassified as stale terminal fixture contract drift in Change B v0.76 2026-08-07
discovered: 2026-08-05
phase: wave1
severity: P0_gate_blocker
---

# Terminal Snapshot Hash vs Schema Conflict

## Closure (2026-08-07)

The reported hash/schema conflict did not reproduce on a current Engine path.
The shared red baseline was a stale fixture selecting an unassigned `reference`
output where the current Wave0 attempt contract requires `source_yaml`.
Archived Change B derives the candidate from that contract while retaining
strict schema, snapshot, and hash protections. See the
[closed remediation ledger](../_closed_plans/gate-schema-progressive-gate-schema-queue-remediation.md).

## Symptom

Gate validation at `work-unit-supersession.mjs:200-203` requires:
1. `hashValue(manifest.queue_item) === hashValue(terminal.item)` — byte-identical
2. But `manifest.queue_item` contains fields (`status`, `restore_priority`,
   `created_at`, `updated_at`) that the declaration ledger validator rejects
   as unrecognized keys.

## Deadlock

- Keep all manifest fields in terminal.item → hash matches → schema rejects
  unrecognized keys (`status`, `restore_priority`, etc.)
- Strip extra fields from terminal.item → schema passes → hash doesn't match
  → "queue snapshot drift" error

## Code Location

`DPT_FRAMEWORK/engine/work-unit-supersession.mjs:200-203` — three-condition
check requires terminal.item to be byte-identical to manifest.queue_item.

## Impact

Prevents reconstructed terminal_history from passing gate validation.
Only original engine-created terminal snapshots (from `operate-work-unit submit`)
can satisfy both constraints simultaneously.

## Workaround

None found through data adjustment. Requires framework change to either:
- Allow extra fields in declaration ledger validation, OR
- Use a normalized hash that excludes runtime fields
