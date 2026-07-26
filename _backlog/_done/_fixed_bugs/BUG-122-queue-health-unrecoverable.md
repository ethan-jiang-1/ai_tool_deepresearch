# BUG-122: Queue health stuck at "blocked" — no legal unblock operation exists

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-122 |
| **Severity** | P1 |
| **Phase** | wave1 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

The queue enters `queue_health: blocked` with `stop_authorization_state: empty_queue_after_refill` after wave0 drain (11 terminal_history items). Once in this state, `operate-queue.mjs enqueue` returns `ok: true` but items are silently discarded — they appear in neither `active_window` nor `terminal_history`.

No CLI command can recover from this state:
- `operate-queue.mjs repair --remove-stale` — returns `ok: true, removed_count: 0`
- `operate-work-unit.mjs open-batch --phase wave1` — returns `ok: true` but queue health unchanged
- Direct edit of `rb_queue.json` to set `queue_health: thin` and `stop_authorization_state: unauthorized_continue_required` — queue JSON is overwritten back to `blocked` on next Engine write

## What Was Tried

```bash
# Attempt 1: repair --remove-stale
node DPT_FRAMEWORK/cli/operate-queue.mjs repair <bundle> --remove-stale
# → ok: true, removed_count: 0 (no effect)

# Attempt 2: open-batch wave1
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase wave1 --reason "..."
# → ok: true (but queue_health still "blocked")

# Attempt 3: Direct rb_queue.json edit
python3 -c "
d['queue_health'] = 'thin'
d['stop_authorization_state'] = 'unauthorized_continue_required'
"
# → Enqueue still OK but items still discarded. JSON was overwritten by Engine.
```

## Root Cause

The `stop_authorization_state: empty_queue_after_refill` is likely set when the queue was refilled (Agent enqueued wave1 tasks) but produced no delegated items (because the task cards were missing `payload.assignment_mode` — BUG-119). The state persists even after the root cause (bad task cards) is fixed.

There appears to be no `operate-queue.mjs unblock` or `operate-queue.mjs reset` command.

## Impact

Once the queue enters `blocked` state, the phase cannot enqueue supplementary work. This blocks the ONLY legal path to satisfy `source_novelty_floor` requirements (which need supplementary `wave1_topic_deepening` work-units). Combined with BUG-119 (silent enqueue rejection) and BUG-121 (gate fatigue), this creates an impassable phase boundary.

## Suggested Fix

1. Add `operate-queue.mjs unblock <bundle>` command that resets queue_health to `thin` and clears `stop_authorization_state`
2. `open-batch` should automatically reset queue_health
3. Successful enqueue of delegated items should clear `empty_queue_after_refill` state
