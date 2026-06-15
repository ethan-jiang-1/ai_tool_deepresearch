---
title: "Check Queue Receipts"
role: "focused Queue Work Unit Contract and receipt verifier"
scope: "read-only check for active Queue contract fields, Refill Pool candidate shape, preflight required receipts, closeout completion receipts, named branch receipts, artifact steering receipts, trace transition receipts, and search provider boundary"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/QUEUE_CONTRACT.md"
  - "flows/queue-agentic-flow.md"
  - "output_templates/QUEUE.md"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
writes: []
---

# Check Queue Receipts

Use this focused verifier when the run is about to execute `slot_1_current`, promote/refill Queue, enter a new wave, continue source intake/deepening, or recover from suspected missing artifacts.

This is a check command, not a separate Queue loop command. The Queue loop itself is defined by `flows/queue-agentic-flow.md`; the object contract is defined by `specs/QUEUE_CONTRACT.md`; runtime Queue data lives in `QUEUE_PATH`.

## Command

From the run root:

```bash
node _framework/cli_tools/check_framework.mjs --gate check-queue-receipts .
```

From outside the run root:

```bash
node <RUN_DIR>/_framework/cli_tools/check_framework.mjs --gate check-queue-receipts <RUN_DIR>
```

The helper is read-only. It must not write gate evidence, repair files, promote references, update artifacts, or authorize gate passage by itself.

## What It Checks

- `slot_1_current` through `slot_5_tail` carry the Queue Work Unit Contract fields when the queue is open.
- Refill Pool `Candidate Block` entries carry equivalent contract fields.
- `slot_1_current.required_receipts` points to receipts that exist when `Active Queue.receipt_check_phase=preflight`.
- `slot_1_current.completion_receipt` points to receipts that exist when `Active Queue.receipt_check_phase=closeout`.
- Named branch receipts such as `artifact_steering_current`, `artifact_refresh_not_due`, `queued_artifact_repair`, `direct_reference_exception`, `active_window_contract_complete`, `topology_delta_disposed`, and `hitl2_pending_or_recorded_ready` are fail-closed and checked by their branch-specific contract, not by loose substring matching.
- Receipt fields are semicolon-delimited. Whole-receipt alternatives may use `A or B` only when each side is a valid machine receipt; status/queue value alternatives use `_or_` inside the value.
- Topic artifact steering receipts resolve through current, refresh-not-due, or queued-repair branches; for missing initial artifacts, `queued_artifact_repair` passes only when production is in `slot_1_current` or `slot_2_next`, not merely in Refill Pool.
- A source-intake/deepening task cannot run while required artifact steering receipts are missing.
- A claimed wave transition has the exact TRACE checkpoint receipt for that boundary: a distinct non-correction entry whose `gate_transition` field value is `wave0_complete`, `wave1_complete`, `wave2_complete`, or `readiness_passed` as applicable.
- Exa search is not silently promoted over default `native_search`; Exa must be user-explicit or justified by an Exa-specific work-unit requirement.

## Results

Return exactly one result:

| result | meaning | next action |
| --- | --- | --- |
| `PASS` | Queue contract fields and mechanically checkable receipts are present | continue from `slot_1_current` |
| `FAIL_FIX` | a field, receipt, artifact steering surface, trace checkpoint, or search boundary is missing but repair is local | queue or execute the concrete repair work, then rerun this check |
| `FAIL_BLOCKED` | a receipt depends on unavailable user input, missing source material, missing credential, or inaccessible local file | record a concrete blocker and ask only for the missing input |

## Repair Rule

A missing receipt creates repair work. It does not authorize a summary, a user-facing progress report, source-intake continuation, Wave 1 deepening, or a gate transition.

For TRACE receipts, do not repair by writing a final multi-gate correction and treating it as coverage. A correction may explain missed checkpoints, but the boundary remains failed until the specific transition checkpoint exists or the affected gate/audit path is re-earned and closed with a proper trace entry.

When the failing receipt is an artifact steering surface, repair by producing missing initial artifacts or refreshing thresholded stale artifacts:

- `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`
- `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/question-list.md`

Then sync `STATUS_PATH` produced counters, the question-list exploration ledger fields, and Queue completion receipts before promotion.

If initial artifacts are missing after the first topic-unique reference, promote the two-artifact production work into `slot_1_current` or `slot_2_next` before any further Wave 1 source-intake, cross-topic handoff, or topic deepening. A Refill Pool candidate is only a reminder; it is not a receipt.

## Boundaries

- Do not run full `check-runtime` for every small Queue step unless the work crosses a gate, changes source counts, repairs framework/runtime drift, or prepares readiness.
- Do run this focused check before source-intake/deepening when topic reference counts changed, after fan-in, before Wave 1/Wave 2 entry, and after Queue refill/promotion changes.
- Native todo/task/plan surfaces are projections only. If they disagree with `QUEUE_PATH`, repair `QUEUE_PATH` or regenerate the projection from Queue.
