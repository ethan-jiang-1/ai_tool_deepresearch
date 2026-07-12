# Rerun Incremental Node

> req: REI-001, REI-002, REI-003, REI-004, REI-005, REI-006

## Purpose

定义 `phase-rerun` node：HITL2 `user_decision: rerun` 后的专职 rerun-prep phase。把 rerun decision + rationale 翻译为增量重跑上下文（profile 更新、rerun 计数），让下游 phase 能以 delta 模式运行。
## Requirements
### Requirement: Phase-rerun node frontmatter and identity

`phase-rerun.md` SHALL 是 `DPT_FRAMEWORK/workflows/nodes/phases/` 下的 phase node，frontmatter 包含：

| Field | Value |
|-------|-------|
| `node_type` | `phase` |
| `id` | `phase-rerun` |
| `phase` | `rerun` |
| `gate` | `rerun-ready` |
| `stop` | `no` |
| `requires` | `["shared/shared-profile"]` |
| `suggested_context` | `["shared/shared-anti-cheating-rules"]` |

Routing identity SHALL 为 node fileRef `phases/phase-rerun.md`。

#### Scenario: Agent resolves rerun path via chain

- **WHEN** Agent 在 HITL2 gate pass 后读到 `user_decision: rerun`
- **THEN** Agent SHALL query chain with outcome `rerun` to resolve next node
- **AND** chain SHALL return `phases/phase-rerun.md`
- **AND** Agent SHALL load the resolved node rather than restarting from seed-topics directly

#### Scenario: Rerun node is self-describing

- **WHEN** Agent reads phase-rerun.md frontmatter
- **THEN** it SHALL identify `phase: rerun`, `gate: rerun-ready`, `stop: no`

### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan

`phase-rerun.md` body SHALL instruct the Agent to:

1. Read `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`, canonical `rb_plan.md#/topic_registry`, current `seed_topics/`, and `operate-topic-state inspect` including its copy-ready layout baseline.
2. Produce a semantic adjustment plan that distinguishes topics to keep, existing topics whose intent needs refinement, new topics to add, explicit current-layout rename/reorder/renumber, and requested remove operations.
3. Prepare exactly one explicit topic-state apply form:
   - add/refine uses `add_topic` and `update_intent` with existing C3A fields;
   - layout mutation uses one complete `mutate_layout` target with `expected_plan_sha256`, ordered retained UID/title/slug-stem entries and explicit remove UIDs;
   - migrate-legacy remains its own complete reconciliation and SHALL NOT mix with either form.
4. Run topic-state apply before queueing new work. Consume structured blockers and rerun the same operation after repair. Active queue/work-unit blockers are ordinary Agent-owned mechanical work.
5. For each successfully added/refined topic, write or update the UID-bound seed `## 本轮重跑方向` section with the existing Agent-facing content: `action`, new search dimensions, adjusted depth, search guardrails and rationale excerpt. These labels remain guidance content, not a second machine state. Layout-only mutation SHALL preserve existing seed body guidance while updating current seed metadata/path.
6. Increment `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` through the existing profile path. If registry length changed through add or safe remove, run the existing `apply-research-style.mjs` owner before the rerun-ready gate.
7. Preserve the incoming HITL2→rerun status window until `check-gate-rerun-ready.mjs` passes. After pass, consume `check.next` through `enter-phase`, then run source-gate `advance-status --to rerun_ready`.

Rename/reorder/renumber SHALL use only canonical topic-state apply; it SHALL NOT fall back to direct multi-file edits. Historical artifact/reference/output paths SHALL remain untouched and continue to resolve through previous layout. Remove SHALL proceed only when Engine proves the UID has no dependency or historical work/content facts; otherwise the Agent SHALL report the single provenance-preserving boundary rather than delete history or invent retirement state.

If update-intent or mutate-layout is blocked by queued, delegated-in-flight or nonterminal work, the Agent SHALL use the existing queue/work-unit inspect, submit, repair or terminalization path and rerun topic-state apply. This mechanical blocker SHALL NOT be pushed to the user unless a new semantic conflict remains after the direct owner is resolved.

Topic-state apply in rerun SHALL be authorized only when `rb_status.json#/current_node` is `phases/phase-rerun.md`, the latest non-superseded HITL2 gate handoff has a route-bound load witness for that node, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window remains intact. A caller-declared rerun context or HITL2 rationale alone SHALL NOT authorize mutation. `migrate_legacy` and `mutate_layout` SHALL be unavailable outside this sanctioned rerun context.

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass
- **WHEN** HITL2 has selected rerun and loaded `phase-rerun.md`
- **THEN** the Agent SHALL keep `current_gate: hitl2_recorded` and `next_gate: rerun_ready` while preparing/applying topic intent or layout
- **AND** it SHALL NOT advance status before the rerun-ready gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass
- **WHEN** rerun-ready passes with `check.next: phases/phase-seed-topics.md`
- **THEN** the Agent SHALL enter that node first and then run `advance-status --to rerun_ready`

#### Scenario: Route-bound rerun entry authorizes topic apply
- **WHEN** HITL2 emitted the rerun target, `enter-phase` recorded the matching route-bound load witness, and the incoming rerun status window is current
- **THEN** rerun topic-state apply MAY migrate legacy state, add/refine canonical intent or apply one complete layout target

#### Scenario: Missing or superseded rerun witness blocks apply
- **WHEN** current-node/context claims rerun but the matching HITL2→rerun witness is missing or superseded by a newer route decision
- **THEN** apply SHALL reject before workspace creation and point to the existing lifecycle route repair
- **AND** the Agent SHALL NOT ask the user to approve a mechanical bypass

#### Scenario: New rerun topic materializes before work
- **WHEN** the rationale requires a new topic
- **THEN** the Agent SHALL commit add-topic registry+seed intent before enqueueing Wave0/Wave1 work

#### Scenario: Existing topic intent update preserves layout
- **WHEN** the rationale refines an existing topic without requesting layout change
- **THEN** update-intent SHALL preserve its UID/id/slug and existing artifacts

#### Scenario: Complete layout target preserves historical outputs
- **WHEN** rationale clearly requests rename or reorder/renumber
- **THEN** the Agent SHALL edit inspect's complete layout baseline and run mutate-layout
- **AND** historical artifact/reference/output files SHALL remain at recorded paths while new work uses current slug

#### Scenario: Safe remove is Engine-proven
- **WHEN** rationale requests removal of a never-worked UID with no inbound dependency
- **THEN** mutate-layout MAY remove its registry/current-seed projection and renumber retained topics
- **AND** a UID with any historical fact SHALL remain blocked without partial layout edits

#### Scenario: First rerun increments count and writes guidance
- **WHEN** rerun_count is absent or 0 and topic-state preparation succeeds
- **THEN** the Agent SHALL write rerun_count 1 through the existing profile path
- **AND** affected add/refine UID-bound seeds SHALL contain updated rerun direction guidance

#### Scenario: Second rerun preserves existing loop protection
- **WHEN** rerun_count is 1 and another sanctioned rerun preparation succeeds
- **THEN** the Agent SHALL write rerun_count 2 and update affected add/refine direction guidance

#### Scenario: Existing artifacts remain preserved
- **WHEN** rerun add/refine or layout preparation executes
- **THEN** existing `reference/`, `artifacts/`, submitted ledger and work-unit history SHALL NOT be deleted, renamed or rewritten by topic-state operations

#### Scenario: Remove or layout mutation remains blocked
> **@deprecated** — Direct multi-file or imperative layout mutation remains blocked; C3B now provides one complete sanctioned `mutate_layout` target.

- **WHEN** the rationale requests remove, rename or renumber
- **THEN** the Agent SHALL use the complete topic-state layout target rather than direct edits or a parallel namespace
- **AND** if Engine history, dependency, quiescence or lifecycle checks reject that target, the layout SHALL remain unchanged and the Agent SHALL follow the single returned owner/boundary action

### Requirement: Rerun-ready gate validates legal rerun state

`phase-rerun.md` remains `stop: "no"` and the `rerun-ready` gate remains the deterministic checkpoint for legal rerun state. Gate failure SHALL NOT create a failed chain transition or allow the Agent to load another phase without `check.next`.

Rerun preparation is not a reporting checkpoint. If rerun analysis or materialization appears locally complete, the Agent SHALL run the `rerun-ready` gate, repair from inspect/advice, or record a legal silent holding event. It SHALL NOT report "rerun prep is done so far," wait for confirmation, or route forward without `check.next`.

For fixable rerun preparation failures, such as missing derived seed topic materialization when the HITL2 rerun decision is otherwise valid, the phase body SHALL instruct the Agent to repair or take a silent degradation path without asking the user. In the specific case where `seed_topics/` is empty, the default silent degradation path SHALL be a full rerun seed regeneration, with the decision recorded through an accepted trace/log surface.

Hard non-repairable legality failures, such as exhausted `rerun_count >= max_reruns` or missing HITL2 rerun rationale, remain gate failures. Because no failed chain edge exists, the Agent SHALL NOT route to another phase. The Agent SHALL record `silent_unpassable` through an accepted trace/log surface, keep the run in the current non-blocked/in-progress holding state, and SHALL NOT ask the user mid-rerun.

#### Scenario: Empty seed topics defaults to full rerun silently

- **WHEN** the rerun phase finds `seed_topics/` empty while preparing rerun inputs
- **THEN** the Agent SHALL default to full rerun seed regeneration
- **AND** the Agent SHALL record `silent_degradation` through an accepted trace/log surface
- **AND** the Agent SHALL NOT ask the user to confirm full rerun

#### Scenario: Non-repairable rerun legality failure does not route forward

- **WHEN** the `rerun-ready` gate fails because `rerun_count >= max_reruns` or HITL2 rerun rationale is absent
- **THEN** `resolveNodeTransitionDetailed` SHALL return `kind: "no_transition"`
- **AND** the Agent SHALL NOT load another phase without `check.next`
- **AND** the Agent SHALL NOT ask the user from inside the `stop: "no"` rerun phase
- **AND** the Agent SHALL record `silent_unpassable` with the gate failure reason through an accepted trace/log surface

#### Scenario: Rerun local completion does not become progress reporting

- **WHEN** rerun preparation has no obvious local work remaining
- **THEN** the Agent SHALL run the `rerun-ready` gate or follow gate fail repair guidance
- **AND** the Agent SHALL NOT surface a progress summary or idle report
- **AND** the Agent SHALL NOT load `seed-topics` without gate CLI `check.next`

### Requirement: Chain routes HITL2 rerun as a deterministic outcome

The chain routing rules for the `rerun` outcome SHALL remain defined in the `transition-table` spec. An explicit HITL2 rerun decision SHALL resolve one fixed next node, while context-dependent revision/repair outcomes SHALL remain outside deterministic chain routing unless another accepted contract defines a fixed route.

#### Scenario: Deterministic rerun decision resolves one fixed node
- **WHEN** HITL2 records `user_decision: rerun` and the chain resolves outcome `rerun`
- **THEN** the resolved next node SHALL be `phases/phase-rerun.md`
- **AND** context-dependent `request_view_revision`, `repair`, and `stop_blocked` outcomes SHALL remain `no_transition` unless another accepted contract defines a deterministic route

### Requirement: Rerun loop protection with max iterations

Rerun loop protection remains mandatory. The change from user-facing stop to silent degradation SHALL NOT weaken `rerun_count < max_reruns`. When the max rerun count is exhausted, the Agent SHALL treat the current rerun path as unpassable rather than bypassing the gate, resetting the counter, or inventing a new route.

#### Scenario: Max reruns exhausted remains unpassable

- **WHEN** `rerun_count >= max_reruns`
- **THEN** the rerun-ready gate SHALL fail
- **AND** the Agent SHALL NOT reset `rerun_count`
- **AND** the Agent SHALL NOT bypass the gate through Markdown prose
