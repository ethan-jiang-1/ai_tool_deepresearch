---
node_type: shared
id: shared-subagent-protocol
surface: shared-work-unit-subagent-protocol
authority: agent-facing-guidance
---

# Shared: Work-Unit Sub-Agent Contract

This shared node defines the only production path for delegated sub-agent work:

```text
queue demand item -> operate-work-unit claim -> bundle-root _work_units/waveN/{work_id}/ envelope
  -> native sub-agent execution -> work-unit result + runtime receipt + outputs/cache
  -> operate-work-unit submit -> rb_output_declarations.jsonl -> gate
```

All bare runtime paths in this node are active bundle-root relative. `_work_units/waveN/{work_id}/`, `rb_output_declarations.jsonl`, `_cache/...`, and `_logs/...` refer to the selected `dpt_rb_*` or `dpt_disp_*` bundle, not repo root or `DPT_FRAMEWORK/`.

The surviving concept is the **Sub-agent actor**: a bounded Agent instance that performs search, fetch, extraction, or verification work. The retired concept is the old delegated channel mechanism. Production guidance MUST NOT route delegated work through non-work-unit runtime paths.

## 1. Authority Boundary

| Surface | Authority |
| --- | --- |
| Queue item | Demand identity via `queue_item_id`; it says what work is needed. |
| Work unit | Attempt identity via `work_id`; it binds a queue demand to one delegated attempt. |
| Work-unit envelope | Bounded task, manifest, beacon, result schema, status, runtime receipt, optional runtime refs. |
| Sub-agent actor | Performs the bounded task and writes only the files named by the work-unit task/result contract. |
| `operate-work-unit submit` | Deterministic submit boundary: validates result, receipt, output files, cache trails, queue binding, hashes, and ledger append. |
| `operate-work-unit late-submit` | Explicit audited recovery boundary for eligible `timed_out` attempts only; it validates the original work-unit identity and refuses submitted replacements. |
| `rb_output_declarations.jsonl` | Production delegated submission ledger. Gates use submitted work-unit rows, not filesystem presence. |

Files under `_work_units/waveN/{work_id}/` are runtime/check surfaces. They are necessary for inspection, but they do not satisfy gate coverage by themselves. Gate coverage comes from the submitted ledger row written by Engine submit.

## 2. Work-Unit Envelope

`operate-work-unit claim <bundle> --phase waveN --count <claim-count>` allocates eligible delegated queue-front demand into `_work_units/waveN/{work_id}/`. The CLI remains the allocator of `work_id`; the Phase Agent computes only the bounded top-up count for independent demand.

On successful claim, stdout includes a top-level `continuation` cue with `next_action: inspect_and_poll_claimed_work` and `work_ids` exactly matching `claimed_work_ids`. This is an immediate polling reminder, not readiness evidence, not queue/index authority, and not persistent work-unit state. Empty claim output has no successful continuation cue.

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

0. Reconstruct delegated in-flight work from bundle truth before claiming: `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, `_work_units/waveN/*/_status.json`, work-unit manifests, and submitted ledger rows. A scratch list from chat is convenience only.
1. Compute a bounded top-up `claim-count` for independent eligible demand. Bound it by the independent eligible demand count, the accepted/default cap, and the remaining free delegated in-flight capacity for that wave. Use an explicit profile/runtime cap when accepted; otherwise use the documented conservative default cap for the phase, no higher than 5.
2. If reconstructed in-flight work already reaches the accepted/default cap, poll/submit/terminalize existing attempts before claiming more. `--count 1` is legal for a single remaining item, dependency-blocked front item, accepted cap of 1, or a narrow repair; it is not the normal drain strategy for independent demand.
3. Claim a bounded batch:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN --count <claim-count>
```

Read the returned `continuation` before doing anything else: if work was claimed, inspect and poll those exact `work_ids` without waiting for a user message or task notification.

4. For each returned `prompt_refs[]`, open the `task_ref`, `beacon_ref`, and `result_schema_ref`.
5. Spawn one native Sub-agent per returned `work_id`. Each prompt includes the work-unit identity and output/cache contract.
6. Actively poll runtime readiness with `operate-work-unit inspect <bundle>` or direct bundle-file inspection. Check result, receipt, output, cache, status, and deadline signals for every in-flight attempt.
7. When a claimed work unit is ready, submit promptly:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

Normal `submit` is intentionally fail-closed for terminal attempts. If a `timed_out` target later produces a valid result, do not retry normal submit and do not rewrite it into a retry identity; use the explicit audited recovery command in §7 only when no replacement has submitted.

8. If submit rejects, repair the same claimed attempt when possible. For expired or stale claimed attempts, run progress-aware timeout preflight before terminal timeout:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]
```

Parse structured stdout even when `timeout-preflight` exits non-zero. Follow the closed `recommended_action` branch: `submit` means run formal submit, `repair` means repair the same claimed `work_id`, `wait` means continue polling recent progress, `inspect` means inspect/repair Engine binding or candidate authority, `block` means surface a deterministic blocker, and `timeout` means default terminal timeout is allowed. A progress-positive attempt is not drained until it is submitted, repaired, waited on, inspected/blocked, or explicitly terminalized after preflight allows timeout.
9. Use `fail`, `timeout`, or `abandon` for explicit terminal closure before claiming replacement work. Default `timeout` is valid only after timeout preflight reports `timeout_eligible: true`; `timeout --force --reason <reason>` is exceptional, audited, and not the normal drain path.
10. After successful submit, perform any Phase-owned projection materialization required by the phase, such as Wave1 topic references or existing-backed Wave2 `00-cross` references. These projections must cite submitted backing; they are not delegated evidence authority by themselves.
11. Continue in this order: fill demand, reconstruct in-flight, claim batch, spawn, poll, submit, repair or timeout-preflight, terminalize only when the selected branch allows it, materialize projections, then gate only after queue demand and delegated in-flight work are both drained.

Queue completion commands are for non-delegated queue maintenance/completion only. Delegated success is normal `operate-work-unit submit` for claimed attempts, or explicit audited `operate-work-unit late-submit` for the narrow eligible `timed_out` recovery path.

## 4. Sub-Agent Rules

The Sub-agent actor MUST:

- Read the assigned work-unit `task.md`, `_beacon.json`, and `result.schema.json`.
- Use the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` from the beacon in receipt events and result JSON.
- Produce only the output paths and cache trails allowed by the task/result contract.
- Use real search/fetch/read actions for evidence. Search snippets alone are not evidence.
- Emit concise batch-level progress before and after slow search, fetch, cache, output, and result-draft work. Suitable receipt/log events include `work_started`, `search_batch_started`, `search_batch_done`, `fetch_batch_started`, `fetch_batch_done`, `cache_written`, `result_draft_written`, and `work_done`.
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

For slow work, write progress before and after each bounded batch. Every progress line must carry `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. Progress receipts help timeout preflight distinguish no progress from slow progress; they do not append ledger rows, satisfy source claims, count gate coverage, or replace formal `operate-work-unit submit`.

## 6. Cache And Output Declarations

Every delegated result that writes reference/evidence output SHOULD include:

- `output_files[]`: bundle-relative paths, roles, source URLs for reference outputs, and source slugs.
- `cache_trails[]`: leaf cache directories containing direct `websearch.json`, `page.md`, and `meta.json` files.

The three cache files are the canonical base contract. Assigned `cache_policy.leaf_files` may add required sidecars but cannot remove a base file. `meta.json` must expose at least one source mapping field: `url`, `source_url`, `final_url`, `fetched_url`, or `source_slug`. Placeholder-only `page.md` is invalid unless the same leaf records an explicit degraded/fetch-failure condition.

Submit validates that declared outputs and cache trails exist before appending the submitted ledger row. Gates and file observability reuse the same Engine-owned cache contract and read submitted work-unit rows; they do not award authority for undeclared files.

Return-map producers should prefer unwrapped canonical labels: `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. Inspect also accepts a balanced asterisk-bold presentation such as `**evidence_meaning**:`; underscore emphasis, inline code, misspellings, invalid enums, and non-concrete evidence refs remain invalid.

## 7. Failure And Retry

Use the work-unit lifecycle commands:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <id> [--result <result.json>]
node DPT_FRAMEWORK/cli/operate-work-unit.mjs fail <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason "<reason>" --force
node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase waveN --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
```

Timeout retry allocates a new `work_id` for the same queue demand. Normal late `submit` against terminal attempts is rejected and logged. Explicit `late-submit` may recover only an eligible command-targeted `timed_out` attempt with a non-empty reason, normal submit-valid result/receipt/output/cache/source surfaces, and no submitted replacement. Accepted `late-submit` writes an audited submitted ledger row and removes queued retry demand or abandons an unsubmitted claimed retry. It never recovers `failed` or `abandoned` attempts and never rewrites old output into a retry work-unit identity. Force timeout is an audited escape hatch for exceptional operator decisions after preflight, not a routine response to progress, repairable candidates, or invalid binding.

## 8. Non-Work-Unit Artifacts

Any delegated-looking artifact outside `_work_units/waveN/{work_id}/` and submitted work-unit ledger coverage is diagnostic only. It may explain what happened, but it is not production authority and cannot make a delegated gate pass.
