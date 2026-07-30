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

All bare runtime paths in this node are active bundle-root relative. `_work_units/waveN/{work_id}/`, `rb_output_declarations.jsonl`, `_cache/...`, and `_logs/...` refer to the selected `dpt_rb_*` or `dpt_disp_*` bundle, not repo root or `DPT_FRAMEWORK/`. Every claimed attempt also exposes one canonical absolute `bundle_dir`; use it with the absolute paths returned in `prompt_refs[]` rather than reconstructing a root from cwd or a bundle basename.

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
| `operate-work-unit recover-declaration` | Existing-owner restoration for one already-submitted attempt whose exact Engine declaration row is missing; it accepts only `--work-id`, rebuilds from direct owners, and requires the recorded index/status hash. |
| `rb_output_declarations.jsonl` | Production delegated submission ledger. Gates use submitted work-unit rows, not filesystem presence. |

Files under `_work_units/waveN/{work_id}/` are runtime/check surfaces. They are necessary for inspection, but they do not satisfy gate coverage by themselves. Gate coverage comes from the submitted ledger row written by Engine submit.

## 2. Work-Unit Envelope

`operate-work-unit claim` first evaluates one explicit role-bound actor observation, then allocates eligible delegated queue-front demand into `_work_units/waveN/{work_id}/` only when the actor decision allows it. The CLI remains the sole allocator of `work_id`; no probe service, availability registry, fallback queue, or automatic actor switch exists.

On successful claim, stdout includes a top-level `continuation` cue with `next_action: inspect_and_poll_claimed_work` and `work_ids` exactly matching `claimed_work_ids`. This is an immediate polling reminder, not readiness evidence, not queue/index authority, and not persistent work-unit state. Empty claim output has no successful continuation cue.

Each envelope contains:

| File | Role |
| --- | --- |
| `manifest.json` | Engine-written binding: `work_id`, `queue_item_id`, `kind`, batch/attempt indexes, snapshot hash, output/cache contract, paths. |
| `task.md` | Bounded Sub-agent task and contract-derived Result JSON Starter. This is the primary text to paste into the native sub-agent surface. |
| `result.schema.json` | Shape the Sub-agent result must satisfy. |
| `_beacon.json` | Immutable Engine-written identity, canonical absolute `bundle_dir`, and logging refs, including actor contract version and actual execution actor class. |
| `runtime-receipt.jsonl` | Lifecycle evidence carrying exact work-unit identity plus actor contract version/class. |
| `result.json` | Candidate prepared by the selected actor at the assigned path from the task's Result JSON Starter. Engine dry-submit validates it; formal submit owns canonicalization and acceptance. |
| `_status.json` | Attempt status projection. |
| `_agent.json` | Optional diagnostic runtime refs. These are never authority. |

## 3. Phase-Agent Loop

For delegated queue demand:

0. Reconstruct delegated in-flight work from bundle truth before claiming: `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, `_work_units/waveN/*/_status.json`, work-unit manifests, and submitted ledger rows. A scratch list from chat is convenience only.
1. Read the queue-front delegated `role_key`, then perform one small real native probe for that exact role. The probe does not search, write evidence, allocate a work ID, or authorize a different role. Normalize only direct results as `available/probe_succeeded`, a classified `unavailable` reason, or `unknown/probe_inconclusive`; missing observation is `unknown/not_observed/observation_required`.
2. Compute a bounded top-up `claim-count` for independent eligible demand. Bound it by the independent eligible demand count, the accepted/default cap, and the remaining free delegated in-flight capacity for that wave. Use an explicit profile/runtime cap when accepted; otherwise use the documented conservative default cap for the phase, no higher than 5.
3. If reconstructed in-flight work already reaches the accepted/default cap, poll/submit/terminalize existing attempts before claiming more. `--count 1` is legal for a single remaining item, dependency-blocked front item, accepted cap of 1, or a narrow repair; it is not the normal actor drain strategy for independent demand.
4. Submit the observation and explicit actor choice to the same claim checkpoint. Available actors use `delegated_subagent`; classified unavailable actors may use one `phase_agent_fallback` only when the Engine kind policy allows it:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN --count <claim-count> \
  --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> \
  --actor-role-key <queue-front-role> --actor-reason <normalized-reason> \
  --execution-actor <delegated_subagent|phase_agent_fallback>
```

Read the returned `continuation` before doing anything else: if work was claimed, inspect and poll those exact `work_ids` without waiting for a user message or task notification.

When a supplied actor observation is rejected, read `actor_observation_feedback` rather than reconstructing a tuple from task prose: `planned_role_key`, `primary_conflict`, bounded `conflicts`, the closed `legal_tuples`, and its same-claim `rerun` are projections of the existing claim validator. Correct that one role-bound observation and rerun claim. The generated `## Completion Contract` uses the same role and candidate vocabulary; neither surface creates availability proof, a second actor policy, or a cache-trail rule.

5. Follow the single returned action. For normal claims, spawn one matching native Sub-agent per returned work ID. For an accepted fallback, the Phase Agent executes exactly that one task/beacon itself and submits or terminalizes it before another fallback claim. A no-claim blocker allocates nothing; `repair_kind` assigns the responsible owner but does not place interaction. Perform only the returned probe/host action and rerun the same checkpoint. Under a loaded `stop: no` phase, `external_action` and `missing_contract` do not initiate a question, acknowledgement, status, approval, or wait; preserve the exact boundary and continue any available Agent-owned mechanics. `human-directed` context is not availability evidence or fallback permission.
6. For each returned `prompt_refs[]`, use its canonical absolute `bundle_dir` and open the absolute `task_ref`, `beacon_ref`, `result_schema_ref`, `result_ref`, and receipt/output/cache paths. Confirm that the beacon binds the same root and identity. Do not overwrite, edit, or repair `_beacon.json`; return an immutable binding conflict to the Engine checkpoint.
7. Read the generated Result JSON Starter embedded in `task.md`, then have the selected actor prepare the candidate at the assigned absolute `result_ref`. The starter projects the current schema and checklist; it is not a prewritten result or success authority.
   For a current assignment, read the Engine-owned `assignment_contract_version` and `required_outputs[]`. The actor verifies every exact path/role/`direct_contract` write before `work_done`; none of these fields is actor-selectable.
8. Actively poll runtime readiness with `operate-work-unit inspect <canonical-absolute-bundle_dir>` or direct bundle-file inspection. Check result, receipt, output, cache, status, and deadline signals for every in-flight attempt.
9. When a claimed work unit is ready, the Agent runs dry-submit itself before formal submit:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit "<canonical-absolute-bundle_dir>" --work-id <work_id> --result <absolute-result.json>
```

Read every structured violation and follow the Engine-derived action. `repair_same_candidate` permits only an unambiguous envelope-derived candidate declaration repair after the assigned target passes. `return_to_actor` preserves pre-`work_done` actor ownership. `fail_and_replace` after `work_done` means fail with `semantic_contract:<primary_root_code>`, explicitly enqueue the same assignment obligation under a fresh queue ID, and claim real replacement execution. `inspect_contract` stays at the Engine/maintenance boundary. Missing semantic output, receipt, source, and cache facts remain actor-owned; never transfer their authorship to the Phase Agent under returned actor provenance. Rerun the same dry-submit checkpoint after legal repair. Do not ask the user to operate the pipeline, guess an internal lineage field, edit Engine-owned authority, or switch identity without the explicit replacement boundary. After dry-submit passes, run formal submit; formal submit remains the sole normal acceptance and delegated success authority:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "<canonical-absolute-bundle_dir>" --work-id <work_id> --result <absolute-result.json>
```

Normal `submit` is intentionally fail-closed for terminal attempts. If a `timed_out` target later produces a valid result, do not retry normal submit and do not rewrite it into a retry identity; use the explicit audited recovery command in §7 only when no replacement has submitted.

10. If formal submit rejects because mutable facts changed after dry-submit, repair the same claimed attempt when possible and return to dry-submit. For expired or stale claimed attempts, run progress-aware timeout preflight before terminal timeout:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]
```

Parse structured stdout even when `timeout-preflight` exits non-zero. Follow the closed `recommended_action` branch: `submit` means run formal submit, `repair` means repair the same claimed `work_id`, `wait` means continue polling recent progress, `inspect` means inspect/repair Engine binding or candidate authority, `block` assigns the deterministic blocker to its named owner and leaves the attempt undrained without initiating a user wait, and `timeout` means default terminal timeout is allowed. A progress-positive attempt is not drained until it is submitted, repaired, waited on, inspected/blocked, or explicitly terminalized after preflight allows timeout.

Read `recommendation_basis` alongside that action: its closed `candidate`, `progress`, `lease`, or `integrity` branch exposes the already selected direct facts behind the recommendation. It does not run another candidate evaluator, extend a lease, authorize a timeout, or turn advice into a new attempt authority.
11. If a normal native spawn fails with a classified unavailable reason before any work-started receipt or Engine-observed output/cache progress, run `fail --reason actor_spawn_unavailable:<reason_code>`, perform a fresh role-matching probe, and make a new claim. Do not convert the existing work ID in place and do not offer `abandon` as a competing recovery. Progress-positive attempts remain on inspect/repair/timeout-preflight paths.
12. After successful submit, perform any Phase-owned projection materialization required by the phase, such as Wave1 topic references or existing-backed Wave2 `00-cross` references. These projections must cite submitted backing; they are not delegated evidence authority by themselves.
   For Phase-owned projection files, retain a completed staging source and use `operate-artifact-persistence.mjs persist` before indexing or consuming the target. Producer-owned output/cache files may use the same persistence command before formal submit, but `operate-work-unit submit` remains the transaction owner that validates and normalizes declared outputs/cache and appends ledger authority.
13. Continue in this order: fill demand, reconstruct in-flight, probe the queue-front role, claim, execute the selected actor path, poll, dry-submit and repair the same candidate, formal submit, timeout-preflight or terminalize only when the selected branch allows it, materialize projections, then gate only after queue demand and delegated in-flight work are both drained.

Compatibility summary: claim batch, spawn the selected actor, poll, dry-submit and repair the same candidate, formal submit, terminalize when authorized, materialize Phase-owned projections, then gate.

Sub-agent prompts, generated `task.md`, actor decisions, persistence verdicts, and work-unit continuation cues return facts and work to the Phase Agent. None creates a user-facing checkpoint, interaction authority, or claim-level placement truth; the loaded lifecycle node remains the only placement owner.

Default `timeout` is valid only after timeout preflight reports `timeout_eligible: true`; `timeout --force --reason <reason>` remains exceptional and audited.

Queue completion commands are for non-delegated queue maintenance/completion only. Delegated success is normal `operate-work-unit submit` for claimed attempts, or explicit audited `operate-work-unit late-submit` for the narrow eligible `timed_out` recovery path.

If Gate/inspect reports an already-submitted work ID with a missing declaration and returns `recover-declaration` as the legal Engine operation, the Agent runs that exact resolved command and reruns the named checkpoint:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration "<canonical-absolute-bundle_dir>" --work-id <submitted_work_id>
```

This operation does not accept `--result`, submit new research, complete queue demand, change index/status hashes, or make reconstructable index/result files count directly. Never hand-write `rb_output_declarations.jsonl`; if direct owners cannot reproduce the recorded hash, preserve the failed boundary instead of inventing a row.

## 4. Sub-Agent Rules

The Sub-agent actor MUST:

- Read the assigned work-unit `task.md`, `_beacon.json`, and `result.schema.json`.
- Use the exact `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `actor_contract_version`, and `execution_actor_class` from the beacon in receipt events and result JSON.
- Produce only the output paths and cache trails allowed by the task/result contract.
- Retain completed staging sources until crash-safe persist reports `committed`; if persistence is used for assigned outputs/cache, formal work-unit submit still owns acceptance and normalization.
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
- Overwrite or edit immutable `_beacon.json`.
- Claim retrospective provenance: work that predates the claim cannot become execution evidence for the claimed attempt, and no post-hoc receipt/result may assert otherwise.

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
  "actor_contract_version": "work-unit.actor.v1",
  "execution_actor_class": "delegated_subagent",
  "ts": "2026-07-06T00:00:00.000Z"
}
```

Append lifecycle evidence directly as JSONL to the assigned `runtime-receipt.jsonl`. `DPT_FRAMEWORK/cli/log-event.mjs` is optional diagnostic mirroring only: it may help forensics, but never satisfies or replaces the runtime receipt. Submit/gate authority still comes from Engine validation and the submitted ledger row.

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
node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase waveN --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
```

Timeout retry allocates a new `work_id` for the same queue demand. Normal late `submit` against terminal attempts is rejected and logged. Explicit `late-submit` may recover only an eligible command-targeted `timed_out` attempt with a non-empty reason, normal submit-valid result/receipt/output/cache/source surfaces, and no submitted replacement. Accepted `late-submit` writes an audited submitted ledger row and removes queued retry demand or abandons an unsubmitted claimed retry. It never recovers `failed` or `abandoned` attempts and never rewrites old output into a retry work-unit identity. Force timeout is an audited escape hatch for exceptional operator decisions after preflight, not a routine response to progress, repairable candidates, or invalid binding.

## 8. Non-Work-Unit Artifacts

Any delegated-looking artifact outside `_work_units/waveN/{work_id}/` and submitted work-unit ledger coverage is diagnostic only. It may explain what happened, but it is not production authority and cannot make a delegated gate pass.
