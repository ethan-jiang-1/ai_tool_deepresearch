# Rerun Incremental Node

> req: REI-001, REI-002, REI-003, REI-004, REI-005

## Purpose

定义 `phase-rerun` node：HITL2 `user_decision: rerun` 后的专职 rerun-prep phase。把 rerun decision + rationale 翻译为增量重跑上下文（profile 更新、rerun 计数），让下游 phase 能以 delta 模式运行。

## ADDED Requirements

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
4. **Record**: increment `rerun_count` in profile, update `rb_status.json` (`current_gate: rerun_ready`, `next_gate: seed_topics_ready`)
5. **Run gate**: execute `check-gate-rerun-ready.mjs`; if pass → chain routes to seed-topics; if fail → stop and inform user (non-repairable)

The Agent SHALL NOT delete existing artifacts or references. Downstream phases (seed-topics, wave0, wave1, wave2) SHALL read `rerun_count > 0` and the `## 本轮重跑方向` section in each seed topic to operate in delta mode.

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

### Requirement: Gate-rerun-ready checks rerun state legality

A deterministic gate `rerun-ready` SHALL validate that the bundle is in a legal state for incremental rerun. The gate SHALL include at minimum:

- `rerun_rationale_present`: `hitl2.rationale` is non-empty
- `rerun_count_valid`: `rerun_count < max_reruns` (default max: 3)
- `bundle_structure_valid`: required directories exist for seed-topics/wave0
- `status_consistent`: `rb_status.json` reflects rerun phase

`stop` SHALL be `"no"` — the rerun node does not wait for user input.

#### Scenario: Gate passes with valid rerun state

- **WHEN** rationale is non-empty, rerun_count is 2 (< 3), bundle structure is intact, status is consistent
- **THEN** gate SHALL return `check.passed: true`

#### Scenario: Gate fails when rationale is empty

- **WHEN** `hitl2.rationale` is empty or absent
- **THEN** gate SHALL return `check.passed: false` with inspect pointing to `rerun_rationale_present`

#### Scenario: Gate fails when rerun_count exceeds max

- **WHEN** `rerun_count >= 3`
- **THEN** gate SHALL return `check.passed: false` with inspect pointing to `rerun_count_valid`

#### Scenario: Gate fail is terminal — no chain edge, Agent stops

- **WHEN** rerun-ready gate returns `check.passed: false`
- **THEN** `resolveNodeTransitionDetailed` SHALL return `kind: 'no_transition'` (no `failed` chain edge exists)
- **AND** Agent SHALL stop execution, inform user of the reason, and suggest starting a new Deep Research or accepting current results
- **AND** Agent SHALL NOT attempt repair or route to another node — rerun-ready failure is non-repairable

### Requirement: Chain routes HITL2 rerun as a deterministic outcome

The chain routing rules for the new `rerun` outcome are defined in `transition-table` spec TRT-001. This requirement establishes the **authority rationale** specific to rerun-incremental-node:

- `rerun` is a **deterministic user decision** — the user explicitly chose "重跑" at HITL2. Unlike `request_view_revision` or `repair` (whose targets depend on Agent judgment of what to revise/repair), `rerun` has a fixed, unambiguous next-node target: `phase-rerun.md`.
- This follows the gate-fork pattern: deterministic `user_decision` values with fixed next-node targets are encoded as chain outcomes. Indeterminate decisions (`request_view_revision`, `repair`, `stop_blocked`) SHALL NOT have chain entries — they return `no_transition`.
- The chain does not distinguish "forward" from "loopback" — to the chain, both `passed → readiness` and `rerun → seed-topics` are just `outcome → next` lookups. Loop semantics are managed by Agent context and profile state (`rerun_count`).

See `transition-table` spec TRT-001 for the concrete chain entries and scenarios.

### Requirement: Rerun loop protection with max iterations

The rerun path SHALL enforce a maximum of 3 rerun cycles via the `rerun_count_valid` gate rule (`rerun_count < 3`). When the limit is reached, the rerun-ready gate SHALL fail, blocking the rerun path. The user SHALL then choose a different HITL2 decision (e.g., `stop_blocked` or `proceed_to_readiness`).

Stall detection is explicitly NOT implemented — the rerun cycle spans multiple async phases across Agent turns, making reliable cross-turn state comparison infeasible in the Agent layer. The hard iteration cap is sufficient protection.

#### Scenario: Rerun count exhausted blocks rerun path

- **WHEN** `rerun_count` reaches 3 and rerun-ready gate is executed
- **THEN** gate SHALL return `check.passed: false` with inspect pointing to `rerun_count_valid`
- **AND** the rerun path SHALL be blocked; the user must choose a different decision at HITL2
