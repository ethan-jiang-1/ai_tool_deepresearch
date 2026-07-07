---
node_type: shared
id: shared-subagent-protocol
surface: shared-work-unit-subagent-protocol
authority: agent-facing-guidance
---

# Shared: Work-Unit Sub-Agent Contract

This shared node defines the only production path for delegated sub-agent work:

```text
queue demand item -> operate-work-unit claim -> _work_units/waveN/{work_id}/ envelope
  -> native sub-agent execution -> work-unit result + runtime receipt + outputs/cache
  -> operate-work-unit submit -> rb_output_declarations.jsonl -> gate
```

The surviving concept is the **Sub-agent actor**: a bounded Agent instance that performs search, fetch, extraction, or verification work. The retired concept is the old delegated channel mechanism. Production guidance MUST NOT route delegated work through non-work-unit runtime paths.

## 1. Authority Boundary

| Surface | Authority |
| --- | --- |
| Queue item | Demand identity via `queue_item_id`; it says what work is needed. |
| Work unit | Attempt identity via `work_id`; it binds a queue demand to one delegated attempt. |
| Work-unit envelope | Bounded task, manifest, beacon, result schema, status, runtime receipt, optional runtime refs. |
| Sub-agent actor | Performs the bounded task and writes only the files named by the work-unit task/result contract. |
| `operate-work-unit submit` | Deterministic submit boundary: validates result, receipt, output files, cache trails, queue binding, hashes, and ledger append. |
| `rb_output_declarations.jsonl` | Production delegated submission ledger. Gates use submitted work-unit rows, not filesystem presence. |

Files under `_work_units/waveN/{work_id}/` are runtime/check surfaces. They are necessary for inspection, but they do not satisfy gate coverage by themselves. Gate coverage comes from the submitted ledger row written by Engine submit.

## 2. Work-Unit Envelope

`operate-work-unit claim <bundle> --phase waveN [--count N]` allocates eligible delegated queue-front demand into `_work_units/waveN/{work_id}/`.

Each envelope contains:

| File | Role |
| --- | --- |
| `manifest.json` | Engine-written binding: `work_id`, `queue_item_id`, `kind`, batch/attempt indexes, snapshot hash, output/cache contract, paths. |
| `task.md` | Bounded Sub-agent task. This is the primary text to paste into the native sub-agent surface. |
| `result.schema.json` | Shape the Sub-agent result must satisfy. |
| `_beacon.json` | Copyable identity and logging refs: bundle path, `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, receipt path. |
| `runtime-receipt.jsonl` | Sub-agent lifecycle evidence. Events must carry `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. |
| `result.json` | Written by Engine submit after validation. The Sub-agent may prepare a result file, but submit owns acceptance. |
| `_status.json` | Attempt status projection. |
| `_agent.json` | Optional diagnostic runtime refs. These are never authority. |

## 3. Phase-Agent Loop

For delegated queue demand:

1. Run `node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN [--count N]`.
2. For each returned `prompt_refs[]`, open the `task_ref`, `beacon_ref`, and `result_schema_ref`.
3. Spawn a native sub-agent with the generated prompt. The prompt includes the work-unit identity and output/cache contract.
4. The Sub-agent performs real search/fetch/extraction and writes declared output files plus cache trails.
5. The Sub-agent writes lifecycle receipt events to the assigned `runtime_receipt_ref`.
6. The Sub-agent prepares a result JSON matching `result.schema.json`.
7. Run `node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>`.
8. If submit rejects, repair the same claimed attempt when possible. Use `fail`, `timeout`, or `abandon` only for explicit terminal closure.
9. When `claim` reports `phase_drained: true`, run the phase gate.

Queue completion commands are for non-delegated queue maintenance/completion only. Delegated success is `operate-work-unit submit`.

## 4. Sub-Agent Rules

The Sub-agent actor MUST:

- Read the assigned work-unit `task.md`, `_beacon.json`, and `result.schema.json`.
- Use the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` from the beacon in receipt events and result JSON.
- Produce only the output paths and cache trails allowed by the task/result contract.
- Use real search/fetch/read actions for evidence. Search snippets alone are not evidence.
- Keep optional platform thread/session/spawn/cancel IDs only under `runtime_refs` diagnostic metadata when requested.
- Return concise structured result JSON. Do not dump raw search trails into the result.

The Sub-agent actor MUST NOT:

- Mutate `rb_queue.json`, `rb_status.json`, gates, chain transitions, or `rb_output_declarations.jsonl`.
- Hand-write submitted ledger rows or mark a queue item done.
- Treat filesystem presence, index state, cache presence, or runtime refs as gate authority.
- Write outside the assigned bundle-relative output/cache paths.
- Continue after `deadline_at` without the Phase Agent explicitly closing or retrying the attempt.

## 5. Receipt And Logging Contract

Lifecycle receipt events are JSONL lines at the envelope `runtime_receipt_ref`.

Minimum identity fields:

```json
{
  "schema_version": "work-unit.receipt-event.v1",
  "event": "work_done",
  "work_id": "wu-w1-b000-deep-i0001",
  "queue_item_id": "topic-a",
  "kind": "wave1_topic_deepening",
  "receipt_nonce": "<nonce>",
  "ts": "2026-07-06T00:00:00.000Z"
}
```

Diagnostic logs go through `DPT_FRAMEWORK/cli/log-event.mjs` when useful. They are useful for forensics, but submit/gate authority still comes from Engine validation and the submitted ledger row.

## 6. Cache And Output Declarations

Every delegated result that writes reference/evidence output SHOULD include:

- `output_files[]`: bundle-relative paths, roles, source URLs for reference outputs, and source slugs.
- `cache_trails[]`: leaf cache directories containing direct `websearch.json`, `page.md`, and `meta.json` files.

Submit validates that declared outputs and cache trails exist before appending the submitted ledger row. Gates and file observability read submitted work-unit rows; they do not award authority for undeclared files.

## 7. Failure And Retry

Use the work-unit lifecycle commands:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs fail <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase waveN --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
```

Timeout retry allocates a new `work_id` for the same queue demand. Late submits against terminal attempts are rejected and logged.

## 8. Non-Work-Unit Artifacts

Any delegated-looking artifact outside `_work_units/waveN/{work_id}/` and submitted work-unit ledger coverage is diagnostic only. It may explain what happened, but it is not production authority and cannot make a delegated gate pass.
