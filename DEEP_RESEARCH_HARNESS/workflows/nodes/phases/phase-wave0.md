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
  - shared/shared-return-map-authoring
  - shared/shared-reference-template
  - shared/shared-anti-cheating-rules
  - templates/seed-topic-template
suggested_context:
  - phases/subagent-dpt-source-intake
---

# Phase: Wave0 — Foundation Shared Reference

## 0. Execution Brief

- **Objective**: collect foundation source metadata for every topic, then use submitted backing for any required shared reference consumer projections.
- **Start here**: load `rb_queue.json`, `rb_plan.md` topic registry, the `## Constraints > ### User Research Controls` baseline when present, the newest complete matching `## Decisions` revision on rerun, seed topic files and matching current directions, profile thresholds, and `dpt-source-intake` role guidance.
- **Entry prerequisite**: after `enter-phase` loads this node, run `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to seed_topics_ready` before Wave0 work or its Gate; this synchronizes the passed source gate and does not prove Wave0 completion.
- **Delegated path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit dry-submit` repair loop -> formal `operate-work-unit submit` -> submitted Wave0 contribution -> Phase materialization or deferred projection -> same inspect -> gate.
- **Canonical closeout loop**: packet -> writer -> same inspect -> gate.
- **Completion check**: side-effect-free `inspect-wave0-output.mjs` passes first, then `check-gate-wave0-complete.mjs` passes for `phases/phase-wave0.md`.
- **Failure posture**: do not direct-search from the Phase Agent as a substitute for delegated evidence. Use submit rejection, terminal attempt closure, refill, and gate feedback.

## 1. Stage Goal

Create `artifacts/wave0/{topic}/source.yaml` for each topic. After formal submit,
the Phase Agent may materialize backed shared foundation consumer projections at
`reference/00-shared-*.md`.

Each new shared projection uses `related_topic_uid: all` in the shared reference
metadata template. Do not select the historical `related_topic` field for a
new Wave0 file.

Wave0 is foundation evidence collection, not comprehensive research. Exact floors come from `rb_profile.yaml#/research_style_params`, especially `wave0_per_topic_source_floor` and `wave0_shared_ref_total`.

For each delegated source-intake task, derive the initial candidate URL/source target from explicit profile/runtime floors plus a conservative small margin. Use `wave0_per_topic_source_floor` as the per-topic floor basis and `wave0_shared_ref_total` or other accepted shared-reference target surfaces when planning shared references. The margin is only a planning buffer for inaccessible pages, duplicates, and non-countable sources; it is not a gate threshold, profile field, quality override, or permission to lower coverage.

## 2. Required Inputs

- Current run bundle that passed `seed-topics-ready`.
- `rb_plan.md` frontmatter `topic_registry`.
- `rb_profile.yaml` research style params.
- `shared-reference-template.md` through this phase's `requires` chain for Phase-owned materialization after formal submit; the current source-intake actor does not load it as a completion route.
- `DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs` for enqueue/check/non-delegated maintenance.
- `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs` for delegated claim/submit/fail/timeout/abandon/inspect.
- `shared-subagent-protocol.md` for work-unit envelope and Sub-agent rules.
- `shared-return-map-authoring.md` and `templates/seed-topic-template.md` through this phase's `requires` chain; `command_playbook/operate-topic-state.md` remains the sole complete packet/apply/repair protocol.

Current intent is read from the applicable HITL1 baseline plus, on a current-contract rerun, the newest complete Decisions revision whose target count matches the current profile `rerun_count`; for an affected Topic, also read only its matching current `## 本轮重跑方向`. Older revisions and stale/future/invalid/legacy-unbound directions remain history or repair context, not current instructions. A readable legacy rerun without a Decisions revision keeps its existing profile/direction compatibility path and does not receive inferred history.

At the actual Wave0 enqueue point, before claim, the Phase Agent SHALL author the existing queue-owned `task_brief` for every intent-affected demand. Keep it bounded and task-local: state the foundation-source objective; name `seed_topics/{topic.slug}.md`; name `rb_plan.md## Constraints > ### User Research Controls` only when present; on rerun name `rb_plan.md## Decisions > ### Rerun intent revision: <current rerun_count>` and `seed_topics/{topic.slug}.md## 本轮重跑方向`; and state that only a direction matching the current profile count is instruction, while stale/future/invalid/legacy-unbound directions are not. Use the work unit's existing beacon-rooted bundle coordinate. Do not copy complete user wording or create queue payload, manifest, result, receipt, permission, or Gate fields. If none of these sources materially affects the demand, omit the optional brief and retain existing behavior rather than create an empty one. The Engine carries an authored brief unchanged through its existing queue/work-unit/task path; it does not interpret it.

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

For each affected item, resolve the current intent sources above and write a one-item `task_brief` before enqueue. The bounded objective belongs to Wave0's `source_intake_fan_in` decision; Seed Topics must not pre-author this future queue work. In the template below, include `task_brief` only when applicable:

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
  "task_brief": "Foundation-source objective for {topic.title}. Read seed_topics/{topic.slug}.md; when present read rb_plan.md## Constraints > ### User Research Controls; on rerun read rb_plan.md## Decisions > ### Rerun intent revision: <current rerun_count> and only the matching current seed_topics/{topic.slug}.md## 本轮重跑方向. Stale, future, invalid, or legacy-unbound direction is not current instruction. Resolve all paths through the existing beacon-rooted bundle coordinate.",
  "action": "Search foundation sources for {topic.title}; fetch page content; write the assigned artifacts/wave0/{topic.slug}/source.yaml and leaf cache trails under _cache/wave0/primary/{topic.slug}/. Return only the current task-contract output_files[] and cache_trails[] for work-unit submit. Do not write a reference/00-shared-*.md file or declare a reference output; formal submit supplies the Phase-owned shared-reference backing path.",
  "writes_to": [
    "artifacts/wave0/{topic.slug}/source.yaml"
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
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wave0-source-{topic.slug}.json
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs check <bundle>
```

### 3.2 Delegated Drain Loop

共享 batch-poll-submit loop（claim_count 公式、actor 观察、poll/submit/repair 骨架）见 `shared/shared-subagent-protocol.md`（已 in requires）。本 phase 特有 drain 差异如下。Before claiming, reconstruct in-flight Wave0 work from `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, and `_work_units/wave0/*` status/result/receipt surfaces.

Read the `ProfileSchema`-parsed `rb_profile.yaml#/delegated_concurrency_cap` as `effective_delegated_concurrency_cap`. It is the only run-level cap input and is `12` when omitted; do not add a CLI, environment, queue, or host-capacity override.

For a normal delegated top-up, compute:

```text
claim_count = min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)
```

This is the accepted bounded top-up batch-claim posture: conceptual `--count <claim-count>` names the computed `claim_count`, bounded by independent eligible demand, the accepted/default cap (`effective_delegated_concurrency_cap` parsed from the profile), and remaining free delegated in-flight capacity (`remaining_free_capacity`).

Here `eligible_independent_demand` is the queue-front count of independent eligible Wave0 source-intake demand, and `remaining_free_capacity` is the effective cap minus reconstructed normal delegated in-flight work. If reconstructed normal delegated in-flight work already reaches the effective cap, poll, submit, repair, or terminalize those attempts before claiming more. Use `--count 1` only for a single remaining item, dependency-blocked front item, effective cap of 1, or a narrow repair.

This bounded prompt count is a Phase-Agent policy choice, not proof that a host started, kept live, or physically ran that number of native sub-agents concurrently. When the Engine admits `phase_agent_fallback`, claim exactly one work unit regardless of the profile cap.

```bash
First inspect the queue-front planned role and perform one bounded real `dpt-source-intake` native probe. Do not claim a batch to test availability or reuse this observation for another role.

node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count <claim_count> --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key dpt-source-intake --actor-reason <normalized-reason> --execution-actor <delegated_subagent|phase_agent_fallback>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <bundle>
```

If claim rejects a supplied observation, use top-level `actor_observation_feedback` to read the planned `dpt-source-intake` role, primary conflict, closed legal tuples, and its same-claim rerun. The generated `Completion Contract` uses this same actor/candidate vocabulary; it is not a second actor proof or cache rule.

For each claimed work unit, use the claim output's canonical absolute `bundle_dir` and absolute `prompt_refs[]` paths. Never derive the bundle root from cwd, append a bundle basename, or switch to a same-named nested directory.

1. Read `prompt_refs[].task_ref`, `beacon_ref`, and `result_schema_ref` at their returned absolute paths. Confirm that `_beacon.json` carries the same canonical absolute `bundle_dir`. Beacon immutability 与 identity/root conflict 处理见 `shared-subagent-protocol.md`（已 in requires）。
2. Spawn the Sub-agent with the generated prompt.
3. Require real search and page fetch following the per-URL access sequence in `shared-page-fetch-guidance.md`. When page fetch is blocked or unavailable at every prior tier, and independent shell/network permission exists, make at most one bounded `curl` request for that same URL. Do not use search snippets as evidence.
4. Plan candidate URLs from the explicit `rb_profile.yaml#/research_style_params.wave0_per_topic_source_floor` plus a conservative small margin for fetch failures, duplicates, and non-countable pages. `wave0_shared_ref_total` remains a Phase-side planning signal for later submitted-backing materialization; it does not add a rich-reference output to this current actor contract. Do not use a fixed hard-coded fetch aim unless it is written as `profile/runtime floor + named margin`.
5. Read the generated Result JSON Starter in `task.md`, then have the selected actor prepare the candidate `result.json` at the assigned absolute result path and write the declared output files and leaf cache trails. The starter is guidance generated from the active contract, not a prewritten result or alternate authority.
6. Ensure `runtime-receipt.jsonl` events carry `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
7. Actively poll result/receipt/output/cache readiness without waiting for user continuation or task notification.
8. The Agent executes the authorized mechanical validation and repair steps. Dry-submit the ready candidate before formal submit:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs dry-submit "<canonical-absolute-bundle_dir>" --work-id <work_id> --result <absolute-result.json>
```

Read every structured violation. Repair the same candidate and same claimed attempt only at the exact authorized `write_to` coordinate, then rerun that same dry-submit command. Do not replace the claim identity, edit Engine-owned authority, or ask the user to run ordinary work-unit commands. When dry-submit passes, run formal submit:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs submit "<canonical-absolute-bundle_dir>" --work-id <work_id> --result <absolute-result.json>
```

When a producer writes assigned `artifacts/` or `_cache/` content through a completed staging file, it may use `operate-artifact-persistence.mjs persist` before submit and must retain staging until `committed`. This does not replace `operate-work-unit submit`, its cache normalization, or submitted-ledger authority.

If formal submit rejects because mutable facts changed after dry-submit, repair the same claimed attempt when possible and return to the same dry-submit checkpoint before another formal submit. For every expired or stale claimed attempt, run timeout preflight before terminal timeout:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]
```

Parse structured stdout even when timeout preflight exits non-zero. Follow `recommended_action` exactly: `submit` runs formal submit; `repair` repairs the same `work_id`; `wait` continues active polling; `inspect` inspects and repairs candidate or Engine binding; `block` assigns the deterministic blocker to its named owner and leaves the phase undrained without initiating a user wait; `timeout` permits normal terminal timeout. Read the matching `recommendation_basis` branch (`candidate`, `progress`, `lease`, or `integrity`) as the direct reason for that action; it does not create a new timeout rule. Only after that decision may the Phase Agent use an explicit close command:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs fail <bundle> --work-id <work_id> --reason "<reason>"
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout <bundle> --work-id <work_id> --reason "<reason>"
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs abandon <bundle> --work-id <work_id> --reason "<reason>"
```

When dry-submit reports `fail_and_replace` after `work_done`, terminalize the current attempt with the supplied semantic-contract reason, then invoke:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs replace <bundle> --work-id <terminal_work_id>
```

Read the structured replacement result. For a newly created or queued successor, perform one exact-role native probe and run the normal `claim` command for the returned wave; do not hand-author an equivalent queue card or infer a queue ID. For an already in-flight idempotent successor, use its disclosed existing `work_id` to reconstruct and actively poll the attempt; do not claim again. The parent remains terminal, and neither branch discovers a successor from `_work_units`.

At every inspect, dry-submit, timeout-preflight, formal-submit, or Gate root, preserve the emitted rerun and read the exact attempt disposition. The claimed `actor_execution` plus `work_id` and `receipt_nonce` owns candidate authorship: for `delegated_subagent`, the Phase Agent may submit the returned candidate but must not author substitute content under that binding; only `phase_agent_fallback` may author its exact fallback attempt. This is logical guidance, not physical actor authentication or host/sub-agent liveness proof.

For structured `busy`, read caller work/operation separately from holder transaction/work/queue coordinates, wait, and rerun the exact caller checkpoint. For `suspect_transaction`, run `operate-work-unit recover-transaction <bundle> --tx-id <id>` only when `repair_kind` names the exact unlocked journal; otherwise preserve `missing_contract`. Exact `recover-declaration` takes precedence over `supersede`. Run `operate-work-unit supersede <bundle> --work-id <submitted_id> --reason <audit-reason>` only when selected, then use the returned `successor_queue_item_id` and ordinary location for current role observation, normal claim/poll/submit, and the same inspect/Gate rerun. Do not reactivate the predecessor or manually edit ledger/index/status/queue/lock/journal/hash authority.

`timeout --force --reason <reason>` is an exceptional audited operator choice after inspection, not the normal response to progress, repairable candidates, or invalid binding. Do not use queue completion commands for delegated success, and do not run the Wave0 gate while preflight recommends `submit`, `repair`, `wait`, `inspect`, or `block` for any in-flight attempt.

### 3.3 Submitted Reference Closeout

After each successful formal submit, run the same `inspect-wave0-output.mjs` and
consume its submitted-reference convergence result before treating a shared
reference floor as a deficit. When it returns materializable backing, the Phase
Agent must use only the returned exact `<work_id>/<ordinal>` source identity,
canonical `write_to`, `source_url`, and submitted source/cache/result/work-unit
refs. URL equality, a bare work ID, an existing file, or an index row cannot
select the backing.

Use `shared-reference-template.md` to write the complete
`reference/00-shared-<slug>.md` consumer projection to a retained staging file.
Its body must carry the exact `<work_id>/<ordinal>` coordinate and the returned
submitted backing refs. Commit that file through
`operate-artifact-persistence.mjs persist`, consume its `committed|blocked`
verdict, then run `node DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs --bundle
<path>` only after a commit. Persistence and indexing provide durable consumer
navigation; neither creates submitted authority. Rerun the same Wave0 inspect
after index synchronization.

When the Phase Agent elects an allowed deferred disposition for one submitted
contribution, retain one `wave_projection/apply_seed_projection` packet with a
single `wave0_evidence.deferred_contribution` object:

```json
{
  "source_identity": { "kind": "submitted_work", "work_id": "<submitted-work-id>" },
  "evidence_meaning": "<Agent-authored limitation meaning>",
  "next_hop": "limitation: <concrete next research hop>"
}
```

Here `work_id` is a contribution selector, not source coverage. The existing
topic-state writer resolves submitted authority and expands currently
unprojected exact identities with the existing `defers` / `["none"]` /
`deferred` form. Do not hand-enumerate an ordinal range, hand-edit a seed or
index, or turn a deferred selector into a reference. Apply the retained packet,
then rerun the same inspect. A true floor deficit is actionable only after this
convergence path has no materializable submitted backing.

### 3.4 Seed Projection Update

Never edit a seed, heading, card, or token. `templates/seed-topic-template`
gives the Wave0 slot/card and rendered-entry shape. After a committed
materialization, retain an explicit `wave0_evidence` entry only for its exact
`<work_id>/N` identity and concrete `reference/00-shared-*.md` navigation ref;
`source.yaml`, `_cache/`, and `_work_units/` remain secondary provenance. For a
contribution-wide deferred outcome, use the one `deferred_contribution` intent
above instead of repeated manual entries. A later legal append has a different
work ID and owns only its returned ordinal interval; do not recalculate
historical ownership from a mutable full array or treat `result_hash` as a
source-byte snapshot.

Use the existing contribution-aware Wave0 inspection/preflight result together
with the complete `wave_projection/apply_seed_projection` packet, authorization,
and repair protocol in `command_playbook/operate-topic-state.md`, then invoke
`operate-topic-state apply` in this loaded Wave0 window. After every packet
apply, rerun the same `inspect-wave0-output.mjs`. A missing writer window,
canonical binding, or submitted authority is its direct lifecycle/owner
boundary, not permission for a user or Agent to hand-edit seed, source, ledger,
receipt, or trace bytes.

## 4. Expected Artifacts

- `artifacts/wave0/{topic}/source.yaml` for every topic.
- `reference/00-shared-*.md` when shared foundation references exist.
- `reference/_INDEX.md` summarizing available references.
- Submitted work-unit rows in `rb_output_declarations.jsonl` covering delegated source/cache outputs and cache trails.
- Seed-topic Wave0 projections materialized through the existing packet writer, with concrete existing `reference/00-shared-*.md` refs as primary consumer navigation; `source.yaml`, `_cache/`, and `_work_units/` refs may appear only as secondary provenance.
- `rb_trace.jsonl` records the `wave0_completion` event/check surface required by the Wave0 gate definition.

## 5. Gate Command

After `rb_queue.json#/active_window`, `#/refill_pool`, and `#/delegated_in_flight` are all empty and each affected current Topic has its Wave0 packet applied, run the Wave0 inspect before recording completion evidence or invoking the formal gate. Do not infer away future-looking residual demand. If `phase_queue_drained` fails, the Agent follows its returned queue/work-unit owner and reruns this same checkpoint; a refill-only `missing_contract` does not authorize queue hand edits.

```bash
node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle <path>
```

This inspect is side-effect-free and non-routing. If it names materializable submitted backing, follow Section 3.3's Phase-owned persistence/index path; if it names a projection packet/entry root, repair the retained packet through the existing writer and rerun this same inspect; if it names unavailable authority or layout, follow that direct owner boundary. Do not create a second local validator, hand-edit a seed, or treat an internal artifact/cache ref as a substitute for concrete consumer navigation.

Only after inspect passes, record or refresh the existing `wave0_completion` evidence through the normal phase logging path, then run the formal gate and read its JSON output before deciding the next action:

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Read `check.degraded` first: when it is `true`, retain the declared `check.degraded_rules` as carried quality debt rather than treating this as a clean quality pass. Then consume the existing `check.next` before synchronizing the just-passed source gate:

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to wave0_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave0 passed; it is not the next-phase loader.

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。反馈读取与互动放置的完整契约（`repair_kind` 只分配责任、当前 loaded node 的 `stop` 才决定 interaction placement、`stop: no` 不得主动发起提问/状态/approval/acknowledgement、current turn 回答不创建 checkpoint）见 `shared/shared-silent-execution.md` 与引擎注入的 AUTONOMOUS header。不得从 legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段或命令。按每个 independent primary hint 执行：

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

通用 anti-cheating 禁令见 `shared/shared-anti-cheating-rules.md`（已在 requires，含手写 trace/receipt/ledger 禁令、work-unit provenance、retry fatigue、reference authority 等）；以下为本 phase 特有与纯纪律条目：

- 禁止让当前 `wave0_source_intake` actor 写入或声明 `reference/00-shared-*.md`; shared references are Phase-owned consumer projections after formal submit.
- 禁止把 gate console confidence 当作 verdict；read gate JSON and trace/check artifacts.
