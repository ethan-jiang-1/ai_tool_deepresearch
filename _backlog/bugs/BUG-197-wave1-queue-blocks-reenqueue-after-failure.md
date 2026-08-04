# BUG-197: Queue system blocks re-enqueuing topics after work-unit failure, preventing gate repair

**Status**: residual — current-head real replay recovered through fresh primary replacement; no current deterministic root admitted
**Severity**: P0 — blocks Wave1 gate pass; no recovery path exists
**Found**: 2026-08-03 during `agentic-rd-org-delivery-systems-2026` Wave1 execution

## Symptom

After `operate-work-unit fail` on work units for topics 01, 03, 05 (failed due to `missing_cache` — sub-agent omitted `cache_trail_refs` in `source_claims[]`), any attempt to enqueue new tasks for the same `topic_slug` is rejected:

```
assignment contract rejected: primary Wave1 assignment receipt shape is invalid or duplicated
```

The queue system detects the topic's presence in `terminal_history` and blocks re-enqueuing regardless of the new `queue_item_id`. The `replace` command on failed work units returns `successor_queue_item_id: null`.

## Root cause

The queue enqueue validator treats any topic with existing terminal history entries as "duplicated," even when:
- The prior entry was `failed` (not `done`)
- The new task has a completely different `queue_item_id`
- The new task uses `P1_state_or_gate_repair` priority (explicitly for gate repair)

The `fail_and_replace` path from dry-submit is supposed to create successors, but `replace` on a `failed` (non-submitted) work unit returns null successor.

## Impact

- Topics that fail on technical contract details (not research quality) become permanently unrecoverable
- Wave1 gate requires `wave1_work_unit_output_coverage` for ALL topics — but failed topics can never get coverage
- Phase Agent has no legal path to repair: can't re-enqueue, can't replace, can't recover
- The only theoretical recovery is to delete the bundle and start over (unacceptable for production runs)

## Expected behavior

Either:
- `P1_state_or_gate_repair` tasks should bypass the duplicate-topic check for gate repair, OR
- `replace` on a failed work unit should create a proper successor queue item, OR
- `fail` should offer a `retry` option that re-enqueues the same demand, OR
- Gate should accept degraded pass when topics have `evidence-summary.md` and `question-list.md` on disk but lack formal submit coverage due to known sub-agent contract issues

## Current-head requalification (2026-08-05)

The bounded real `case-164-heavy-direct-output-candidate-contract` replay
exercised the reported repair boundary. After the first primary attempt failed
with the real semantic root code, the Subject explicitly enqueued a new primary
Wave1 demand with fresh `queue_item_id: case-164-primary-2`, claimed it, and
submitted the second distinct child result. The first attempt has no submitted
ledger row; the replacement has exactly one submitted row and reaches `done`.

The reported permanent duplicate-topic block and null replacement path were
not reproduced on the current head. No queue bypass, degraded Gate floor, or
new retry authority is admitted. Keep this card as a historical
Actor/requalification residual pending the separate degraded-mode cases.
