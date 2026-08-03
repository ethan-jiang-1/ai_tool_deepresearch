# BUG-194: Wave1 enqueue rejects task cards when assignment_mode is at top level instead of payload

**Status**: open
**Severity**: P2 — one-time setup friction; phase instructions template is ambiguous
**Found**: 2026-08-03 during `agentic-rd-org-delivery-systems-2026` Wave1 execution

## Symptom

`operate-queue.mjs enqueue` rejects Wave1 task cards with:
```
assignment contract rejected: Wave1 assignment_mode must be primary or supplementary
```

The task card JSON has `"assignment_mode": "primary"` at the top level. The fix is to move it inside `payload`.

## Root cause

The phase-wave1.md §3.1 task card template shows `assignment_mode` inside `payload`:
```json
"payload": {
    "assignment_mode": "primary",
    ...
}
```

But this is easy to miss because the Wave0 task card template in phase-wave0.md has NO `assignment_mode` at all, and the Agent naturally places new required fields at the top level alongside other top-level fields like `kind`, `priority_class`, `producer_rule`.

The error message says "must be primary or supplementary" but does not say WHERE the field should be placed.

## Impact

- 1-2 wasted repair cycles per Wave1 task card enqueue attempt
- 5 topics × 2 cycles = 10 wasted turns

## Expected behavior

Error message should say: "Wave1 task cards require payload.assignment_mode to be 'primary' or 'supplementary'" — naming the exact JSON path.
