# Workflow Node Contract

> req: WNC-001, WNC-002, WNC-003, WNC-004, WNC-005, WNC-006, WNC-007

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
