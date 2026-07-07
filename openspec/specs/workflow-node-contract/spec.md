# Workflow Node Contract

> req: WNC-001, WNC-002, WNC-003, WNC-004, WNC-005, WNC-006, WNC-007, WNC-008, WNC-009, WNC-010, WNC-011

## Purpose

定义 Workflow Foundation 的 node metadata contract、phase manifest 和 14 个骨架文件的产出要求。使 Agent 能通过 frontmatter 和 manifest 识别当前 phase、gate、phase inventory 和 shared nodes，无需从散落 prose 或 chat memory 推断。
## Requirements
### Requirement: Phase node metadata contract

Phase node metadata SHALL describe lifecycle phase nodes, shared guidance, and work-unit sub-agent task guidance without using removed delegated mechanism names as production surfaces. `execution_contract` SHALL remain Agent-readable and validator-enforceable guidance, but deterministic authority SHALL come from queue state, submitted work-unit ledger rows, trace, and gate CLI verdicts.

#### Scenario: delegated metadata names work-unit guidance

- **WHEN** a phase node references delegated guidance
- **THEN** the metadata SHALL identify work-unit sub-agent task guidance and submitted coverage requirements

### Requirement: Shared node metadata contract

所有 shared node SHALL 包含以下 frontmatter 字段：

| Field | Required | Meaning |
|-------|----------|---------|
| `node_type` | yes | `"shared"` |
| `id` | yes | Stable identifier（如 `shared-profile`） |
| `shared_scope` | yes | Shared node 服务的上下文范围（如 `profile`、`gate-summary`、`schema-summary`） |
| `authority` | yes | `"guidance-only"` 或 `"generated-summary"` |
| `requires` | yes | Mandatory shared Markdown dependency；无则为 `[]` |
| `suggested_context` | yes | Optional reference；无则为 `[]` |

Shared node SHALL NOT 声明 `phase`、`gate`、`next` 或 `stop` 字段。

#### Scenario: Shared node is not a hidden phase

- **WHEN** 一个 Markdown 文件位于 `shared/` 目录且 `node_type: shared`
- **THEN** 该文件 MUST NOT 含有 `phase`、`gate`、`next` 或 `stop` frontmatter 字段

#### Scenario: Shared node declares its authority boundary

- **WHEN** agent 加载 `shared-gate-rules.md`
- **THEN** frontmatter MUST 包含 `authority: generated-summary`，body MUST 说明 gate definition JSON 和 CLI output 才是 deterministic rule authority

### Requirement: Phase manifest structure

`DPT_FRAMEWORK/workflows/manifest.json` SHALL 定义完整的 lifecycle inventory/index：

- `phases` 数组 MUST 包含 11 个元素，按 `instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness → rerun → final` 顺序排列
- 每个 phase entry MUST 包含 `key`、`node`（相对 manifest 的路径）、`gate` 字段
- `node` value SHALL be the canonical fileRef used by transition lookup
- `next` 不是 manifest contract 的一部分；phase 顺序仅作为 Agent-readable inventory/index，由数组位置表示
- Runtime next-node lookup MUST come from gate CLI `check.next`, sourced from detailed transition router results
- `final` phase 的 `gate` MUST 为 `null`
- `shared` 数组 MUST 列出所有 shared node 的相对路径

#### Scenario: Manifest is the lifecycle inventory

- **WHEN** loader or Agent 需要识别已知 phase、展示 lifecycle order、或校验 phase metadata
- **THEN** it MUST read the `phases` array as the lifecycle inventory/index
- **AND** the ordered lifecycle inventory SHALL be instantiation, hitl1, setup, seed-topics, wave0, wave1, wave2, hitl2, readiness, rerun, final
- **AND** it MUST NOT infer runtime next-node transition from the `phases` array, node frontmatter, or a manifest `next` field

#### Scenario: Transition table owns next-node lookup

- **WHEN** gate `wave0-complete` passes and the gate response contains `check.next`
- **THEN** that next node reference MUST come from detailed transition router results
- **AND** Markdown/Agent MAY load the returned node reference after reading the gate feedback

#### Scenario: Final phase is terminal

- **WHEN** loader 读取 `final` phase entry
- **THEN** `gate` MUST 为 `null`
- **AND** `final` MUST 是当前 delivery pass 的 terminal phase

### Requirement: Phase node body structure

每个 phase node body SHALL 包含以下 section（骨架阶段内容为最小 placeholder）：

1. Stage goal
2. Required inputs（来自哪些 bundle state 或文件）
3. Allowed Agent actions
4. Expected runtime artifacts
5. Gate command（要运行的 gate CLI 命令）
6. On gate pass
7. On gate fail
8. Stop behavior
9. Anti-cheating rules

Body SHALL NOT 重复整个 lifecycle 或在 prose 里复制 gate rules。Gate details 可为 Agent 可读性做摘要，但 SHALL 说明 deterministic rule authority 在 Gate definition JSON 和 CLI output。

#### Scenario: Agent loads a phase node

- **WHEN** agent 加载 `phase-wave0.md`
- **THEN** body MUST 包含全部 9 个 section title，内容可为 placeholder

### Requirement: Final node terminal semantics

`phase-final.md` SHALL 声明 `gate: null`。它是当前 delivery pass 的 terminal node，SHALL NOT 拥有 outgoing gate 或 normal next phase。

用户 final 后反馈 SHALL NOT 通过 final node 的隐藏循环处理。反馈路径由 HITL2 repair/rerun 承载（属于后续 content change 的职责）。

#### Scenario: Final node is terminal

- **WHEN** loader 读取 `phase-final.md` 的 metadata 或 `manifest.json` 中 final 的 entry
- **THEN** `gate` MUST 为 `null`
- **AND** 该 node MUST NOT 声明 `next` 作为权威字段

### Requirement: Skeleton completeness criteria

骨架阶段不要求 body 有完整内容。每个 skeleton file SHALL 满足：

- Frontmatter 可被正则提取并 JSON.parse
- Agent 能从 frontmatter 确定 `node_type`、`id`、gate/stop（phase 适用）或 shared_scope/authority（shared 适用）
- CLI skeleton 可被 `node` 执行且返回合法 JSON
- Gate definition JSON 可被 `JSON.parse` 且包含 `gate`、`description`、`rules` 字段

#### Scenario: Skeleton is parseable not functional

- **WHEN** `check-gate-wave0-complete.mjs` 被 `node` 执行且 `--bundle` 参数提供
- **THEN** 脚本 MUST 返回合法 JSON，MUST NOT 因 `import` 错误或语法错误而崩溃

#### Scenario: Skeleton phase node is loadable

- **WHEN** loader 打开 `phase-wave0.md`
- **THEN** frontmatter MUST 可解析为合法 key-value pairs，`node_type` MUST 为 `phase`

### Requirement: Workflow package consistency validation

Workflow package consistency validation SHALL check manifest membership, frontmatter, gate definitions, transition tables, loader cache, dependency plans, and work-unit sub-agent guidance references. Validation SHALL reject delegated guidance that claims production authority without work-unit task, submit, and gate coverage contracts.

#### Scenario: delegated guidance is validated through work-unit contracts

- **WHEN** workflow validation sees delegated guidance
- **THEN** it SHALL require work-unit-compatible metadata and dependency wiring

### Requirement: Autonomous contract header injection for lifecycle stop:no phases

Autonomous contract header injection SHALL apply only to manifest lifecycle phases with `stop: "no"`. Work-unit sub-agent task guidance and other non-lifecycle task surfaces SHALL NOT receive lifecycle autonomous or terminal-delivery headers solely because their frontmatter resembles a phase node.

#### Scenario: work-unit sub-agent guidance does not receive lifecycle header

- **WHEN** `assessNode()` loads work-unit sub-agent task guidance
- **THEN** it SHALL NOT inject the lifecycle autonomous header unless the file is a manifest lifecycle phase

### Requirement: Universal silent execution dependency for lifecycle stop:no phases

Every manifest lifecycle phase node with `stop: "no"` in its frontmatter SHALL include `shared/shared-silent-execution` in its `requires` array. Work-unit sub-agent task guidance and other phase-like files outside manifest lifecycle membership are outside this requirement.

#### Scenario: sub-agent task guidance is outside lifecycle dependency rule

- **WHEN** dependency closure evaluates a work-unit sub-agent task guidance file
- **THEN** it SHALL NOT treat that file as a manifest lifecycle phase

### Requirement: Sub-agent role specs SHALL mandate standard library output serialization

Sub-agent role specs SHALL require that all structured output files written by the sub-agent be produced through standard library serialization: `yaml.stringify()` for YAML outputs and `JSON.stringify()` for JSON outputs. Hand-concatenated format strings (template literals, string interpolation, shell heredocs) SHALL NOT be described as an acceptable method.

Standard library serialization prevents parse failures from unescaped special characters — the `yaml` package's `stringify()` automatically selects the correct scalar style for each value. This is the write-side prevention for BUG-018.

> **Read-side complement:** `gate-skeleton` GSK-002 adds deterministic YAML/JSON repair in gate helpers for legacy data and edge cases. Together they form the BUG-018 double defense.

#### Scenario: YAML output uses yaml.stringify

- **WHEN** a sub-agent role spec instructs the sub-agent to write `source.yaml`
- **THEN** the spec SHALL mandate constructing a JS array and calling `yaml.stringify(data)` to produce file content
- **AND** the spec SHALL explicitly warn against hand-concatenating YAML strings

### Requirement: Header injection uses manifest membership and execution_contract surface

Header injection SHALL use manifest lifecycle membership as authority. `execution_contract.surface` SHALL reinforce that lifecycle phase surfaces and work-unit sub-agent task guidance surfaces are different execution surfaces.

#### Scenario: work-unit guidance surface does not receive lifecycle header

- **WHEN** `assessNode()` loads a guidance file with a work-unit sub-agent task surface
- **THEN** lifecycle header injection SHALL be skipped unless manifest lifecycle membership also applies

### Requirement: Lifecycle phase handoff consumes check.next through enter-phase (WNC-010)

Lifecycle phase nodes with deterministic gate pass routing SHALL instruct the Agent to consume gate CLI `check.next` through `enter-phase.mjs`.

The On Gate Pass section SHALL require this sequence:

1. read the gate CLI JSON output;
2. verify `check.passed === true`;
3. read `check.next`;
4. call `node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>` and capture the rendered Markdown as the next Agent control surface;
5. before executing any work from that rendered next phase, call `node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to <this phase's gate enum>` to synchronize the just-passed source gate after the target node load witness exists;
6. continue from the Markdown captured in step 4.

The phase body SHALL NOT frame `advance-status` as the action that enters the next phase. `advance-status` is status synchronization and SHALL NOT substitute for `enter-phase`. `enter-phase` itself SHALL also be framed as a deterministic loader/check, not as a JS lifecycle walker or executor of the next phase.

The source gate enum SHALL be the gate that just passed, not the next phase's gate. For example, wave0 gate pass SHALL synchronize with `--to wave0_complete` after `enter-phase --node phases/phase-wave1.md`; it SHALL NOT use `--to wave1_complete` until the wave1 gate itself has passed.

This requirement applies to lifecycle phases whose deterministic outcome has a next lifecycle node from setup onward, including setup→seed-topics, seed-topics→wave0, wave0→wave1, wave1→wave2, wave2→HITL2, HITL2→readiness, HITL2→rerun, readiness→final, and rerun→seed-topics. HITL2 indeterminate decisions remain governed by their existing decision logic; when the current runtime emits a deterministic HITL2 branch, its selected fileRef SHALL still be consumed through `enter-phase`. The instantiation/HITL1 bootstrap status shape is a compatibility exception for this change and SHALL NOT be silently rewritten by the phase wording update.

The phase wording SHALL give concrete source-gate `advance-status` commands so the Agent does not infer them at runtime:

| Passed phase | Target from `check.next` | Source-gate status sync |
| --- | --- | --- |
| setup | `phases/phase-seed-topics.md` | `advance-status --to setup_ready` |
| seed-topics | `phases/phase-wave0.md` | `advance-status --to seed_topics_ready` |
| wave0 | `phases/phase-wave1.md` | `advance-status --to wave0_complete` |
| wave1 | `phases/phase-wave2.md` | `advance-status --to wave1_complete` |
| wave2 | `phases/phase-hitl2.md` | `advance-status --to wave2_complete` |
| HITL2 proceed branch | `phases/phase-readiness.md` | `advance-status --to hitl2_recorded` |
| HITL2 rerun branch | `phases/phase-rerun.md` | `advance-status --to hitl2_recorded` |
| readiness | `phases/phase-final.md` | `advance-status --to readiness_passed` |
| rerun | `phases/phase-seed-topics.md` | `advance-status --to rerun_ready` |

#### Scenario: Wave phase gate pass uses enter-phase

- **WHEN** a wave phase node describes its Gate Pass behavior
- **THEN** it SHALL instruct the Agent to run `enter-phase --bundle <path> --node <check.next>`
- **AND** it SHALL instruct the Agent to run `advance-status --bundle <path> --to <this phase's gate enum>` only after `enter-phase`
- **AND** it SHALL tell the Agent to continue from the captured rendered next node content as the Phase Agent's next Markdown control surface after source-gate status synchronization

#### Scenario: Advance status is not described as phase entry

- **WHEN** a lifecycle phase node mentions `advance-status`
- **THEN** the phase body SHALL NOT describe it as loading, entering, or executing the next phase
- **AND** the phase body SHALL preserve `enter-phase` as the handoff consumption action
- **AND** the phase body SHALL NOT use the next phase's gate enum as the `--to` value for the just-passed source phase

#### Scenario: Final delivery still happens only at final

- **WHEN** readiness gate pass points to `phase-final.md`
- **THEN** readiness SHALL instruct the Agent to consume that node through `enter-phase`
- **AND** final report delivery SHALL remain governed by the Final node after final artifacts are written

#### Scenario: Wave1 and Wave2 handoffs use source-gate synchronization

- **WHEN** wave1 or wave2 phase nodes describe their Gate Pass behavior
- **THEN** wave1 SHALL instruct `enter-phase --node phases/phase-wave2.md` followed by `advance-status --to wave1_complete`
- **AND** wave2 SHALL instruct `enter-phase --node phases/phase-hitl2.md` followed by `advance-status --to wave2_complete`
- **AND** neither phase SHALL instruct the Agent to synchronize to the next phase's gate before that next phase passes

#### Scenario: Rerun handoff preserves alternate predecessor semantics

- **WHEN** rerun gate pass points to `phases/phase-seed-topics.md`
- **THEN** rerun SHALL instruct the Agent to consume seed-topics through `enter-phase`
- **AND** rerun SHALL synchronize source status with `advance-status --to rerun_ready`
- **AND** seed-topics SHALL treat rerun as a legal predecessor when the runtime trace proves that branch

#### Scenario: HITL2 deterministic branches consume the selected target

- **WHEN** HITL2 proceeds to readiness
- **THEN** HITL2 SHALL consume `phases/phase-readiness.md` through `enter-phase` and synchronize with `advance-status --to hitl2_recorded`
- **WHEN** HITL2 selects the deterministic rerun branch
- **THEN** HITL2 SHALL consume `phases/phase-rerun.md` through `enter-phase` and synchronize with `advance-status --to hitl2_recorded`
- **AND** neither branch SHALL let `advance-status` choose the target in place of the selected `check.next`

### Requirement: Lifecycle node wording uses canonical phase-boundary terms

Lifecycle phase nodes and shared workflow Markdown SHALL use the canonical phase-boundary terminology when describing gate pass behavior.

On a deterministic gate pass, lifecycle wording SHALL preserve this order and meaning:

1. the gate CLI passes the current phase and emits structured stdout with `check.next`;
2. the Phase Agent consumes `check.next` through `enter-phase` or another accepted loader/check path;
3. the loader writes a route-bound `load_complete` entry witness for the target Markdown control surface;
4. `advance-status --to <source_gate_enum>` synchronizes the just-passed source gate in `rb_status.json`; and
5. the target phase's work remains unproven until the target phase performs its own work and passes its own gate.

Lifecycle Markdown SHALL NOT describe `advance-status` as entering/loading/executing the next phase, SHALL NOT describe `enter-phase` or `load_complete` as target work completion, and SHALL NOT call local artifact creation or queue drain a phase boundary unless the current gate has passed and emitted the accepted `check.next`.

#### Scenario: On Gate Pass wording preserves boundary order

- **WHEN** a lifecycle phase node documents deterministic Gate Pass behavior
- **THEN** it SHALL tell the Agent to read gate stdout, consume `check.next` through `enter-phase`, synchronize source status with `advance-status`, and continue from the rendered next node
- **AND** the wording SHALL distinguish source-gate status synchronization from target-phase work completion

#### Scenario: Static validation catches overclaiming

- **WHEN** a lifecycle node or shared workflow Markdown says that `advance-status` enters the next phase or that `enter-phase` completes the target phase
- **THEN** the docs validator or regression SHALL fail
- **AND** the failure SHALL identify the file and boundary term that overclaims

### Requirement: Self-documenting lifecycle and work-unit sub-agent guidance nodes

Every work-unit sub-agent guidance file SHALL contain a concise role or task brief immediately after the H1. The brief SHALL orient the sub-agent to assigned work-unit identity, inputs, outputs, boundary, and return contract. Orientation text SHALL NOT replace schemas, queue state, submitted output declarations, trace, transition routing, or gate CLI verdicts as deterministic authority.

#### Scenario: work-unit sub-agent guidance has task brief

- **WHEN** a sub-agent receives work-unit guidance
- **THEN** the guidance SHALL state assigned identity, boundary, expected outputs, and return contract

