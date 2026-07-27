---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: work_unit_required
  delegated_role_keys:
    - dpt-source-intake
requires:
  - shared/shared-profile
  - shared/shared-schemas
  - shared/shared-silent-execution
  - shared/shared-subagent-protocol
  - shared/shared-reference-template
  - shared/shared-anti-cheating-rules
  - templates/seed-topic-template
suggested_context:
  - phases/subagent-dpt-source-intake
---

# Phase: Wave0 — Foundation Shared Reference

## 0. Execution Brief

- **Objective**: collect foundation source metadata and shared reference evidence for every topic.
- **Start here**: load `rb_queue.json`, `rb_plan.md` topic registry and, when present, `## Constraints > User Research Controls`, seed topic files, profile thresholds, and `dpt-source-intake` role guidance.
- **Delegated path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit dry-submit` repair loop -> formal `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: side-effect-free `inspect-wave0-output.mjs` passes first, then `check-gate-wave0-complete.mjs` passes for `phases/phase-wave0.md`.
- **Failure posture**: do not direct-search from the Phase Agent as a substitute for delegated evidence. Use submit rejection, terminal attempt closure, refill, and gate feedback.

## 1. Stage Goal

Create `artifacts/wave0/{topic}/source.yaml` for each topic and shared foundation references under `reference/00-shared-*.md`.

Wave0 is foundation evidence collection, not comprehensive research. Exact floors come from `rb_profile.yaml#/research_style_params`, especially `wave0_per_topic_source_floor` and `wave0_shared_ref_total`.

For each delegated source-intake task, derive the initial candidate URL/source target from explicit profile/runtime floors plus a conservative small margin. Use `wave0_per_topic_source_floor` as the per-topic floor basis and `wave0_shared_ref_total` or other accepted shared-reference target surfaces when planning shared references. The margin is only a planning buffer for inaccessible pages, duplicates, and non-countable sources; it is not a gate threshold, profile field, quality override, or permission to lower coverage.

## 2. Required Inputs

- Active bundle that passed `seed-topics-ready`.
- `rb_plan.md` frontmatter `topic_registry`.
- `rb_profile.yaml` research style params.
- `shared-reference-template.md` through this phase's `requires` chain and the source-intake actor's delivered role guidance.
- `DPT_FRAMEWORK/cli/operate-queue.mjs` for enqueue/check/non-delegated maintenance.
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs` for delegated claim/submit/fail/timeout/abandon/inspect.
- `shared-subagent-protocol.md` for work-unit envelope and Sub-agent rules.

When a valid user-controls snapshot is present, read its original host-file coordinate as guidance alongside profile floors and seed-topic instructions. It may guide source selection, evidence treatment and presentation, but never lowers provenance/source floors or changes receipt, Gate, queue or lifecycle authority. Before claim, the Phase Agent MAY append one sentence to the existing `task_brief`: `Read rb_plan.md## Constraints > User Research Controls through your existing beacon-rooted bundle coordinate; it is read-only research guidance.` Only add it when controls are present; do not copy controls into queue payload machine fields, manifest/result/receipt, or an empty brief.

## 3. Allowed Actions

### 3.0 Classify Direct Facts

Before filling demand, classify each current canonical Topic from direct bundle authority, not from rerun history or filesystem appearance:

- `existing Topic + valid submitted Wave0 coverage -> reuse` that submitted historical coverage.
- `new Topic + no submitted Wave0 coverage -> normal Topic pipeline` beginning with normal Wave0 demand.
- `supplement intent -> normal supplementary demand` through the same `wave0_source_intake` producer path.
- orphan `source.yaml` -> not coverage; a filesystem-only artifact is diagnostic until a real claimed attempt submits it through normal authority.

This classification is the same for first-run and rerun-added Topics. It creates no rerun Gate exception, mode, controller, submit path, or provenance namespace. Work that predates a claim cannot be converted into current claimed-attempt provenance: do not manufacture a receipt/result after the fact or attach post-hoc provenance to an orphan artifact.

### 3.1 Fill Queue

If `operate-queue check <bundle>` reports an empty or thin queue, enqueue one delegated queue item for each Topic classified as normal new-topic demand or normal supplementary demand. Do not enqueue duplicate work for an existing Topic whose valid submitted Wave0 coverage is being reused.

Task card template:

```json
{
  "queue_item_id": "wave0-source-{topic.slug}",
  "title": "Source intake: {topic.title}",
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-source-intake",
      "timeout_ms": 600000
    }
  },
  "kind": "wave0_source_intake",
  "producer_rule": "source_intake_fan_in",
  "priority_class": "P5_new_reference_intake",
  "action": "Search foundation references for {topic.title}; fetch page content; write artifacts/wave0/{topic.slug}/source.yaml. When this work unit is used to repair missing shared_ref_count_floor coverage, the actor MUST also write reference/00-shared-<slug>.md as a declared reference output with a real source_url; do not create it directly as the Phase Agent. Write leaf cache trails under _cache/wave0/primary/{topic.slug}/; return output_files[] and cache_trails[] for work-unit submit.",
  "writes_to": [
    "artifacts/wave0/{topic.slug}/source.yaml",
    "reference/00-shared-<slug>.md"
  ],
  "required_receipts": [
    "file:artifacts/wave0/{topic.slug}/source.yaml"
  ],
  "done_condition": "source.yaml exists, validates as ReferenceMetadata, and contains at least one real source",
  "verification": {
    "engine": ["work_unit_submit"],
    "agent": ["url_accessible", "title_matches_page", "cache_trails_complete"]
  },
  "status_sync": ["wave0_source_intake_submitted"],
  "completion_receipt": "work_unit:submitted-ledger",
  "failure_route": "work_unit_repair",
  "payload": {
    "topic_slug": "{topic.slug}",
    "topic_title": "{topic.title}",
    "wave": 0
  },
  "lineage": {
    "topic_slug": "{topic.slug}",
    "phase": "wave0"
  }
}
```

Enqueue:

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wave0-source-{topic.slug}.json
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```

### 3.2 Delegated Drain Loop

Repeat the shared batch-poll-submit loop until the queue and delegated in-flight work are drained. Before claiming, reconstruct in-flight Wave0 work from `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, and `_work_units/wave0/*` status/result/receipt surfaces.

Compute a bounded top-up `claim-count` from:

- independent eligible Wave0 source-intake demand;
- the accepted/default cap for the run, conservatively no higher than 5 when no accepted profile/runtime cap exists;
- remaining free delegated in-flight capacity after reconstructed in-flight work is counted.

If reconstructed in-flight work already reaches the accepted/default cap, poll, submit, repair, or terminalize those attempts before claiming more. Use `--count 1` only for a single remaining item, dependency-blocked front item, accepted cap of 1, or a narrow repair.

```bash
First inspect the queue-front planned role and perform one bounded real `dpt-source-intake` native probe. Do not claim a batch to test availability or reuse this observation for another role.

node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count <claim-count> --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key dpt-source-intake --actor-reason <normalized-reason> --execution-actor <delegated_subagent|phase_agent_fallback>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
```

For each claimed work unit, use the claim output's canonical absolute `bundle_dir` and absolute `prompt_refs[]` paths. Never derive the bundle root from cwd, append a bundle basename, or switch to a same-named nested directory.

1. Read `prompt_refs[].task_ref`, `beacon_ref`, and `result_schema_ref` at their returned absolute paths. Confirm that `_beacon.json` carries the same canonical absolute `bundle_dir`. Treat the beacon as immutable: do not overwrite, edit, or repair `_beacon.json`; an identity/root conflict belongs at the Engine checkpoint.
2. Spawn the Sub-agent with the generated prompt.
3. Require real search and page fetch following the per-URL access sequence in `shared-page-fetch-guidance.md`. When page fetch is blocked or unavailable at every prior tier, and independent shell/network permission exists, make at most one bounded `curl` request for that same URL. Do not use search snippets as evidence.
4. Plan candidate URLs from the explicit `rb_profile.yaml#/research_style_params.wave0_per_topic_source_floor` plus a conservative small margin for fetch failures, duplicates, and non-countable pages. When shared foundation references are assigned, bind the shared-reference target to `wave0_shared_ref_total` or another explicit runtime/profile surface plus the same conservative margin. Do not use a fixed hard-coded fetch aim unless it is written as `profile/runtime floor + named margin`.
5. Read the generated Result JSON Starter in `task.md`, then have the selected actor prepare the candidate `result.json` at the assigned absolute result path and write the declared output files and leaf cache trails. The starter is guidance generated from the active contract, not a prewritten result or alternate authority.
6. Ensure `runtime-receipt.jsonl` events carry `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
7. Actively poll result/receipt/output/cache readiness without waiting for user continuation or task notification.
8. The Agent executes the authorized mechanical validation and repair steps. Dry-submit the ready candidate before formal submit:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit "<canonical-absolute-bundle_dir>" --work-id <work_id> --result <absolute-result.json>
```

Read every structured violation. Repair the same candidate and same claimed attempt only at the exact authorized `write_to` coordinate, then rerun that same dry-submit command. Do not replace the claim identity, edit Engine-owned authority, or ask the user to run ordinary work-unit commands. When dry-submit passes, run formal submit:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "<canonical-absolute-bundle_dir>" --work-id <work_id> --result <absolute-result.json>
```

When a producer writes assigned `artifacts/`, `reference/`, or `_cache/` content through a completed staging file, it may use `operate-artifact-persistence.mjs persist` before submit and must retain staging until `committed`. This does not replace `operate-work-unit submit`, its cache normalization, or submitted-ledger authority.

If formal submit rejects because mutable facts changed after dry-submit, repair the same claimed attempt when possible and return to the same dry-submit checkpoint before another formal submit. For every expired or stale claimed attempt, run timeout preflight before terminal timeout:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]
```

Parse structured stdout even when timeout preflight exits non-zero. Follow `recommended_action` exactly: `submit` runs formal submit; `repair` repairs the same `work_id`; `wait` continues active polling; `inspect` inspects and repairs candidate or Engine binding; `block` assigns the deterministic blocker to its named owner and leaves the phase undrained without initiating a user wait; `timeout` permits normal terminal timeout. Only after that decision may the Phase Agent use an explicit close command:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs fail <bundle> --work-id <work_id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <work_id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <work_id> --reason "<reason>"
```

When dry-submit reports `fail_and_replace` after `work_done`, terminalize the current attempt with the supplied semantic-contract reason, then invoke:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs replace <bundle> --work-id <terminal_work_id>
```

Read the structured replacement result. For a newly created or queued successor, perform one exact-role native probe and run the normal `claim` command for the returned wave; do not hand-author an equivalent queue card or infer a queue ID. For an already in-flight idempotent successor, use its disclosed existing `work_id` to reconstruct and actively poll the attempt; do not claim again. The parent remains terminal, and neither branch discovers a successor from `_work_units`.

`timeout --force --reason <reason>` is an exceptional audited operator choice after inspection, not the normal response to progress, repairable candidates, or invalid binding. Do not use queue completion commands for delegated success, and do not run the Wave0 gate while preflight recommends `submit`, `repair`, `wait`, `inspect`, or `block` for any in-flight attempt.

### 3.3 Seed Projection Update

After each successful submit, never edit a seed, heading, card, or token. `templates/seed-topic-template` gives the Wave0 slot/card and rendered-entry shape. For each affected current canonical topic, read the current eligible submitted Wave0 row, then use the complete packet, authorization and repair protocol in `command_playbook/operate-topic-state.md` to retain one `wave_projection/apply_seed_projection` packet for `wave0_evidence` and invoke existing `operate-topic-state apply` in this loaded Wave0 window. Its entry identity is `<work_id>/<positive ordinal>`; evidence-bearing entries lead with a concrete existing `reference/00-shared-*.md` ref, while `source.yaml`, `_cache/`, and `_work_units/` remain secondary provenance.

When no consumer reference is materializable, retain an identity-bound `defers` / `deferred` entry with `refs: [none]` and an explicit limitation in `next_hop`. The writer consumes a first token or upserts the matching identity atomically; Phase prose never decides which path applies. A missing writer window, canonical binding, or submitted authority is its direct lifecycle/owner boundary, not permission for a user or Agent to hand-edit bytes.

## 4. Expected Artifacts

- `artifacts/wave0/{topic}/source.yaml` for every topic.
- `reference/00-shared-*.md` when shared foundation references exist.
- `reference/_INDEX.md` summarizing available references.
- Submitted work-unit rows in `rb_output_declarations.jsonl` covering delegated outputs and cache trails.
- Seed-topic Wave0 projections materialized through the existing packet writer, with concrete existing `reference/00-shared-*.md` refs as primary consumer navigation; `source.yaml`, `_cache/`, and `_work_units/` refs may appear only as secondary provenance.
- `rb_trace.jsonl` records the `wave0_completion` event/check surface required by the Wave0 gate definition.

## 5. Gate Command

After `rb_queue.json#/active_window`, `#/refill_pool`, and `#/delegated_in_flight` are all empty and each affected current Topic has its Wave0 packet applied, run the Wave0 inspect before recording completion evidence or invoking the formal gate. Do not infer away future-looking residual demand. If `phase_queue_drained` fails, the Agent follows its returned queue/work-unit owner and reruns this same checkpoint; a refill-only `missing_contract` does not authorize queue hand edits.

```bash
node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle <path>
```

This inspect is side-effect-free and non-routing. If it names a projection packet/entry root, repair the retained packet through the existing writer and rerun this same inspect; if it names unavailable authority or layout, follow that direct owner boundary. Do not create a second local validator, hand-edit a seed, or treat an internal artifact/cache ref as a substitute for concrete consumer navigation.

Only after inspect passes, record or refresh the existing `wave0_completion` evidence through the normal phase logging path, then run the formal gate and read its JSON output before deciding the next action:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Then consume `check.next` before synchronizing the just-passed source gate:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave0_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave0 passed; it is not the next-phase loader.

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。不得从 legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段或命令。`repair_kind` 只分配责任，当前 loaded node 的 `stop` 才决定 interaction placement；本 phase 为 `stop: no`，任何分类都不得主动发起提问、状态/进度、approval、acknowledgement 或等待。用户主动的 current turn 可从 direct facts 得到直接回答，但回答不创建 checkpoint、state、permission、route、mutation 或 reentry authority。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 Wave0 mutable surface 时，由 Agent 修复 exact field/file；不得把 filesystem-only artifact 追认为 submitted coverage。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal queue/work-unit/topic/lifecycle operation；不得要求用户运行普通命令，也不得直接编辑 status、trace、ledger、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：识别 `missing_fact` 指出的真实语义/风险决定。Wave0 是 `stop: no`，不得由 hint 创造新 HITL、repair controller 或 lifecycle；没有 accepted decision path 时保持当前 checkpoint failed。
4. `repair_kind: external_action`：识别当前环境不可代理的 actor/search/fetch/permission 前置条件；不主动请求 acknowledgement，满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：保留 exact unavailable capability/contract boundary，不提供手写 authority、用户等待、绕过 Gate 或平行成功路径。

Hint 不创造 permission、controller 或 lifecycle。完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 Wave0 checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

仅当 structured hint 的 `missing_fact` / `write_to` 明确识别 `per_topic_count_floor`、`shared_ref_count_floor` 或缺失 submitted backing，并且 normal supplementary demand 是现有合法路径时：

1. Enqueue supplementary delegated queue items with `kind: "wave0_source_intake"` and `priority_class: "P1_state_or_gate_repair"`.
2. Drain through the same work-unit claim/submit path.
3. Run the hint's exact `rerun`.

Supplementary tasks must append or add real sources only. They must not overwrite existing `source.yaml`, create placeholder URLs, or fabricate `reference/00-shared-*.md`.

Gate repair/refill handles remaining floor gaps. Do not treat the planning margin as pass authority, do not silently lower floors, and do not create a new numeric threshold outside the accepted profile/runtime surfaces.

## 8. Stop Behavior

Do not stop for progress, idle/no-work, or partial-completion reporting. Phase completion condition is gate pass: structural and work-unit provenance checks must pass through the Wave0 gate CLI. After gate pass, consume `check.next` through `enter-phase` and continue to Wave1.

## 9. Anti-Cheating Rules

- 禁止把 direct filesystem artifacts 当作 delegated evidence；delegated Wave0 outputs require submitted work-unit ledger rows.
- 禁止用 `operate-queue complete` 完成 delegated source intake.
- 禁止手写 `rb_output_declarations.jsonl` rows, work-unit result files, receipts, or trace events.
- 禁止把 search snippets 当作 fetched source evidence.
- 禁止 claim 后跳过 Sub-agent task instructions and submit a fabricated result.
- 禁止以 token replacement、raw Markdown patch、heading/path/line number 或手改 seed 完成 Wave0 projection。
- 禁止把 Wave0 projection 写成 naked URL/evidence list or generic `Wave0 submitted` prose; retain a packet entry with identity, fields, and refs.
- 禁止让 orphan `reference/00-shared-*.md` satisfy gate coverage.
- 禁止修改 `_work_units/_index.json` to repair submit or inspect failures.
- 禁止覆盖、编辑或“修复” immutable `_beacon.json`; use the canonical absolute `bundle_dir` and Engine checkpoint named by the failure.
- 禁止给 claim 前已经存在的 work/output 补写 retrospective receipt/result or post-hoc provenance；旧文件不能成为当前 claimed attempt 的 execution evidence.
- 禁止把 gate console confidence当作 verdict；read gate JSON and trace/check artifacts.
- 禁止在 repeated failure 后静默推进；use gate `inspect`/`advice`, terminal attempt commands, or refill.
