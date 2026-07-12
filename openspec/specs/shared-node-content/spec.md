# Shared Node Content

> req: SHC-001, SHC-002, SHC-003, SHC-004, SHC-005, SHC-006

## Purpose

定义 5 个 shared node 的完整 Agent-readable 内容要求。每个 shared node 只提供 guidance 或 generated summary，不是 deterministic rule authority。内容必须贴合当前 accepted schema / CLI surface，帮助 Agent 在 pre-research 阶段正确理解 profile、gate、schema、repair posture 和 anti-cheating 边界。
## Requirements
### Requirement: Shared profile content completeness

`shared-profile.md` SHALL explain the current `rb_profile.yaml` fields, types, write timing, example values, and Source of Record.

Content SHALL cover at least the current `ProfileSchema` fields:

- `plan_basename`: string for the run's canonical basename; a disposable bundle directory MAY include a `dpt_disp_` prefix and random suffix, while `plan_basename` remains the unsuffixed logical name;
- `research_profile`: one of `not_selected`, `quick_factual`, `exploratory_map`, `claim_verification`, `debug`;
- `root_must_answer_set`: string array containing the user's required questions;
- `research_style_params`: optional/nullable current style object populated through the accepted profile-style path;
- `research_access`: optional discriminated status contract for `unprobed`, `available`, or `unavailable`, including the branch-specific probe fields;
- `human_decision_checkpoints.hitl1.status`;
- `human_decision_checkpoints.hitl1.recorded_at`;
- `human_decision_checkpoints.hitl2.status`: one of `not_started`, `pending_user`, `recorded`, `blocked`, `not_applicable`;
- `human_decision_checkpoints.hitl2.answerability_class`: one of `not_assessed`, `ready_substantive`, `ready_insufficient_judgment`, `blocked_repair_required`;
- `human_decision_checkpoints.hitl2.user_decision`: `not_started` before a decision is recorded, and then one of `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked`;
- `human_decision_checkpoints.hitl2.final_report_view`: one of `not_started`, `profile_default`, `executive_brief`, `evidence_map`, `claim_judgment`, `technical_deep_dive`, `custom`;
- `human_decision_checkpoints.hitl2.custom_slug`: optional custom report name;
- `human_decision_checkpoints.hitl2.rerun_count`: optional non-negative integer with default `0`; and
- `human_decision_checkpoints.hitl2.rationale`: optional text carrying the recorded decision reason or rerun/repair intent.

The HITL2 explanation SHALL distinguish `repair` from `rerun`: `repair` means the Agent repairs the current run through existing legal paths and reruns the HITL2 gate, while `rerun` means the HITL2 gate emits the deterministic handoff to `phases/phase-rerun.md`. It SHALL NOT describe either decision as an automatic restart from instantiation.

The body SHALL include an Authority Boundary section stating that schema authority is `DPT_FRAMEWORK/schema/contracts/profile.mjs` and runtime truth is the active bundle's `rb_profile.yaml`.

#### Scenario: Agent reads shared-profile for field meaning

- **WHEN** the Agent needs to understand profile, research-access, style, or HITL decision fields
- **THEN** `shared-profile.md` SHALL describe the current field and enum contract
- **AND** it SHALL distinguish `repair` from the deterministic `rerun -> phase-rerun` route
- **AND** it SHALL identify `not_started`, not an empty string, as the pre-decision `user_decision` value

#### Scenario: HITL1 path uses current accepted contract

- **WHEN** the Agent reads the HITL1 portion of `shared-profile.md`
- **THEN** the node SHALL point to `human_decision_checkpoints.hitl1.status` and `human_decision_checkpoints.hitl1.recorded_at`
- **AND** research profile and must-answer fields SHALL remain top-level profile fields rather than invented nested HITL1 fields
- **AND** the node SHALL NOT describe removed `topic_rewrite` or `user_intent_summary` schema fields

#### Scenario: Shared profile explains disposable basename relation

- **WHEN** the Agent reads `plan_basename` in an experiment bundle
- **THEN** the node SHALL explain that the bundle directory MAY include a `dpt_disp_` prefix and random suffix
- **AND** the canonical `plan_basename` written to plan/profile SHALL remain the unsuffixed logical name

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL provide Agent-facing summaries of gate purpose, current check direction, and repair posture. Content SHALL mark itself `authority: generated-summary` and SHALL state that gate definition JSON and gate CLI output are deterministic rule authority. Wave gate summaries SHALL describe delegated source/evidence coverage as work-unit ledger coverage plus cross-checks.

The `hitl2-recorded` summary SHALL match the current definition and CLI contract: decision brief existence/non-empty, profile parsing, recorded status, non-empty five-enum decision, and the shared phase-handoff preflight. It SHALL NOT list a separate `hitl2_recorded` trace event as a blocking definition rule. It MAY state that the Phase Agent records that event for diagnostic/audit history, while the gate CLI writes the authoritative `gate_attempt` for the gate verdict and selected handoff.

The summary SHALL distinguish the two deterministic outcomes: `proceed_to_readiness` selects `phases/phase-readiness.md`, while `rerun` selects `phases/phase-rerun.md`. It SHALL NOT describe `repair`, `request_view_revision`, or `stop_blocked` as defaulting to readiness.

#### Scenario: Agent reads current HITL2 gate summary

- **WHEN** the Agent reads `shared-gate-rules.md` before the HITL2 gate
- **THEN** the summary SHALL reflect the current definition rules and five-enum contract
- **AND** it SHALL identify gate CLI output as deterministic verdict/routing authority
- **AND** it SHALL NOT instruct the Agent to repair a nonexistent blocking `trace_event_present` rule

#### Scenario: Wave gate summaries preserve work-unit coverage

- **WHEN** the Agent reads a Wave0, Wave1, or Wave2 gate summary
- **THEN** delegated output coverage SHALL remain described as submitted work-unit ledger coverage plus direct cross-checks

### Requirement: Shared schemas content matches current executable surface

Shared schema guidance SHALL describe current executable surfaces for profile, status, queue v2, plan, trace, gate definitions, work-unit manifests/results/receipts, output declarations, cache trails, and wave artifacts. Delegated Wave1/Wave2 schema examples SHALL describe work-unit-backed evidence/reference outputs.

#### Scenario: shared schemas name work-unit-backed outputs

- **WHEN** shared schema guidance lists delegated evidence artifacts
- **THEN** those artifacts SHALL be described as covered by submitted work-unit declarations

### Requirement: Shared repair guidance content

`shared-repair-guidance.md` SHALL 提供 gate fail 后的通用 repair posture。

内容 SHALL 覆盖：
- fail -> read `inspect` / `advice` -> repair -> rerun 的标准循环
- 默认 retry limit 3
- 超过 retry limit 或持续无进展时的 escalation
- 不同 check type 的修复方向摘要：
  - `file_exists` / `dir_exists`
  - `schema_valid`
  - `field_non_empty`
  - `field_value`
  - `status_value`
  - `cross_field`

Repair guidance SHALL NOT 变成某个具体 gate 的隐藏脚本。

#### Scenario: Agent encounters setup gate failure

- **WHEN** `check-gate-setup-ready.mjs` 返回 fail
- **THEN** Agent SHOULD 先读 CLI 的 `inspect` / `advice`
- **AND** 再参考 `shared-repair-guidance.md` 的通用修复姿势

### Requirement: Shared anti-cheating rules content

`shared-anti-cheating-rules.md` SHALL 列举所有 phase 共享的底线禁令，并给出正确替代动作。

内容 SHALL 至少包含以下禁令：
- 禁止手写 trace event、receipt、gate result
- 禁止在 gate 未 pass 时修改 control files 冒充 pass
- 禁止跳过 retry / escalation
- 禁止把 chat memory 当 runtime state
- 禁止在 instantiation / setup 阶段声称 evidence coverage 或 synthesis quality
- 禁止在 `stop: yes` 节点未等用户输入就继续
- 禁止在 HITL2 阶段伪造用户 decision 或绕过用户输入
- 禁止在 readiness 阶段评判语义质量或写作质量
- 禁止从 chat memory 生成 final report——必须 sourced from verified bundle state
- 禁止在 final phase 实现 hidden loop 用于 post-delivery rework

#### Scenario: Agent reads anti-cheating rules before phase execution

- **WHEN** Agent 加载任一 pre-research phase node
- **THEN** it SHOULD be able to use `shared-anti-cheating-rules.md` as the shared baseline
- **AND** the node SHALL explain the correct alternative action for each prohibition

### Requirement: Shared node authority boundary enforcement

Shared node authority-boundary wording SHALL use canonical phase-boundary terminology when prohibiting hidden phase movement.

Shared node bodies SHALL continue to avoid `phase`, `gate`, `next`, and `stop` frontmatter fields and SHALL NOT contain hidden phase instructions such as "run this command then continue to the next phase." When describing that prohibition, the wording SHALL distinguish:

- shared nodes SHALL NOT instruct phase handoff, next-node loading, or consuming a gate `check.next`;
- shared nodes SHALL NOT instruct source-gate status synchronization or `advance-status`; and
- shared nodes SHALL NOT claim target-phase work completion.

Shared nodes remain Agent-readable guidance or generated summaries, not lifecycle phase nodes and not deterministic boundary authorities.

#### Scenario: Shared node does not become hidden phase

- **WHEN** the Agent loads any shared node
- **THEN** the body SHALL NOT instruct phase handoff, status synchronization, or target work completion
- **AND** frontmatter SHALL remain `node_type: shared`
