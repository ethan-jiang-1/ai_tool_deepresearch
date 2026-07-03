# Workflow Node Contract

> req: WNC-001, WNC-002, WNC-003, WNC-004, WNC-005, WNC-006, WNC-007, WNC-008, WNC-009

## Purpose

定义 Workflow Foundation 的 node metadata contract、phase manifest 和 14 个骨架文件的产出要求。使 Agent 能通过 frontmatter 和 manifest 识别当前 phase、gate、phase inventory 和 shared nodes，无需从散落 prose 或 chat memory 推断。
## Requirements
### Requirement: Phase node metadata contract

所有 phase node SHALL 包含以下 frontmatter 字段，字段值 MUST 与 `manifest.json` 中的对应 entry 一致。`gate` 使用 hyphen 形式；phase frontmatter SHALL NOT 声明 `next`。routing identity SHALL 是 node fileRef（例如 `phases/phase-wave0.md`），而不是 frontmatter `id`。

| Field | Required | Meaning |
|-------|----------|---------|
| `node_type` | yes | `"phase"` |
| `id` | yes | Stable diagnostic label，与文件名语义一致（如 `phase-wave0`） |
| `phase` | yes | 当前 phase key（如 `wave0`） |
| `gate` | yes | Phase work 后要运行的 gate key；`final` 为 `null` |
| `stop` | yes | `"yes"` 或 `"no"` |
| `requires` | yes | Mandatory shared Markdown dependency 的 id 数组；无则为 `[]` |
| `suggested_context` | yes | Optional reference 的 id 数组；无则为 `[]` |
| `subagent` | no | 标记该 phase 未来使用 subagent mechanics；值为 `true` 或不出现 |
| `execution_contract` | yes (lifecycle phases, relay role specs, shared nodes touched by this change) | Object declaring `surface` (`phase-agent` / `relay-subagent-role` / `shared-guidance`), `search_policy` (`no_search` / `relay_required` / `relay_required_for_new_evidence` / `subagent_performs_search`), and conditional fields `delegated_role_keys`, `loaded_by`, `delivered_via` |

`execution_contract` is Agent-readable + validator-enforceable guidance. It SHALL NOT replace relay receipts, `rb_output_declarations.jsonl`, slot markers, or gate provenance checks as deterministic authority.

`surface: phase-agent` means the Markdown is a manifest lifecycle node. `surface: relay-subagent-role` means it is a Phase-Agent-loaded role spec delivered via relay `task.md`. `surface: shared-guidance` means it is shared context/guidance only.

`search_policy: relay_required` means any WebSearch/WebFetch task SHALL delegate through relay with `targets.controller: "main-agent"` + `targets.delegates.to: "sub-agent"`. `relay_required_for_new_evidence` allows main-agent synthesis but requires relay delegation for new search/evidence/reference outputs. `no_search` prohibits WebSearch/WebFetch. `subagent_performs_search` describes role-spec search behavior.

`stop: "yes"` SHALL 仅出现在 HITL nodes（`phase-hitl1`、`phase-hitl2`）。

#### Scenario: Agent reads phase node metadata

- **WHEN** agent 加载 `phase-wave0.md`
- **THEN** agent MUST 能从 frontmatter 确定当前 phase 是 `wave0`、gate 是 `wave0-complete`、stop 是 `no`
- **AND** routing MUST use the node fileRef `phases/phase-wave0.md`

#### Scenario: Phase node metadata matches manifest

- **WHEN** `phase-wave0.md` 的 frontmatter 声明 `gate: wave0-complete`
- **THEN** `manifest.json` 中 phase `wave0` 的 `gate` MUST 也是 `wave0-complete`
- **AND** 该 phase 的位置 MUST 可由 `phases` 数组顺序识别，NOT 由 `next` 字段决定
- **AND** runtime next-node lookup MUST NOT be inferred from phase frontmatter

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

- `phases` 数组 MUST 包含 9 个元素，按 `instantiation → hitl1 → setup → wave0 → wave1 → wave2 → hitl2 → readiness → final` 顺序排列
- 每个 phase entry MUST 包含 `key`、`node`（相对 manifest 的路径）、`gate` 字段
- `node` value SHALL be the canonical fileRef used by transition lookup
- `next` 不是 manifest contract 的一部分；phase 顺序仅作为 Agent-readable inventory/index，由数组位置表示
- Runtime next-node lookup MUST come from gate CLI `check.next`, sourced from detailed transition router results
- `final` phase 的 `gate` MUST 为 `null`
- `shared` 数组 MUST 列出所有 shared node 的相对路径

#### Scenario: Manifest is the lifecycle inventory

- **WHEN** loader or Agent 需要识别已知 phase、展示 lifecycle order、或校验 phase metadata
- **THEN** it MUST read the `phases` array as the lifecycle inventory/index
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

The system SHALL provide workflow package consistency validation that checks the package as a whole, not just one file type. The validator SHALL compare manifest phase entries, phase/shared node frontmatter, gate definition JSON, transition tables, and loader runtime cache / dependency plan.

The validator SHALL report at least these mismatch classes:

- manifest entry points to a missing node file
- node frontmatter `gate` disagrees with manifest or gate definition
- gate definition `gate` disagrees with the node binding
- transition table references a missing current node or next node
- loader-resolved dependency ref cannot be resolved under the configured node directory
- missing `execution_contract` on lifecycle phase nodes, shared nodes, or relay role specs
- unknown `surface` or `search_policy` value
- `surface: relay-subagent-role` listed in `manifest.phases[]`
- relay role spec missing `loaded_by: phase-agent` or `delivered_via: relay_task_md`
- `search_policy: relay_required` task template performs WebSearch/WebFetch without `targets.delegates.to: "sub-agent"`
- relay-capable lifecycle node keeps subagent/anti-cheating rules only in `suggested_context` instead of `requires`
- missing `Execution Brief` on lifecycle phase nodes or `Role Brief` on relay role specs
- sub-agent role spec artifact instructions using template literal, heredoc, or string interpolation patterns (serialization contract violation)

#### Scenario: Consistent package passes validation

- **WHEN** manifest, node frontmatter, gate definitions, transition tables, and resolvable file refs all agree
- **THEN** the validator SHALL pass

#### Scenario: Gate binding mismatch fails validation

- **WHEN** a phase node frontmatter `gate` differs from its manifest entry or gate definition
- **THEN** the validator SHALL fail and report the mismatch

#### Scenario: Missing transition target fails validation

- **WHEN** a transition table references a current node or next node that does not exist on disk
- **THEN** the validator SHALL fail and report the missing file ref

#### Scenario: Unresolvable loader ref fails validation

- **WHEN** a loader-resolved node file ref cannot be resolved under the configured workflow node directory
- **THEN** the validator SHALL fail and report the unresolved ref

### Requirement: Autonomous contract header injection for lifecycle stop:no phases

`assessNode()` SHALL, for manifest lifecycle entry nodes when `stop` is `"no"`, inject a mode contract header into the node's Markdown content after frontmatter parsing and before the first phase body section. The injection SHALL be the first body content the Agent reads after frontmatter, ensuring the Agent cannot miss the autonomous execution contract.

Manifest lifecycle membership SHALL be determined only from `DPT_FRAMEWORK/workflows/manifest.json` (or the manifest colocated with the active `runtime.nodesDir` in tests): a node is lifecycle-covered only when its fileRef exactly matches an entry in `manifest.phases[].node`. Frontmatter fields (`node_type`, `phase`, `gate`, `stop`) are necessary for selecting the header variant, but they SHALL NOT by themselves make a file a lifecycle phase. Filename patterns such as `phase-*.md` SHALL NOT be used as lifecycle authority.

For non-terminal manifest lifecycle phase nodes with `stop: "no"` and `gate` not `null`, the injected header SHALL be an autonomous-mode header and SHALL include:

- A prominent "AUTONOMOUS MODE" declaration
- An explicit statement that this is a non-terminal `stop: no` phase
- Absolute prohibitions: SHALL NOT surface to user, SHALL NOT ask questions, SHALL NOT request confirmation, SHALL NOT report progress, SHALL NOT report idle/no-work state
- Guidance that the phase objective is to complete the current node by repairing/draining/degrading as needed, running the gate, and following gate CLI `check.next`
- Guidance on gate failure: repair and retry autonomously, do not ask the user
- A reference to `shared-silent-execution.md` as the governing behavioral contract

The injected header is a principle-level guardrail. It SHALL NOT replace the phase body's node-specific Stop Behavior, quality rules, queue rules, or gate-fail repair instructions. Each lifecycle node MAY phrase its §8 Stop Behavior differently as long as it preserves the shared autonomous invariants.

For the terminal Final phase (`phase: "final"`, `stop: "no"`, and `gate: null`), the injected header SHALL be a terminal-delivery header and SHALL include:

- A prominent "TERMINAL DELIVERY MODE" declaration
- An explicit statement that this is the terminal Final phase (`stop: no` + `gate: null`)
- A prohibition on questions, confirmation requests, progress reports, A/B choices, and post-delivery feedback loops
- Permission to deliver the final report only after final artifacts have been written to `final/`
- A statement that user feedback after delivery belongs to the HITL2 repair/rerun path, not the Final node

The injection SHALL be separated from the phase body by a horizontal rule (`---`) for visual distinction.

The injection SHALL NOT modify `entry.frontmatter` (already parsed). The injection SHALL target `entry.md` in the content cache, affecting only the Agent-readable Markdown content.

The injection SHALL be deterministic and idempotent — repeated `assessNode` calls on the same node SHALL produce the same result.

If no workflow manifest is available for the active `runtime.nodesDir`, `assessNode()` SHALL skip lifecycle header injection rather than infer lifecycle membership from filename or frontmatter alone. Phases with `stop: "yes"` or without a `stop` field SHALL NOT receive the injection. Markdown relay/sub-agent task surfaces that are not manifest lifecycle phase entries, including `phase-wave2-subagent.md`, SHALL NOT receive the lifecycle autonomous or terminal-delivery header solely because they contain `stop: "no"`.

#### Scenario: non-terminal stop:no phase receives autonomous contract header

- **WHEN** `assessNode()` loads a manifest lifecycle phase node with `stop: "no"` and `gate` not `null`
- **THEN** the returned Markdown content SHALL contain an "AUTONOMOUS MODE" header immediately after the frontmatter block
- **AND** the header SHALL precede the first `# Phase:` heading
- **AND** the header SHALL include explicit prohibitions against surfacing to the user
- **AND** the header SHALL prohibit progress/idle reports and point the Agent back to gate-driven completion

#### Scenario: autonomous header preserves node-specific stop behavior

- **WHEN** a manifest lifecycle `stop: "no"` phase has phase-specific §8 Stop Behavior
- **THEN** the injected header SHALL act as a shared guardrail rather than a replacement template
- **AND** the implementation SHALL NOT require all phase bodies to use identical Stop Behavior wording
- **AND** phase-specific quality, queue, and gate repair instructions SHALL remain authoritative within the autonomous boundary

#### Scenario: final phase receives terminal delivery header

- **WHEN** `assessNode()` loads the Final phase with `phase: "final"`, `stop: "no"`, and `gate: null`
- **THEN** the returned Markdown content SHALL contain a "TERMINAL DELIVERY MODE" header immediately after the frontmatter block
- **AND** the header SHALL precede the first `# Phase:` heading
- **AND** the header SHALL permit final report delivery after final artifacts are written
- **AND** the header SHALL prohibit questions, confirmation requests, A/B choices, and post-delivery feedback handling

#### Scenario: stop:yes phase does not receive injection

- **WHEN** `assessNode()` loads a `stop: "yes"` phase node
- **THEN** the returned Markdown content SHALL NOT contain the autonomous or terminal-delivery contract header
- **AND** the content SHALL be the unmodified phase body

#### Scenario: relay sub-agent surface does not receive lifecycle header

- **WHEN** `assessNode()` or a future loader reads `phase-wave2-subagent.md`
- **THEN** the returned Markdown content SHALL NOT contain the lifecycle autonomous or terminal-delivery contract header
- **AND** lifecycle stop:no coverage SHALL NOT be inferred from filename alone

#### Scenario: manifest is the lifecycle membership source

- **WHEN** a Markdown file has phase-like frontmatter including `stop: "no"` but its fileRef is absent from `manifest.phases[].node`
- **THEN** `assessNode()` SHALL NOT inject the lifecycle autonomous or terminal-delivery contract header
- **AND** the implementation SHALL NOT infer lifecycle membership from filename, directory, `phase`, `gate`, or `stop` fields alone

### Requirement: Universal silent execution dependency for lifecycle stop:no phases

Every manifest lifecycle phase node with `stop: "no"` in its frontmatter SHALL include `shared/shared-silent-execution` in its `requires` array. Manifest lifecycle phase nodes are exactly the fileRefs listed in `manifest.phases[].node`; relay/sub-agent task surfaces and other phase-like Markdown files outside that manifest set are not lifecycle phase nodes for this requirement. This ensures the full silent execution behavioral contract is loaded into the Phase Agent's context before the phase body is read, via the existing dependency resolution closure mechanism in `resolveDependencyClosure()`.

The `requires` array SHALL be used for this dependency — `suggested_context` is insufficient because it does not guarantee the dependency is loaded before the phase body.

Lifecycle phases covered: instantiation, setup, seed-topics, wave0, wave1, wave2, readiness, rerun, final. Final is covered by the dependency requirement but uses terminal delivery semantics in the injected header. Relay/sub-agent task surfaces such as `subagent-dpt-topic-scout.md` are outside this requirement even if their frontmatter contains `stop: "no"`; their behavior is governed by relay/sub-agent contracts.

#### Scenario: Every lifecycle stop:no phase requires shared-silent-execution

- **WHEN** a manifest lifecycle phase node frontmatter declares `stop: "no"`
- **THEN** its `requires` array SHALL include `shared/shared-silent-execution`
- **AND** `resolveDependencyClosure()` SHALL include `shared-silent-execution.md` in the load plan before the phase body

### Requirement: Self-documenting lifecycle and relay role nodes

Workflow Markdown nodes SHALL expose their execution identity at first load without changing runtime authority.

Every manifest lifecycle phase node SHALL contain `## 0. Execution Brief` immediately after the H1 and before `## 1. Stage Goal`. The brief fields in order: `Objective`, `Start here`, `Path to pass`, `Completion check`, `Failure posture`. Lifecycle phase nodes SHALL retain the existing 9-section body after the brief.

Every relay role spec SHALL contain `## 0. Role Brief` immediately after the H1. Fields in order: `Role key`, `Used by`, `Receives`, `Produces`, `Boundary`, `Handoff`. Role specs SHALL use a role-oriented body structure and SHALL NOT use lifecycle-primary headings.

`Execution Brief` and `Role Brief` are Agent orientation layers only. They SHALL NOT replace schemas, queue state, relay receipts, output declarations, trace, transition routing, or gate CLI verdicts as deterministic authority.

#### Scenario: Lifecycle phase has ordered execution brief

- **WHEN** workflow package validation reads any `manifest.phases[].node`
- **THEN** the node SHALL contain `## 0. Execution Brief` with five required fields in order before `## 1. Stage Goal`

### Requirement: Sub-agent role specs SHALL mandate standard library output serialization

Sub-agent role specs SHALL require that all structured output files written by the sub-agent be produced through standard library serialization: `yaml.stringify()` for YAML outputs and `JSON.stringify()` for JSON outputs. Hand-concatenated format strings (template literals, string interpolation, shell heredocs) SHALL NOT be described as an acceptable method.

Standard library serialization prevents parse failures from unescaped special characters — the `yaml` package's `stringify()` automatically selects the correct scalar style for each value. This is the write-side prevention for BUG-018.

> **Read-side complement:** `gate-skeleton` GSK-002 adds deterministic YAML/JSON repair in gate helpers for legacy data and edge cases. Together they form the BUG-018 double defense.

#### Scenario: YAML output uses yaml.stringify

- **WHEN** a sub-agent role spec instructs the sub-agent to write `source.yaml`
- **THEN** the spec SHALL mandate constructing a JS array and calling `yaml.stringify(data)` to produce file content
- **AND** the spec SHALL explicitly warn against hand-concatenating YAML strings

### Requirement: Header injection uses manifest membership and execution_contract surface

Header injection SHALL use manifest lifecycle membership as authority. `execution_contract.surface` SHALL reinforce this boundary:
- `surface: phase-agent` MAY receive autonomous or terminal-delivery header injection when the file is a manifest lifecycle phase
- `surface: relay-subagent-role` SHALL NOT receive lifecycle header injection
- `surface: shared-guidance` SHALL NOT receive lifecycle header injection

#### Scenario: Relay role surface does not receive lifecycle header

- **WHEN** `assessNode()` loads a role spec with `execution_contract.surface: relay-subagent-role`
- **THEN** the returned content SHALL NOT contain a lifecycle autonomous or terminal-delivery contract header
