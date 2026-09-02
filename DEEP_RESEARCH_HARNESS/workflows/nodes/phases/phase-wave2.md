---
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: work_unit_required_for_new_evidence
  delegated_role_keys:
    - dpt-topic-scout
    - dpt-evidence-extractor
requires:
  - shared/shared-schemas
  - shared/shared-subagent-protocol
  - shared/shared-silent-execution
  - shared/shared-return-map-authoring
  - shared/shared-anti-cheating-rules
  - templates/seed-topic-template
suggested_context:
  - phases/subagent-dpt-topic-scout
  - phases/subagent-dpt-evidence-extractor
---

# Phase: Wave2 — Cross-Topic Synthesis

## 0. Execution Brief

- **Objective**: produce cross-topic synthesis artifacts and delegate only new search/evidence work through work units.
- **Start here**: load Wave1 artifacts, `finding-index.yaml` expectations, queue state, profile thresholds, the `rb_plan.md## Constraints > ### User Research Controls` baseline when present, the newest complete matching `## Decisions` revision on rerun, matching current directions, and current Wave1 focus coverage, then Wave2 role guidance.
- **Entry prerequisite**: after `enter-phase` loads this node, run `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to wave1_complete` before Wave2 work or its Gate; this synchronizes the passed source gate and does not prove Wave2 completion.
- **Pure synthesis path**: Phase Agent reads existing submitted evidence and writes synthesis artifacts.
- **Delegated evidence path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: side-effect-free `inspect-wave2-output.mjs` passes first, then `check-gate-wave2-complete.mjs` passes for `phases/phase-wave2.md`.
- **Failure posture**: do not direct-search new evidence from the Phase Agent. Use targeted work units, explicit HITL2 deferral, or bounded refill.

## 1. Stage Goal

Create the Wave2 artifact group:

- `artifacts/wave2/synthesis.md`
- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`

Wave2 is cross-topic cognition, not just prose. It first builds scan/triage/gap-analysis process evidence, then writes synthesis as a projection of that work. It triages findings, records search decisions, and routes new evidence gaps through work units.

Accepted consumer-facing `W2F-xxx` findings with concrete existing Wave0/Wave1 submitted backing are materialized as existing-backed `reference/00-cross-*.md` Phase-owned projections, or they carry an explicit non-consumer/deferred/limitation reason.

## 2. Required Inputs

- Wave0 reference index and source metadata.
- Wave1 `evidence-summary.md` and `question-list.md` for every topic.
- The exact route-bound Wave1 Gate handoff receipt, when the selected handoff carries `wave1-carried-targets/v1`.
- `rb_profile.yaml` Wave2 params: `wave2_cross_topic_depth`, `wave2_emergent_search_rounds`, `p0p1_independent_backing`, `quality_min_tier`, `quality_min_substance`.
- `shared-schemas.md` for Wave2 artifact paths and finding-index schema.
- `operate-queue` and `operate-work-unit` CLIs.
- `rb_plan.md## Constraints > ### User Research Controls` baseline when present and, for current-contract rerun N, `rb_plan.md## Decisions > ### Rerun intent revision: N` plus affected Topics' matching current directions.
- Current-round Wave1 `focus_coverage`, the exact routed carried-target receipt, current finding index, and verified submitted backing.

For round 0, applicable current intent comes from the controls baseline plus current canonical Seed projection. For rerun N, it comes from that baseline, the newest complete matching Decisions revision, and matching current Topic directions. Older revisions, stale/future/invalid/legacy-unbound directions, and historical submitted work remain history or context, not the current amendment set or current completion proof. A readable legacy rerun without a revision retains existing compatibility behavior and receives no inferred history.

For each intent-affected targeted-evidence demand, the Phase Agent SHALL author the existing queue-owned `task_brief` at the actual enqueue point before claim. State the bounded finding-gap objective; name relevant canonical seed coordinates; add the controls baseline coordinate when present; on rerun add the newest complete matching revision and assigned Topics' matching direction coordinates; and state that stale/future/invalid/legacy-unbound directions are not current instructions. Use the existing beacon-rooted bundle coordinate and do not copy complete user wording. The brief adds no finding/index, queue, manifest, result, receipt, permission, direct-search, or Gate authority. If current intent does not materially affect a demand, omit the optional brief rather than author an empty one. A strict control that cannot be met follows the existing explicit limitation, `defer_hitl2`, `requires_internal_data`, or `record_only` contract rather than a hidden exception.

## 3. Allowed Actions

### 3.0 Classify Direct Facts（Targeted Evidence Only）

Before filling targeted-evidence queue demand, classify each finding from direct bundle authority. This classification covers the targeted-evidence path only. Pure synthesis and cross-topic backfill are NOT subject to per-topic reuse classification.

Use the direction resolver: read `## 本轮重跑方向` section, compare `rerun_count` with current `rb_profile.yaml` value:

- `emergent finding` with `gap_status: needs_search` and no valid submitted `wave2_targeted_evidence` → **normal targeted evidence demand**.
- `finding` with valid submitted `wave2_targeted_evidence` and no new gap → **reuse** that submitted coverage.
- `new Topic` needing cross-topic integration → **normal finding triage pipeline**.

This differs from existing §3.2 triage by adding round-awareness: a finding from a previous round with `rerun_count < profile.rerun_count` in the direction → stale, treated as reuse (no new targeted evidence unless a genuinely new gap is identified).

### 3.1 Filling

If queue is empty, enqueue:

1. One non-delegated synthesis queue item:

```json
{
  "queue_item_id": "wave2-synthesis",
  "title": "Cross-topic synthesis",
  "targets": { "controller": "main-agent" },
  "producer_rule": "cross_topic_synthesis",
  "priority_class": "P2_close_open_loop",
  "action": "Read existing Wave0/Wave1 evidence, build cross-topic scan matrix, triage findings, record gap_status and synthesis_eligibility, write synthesis.md, cross-topic-ledger.md, and finding-index.yaml. Do not perform new external search inside this task.",
  "required_receipts": [
    "file:artifacts/wave2/synthesis.md",
    "file:artifacts/wave2/cross-topic-ledger.md",
    "file:artifacts/wave2/finding-index.yaml"
  ],
  "done_condition": "synthesis.md, cross-topic-ledger.md, and finding-index.yaml exist and contain structured finding triage grounded in submitted Wave0/Wave1 backing",
  "verification": {"engine": ["receipt_check"], "agent": ["finding_index_readable", "cross_topic_refs_present"]},
  "writes_to": [
    "artifacts/wave2/synthesis.md",
    "artifacts/wave2/cross-topic-ledger.md",
    "artifacts/wave2/finding-index.yaml"
  ],
  "status_sync": ["wave2_synthesis_materialized"],
  "completion_receipt": "file:artifacts/wave2/finding-index.yaml",
  "failure_route": "queue_repair",
  "lineage": {"phase": "wave2"},
  "payload": {"wave": 2}
}
```

2. Targeted delegated evidence queue items only when findings require new search. Resolve current intent for the affected finding and author the bounded `task_brief` before enqueue; the template shows the field for an affected item and it is omitted when not applicable:

```json
{
  "queue_item_id": "wave2-targeted-{finding_id}",
  "title": "Targeted evidence for {finding_id}",
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-topic-scout",
      "timeout_ms": 600000
    }
  },
  "kind": "wave2_targeted_evidence",
  "producer_rule": "targeted_evidence_search",
  "priority_class": "P1_state_or_gate_repair",
  "task_brief": "Targeted-evidence objective for {finding_id}. Read the relevant canonical seed_topics/{topic.slug}.md coordinates and, when present, rb_plan.md## Constraints > ### User Research Controls. On rerun read rb_plan.md## Decisions > ### Rerun intent revision: <current rerun_count> and only matching current affected-Topic ## 本轮重跑方向 sections. Stale, future, invalid, or legacy-unbound direction is not current instruction. Resolve all paths through the existing beacon-rooted bundle coordinate.",
  "required_receipts": [],
  "action": "Search only the assigned finding gap. Return bounded targeted evidence, source_urls, fills_gap, confidence, declared output files, and leaf cache trails for work-unit submit. The Phase Agent updates finding-index.yaml, cross-topic-ledger.md, synthesis/backfill, and any reference/00-cross-*.md projection after submitted evidence is accepted.",
  "done_condition": "targeted evidence work-unit submit succeeds or records a terminal explicit limitation for the finding",
  "verification": {"engine": ["work_unit_submit"], "agent": ["fills_gap_evaluated", "cache_trails_complete"]},
  "writes_to": [
    "artifacts/wave2/finding-index.yaml",
    "artifacts/wave2/cross-topic-ledger.md",
    "reference/00-cross-<slug>.md"
  ],
  "status_sync": ["wave2_targeted_evidence_submitted"],
  "completion_receipt": "work_unit:submitted-ledger",
  "failure_route": "work_unit_repair",
  "lineage": {"finding_id": "{finding_id}", "phase": "wave2"},
  "payload": {
    "finding_id": "{finding_id}",
    "wave": 2
  }
}
```

### 3.2 Execution Loop

This is the finding triage loop: classify each candidate, decide whether existing evidence is enough, route new evidence gaps to targeted work units, read JS/CLI feedback checkpoints, and repeat until convergence.

L0 checkpoint: schema/file readiness. Use local parsing and gate/queue/check outputs to confirm the three Wave2 artifacts exist and are structurally readable.

L1 checkpoint: provenance and targeted-evidence coverage. Use `operate-work-unit submit`, Wave2 gate JSON, and work-unit inspection feedback to confirm delegated targeted evidence is covered by submitted ledger rows.

Convergence criteria: every finding has a decision, no `priority: p0` or `priority: p1` finding remains under-backed without submitted evidence or explicit routing, no finding marked `exploit_search` or `explore_search` lacks either submitted targeted evidence or a transition to explicit deferral/internal-data/record-only routing, `synthesis_eligibility.pure_synthesis_eligible` is true only when unresolved search gaps are zero, and all gate `inspect` items are repaired or consciously routed to HITL2/final limitations.

#### 3.2.1 Pure Synthesis

For the synthesis queue item, the Phase Agent:

1. Reads all Wave1 evidence summaries and question lists, the applicable controls baseline, newest complete matching Decisions revision on rerun, affected Topics' matching directions, current-round `focus_coverage`, the exact carried-target receipt, current finding index, and verified submitted backing.
2. Builds a cross-topic scan matrix with dimensions such as `shared_pattern`, `contradiction`, `resolution_opportunity`, and `emergent_question`.
3. Writes all findings into `cross-topic-ledger.md` and `finding-index.yaml`.
4. Sets each finding decision to one of: `use_existing_evidence`, `exploit_search`, `explore_search`, `defer_hitl2`, `requires_internal_data`, `record_only`.
5. Sets `priority`, `confidence`, `independent_backing_refs`, `gap_status`, and top-level `synthesis_eligibility`.
6. Writes `synthesis.md` as a narrative projection grounded in existing references, citing `W2F-xxx` finding ids. When current controls or amendments create material commitments, include a readable `## Current Intent Coverage` section that summarizes the current incremental objective, affected Topics, covered commitments, and visible limited commitments. Cite baseline/revision/direction coordinates and applicable focus commitment/finding IDs rather than copying complete user wording. Distinguish `covered` from `limited`; a changed current commitment requires current-round backing and historical work cannot be relabelled as current completion. When no material current commitment exists, do not create an empty section.
7. For each accepted consumer-facing backed `W2F-xxx` finding, materializes an existing-backed `reference/00-cross-*.md` projection or records an explicit non-consumer/deferred/limitation reason.
8. **Finding round marker**：When creating new findings in `finding-index.yaml`, SHALL write `created_in_rerun_count` field from `rb_profile.yaml` current value. Legacy findings without this field remain valid — they are included in projection scope and produce advisory (non-blocking) inspect feedback if missing from seed projection.
9. Completes the non-delegated queue item through the normal queue path only after scan/triage/gap analysis is represented in ledger/index.

No delegated ledger row is required for pure synthesis artifacts.

`## Current Intent Coverage` is presentation-tolerant, human-readable synthesis only. It does not add a `finding-index.yaml` field, ledger row, synthesis-eligibility condition, direct-search route, Gate rule, or second coverage verdict, and no Engine component parses it to decide semantic satisfaction. Current `focus_coverage`, finding/index, submitted backing, carried receipt, and existing Gate owners remain authoritative for their own facts.

For Phase-owned `artifacts/wave2/*` and `reference/00-cross-*.md` writes, prepare complete retained staging files and commit them with `operate-artifact-persistence.mjs persist`; on crash, quiesce the bundle and run the same command's `sweep`. A persistence verdict never changes the finding, provenance, targeted-evidence, queue, or gate authority described here.

Existing-backed `00-cross` projections use a primary prior accepted backing source URL in `source_url`, cite `W2F-xxx`, and list bundle-relative refs to `finding-index.yaml`, `cross-topic-ledger.md`, plus concrete prior Wave0/Wave1 reference/artifact/cache/work-unit backing. They do not need a new Wave2 work-unit row, but a prior reference is only a locator unless it resolves to accepted submitted prior backing. Its current metadata writes `related_topic_uids` as the exact non-empty, duplicate-free current Topic UID subset selected from the finding/materialization facts. This metadata is self-contained: do not write a `W2F-*` join field, do not write `related_topic`, and do not broaden a selected subset to `all`.

Newly fetched evidence follows the other authority path: it is not accepted until a `wave2_targeted_evidence` work unit is submitted with matching result/receipt/cache/source backing. A resulting `reference/00-cross-*.md` may then be a submitted reference output or a Phase-owned projection that binds back to those submitted Wave2 surfaces. `reference/_INDEX.md` and its `source_layer: wave2_cross` row are navigation metadata only; they never prove either authority path.

#### 3.2.2 Targeted Evidence

For any finding with `decision=exploit_search` or `decision=explore_search`, author the applicable current-intent `task_brief` at every initial or refill enqueue, then drain targeted evidence work units. Reconstruct normal delegated in-flight Wave2 work before claiming, then read the `ProfileSchema`-parsed `rb_profile.yaml#/delegated_concurrency_cap` as `effective_delegated_concurrency_cap`. It is the only run-level cap input and is `12` when omitted; do not add a CLI, environment, queue, or host-capacity override.

For a normal delegated top-up, compute:

```text
claim_count = min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)
```

Here `eligible_independent_demand` is the queue-front count of independent eligible targeted-evidence findings, and `remaining_free_capacity` is the effective cap minus reconstructed normal delegated in-flight work. If reconstructed normal delegated in-flight work already reaches the effective cap, poll, submit, repair, or terminalize those attempts before claiming more. Use `--count 1` only for a single remaining item, dependency-blocked front item, effective cap of 1, or a narrow repair.

This bounded prompt count is a Phase-Agent policy choice, not proof that a host started, kept live, or physically ran that number of native sub-agents concurrently. When the Engine admits `phase_agent_fallback`, claim exactly one work unit regardless of the profile cap.

```bash
First inspect the queue-front planned role and perform one bounded real `dpt-topic-scout` native probe. Do not claim a batch to test availability or reuse this observation for another role.

node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim <bundle> --phase wave2 --count <claim_count> --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key dpt-topic-scout --actor-reason <normalized-reason> --execution-actor <delegated_subagent|phase_agent_fallback>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <bundle>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

If a supplied actor observation is invalid, `actor_observation_feedback` names the planned `dpt-topic-scout` role, primary field conflict, closed legal tuples, and exact same-claim rerun. Read that existing projection rather than deriving a tuple from task text; the generated `Completion Contract` uses the same actor/candidate terms and adds no second validator.

Actively poll targeted-evidence result/receipt/output/cache readiness without waiting for user continuation or task notification. For every expired or stale claimed attempt, run `operate-work-unit timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]` and parse structured stdout even when the command exits non-zero. Follow the closed advice branches: formal `submit`, same-`work_id` `repair`, active-poll `wait`, authority `inspect`, owner-assigned deterministic `block`, or normal terminal `timeout`. Its `recommendation_basis` uses one existing `candidate`, `progress`, `lease`, or `integrity` branch to explain that action; it neither evaluates another candidate nor changes lease or terminal authority. A `block` assigns responsibility and leaves the phase undrained; it does not initiate a user wait. Any `submit`, `repair`, `wait`, `inspect`, or `block` recommendation means delegated in-flight work is not drained.

At every inspect, dry-submit, timeout-preflight, formal-submit, or Gate root, preserve the emitted rerun and read the exact attempt disposition. The claimed `actor_execution` plus `work_id` and `receipt_nonce` owns candidate authorship: for `delegated_subagent`, the Phase Agent may submit the returned candidate but must not author substitute content under that binding; only `phase_agent_fallback` may author its exact fallback attempt. This is logical guidance, not physical actor authentication or host/sub-agent liveness proof.

For structured `busy`, read caller work/operation separately from holder transaction/work/queue coordinates, wait, and rerun the exact caller checkpoint. For `suspect_transaction`, run `operate-work-unit recover-transaction <bundle> --tx-id <id>` only when `repair_kind` names the exact unlocked journal; otherwise preserve `missing_contract`. Exact `recover-declaration` takes precedence over `supersede`. Run `operate-work-unit supersede <bundle> --work-id <submitted_id> --reason <audit-reason>` only when selected, then use the returned `successor_queue_item_id` and ordinary location for current role observation, normal claim/poll/submit, and the same inspect/Gate rerun. Do not reactivate the predecessor or manually edit ledger/index/status/queue/lock/journal/hash authority.

`timeout --force --reason <reason>` is exceptional and audited, not the normal response to recent progress, repairable candidates, or invalid binding. This preflight loop does not change the Wave2 authority split: pure synthesis continues from existing accepted backing, while newly fetched targeted evidence counts only after successful `wave2_targeted_evidence` submit. Phase-owned finding-index, cross-topic ledger, synthesis, backfill, and `00-cross` materialization remain downstream of accepted evidence.

Targeted evidence Sub-agents must:

- Search/fetch only the assigned gap.
- Avoid duplicate source URLs.
- Return bounded evidence payloads, source URLs, `fills_gap`, confidence, declared output files, and cache trails.
- Write cache trails under an assigned `_cache/wave2/...` leaf directory.
- Bind receipt/result identity to `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

After submit, update the finding:

- keep `decision: exploit_search` or `decision: explore_search` only when `subagent_receipt_refs[]` is non-empty and `gap_status: search_submitted`;
- materialize `reference/00-cross-*.md` only after submitted targeted evidence backs a new fetched source, or when existing prior backing already supports a pure-synthesis projection; write the exact selected current UID subset in `related_topic_uids`, never `all` as a shortcut;
- otherwise transition to `decision: defer_hitl2`, `requires_internal_data`, or `record_only` with matching `gap_status`;
- never leave `gap_status: needs_search` while declaring pure synthesis eligible.

Wave2 gate fails if targeted evidence/reference outputs exist without submitted work-unit coverage, or if search-required findings lack receipts or explicit routing. New external evidence cannot count until submitted through `wave2_targeted_evidence`.

#### 3.2.3 Backfill

Never edit a seed, heading, card, or token. `templates/seed-topic-template` gives the Wave2 slot/card and rendered-entry shape. Read current-round usable W2F findings from `finding-index.yaml`, resolve each `affected_topics` token to its current canonical topic, and use the complete packet, authorization and repair protocol in `command_playbook/operate-topic-state.md` to retain one `wave_projection/apply_seed_projection` packet per affected topic. Each entry has `entry_id` equal to its exact current-round `W2F-*` source identity. The packet always updates `wave2_judgment` and may append/upsert only that W2F entry in `pending_questions`; it never overwrites a Wave1 question entry.

The template placeholders `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` are replaced only by the existing projection writer; they are documentation tokens, not Agent-edit targets.

Use concrete existing `reference/00-cross-*.md` consumer navigation for evidence-bearing findings, with ledger/index and prior source surfaces only as secondary provenance. An identity-bound `defers` / `deferred` entry may keep `refs: [none]` only with an explicit limitation in `next_hop`. Historical W2F refs remain read-compatible but never authorize a new packet. Missing current finding authority, topic binding, or writer window is a direct owner boundary, not permission to patch a legacy seed.

### 3.3 Closeout + Gate Readiness

Before gate, ensure `cross-topic-ledger.md` contains these six required, non-empty synthesis control sections:

- Cross-Topic Scan Matrix
- Wave1 Legacy Questions
- Cross-Topic Resolutions
- Emergent Cross-Topic Questions
- Exploration Decisions
- HITL2 Handoff

The canonical names above are recommended presentation. The semantic parser tolerates heading case, heading level, spacing, and section order; those presentation differences are not blocking. Missing or empty semantic sections remain blocking.

Use the single canonical finding contract in `shared/shared-schemas.md` under `finding-index.yaml — JS-Readable Shadow Index`. It defines all 15 required per-finding fields and their types. Canonical enums are: `type` = `wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question`; `priority` = `p0` / `p1` / `p2`; `status` = `resolved` / `partial` / `open` / `deferred`; `decision` = `use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only`; `confidence` = `high` / `medium` / `low` / `uncertain`; `gap_status` = `no_gap` / `needs_search` / `search_submitted` / `deferred_hitl2` / `requires_internal_data` / `record_only`. Do not maintain a shortened local field count or infer missing values from Engine source; run Wave2 inspect for exact deterministic feedback.

When the exact routed Wave1 handoff contains `carried_target_receipt`, every receipt target must appear on at least one valid finding as a separate exact binding. Add optional `wave1_target_bindings` to that finding, with one or more entries shaped exactly as `{ receipt_sha256, topic_uid, intent_sha256, target_id, target_revision }`. Do not substitute shared topic, `origin_refs`, `trigger_refs`, question-list prose, or a reread depth review. If Wave2 reports missing bindings, repair `artifacts/wave2/finding-index.yaml` and rerun the same inspect/Gate. If it reports a receipt/current-intent mismatch, repair through the existing Wave1 handoff path instead; never hand-edit trace or bind the stale target.

For a backed finding that appears in synthesis and is consumer-facing, ensure there is a matching `reference/00-cross-*.md` projection or a field such as `consumer_reference_omission_reason` explaining `process-only`, `internal`, `deferred`, `not sufficiently source-backed`, or intentionally not consumer-facing status.

Also include top-level `synthesis_eligibility`:

```yaml
synthesis_eligibility:
  pure_synthesis_eligible: true
  scan_matrix_present: true
  scan_topic_pair_coverage:
    - pair: [topic-a, topic-b]
      refs: [artifacts/wave2/cross-topic-ledger.md]
  unresolved_search_required_count: 0
  targeted_search_required_count: 0
  targeted_search_submitted_count: 0
  explicit_deferral_count: 0
  profile_params_read: []
  ineligibility_reasons: []
```

`scan_topic_pair_coverage` accepts either the direct array above or exactly `{ pairs: [<same entries>] }`. Each entry uses `{ pair: [topicA, topicB], refs?: [...] }`; object maps, key-encoded pairs, self/unknown/duplicate pairs, and free text are not pair facts. Use canonical Topic UID, current slug, or an accepted previous slug. `scan.topic_count` is the canonical registry count, `pair_count_expected` is canonical `C(n,2)`, and `pair_count_checked` equals the observed unique structured entries.

For an ordinary first run or `action:supplement`, non-empty reduced coverage may remain below `pair_count_expected`; a multi-topic run must still record at least one real checked pair, including when `wave2_cross_topic_depth: 0`. Only an activated rerun `action:add` requires the exact complete canonical pair universe and both counts equal to `C(n,2)`. If inspect names a pair root, repair this projection at its exact `write_to` and rerun the same checkpoint; do not add slug prose or edit counts to imitate coverage.

`gap_status` values are closed: `no_gap`, `needs_search`, `search_submitted`, `deferred_hitl2`, `requires_internal_data`, `record_only`.

Before gate, current W2F projection demand must have passed the same Wave2 inspect; `pending_questions` remains optional for Wave2 and is not a token-consumption obligation by itself.

#### 3.3.1 Quality Self-Check

Before gate, the Phase Agent checks the five Wave2 profile parameters:

| # | Parameter | Check |
| --- | --- | --- |
| 1 | `p0p1_independent_backing` | P0/P1 findings have enough independent backing refs. |
| 2 | `quality_min_tier` | Backing refs meet source tier floor. |
| 3 | `quality_min_substance` | Backing refs meet substance floor. |
| 4 | `wave2_cross_topic_depth` | Each topic has enough cross-topic scan connections. |
| 5 | `wave2_emergent_search_rounds` | Required emergent search rounds are completed or explicitly deferred. |

These checks are Agent discipline. The gate verifies structural artifacts, references, links, trace expectations, `finding-index.yaml` consistency, pure-synthesis eligibility, and submitted work-unit coverage for delegated targeted evidence.

## 4. Expected Artifacts

- `artifacts/wave2/synthesis.md`
- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`
- Existing-backed `reference/00-cross-*.md` projections for accepted consumer-facing backed `W2F-xxx` findings, plus targeted-evidence `00-cross` references only when submitted `wave2_targeted_evidence` backs new fetched evidence
- Submitted work-unit rows for delegated targeted evidence outputs and cache trails
- Seed-topic Wave2 projections written only through the packet writer, preserving exact `W2F-xxx` identities and concrete `reference/00-cross-*.md` refs for consumer-facing materialized findings, with `cross-topic-ledger.md`, `finding-index.yaml`, and source artifacts as secondary provenance.
- `rb_trace.jsonl` records the `wave2_completion` event/check surface required by the Wave2 gate definition.

## 5. Gate Command

After `rb_queue.json#/active_window`, `#/refill_pool`, and `#/delegated_in_flight` are all empty, and accepted consumer-facing backed findings have either `00-cross` projections or explicit omission reasons, run the Wave2 inspect before recording completion evidence or invoking the formal gate. This is global quiescence: do not infer a future-looking residual away from its id, kind, producer, path, or prose. If `phase_queue_drained` fails, the Agent follows its one existing owner coordinate and reruns this same checkpoint; refill-only `missing_contract` is not permission to hand-edit queue authority.

```bash
node DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs --bundle <path>
```

This inspect is side-effect-free and non-routing. If it fails, repair the smallest named finding field, ledger section, reference/backing surface, or explicit limitation and rerun this same inspect; do not read Engine helper source or build a second validator.

Only after inspect passes, record or refresh the existing `wave2_completion` evidence through the normal phase logging path, then run the formal gate:

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Read `check.degraded` first: when it is `true`, retain the declared `check.degraded_rules` as carried quality debt rather than treating this as a clean quality pass. Then consume the existing `check.next` before synchronizing the just-passed source gate:

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to wave2_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave2 passed; it is not the next-phase loader.

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。反馈读取与互动放置的完整契约（`repair_kind` 只分配责任、当前 loaded node 的 `stop` 才决定 interaction placement、`stop: no` 不得主动发起提问/状态/approval/acknowledgement、current turn 回答不创建 checkpoint）见 `shared/shared-silent-execution.md` 与引擎注入的 AUTONOMOUS header。不得从 legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段或命令。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 Wave2 mutable surface 时，由 Agent 修复 exact finding/index/ledger/synthesis field/file；不得把 synthesis prose 或 filesystem-only reference 当作 provenance。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal queue/work-unit/declaration/lifecycle operation；不得要求用户运行普通命令，也不得直接编辑 status、trace、ledger declaration、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：识别 `missing_fact` 指出的真实语义/风险决定。Wave2 是 `stop: no`，不得由 hint 创造新 HITL、repair controller 或 lifecycle；没有 accepted decision path 时保持当前 checkpoint failed。
4. `repair_kind: external_action`：识别不可代理的 actor/search/fetch/permission 前置条件；不主动请求 acknowledgement，满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：保留 exact unavailable capability/contract boundary，不提供手写 authority、用户等待、绕过 Gate 或平行成功路径。

Hint 不创造 permission、controller 或 lifecycle。完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 Wave2 checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

仅当 structured hint 的 `missing_fact` / `write_to` 明确识别一个需要新 evidence 的合法 gap 时：

1. Enqueue targeted delegated queue items with `kind: "wave2_targeted_evidence"`.
2. Drain through work-unit claim/submit.
3. Update only the authorized `finding-index.yaml` / `cross-topic-ledger.md` projections from submitted backing.
4. Run the hint's exact `rerun`.

If a semantic gap cannot be resolved after bounded legal attempts, record the limitation only on the accepted finding/decision surface. Any HITL2, internal-data, or record-only decision must come from its existing contract; the hint itself does not create that route. Do not invent references. Do not declare `pure_synthesis_eligible: true` until `gap_status` and counts are consistent.

## 8. Stop Behavior

Do not stop for progress, idle/no-work, or partial-completion reporting. Phase completion condition is gate pass: Wave2 structural and work-unit provenance checks must pass through the Wave2 gate CLI. After gate pass, consume `check.next` through `enter-phase` and continue to HITL2/final flow.

## 9. Anti-Cheating Rules

通用 anti-cheating 禁令见 `shared/shared-anti-cheating-rules.md`（已在 requires，含手写 trace/receipt/ledger 禁令、work-unit provenance、retry fatigue、reference authority 等）；以下为本 phase 特有与纯纪律条目：

- 禁止 inventing references when targeted search fails; record limitation or route to HITL2.
- 禁止 bypassing gate JSON `inspect`/`advice`; repair, refill, defer, or record limitation from real feedback.
- Lifecycle-integrity 消费义务（SWE-007/CPT-006）：疲劳阈值、换策略、以及合成任何 final 报告内容之前，必须先获取并消费最新 lifecycle-integrity 判定（最近 checkpoint 输出中的 `DPT_LIFECYCLE_INTEGRITY` 块，或 `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <bundle>`）；判定含 `premature_final_present`、`plan_progress_tamper_suspected`、`status_drift`、`manual_bypass_suspected`、`missing_witness`、`failed_gate_downstream_status` 任一时，唯一去向是按具名 surface 做 repair，禁止转向 final 合成或任何绕过。
- 完成宣告 backing：向用户宣告"研究完成"必须引用 terminal lifecycle 事实（terminal status + integrity `passed`）；无此 backing 的完成宣告属于禁止的 surfacing。
- 本 phase 期间 `final/` 不得出现无 lineage 覆盖的 canonical primary-series 文件；premature 文件会以 `premature_final_present` 阻断 wave gate，唯一合法补救是移出 canonical 命名（`final/attic-<原名>`），Engine 不会代为移动或删除。
