# BUG-119: Queue enters blocked state after wave0 drain — wave1 items silently dropped

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-119 |
| **Severity** | P1 |
| **Phase** | wave0→wave1 transition |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

After wave0 gate pass, the queue enters a blocked state that silently discards all wave1 enqueue operations. `operate-queue.mjs enqueue` returns `ok: true` but items never appear in `active_window` or `terminal_history`.

## Discovery Sequence

### Step 1: Wave0 gate passes
```
check.next: phases/phase-wave1.md
enter-phase wave1 → OK
advance-status → wave0_complete → OK
```

### Step 2: Check queue (expecting empty, ready for wave1)
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```
Result:
```json
{"queue_health": "blocked", "stop_authorization_state": "empty_queue_after_refill", "active_window": [], "delegated_in_flight": {}}
```
Queue health is `blocked` (not `thin` or `healthy`). The `stop_authorization_state` says "empty after refill" — the queue thinks it was refilled but produced nothing.

### Step 3: Try to enqueue wave1 tasks anyway
```bash
for slug in 01 through 05; do
  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-wave1-${slug}.json
done
# All 5 return: ok: true
```

### Step 4: Check queue again
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
# active_window: 0, delegated_in_flight: 0
# terminal_history: still only 11 wave0 items — NO wave1 items
```

The 5 enqueue operations reported `ok: true` but produced NO state change. Items silently discarded.

### Step 5: Check rb_queue.json directly
```python
d = json.load(open('rb_queue.json'))
# queue_health: "blocked"
# stop_authorization_state: "empty_queue_after_refill"
# active_window: []
# "wave1" does not appear ANYWHERE in the file
```

### Step 6: Try open-batch for wave1
```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase wave1 --reason "wave1 deepening start"
# Returns: ok: true
```
Queue state unchanged — still `blocked`.

### Step 7: Try repair
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs repair <bundle> --remove-stale
# Returns: ok: true, removed_count: 0
```
Nothing removed, queue still blocked.

### Step 8: Discover root cause — assignment_mode field
The first wave1 enqueue attempt used task cards without `assignment_mode`. Checking the raw enqueue output (without pipe):
```
Wave1 assignment_mode must be primary or supplementary
```
The error was on STDERR (BUG-116), and the `ok: true` was a false positive from a DIFFERENT code path.

### Step 9: Fix — add assignment_mode to payload
The field must be in `payload.assignment_mode`, NOT top-level:
```json
{
  "payload": {
    "topic_slug": "...",
    "assignment_mode": "primary"
  }
}
```
After this fix, enqueue succeeds and items appear in active_window.

### Step 10: Queue still blocked even after successful enqueue
Even with correct task cards and successful enqueue (items in active_window), the queue remains `health: blocked`. The `stop_authorization_state: empty_queue_after_refill` persists.

The workaround: despite `blocked` health, `operate-work-unit.mjs claim` actually WORKS when items are in active_window. The queue health label is misleading — it says "blocked" but the system functions normally.

## Root Cause Chain

1. First wave1 enqueue attempt used task cards without `payload.assignment_mode`
2. Rejection messages went to stderr (BUG-116), invisible behind `2>/dev/null`
3. Agent thought enqueue succeeded (no error visible) but items never appeared
4. The failed enqueue attempts triggered `stop_authorization_state: empty_queue_after_refill`
5. This state persisted even after correct enqueue, misleading Agent into thinking queue was broken
6. `queue_health: blocked` label persisted but system actually worked

## Key Detail: assignment_mode location

From `DPT_FRAMEWORK/engine/work-unit-assignment-contract.mjs:85`:
```javascript
const mode = queueItem?.payload?.assignment_mode;
if (!mode ...) throw new Error('Wave1 assignment_mode must be primary or supplementary');
```

The field is read from `payload.assignment_mode`, NOT top-level `assignment_mode`. This is undocumented — the wave0 task card template in phase-wave0.md doesn't show this field, and phase-wave1.md's template was generated from the wave0 template without updating.

## Suggested Fix

1. `operate-queue.mjs enqueue` should validate wave1 task cards BEFORE returning `ok: true`
2. `stop_authorization_state` should reset when new items are successfully enqueued
3. `phase-wave1.md` task card template should include `"payload": {"assignment_mode": "primary"}`
4. Enqueue rejection errors must go to stdout when the primary output is JSON
