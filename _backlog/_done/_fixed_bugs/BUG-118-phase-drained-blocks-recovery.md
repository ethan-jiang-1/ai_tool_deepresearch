# BUG-118: phase_drained blocks recovery — no legal path after abandoned work-unit

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-118 |
| **Severity** | P1 |
| **Phase** | wave0 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

After 4/5 work-units successfully submitted and 1 abandoned (wu-w0-b000-src-i0001), the queue drains all items (11 in terminal_history) and enters `phase_drained: True`. The Agent cannot reclaim the abandoned topic because every recovery path is blocked by a different terminal status check.

## Sequence of Events

### 1. Initial state: 5 queue items enqueued
```
wave0-source-01_openspec-adoption-evidence → claimed → abandoned (Agent called abandon during debugging)
wave0-source-02_competitor-landscape → claimed → submitted
wave0-source-03_community-sentiment → claimed → submitted
wave0-source-04_greenfield-vs-retrofit → claimed → submitted
wave0-source-05_ecosystem-maturity → claimed → submitted
```

### 2. Gate shows: phase_queue_drained, output_coverage for topic 01
Topic 01 has no submitted work-unit. Need a new one.

### 3. Attempt 1: Re-enqueue topic 01
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-wave0-01-v3.json
# Returns: ok: true
```
Queue state after: `active_window: 0, delegated_in_flight: 1` — the item went to `delegated_in_flight` as `wave0-source-01_openspec-adoption-evidence-v2` with work_id `wu-w0-b001-src-i0001`. BUT: the work-unit directory was never created because...

### 4. Attempt 2: Claim the in-flight item
```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count 1 ...
# Returns: ok: false, unclaimed_delegated_count: 0, phase_drained: True
```
`phase_drained: True` — the queue thinks all demand is met. It won't let new claims happen even though there's an in-flight item.

### 5. Attempt 3: open-batch to reopen the phase
```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase wave0 --reason "topic 01 needs work-unit after abandon"
# Returns: ok: true
# Creates batch b001 in _work_units/_index.json
```
Queue state after: `phase_drained: False` — batch is open!

### 6. Attempt 4: Re-enqueue + claim after open-batch
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-wave0-01-v4.json
# Returns: ok: true
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 ...
# Returns: ok: false, unclaimed_delegated_count: 0
```
The enqueued item disappears — not in active_window, not in terminal_history. The queue accepted it (ok: true) but it was silently discarded because the queue_state was `blocked` with `stop_authorization_state: empty_queue_after_refill`.

### 7. The ACTUAL solution (discovered accidentally)
The `open-batch` in step 5 DID create a work-unit: `wu-w0-b001-src-i0001`. It was just invisible to the claim command. The work-unit directory existed at `_work_units/wave0/wu-w0-b001-src-i0001/` with a full `_beacon.json` and `result.schema.json`. The Agent found it by listing the filesystem, NOT through any CLI command.

The Agent then directly wrote receipt/cache/result and submitted it — bypassing the claim step entirely because the work-unit already existed.

## Recovery Attempts That Failed

| Attempt | Command | Result |
|---------|---------|--------|
| Re-enqueue | operate-queue enqueue → OK | Item invisible to claim |
| open-batch | operate-work-unit open-batch → OK | Still can't claim |
| timeout --force | operate-work-unit timeout --force | Rejected: "abandoned" status |
| late-submit | operate-work-unit late-submit | Rejected: "only recovers timed_out" |
| phase_agent_fallback | claim --execution-actor phase_agent_fallback | no_claim |
| delegated_subagent | claim --execution-actor delegated_subagent | no_claim |

## The Only Successful Recovery Path (undocumented)

```bash
# 1. open-batch to reopen the phase
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase wave0 --reason "..."

# 2. Enqueue (reported OK but item goes to delegated_in_flight, not active_window)
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task <task.json>

# 3. DO NOT use claim — find the work-unit by listing filesystem
ls _work_units/wave0/  # Find wu-w0-b001-src-i0001

# 4. Read beacon directly, write receipt/result/cache manually
# 5. dry-submit → submit
```

The claim step is completely bypassed because the work-unit was auto-created by enqueue+open-batch.

## Root Cause

1. `operate-work-unit.mjs abandon` is permanent — no transition to `timed_out` or recovery
2. `phase_drained` prevents new claims even after `open-batch` if queue_state is blocked
3. `stop_authorization_state: empty_queue_after_refill` blocks queue from accepting new items
4. The work-unit IS created (filesystem) but not visible through CLI claim

## Suggested Fix

1. Allow `abandoned → timed_out` transition via `operate-work-unit.mjs timeout --force`
2. `open-batch` should clear `stop_authorization_state` and reset queue_health
3. Document that batch b001+ work-units need filesystem discovery, not CLI claim
4. Or: `operate-work-unit.mjs claim` should find work-units in all batches, not just b000
