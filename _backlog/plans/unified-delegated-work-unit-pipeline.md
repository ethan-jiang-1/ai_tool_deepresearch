# Unified Delegated Work Unit Pipeline — Only One Path

> Created: 2026-07-06
> Status: active plan
> Intended OpenSpec change: `unify-delegated-work-unit-pipeline`

## Purpose

This document defines the target delegated-work mechanism. It is the principle doc, not the impact map.

The system SHALL expose exactly one production delegated-work path:

```text
queue item -> work unit -> sub-agent -> submit -> ledger -> gate
```

The most important model split is:

```text
work unit = one delegated execution attempt envelope
submitted work unit = one delegated task completion
phase loop = many queue demand items allocated/submitted through work units
wave gate = aggregate validation over all submitted work units for that wave
```

A work unit is not a wave. A work unit is the atomic execution-attempt envelope for one delegated queue demand item. Only a successfully submitted work unit proves completion. Wave0, Wave1, and Wave2 may each create many work units before the wave gate can judge whether the wave passes.

## Core Decision

Production delegated work uses a unified work-unit envelope keyed by `work_id`:

```text
wave-specific queue demand item
  -> _work_units/waveN/{work_id}/
  -> synchronous sub-agent execution
  -> operate-work-unit submit
  -> queue complete + ledger append
  -> wave gate aggregate check
```

There is no second production path. Active specs, framework docs, runtime docs, phase docs, gates, tests, and controlled E2E playbooks SHALL NOT treat these surfaces as production authority:

- `_subagents/wave_NN/slot_MM`
- `slot_result_ref`
- `drive-relay-slot`
- `subagent_slot_presence`

Those names may appear only when a plan, bug note, archive, or hygiene check is explicitly identifying surfaces to delete or rewrite. They are not valid instructions for current or future production execution.

## Problem Being Removed

Recent production-style runs showed a systemic workflow problem. The research work can be real, and sub-agents can gather useful evidence, but one logical delegated completion was split across too many deterministic surfaces.

The removed anti-pattern is:

```text
queue task -> relay slot -> runtime receipt -> relay commit -> queue complete -> ledger -> gate
```

This is not an execution recipe. It is the failure shape the work-unit pipeline deletes.

The split made the Phase Agent bridge authority by interpretation:

- Queue items were topic/finding work, while relay slots were role/slot work.
- Completion and provenance were not one atomic action.
- Ledger rows could be reconstructed after the fact instead of emerging from validated submission.
- Gate diagnostics had to infer whether delegated work was real from multiple partially connected surfaces.
- Wave-level failure and per-task completion were easy to confuse.

The replacement is to split queue demand identity from delegated execution identity, then bind the execution attempt through `work_id`.

## Authority Model

The production model has two IDs:

- `queue_item_id`: identifies the queue demand item, meaning the thing the phase says needs to be done.
- `work_id`: identifies one Engine-allocated delegated execution attempt for a claimed queue item.

Active production naming must preserve this split. Queue items, task cards, and demand records should be called queue items or queue demand items. The name "work unit" is reserved for the delegated execution-attempt envelope allocated by `operate-work-unit claim`. Existing queue schema/spec language that calls queue demand items "work units" must be renamed during the replacement so `work_id` cannot mean two different things.

`work_id` binds:

- The claimed `queue_item_id`.
- The work-unit manifest and task.
- The sub-agent runtime receipt.
- The submitted result.
- The ledger declaration.
- The gate coverage record.

No production check should infer delegated provenance from slot number, role slot, directory order, or a separate collect/merge step.

Queue owns demand: what still needs work. Work-unit index owns attempts: what delegated attempts have been allocated, are in flight, have submitted, or have reached terminal non-success status. Gates read only successful work-unit ledger coverage; they do not treat queue items or `_work_units/_index.json` as pass evidence.

The target queue file shape is `rb_queue.json` v2. It is nested and ordered; it does not preserve top-level `slot_NN` fields as the production target shape:

```text
rb_queue.json
  schema_version          2
  active_window           ordered queue-front window of unclaimed queue demand items
  refill_pool             ordered overflow queue demand items
  delegated_in_flight     claimed delegated demand items keyed by queue_item_id
  terminal_history        completed or permanently closed queue demand records keyed by queue_item_id
```

`active_window` is the queue front. Its first element is the current blocking item for claim-order purposes. The Engine may compact and refill this ordered window after claims, submits, terminal attempt transitions, and queue repairs. `refill_pool` is ordered overflow, not executable work until promoted into `active_window`.

`delegated_in_flight` means a queue demand item has been removed from the queue front and is currently bound to one non-terminal delegated execution attempt. It is keyed by `queue_item_id`, not by `work_id`, because the queue owns demand while `_work_units/_index.json` owns attempts.

`operate-work-unit claim` moves eligible delegated queue demand items from `active_window` into `delegated_in_flight` while creating work units, then compacts/refills the active window. `operate-work-unit submit` completes by `work_id` / `queue_item_id` binding from `delegated_in_flight`, so out-of-order sub-agent returns do not depend on `slot_1_current`.

Minimum `delegated_in_flight` entry shape:

```json
{
  "queue_item_id": "queue-wave0-source-topic-a",
  "work_id": "wu-w0-b000-src-i0001",
  "wave": 0,
  "batch_id": "b000",
  "kind": "wave0_source_intake",
  "attempt_index": 1,
  "queue_item_snapshot_hash": "sha256:queue-item-snapshot",
  "claimed_at": "2026-07-06T00:00:00.000Z",
  "timeout_ms": 600000,
  "deadline_at": "2026-07-06T00:10:00.000Z",
  "last_observed_at": null
}
```

Queue uniqueness invariant: a `queue_item_id` must appear in exactly one active queue location at a time: `active_window`, `refill_pool`, `delegated_in_flight`, or terminal history. A successfully submitted, failed, timed-out, or abandoned work unit must not remain in `delegated_in_flight`.

Attempt history is not queue terminal history. `failed`, `timed_out`, and `abandoned` are work-unit attempt statuses stored in `_work_units/_index.json`. They leave the queue demand unfinished and normally return the same `queue_item_id`, or an Engine-approved replacement with lineage, to active queue state.

`queue_item_snapshot_hash` is the hash of the canonical JSON representation of the queue demand item at claim time. It includes the semantic demand fields such as `queue_item_id`, `phase`, `kind`, `targets`, `producer_rule`, `payload`, `lineage`, `output_contract`, and `required_receipts`. It excludes queue location, status, timestamps, in-flight attempt refs, runtime refs, and other transient scheduling fields. `submit` must fail closed if the current binding, manifest, or result claims a different queue item snapshot than the one claimed.

## Work ID Encoding

`work_id` should be structured, human-readable, and assigned only by `operate-work-unit claim`. Agents do not invent it, pre-reserve it, or edit it after claim.

Canonical format:

```text
wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}
```

Example IDs:

```text
wu-w0-b000-src-i0001
wu-w0-b000-src-i0002
wu-w1-b000-deep-i0001
wu-w1-b001-deep-i0001
wu-w2-b002-evd-i0003
```

Field meanings:

| Field | Meaning | Rule |
|-------|---------|------|
| `wu` | Work-unit prefix | Literal prefix so work-unit IDs are visually distinct. |
| `w{wave}` | Wave number | `w0`, `w1`, `w2`, with room for future numeric waves. |
| `b{batch_index}` | Phase drain batch | Zero-padded three-digit batch within the wave. `b000` is the initial drain; `b001+` are repair/refill batches created after gate failure or explicit refill. |
| `{kind_code}` | Registered work-unit kind code | Short stable code for the semantic contract. First codes: `src` = `wave0_source_intake`, `deep` = `wave1_topic_deepening`, `evd` = `wave2_targeted_evidence`. |
| `i{claim_index}` | Claim order inside the batch | Zero-padded four-digit integer assigned by the Engine while claiming queue work. It is unique within `(wave, batch_index)` across all kinds. |

Validation regex:

```text
^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$
```

Three-digit `batch_index` supports up to 999 phase drain batches per wave before any future width expansion. Four-digit `claim_index` supports up to 9999 claims inside one wave/batch allocation sequence. `kind_counts` is a projection only; it does not define the uniqueness scope for `claim_index`.

The encoded fields are readable hints and must match the manifest fields. The manifest remains the structured authority for `wave`, `batch_index`, `kind`, `queue_item_id`, and output contract.

The Engine also maintains `_work_units/_index.json` as the allocation registry and query truth. It stores counters and allocation state for waves, batches, kind codes, and every assigned `work_id`. `work_id` readability is the first layer; `_work_units/_index.json` is the machine-checkable allocation truth.

Work-unit directory paths use explicit wave directory names:

```text
_work_units/wave0/{work_id}/
_work_units/wave1/{work_id}/
_work_units/wave2/{work_id}/
```

The directory wave segment must match the encoded `w{wave}` field and manifest `wave`. A path under `_work_units/w0/` is not the canonical production path.

Batch semantics:

- `b000` is the initial phase-drain batch for the wave.
- `b001+` are opened only by the Engine after a gate failure or explicit refill decision.
- Ordinary `claim` calls inside the same drain do not increment `batch_index`; they only increment `claim_index`.
- Timeout retry of the same still-valid queue demand stays in the current batch by default. It gets a new `claim_index`, new `work_id`, and incremented `attempt_index`, but does not open `b001+`.
- Repair/refill work created after a gate failure or explicit refill opens `b001+`, starts a new batch-local `claim_index` sequence, and records lineage to the prior `queue_item_id` / `work_id` when applicable.
- Each batch records `batch_reason`, such as `initial_drain`, `gate_repair`, or `explicit_refill`.

Parallel-readiness rule:

- `claim` assigns `batch_index` and `claim_index` under the same deterministic queue/work-unit lock used to claim queue work.
- Concurrent or batched claims may create multiple in-flight work units, but each gets a unique `iNNNN` within the same `(wave, batch_index)`.
- `claim_index` is unique within `(wave, batch_index)` across all kinds. It does not reset per kind.
- Future parallel dispatch uses `operate-work-unit claim --count N`: the Main Agent asks the Engine for N registered work units, then fans out the returned prompts. This is real in-flight allocation, not prompt-only generation. Sub-agents never allocate IDs or write `_work_units/_index.json`.
- The Engine must reject malformed IDs, duplicate IDs, IDs whose encoded fields disagree with the manifest, and result submissions whose `work_id` does not match the claimed `queue_item_id` binding.
- The ID should not include `topic_slug`, `finding_id`, source URL, title text, or runtime agent ID. Those belong in the manifest/result. This keeps paths stable if human-readable topic labels change.

## Phase Loop Model

Each wave/phase runs a queue-drain loop. The loop completes many work units before the gate runs:

```text
while delegated queue work remains for the phase:
  1. claim one or more queue demand items as work units
  2. spawn the bounded synchronous sub-agent from the generated task
  3. submit each result through operate-work-unit by work_id
  4. each successful submit atomically completes its queue binding + appends ledger

after no unclaimed delegated queue demand items and no non-terminal in-flight work units remain:
  5. run the wave gate over all submitted work-unit ledger coverage
  6. if the gate fails, enqueue repair/refill work units and return to the same loop
```

Gate failure does not introduce a new mechanism. Missing coverage, bad receipt, invalid outputs, and content-quality failures all re-enter the same queue/work-unit loop through repair or refill work units.

An expired in-flight work unit does not count as drained. `inspect` reports the expired lease, and the Main Agent must resolve it through `submit`, `timeout`, `fail`, or `abandon` before the phase can run its gate. Timeout recovery returns the bound queue demand to the same queue/work-unit loop with a new `work_id`.

## Wave Differences

Wave0, Wave1, and Wave2 differ by work-unit `kind`, output contract, and gate coverage. They do not get separate delegated-work mechanisms.

| Wave | First-version work-unit kind | Typical delegated purpose | Gate coverage emphasis |
|------|------------------------------|---------------------------|------------------------|
| Wave0 | `wave0_source_intake` | Search/fetch foundation sources; write source YAML, shared/topic references, and cache trails. | Foundation source coverage, reference/cache trail coverage, source intake outputs. |
| Wave1 | `wave1_topic_deepening` | Deepen topic evidence; reconcile questions; enrich topic references. | Per-topic evidence coverage, reference quality, cache-backed claims. |
| Wave2 | `wave2_targeted_evidence` | Search/fetch targeted backing evidence only when synthesis findings require new evidence. | Finding-level backing coverage for delegated search decisions. |

Wave2 pure cross-topic synthesis remains main-agent synthesis. It creates work units only when it needs delegated evidence/search work.

## Runtime Shape

Production delegated work writes one directory per `work_id` under the canonical wave directory:

```text
_work_units/waveN/{work_id}/
  manifest.json
  task.md
  result.schema.json
  _beacon.json
  runtime-receipt.jsonl
  result.json
  result.md
  _status.json
  _agent.json
```

The bundle-level work-unit index is:

```text
_work_units/_index.json
```

`_index.json` is Engine-owned. Agents and sub-agents do not edit it.

Minimum `_index.json` shape:

```json
{
  "schema_version": 1,
  "created_at": "2026-07-06T00:00:00.000Z",
  "updated_at": "2026-07-06T00:00:00.000Z",
  "counters": {
    "waves": {
      "w0": {
        "current_batch_index": 0,
        "batches": {
          "b000": {
            "next_claim_index": 2,
            "batch_reason": "initial_drain",
            "kind_counts": {
              "src": 1
            }
          }
        }
      }
    }
  },
  "kind_registry": {
    "src": "wave0_source_intake",
    "deep": "wave1_topic_deepening",
    "evd": "wave2_targeted_evidence"
  },
  "work_units": {
    "wu-w0-b000-src-i0001": {
      "work_id": "wu-w0-b000-src-i0001",
      "wave": 0,
      "batch_index": 0,
      "batch_id": "b000",
      "claim_index": 1,
      "kind": "wave0_source_intake",
      "kind_code": "src",
      "queue_ref": {
        "queue_item_id": "queue-wave0-source-topic-a",
        "queue_item_snapshot_hash": "sha256:7d6f0b4ef2f6d6b9f9c2d51c1b0f91f7b7a25b1f0d7b0e5a8e9c2f2a1b3c4d5e",
        "attempt_index": 1,
        "claim_tx_id": "tx-20260706T000000Z-0001"
      },
      "work_unit_ref": "_work_units/wave0/wu-w0-b000-src-i0001/",
      "manifest_ref": "_work_units/wave0/wu-w0-b000-src-i0001/manifest.json",
      "task_ref": "_work_units/wave0/wu-w0-b000-src-i0001/task.md",
      "result_schema_ref": "_work_units/wave0/wu-w0-b000-src-i0001/result.schema.json",
      "beacon_ref": "_work_units/wave0/wu-w0-b000-src-i0001/_beacon.json",
      "result_ref": null,
      "runtime_receipt_ref": "_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl",
      "receipt_nonce": "550e8400-e29b-41d4-a716-446655440000",
      "status": "claimed",
      "created_at": "2026-07-06T00:00:00.000Z",
      "claimed_at": "2026-07-06T00:00:00.000Z",
      "timeout_ms": 600000,
      "deadline_at": "2026-07-06T00:10:00.000Z",
      "last_observed_at": null,
      "submitted_at": null,
      "terminal_at": null,
      "terminal_reason": null,
      "runtime_refs": {
        "platform": null,
        "runtime_agent_id": null,
        "spawn_request_id": null,
        "thread_id": null,
        "session_id": null,
        "cancel_ref": null,
        "opaque": {}
      },
      "result_hash": null,
      "ledger_record_hash": null,
      "last_submit_rejection": null
    }
  },
  "status_counts": {
    "claimed": 1,
    "submitted": 0,
    "failed": 0,
    "timed_out": 0,
    "abandoned": 0
  },
  "inspect_projection": {
    "waves": {
      "w0": {
        "total": 1,
        "status_counts": {
          "claimed": 1,
          "submitted": 0,
          "failed": 0,
          "timed_out": 0,
          "abandoned": 0
        },
        "batches": {
          "b000": {
            "total": 1,
            "kind_counts": {
              "src": 1
            },
            "status_counts": {
              "claimed": 1,
              "submitted": 0,
              "failed": 0,
              "timed_out": 0,
              "abandoned": 0
            }
          }
        }
      }
    }
  }
}
```

Rules for `_index.json`:

- `schema_version` gates future shape changes.
- `counters.waves[wN].batches[bNNN].next_claim_index` is the next integer to render as `iNNNN`.
- `counters.waves[wN].batches[bNNN].batch_reason` records why the batch exists; ordinary claims do not change it.
- `kind_registry` is the closed mapping from `kind_code` to full work-unit kind.
- `work_units` is keyed by canonical `work_id`; each entry stores the queue binding, snapshot hash, claim transaction, task/manifest/schema/beacon/result/receipt refs, receipt nonce, lease/deadline fields, optional runtime refs, status, hashes, timestamps, and the latest non-terminal submit rejection if any.
- `status` values are `claimed`, `submitted`, `failed`, `timed_out`, or `abandoned`.
- `claimed` means Engine allocated the work unit, wrote the envelope, returned the prompt, and registered it as in flight.
- `submitted` means `submit` succeeded and queue completion plus ledger append have completed.
- `failed` means submit/fail closed and did not complete the bound `queue_item_id` or append ledger; repair/refill must create a new `work_id`.
- `timed_out` means the Main Agent explicitly closed an expired attempt through the Engine timeout transition; it did not complete the bound `queue_item_id` or append ledger.
- `abandoned` means Engine explicitly canceled or replaced the attempt.
- `status_counts` and `inspect_projection` are cached projections for inspect output. They must be derivable from `work_units`; if either disagrees, `inspect` must flag the index as inconsistent.
- `inspect_projection` gives Main Agent the quick answer to "how many work units has this wave/batch/kind done, and how many remain non-terminal?" without asking the Agent to manually scan every entry.
- The `queue_ref.queue_item_id` is different from the assigned `work_id`. Queue items describe requested work; work units record delegated execution attempts.
- `queue_ref` must not rely on queue slot names as authority or normal diagnostics. Completion authority comes from `queue_item_id`, `queue_item_snapshot_hash`, and the `delegated_in_flight` binding.
- `queue_ref.attempt_index` increments when the same `queue_item_id` is retried. Gate-fail repair/refill may instead create a new `queue_item_id` linked by lineage; either path still allocates a new `work_id`.
- `receipt_nonce` is an Engine-generated UUID or opaque random nonce. It must not be derived from `work_id`, queue item identity, topic text, timestamps alone, or agent-provided text.
- `receipt_nonce` must appear in the generated `_beacon.json`, `task.md`, spawn prompt, runtime receipt events, manifest, result, index, and ledger. `submit` must verify `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` agree across index, manifest, beacon, receipt, result, and ledger row.
- `submit` must update the matching index entry with `result_ref`, optional `runtime_refs`, `submitted_at`, `status`, `result_hash`, `ledger_record_hash`, and any failure diagnostics before or atomically with queue completion and ledger append.
- `last_submit_rejection` is overwritten by each failed validation attempt and cleared on successful submit or terminal attempt transition.

The manifest records:

- `work_id`
- `wave`
- `kind`
- `kind_code`
- `batch_index`
- `claim_index`
- `role_key`
- `topic_slug` or `finding_id`
- `queue_item_id`
- `queue_ref`
- `queue_item_snapshot_hash`
- `claim_tx_id`
- `timeout_ms`
- `claimed_at`
- `deadline_at`
- `last_observed_at`
- `task_ref`
- `result_schema_ref`
- `beacon_ref`
- `receipt_nonce`
- `runtime_refs`
- `output_contract`
- `cache_policy`
- `required_receipts`

The task and spawn prompt must direct the sub-agent to write lifecycle receipt events before result submission. The receipt is validated by `operate-work-unit submit`, not by prose convention.

## Attempt Lease And Timeout Recovery

Every claimed work unit has a lease. The Engine sets `timeout_ms`, `claimed_at`, and `deadline_at` during `claim`; later mutating transitions such as submit, fail, timeout, abandon, or explicit receipt/runtime import may update `last_observed_at`. Read-only `inspect` must only report the observed state. The timeout default can come from the queue item, phase target, or Engine default, but the effective lease must be written into the work-unit manifest, queue `delegated_in_flight` entry, and `_work_units/_index.json`.

`inspect` reports expired in-flight attempts. It does not silently heal them, auto-submit them, or treat them as completed. An expired attempt still blocks phase drain until the Main Agent chooses a terminal transition.

`timeout` is the terminal recovery transition for a sub-agent that did not return:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason <reason>
```

`timeout` must:

- Mark the old `work_id` as `timed_out`.
- Remove the bound `queue_item_id` from `delegated_in_flight`.
- Record `terminal_at`, `terminal_reason`, `deadline_at`, and any available runtime refs.
- Append no ledger row and complete no queue item.
- Requeue the same `queue_item_id` or create the Engine-approved replacement queue item before any new claim.

Retry semantics:

- Retry always receives a new Engine-allocated `work_id`.
- Retry increments `queue_ref.attempt_index` for the same `queue_item_id`; if repair/refill creates a new queue item instead, the new queue item must carry lineage to the timed-out attempt.
- The new attempt may reuse the same queue item snapshot when the demand is still valid, or use a repair/refill queue item when the demand has changed.
- Late `submit` from the old `timed_out` `work_id` fails closed. It cannot compete with the retry and cannot append ledger coverage.

Opaque runtime metadata is diagnostic and cancellation-assist only:

```json
{
  "platform": "codex",
  "runtime_agent_id": "optional-runtime-agent-id",
  "spawn_request_id": "optional-spawn-request-id",
  "thread_id": "optional-thread-id",
  "session_id": "optional-session-id",
  "cancel_ref": "optional-platform-cancel-reference",
  "opaque": {}
}
```

All `runtime_refs` fields are optional and platform-specific. `runtime_agent_id` may be unknown at claim time and filled during submit, receipt import, timeout, fail, or abandon diagnostics. Platform cancellation is best-effort: a native cancel handle can help the Main Agent clean up, but Engine authority does not depend on cancellation success. The authoritative facts are still `work_id`, `queue_item_id`, lease/deadline, `receipt_nonce`, Engine state transition, and submitted ledger coverage.

Version 1 has no first-valid-submit-wins multi-active racing. The Main Agent should mark the old attempt `timed_out` or `abandoned` before re-claiming equivalent work. Future speculative racing may add `attempt_group_id`, but it is outside the current replacement scope.

## CLI Contract

The only production delegated-work CLI is:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN --count N
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <id> --result <result.json> [--runtime-agent-id <id>]
node DPT_FRAMEWORK/cli/operate-work-unit.mjs fail <bundle> --work-id <id> --reason <reason>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason <reason>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason <reason>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
```

`submit` uses file-based result input as the canonical interface. Inline JSON is not the production contract because result payloads can be large and must be inspectable as files.

`claim --count N` must claim up to N eligible delegated queue demand items from the queue front under one Engine transaction. It claims only a contiguous prefix of eligible delegated items from `active_window`. It must stop before the first non-delegated, blocking, wrong-phase, expired, or otherwise ineligible queue demand item, and it must not skip over that item unless a future accepted spec explicitly allows reordering. If fewer than N eligible items are available before the blocking point, it succeeds with a partial claim response. If zero are available, it performs no mutation and returns `claimed_count: 0`.

The claim response includes:

- `requested_count`
- `claimed_count`
- `claimed_work_ids`
- `in_flight_count`
- `unclaimed_delegated_count`
- `blocked_by_queue_item_id`
- `phase_drained`

`blocked_by_queue_item_id` is `null` when no queue-front blocker prevented additional claims. `phase_drained` is `true` only when the target phase has no unclaimed delegated queue demand items and no non-terminal or expired delegated in-flight attempts after the claim transaction.

First version has no `--exact` mode.

`claim` must:

- Claim exactly one delegated queue demand item for the phase by default.
- Support `--count N` to claim N eligible delegated queue demand items in one Engine transaction for future parallel fan-out.
- Assign canonical `work_id` values from `_work_units/_index.json` counters.
- Create each matching `_work_units/waveN/{work_id}/` envelope.
- Write task, result schema, beacon, manifest, claimed status, and index entries.
- Mark each queue binding as in flight without relying on `slot_1_current` as the only completable item.
- Compact and refill `active_window` after moving claimed demand items to `delegated_in_flight`.
- Write the effective lease and deadline for each claimed attempt.
- Print the synchronous sub-agent prompt or prompt list.

`submit` must atomically:

- Validate the runtime receipt.
- Validate the kind-specific result schema.
- Verify declared output files and cache trails.
- Write `result.json`, `result.md`, `_agent.json`, and `_status.json`.
- Mark the bound `queue_item_id` complete by `work_id`, even if other claimed work units are still in flight or submits arrive out of order.
- Append the output declaration ledger.
- Render the queue projection.

If any validation fails, `submit` fails closed as a non-terminal rejection. It must not complete the bound `queue_item_id`, must not append ledger coverage, and must not automatically mark the attempt `failed`. The attempt remains `claimed` so the Main Agent can correct the result bundle and retry submit, or explicitly choose `fail`, `timeout`, or `abandon`.

On validation rejection, `submit` must record `last_submit_rejection` in the work-unit index entry and emit trace/log diagnostics. The rejection record must include at least `rejected_at`, `reason_code`, `message`, and any relevant result/receipt hash that was inspected. Rejection diagnostics are not gate coverage and are not a terminal status.

`submit` idempotency:

- If the `work_id` is already `submitted` with the same `result_hash`, `ledger_record_hash`, receipt nonce, output declarations, and ledger row, `submit` returns success without appending a duplicate ledger row.
- If the `work_id` is already `submitted` with different content, `submit` fails closed.
- If the `work_id` is `failed`, `timed_out`, or `abandoned`, `submit` fails closed and instructs repair/refill or retry to allocate a new `work_id`.

Terminal attempt commands:

- `fail` marks the work-unit attempt as `failed`, appends no ledger row, does not complete the bound `queue_item_id`, and requeues the same queue item or enqueues a replacement/repair queue item through Engine state in the same transaction.
- `timeout` marks the work-unit attempt as `timed_out`, appends no ledger row, does not complete the bound `queue_item_id`, removes it from `delegated_in_flight`, records the terminal reason, and requeues/replaces the demand through Engine state in the same transaction.
- `abandon` marks the attempt as `abandoned`, appends no ledger row, does not complete the bound `queue_item_id`, and cancels or replaces the attempt through Engine state in the same transaction.
- Repeating a terminal command against the same `work_id`, same terminal status, and same reason is idempotent.
- A terminal command against a `submitted` work unit, or against a different terminal status/reason than the one already recorded, must fail closed.
- Late `submit` against a `failed`, `timed_out`, or `abandoned` `work_id` must fail closed.

`inspect` is read-only. It reports status counts from `_index.json`, validates that projections match `work_units`, and diagnoses stale, expired, incomplete, orphaned, or transaction-suspect work units. These diagnostic labels are not status enum values.

`operate-queue` boundary:

- `operate-queue` may continue to handle non-delegated main-agent queue work.
- `operate-queue complete` must not complete delegated sub-agent work after this replacement.
- Delegated sub-agent completion must go through `operate-work-unit submit`, which performs result validation, queue completion, index update, and ledger append as one authority transition.

Filesystem transaction rule:

- `claim` and `submit` acquire a bundle-scoped Engine lock before reading or writing queue, index, work-unit files, or ledger.
- Writes use temp files plus atomic rename.
- Multi-file mutations create a transaction journal under `_work_units/_transactions/{tx_id}.json` before mutation and mark it committed only after queue, index, work-unit files, and ledger are consistent.
- `inspect` must fail closed on an uncommitted transaction journal, orphan work-unit directory, missing index entry, duplicate binding, or ledger/index mismatch, and must provide repair advice instead of silently healing authority state.

## Ledger Contract

Wave gates read only ledger declarations produced by `operate-work-unit submit`.

The canonical production work-unit submission ledger is the existing bundle-root file:

```text
rb_output_declarations.jsonl
```

Version 1 does not add `_work_units/_ledger.jsonl` or any second production submission ledger. `_work_units/_index.json` is the allocation and attempt-state registry; it is not the gate coverage ledger.

Production ledger records contain work-unit-only provenance fields:

- `work_id`
- `queue_item_id`
- `wave`
- `kind`
- `producer_rule`
- `work_unit_ref`
- `result_ref`
- `runtime_receipt_ref`
- `receipt_nonce`
- `output_files`
- `cache_trails`
- `creation_reason`
- `result_hash`
- `ledger_record_hash`

The ledger is the gate-readable summary of validated work-unit submission. It is not hand-authored by the Agent and is not reconstructed after gate failure.

Successful submit appends exactly one ledger row for a `work_id`. Same-content duplicate submit returns success without appending another row. Failed validation, `fail`, `timeout`, and `abandon` append no ledger row.

Ledger rows must not contain old relay production fields such as `slot_result_ref`. Work-unit provenance is represented by `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `result_hash`, and `ledger_record_hash`.

## Gate Contract

Wave gates perform aggregate validation over the submitted work-unit ledger coverage for the wave.

Required gate checks become:

- `work_unit_ledger_exists`
- `work_unit_output_coverage`
- `work_unit_submission_presence`
- `delegated_bypass_suspected`

Check meanings:

- `work_unit_ledger_exists` verifies at least one valid Engine-written ledger row for the target wave/kind/scope and rejects hand-authored or schema-invalid ledger rows.
- `work_unit_output_coverage` verifies every expected delegated output path is declared by a matching submitted work-unit ledger row and still exists/schema-valid on disk.
- `work_unit_submission_presence` verifies every counted ledger row binds to a `submitted` work unit whose index entry, manifest, result, receipt, beacon, and hashes agree.
- `delegated_bypass_suspected` detects filesystem-only evidence/search outputs, old relay artifacts, or hand-written declarations that lack submitted work-unit coverage. It is diagnostic evidence for why the gate fails, not an alternate pass authority.

Gate coverage comes only from matching rows in `rb_output_declarations.jsonl`. `_work_units/_index.json`, manifest, result, runtime receipt, beacon, and output files are cross-check surfaces for `work_unit_submission_presence`; none of them independently provide pass coverage without a matching ledger row.

Gate pass requires:

- Ledger coverage for expected phase outputs.
- Valid runtime receipt imported through `operate-work-unit submit`.
- Declared output files present and schema-valid.
- Cache trails present where the work-unit kind requires them.

Gate fail should distinguish:

- Missing work-unit coverage.
- Direct/orphan artifact bypass.
- Invalid receipt/result.
- Missing output or cache trail.
- Content-quality failure after valid work-unit completion.

Direct/orphan artifacts remain non-authoritative. They cannot make a gate pass.

## Spec And Test Direction

The OpenSpec change must make accepted production specs expose exactly one delegated-work path: work units.

Regression tests must prove:

- `rb_queue.json` target v2 shape is nested and ordered, and a `queue_item_id` cannot appear in more than one active location among `active_window`, `refill_pool`, `delegated_in_flight`, and terminal history.
- `claim` creates the correct work-unit envelope for every first-version kind.
- `claim` generates canonical `work_id` values with three-digit `batch_index`, increments `claim_index` inside each batch, increments `batch_index` only for repair/refill batches, and rejects duplicate or malformed IDs.
- Two-digit batch IDs such as `wu-w0-b00-src-i0001` fail validation; three-digit batch IDs such as `wu-w0-b000-src-i0001` pass.
- `claim --count 3` claims only contiguous eligible delegated queue items from the queue front, stops before a non-delegated/blocking item, creates distinct work units, records them as `claimed`, and returns prompts without duplicate IDs.
- `claim --count N` succeeds partially when fewer than N eligible items exist before the queue-front blocker, reports `requested_count` / `claimed_count` / `claimed_work_ids` / `in_flight_count` / `unclaimed_delegated_count` / `blocked_by_queue_item_id` / `phase_drained`, and performs no mutation when `claimed_count` is 0.
- Timeout retry in the same drain keeps the current batch, allocates the next `claim_index`, creates a new `work_id`, and increments `attempt_index` for the same `queue_item_id`.
- Gate-failure or explicit refill opens `b001+` with explicit `batch_reason` and starts a new batch-local `claim_index` sequence.
- Submits may arrive out of order; each submit completes the correct queue binding and ledger row by `work_id`.
- Invalid `submit` leaves the attempt `claimed`, records `last_submit_rejection`, writes no ledger row, and allows a corrected submit.
- A failed, timed-out, or abandoned work unit does not complete the bound `queue_item_id` or append ledger; retry or repair/refill creates a new `work_id`.
- A claimed work unit with expired `deadline_at` is reported stale/expired by read-only `inspect` without state mutation.
- `operate-work-unit timeout` marks the old attempt `timed_out`, removes the binding from `delegated_in_flight`, records terminal reason/runtime refs when available, and appends no ledger.
- Re-claim after timeout allocates a distinct `work_id` with incremented `attempt_index` for the same `queue_item_id`, or explicit lineage for a replacement queue item.
- Late submit from a timed-out `work_id` fails closed and cannot compete with the retry.
- Retry submit through the new `work_id` can complete the original `queue_item_id` binding when the demand was requeued unchanged.
- Runtime refs may be absent, partial, or platform-specific without affecting submit or gate authority.
- `_work_units/_index.json` validates against the declared shape, and `inspect` flags mismatched counters, status counts, queue refs, or encoded fields.
- Receipt nonce mismatch, beacon mismatch, missing transaction commit, duplicate submit with different content, stale queue snapshot hash, and ledger/index mismatch fail closed.
- Successful `submit` atomically completes queue + appends exactly one `rb_output_declarations.jsonl` ledger row.
- Missing receipt, nonce mismatch, invalid result, missing output, missing cache, and wrong `work_id` fail closed without terminalizing the attempt unless `fail`, `timeout`, or `abandon` is explicitly invoked.
- Gates reject ledger rows whose index, manifest, result, receipt, beacon, output-file, or hash binding disagrees.
- Gates no longer read `_subagents`.
- Gates no longer accept `slot_result_ref`.
- Active production specs contain zero production references to `_subagents/wave_NN/slot_MM`, `slot_result_ref`, `drive-relay-slot`, or `subagent_slot_presence`.

Controlled E2E acceptance requires:

- Only `operate-work-unit` is used for delegated work.
- Multiple work units can be claimed, held in flight, and submitted out of order in Wave0 and Wave1 before the gate runs.
- Gate failure creates repair/refill work units and returns to the same loop.
- No mixed provenance path, no hand-written ledger, and no gate pass from direct/orphan artifacts.

## Out Of Scope

- Migrating a specific existing run bundle.
- Adding background/durable parallel sub-agent wakeup.
- Reworking final report synthesis beyond gate-readable delegated provenance.
- Keeping any alternate production delegated-work mechanism.
