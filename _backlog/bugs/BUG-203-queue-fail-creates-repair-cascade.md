---
bug_id: BUG-203
status: open
discovered: 2026-08-05
phase: wave1
severity: P1_queue_blocker
---

# Queue Fail Creates Infinite Repair Cascade

## Symptom

Calling `operate-queue.mjs fail` on a queue item creates a `repair-<qid>-<timestamp>`
replacement item. Calling `fail` on the repair item creates
`repair-repair-<qid>-<timestamp>-<timestamp>`, ad infinitum. There is no
termination condition — each fail creates a new repair item that blocks the queue.

## Reproduction

1. Enqueue item without `delegates` configured
2. Item can't be claimed (no delegates)
3. `operate-queue.mjs fail` → creates repair item
4. Repair item also can't be claimed
5. `fail` on repair item → creates repair-repair item
6. Repeats indefinitely

## Impact

- Queue becomes permanently blocked by repair cascade
- `operate-queue.mjs repair --remove-stale` does not remove active repair items
- Only escape is `preempt --unsafe-current` to bypass, or direct rb_queue.json edit
- Combined with other items, creates multi-layered queue deadlock

## Observed In

Wave1 closeout — topics 02,03 retry attempts created 5+ layers of repair items.
Required `preempt --unsafe-current` to bypass, which then left orphaned items
in rb_queue.json that gate sees but `operate-queue.mjs check` doesn't show.

## Related

- Queue state inconsistency between check CLI and rb_queue.json
