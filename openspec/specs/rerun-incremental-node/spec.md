# Rerun Incremental Node

> req: REI-001, REI-002, REI-003, REI-004, REI-005

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

`phase-rerun.md` body SHALL instruct the Agent to perform semantic analysis:

1. **Read inputs**: `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` (user intent) and current `seed_topics/` state (existing topic list, each topic's depth/direction)
2. **Compare and infer**: analyze what the user wants to change vs what already exists, then produce a topic adjustment plan:
   - Topics to **keep** as-is (not mentioned in rationale, work still valid)
   - Topics to **supplement** with new dimensions/directions (rationale asks for deeper/more specific angle on existing topic)
   - Topics to **add** (rationale mentions new areas not covered)
   - Topics to **remove** (rationale explicitly rejects or contradicts)
3. **Write direction hints**: for each affected topic, write a `## 本轮重跑方向` section into `seed_topics/{slug}.md` containing:
   - `action`: `supplement` (add dimensions to existing topic), `add` (new topic), or `remove` (deprecate topic)
   - `new_search_dimensions`: additional search angles for wave0
   - `adjusted_depth`: modified research depth if changed
   - `search_guardrails`: any new constraints for source intake
   - `rationale_excerpt`: relevant quote from HITL2 rationale

   The section format is Agent-facing Markdown prose — the field labels above describe **required content**, not prescribed literal key names. Downstream phases (also Agent-driven) read this section as natural language guidance, not as structured data.
4. **Record rerun context**: increment `rerun_count` in profile. Gate preconditions SHALL keep the incoming HITL2→rerun status window (`current_gate: hitl2_recorded`, `next_gate: rerun_ready`) until the `rerun-ready` gate itself passes. The Agent SHALL NOT write `current_gate: rerun_ready` before the `rerun-ready` gate has passed.
5. **Run gate**: execute `check-gate-rerun-ready.mjs`; if pass, consume the gate CLI `check.next` through `enter-phase --bundle <path> --node <check.next>`, then synchronize the just-passed source gate with `advance-status --bundle <path> --to rerun_ready`. If fail, follow gate inspect/advice and do not route forward without `check.next`.

The Agent SHALL NOT delete existing artifacts or references. Downstream phases (seed-topics, wave0, wave1, wave2) SHALL read `rerun_count > 0` and the `## 本轮重跑方向` section in each seed topic to operate in delta mode.

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass

- **WHEN** HITL2 has selected the deterministic rerun branch and `enter-phase --node phases/phase-rerun.md` has loaded the rerun node
- **AND** source-gate status synchronization has written `current_gate: "hitl2_recorded"` and `next_gate: "rerun_ready"`
- **THEN** `phase-rerun.md` SHALL instruct the Agent to run `check-gate-rerun-ready.mjs` under that incoming status window
- **AND** it SHALL NOT instruct `advance-status --to rerun_ready` before the rerun gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass

- **WHEN** `check-gate-rerun-ready.mjs` passes and emits `check.next: "phases/phase-seed-topics.md"`
- **THEN** the Agent SHALL first run `enter-phase --bundle <bundle> --node phases/phase-seed-topics.md`
- **AND** only after that route-bound entry witness exists, run `advance-status --bundle <bundle> --to rerun_ready`
- **AND** the resulting status window SHALL be `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`

#### Scenario: First rerun sets rerun_count and writes direction hints

- **WHEN** `rerun_count` is absent or 0 and Agent executes phase-rerun
- **THEN** Agent SHALL write `rerun_count: 1` in `rb_profile.yaml#/human_decision_checkpoints/hitl2/`
- **AND** Agent SHALL write `## 本轮重跑方向` sections into affected `seed_topics/{slug}.md` files

#### Scenario: Second rerun increments rerun_count and updates hints

- **WHEN** `rerun_count` is 1 and Agent executes phase-rerun again
- **THEN** Agent SHALL write `rerun_count: 2`
- **AND** Agent SHALL update `## 本轮重跑方向` sections in affected seed topic files reflecting new rationale

#### Scenario: Existing artifacts are preserved

- **WHEN** Agent executes phase-rerun
- **THEN** existing `reference/` and `artifacts/` SHALL NOT be deleted

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

The chain routing rules for the new `rerun` outcome are defined in the `transition-table` spec (chain rerun-exit requirement). This requirement establishes the **authority rationale** specific to rerun-incremental-node:

- `rerun` is a **deterministic user decision** — the user explicitly chose "重跑" at HITL2. Unlike `request_view_revision` or `repair` (whose targets depend on Agent judgment of what to revise/repair), `rerun` has a fixed, unambiguous next-node target: `phase-rerun.md`.
- This follows the gate-fork pattern: deterministic `user_decision` values with fixed next-node targets are encoded as chain outcomes. Indeterminate decisions (`request_view_revision`, `repair`, `stop_blocked`) SHALL NOT have chain entries — they return `no_transition`.
- The chain does not distinguish "forward" from "loopback" — to the chain, both `passed → readiness` and `rerun → seed-topics` are just `outcome → next` lookups. Loop semantics are managed by Agent context and profile state (`rerun_count`).

See the `transition-table` spec chain rerun-exit requirement for the concrete chain entries and scenarios.

### Requirement: Rerun loop protection with max iterations

Rerun loop protection remains mandatory. The change from user-facing stop to silent degradation SHALL NOT weaken `rerun_count < max_reruns`. When the max rerun count is exhausted, the Agent SHALL treat the current rerun path as unpassable rather than bypassing the gate, resetting the counter, or inventing a new route.

#### Scenario: Max reruns exhausted remains unpassable

- **WHEN** `rerun_count >= max_reruns`
- **THEN** the rerun-ready gate SHALL fail
- **AND** the Agent SHALL NOT reset `rerun_count`
- **AND** the Agent SHALL NOT bypass the gate through Markdown prose
