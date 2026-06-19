> req: WNC-001, WNC-002, WNC-003, WNC-004, WNC-005, WNC-006

## Purpose

定义 Workflow Foundation 的 node metadata contract、phase manifest 和 14 个骨架文件的产出要求。使 Agent 能通过 frontmatter 和 manifest 确定当前 phase、下一个 phase、该跑哪个 gate，无需从散落 prose 或 chat memory 推断。

## Requirements

### Requirement: Phase node metadata contract

所有 phase node SHALL 包含以下 frontmatter 字段，字段值 MUST 与 `manifest.json` 中的对应 entry 一致：

| Field | Required | Meaning |
|-------|----------|---------|
| `node_type` | yes | `"phase"` |
| `id` | yes | Stable identifier，与文件名语义一致（如 `phase-wave0`） |
| `phase` | yes | 当前 phase key（如 `wave0`） |
| `gate` | yes | Phase work 后要运行的 gate key；final 为 `none` |
| `next` | yes | Gate pass 后的 next phase key；final 为 `none` |
| `stop` | yes | `"yes"` 或 `"no"` |
| `requires` | yes | Mandatory shared Markdown dependency 的 id 数组；无则为 `[]` |
| `suggested_context` | yes | Optional reference 的 id 数组；无则为 `[]` |
| `subagent` | no | 标记该 phase 未来使用 subagent mechanics；值为 `true` 或不出现 |

`stop: "yes"` SHALL 仅出现在 HITL nodes（`phase-hitl1`、`phase-hitl2`）。

#### Scenario: Agent reads phase node metadata

- **WHEN** agent 加载 `phase-wave0.md`
- **THEN** agent MUST 能从 frontmatter 确定当前 phase 是 `wave0`、gate 是 `wave0_complete`、next 是 `wave1`、stop 是 `no`

#### Scenario: Phase node metadata matches manifest

- **WHEN** `phase-wave0.md` 的 frontmatter 声明 `next: wave1`
- **THEN** `manifest.json` 中 phase `wave0` 的 `next` MUST 也是 `wave1`

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

`DPT_FRAMEWORK/workflows/manifest.json` SHALL 定义完整的 lifecycle navigation：

- `phases` 数组 MUST 包含 9 个元素，按 `instantiation → hitl1 → setup → wave0 → wave1 → wave2 → hitl2 → readiness → final` 顺序
- 每个 phase entry MUST 包含 `key`、`node`（相对 manifest 的路径）、`gate`、`next` 字段
- `final` phase 的 `gate` 和 `next` MUST 为 `null`
- `shared` 数组 MUST 列出所有 shared node 的相对路径

#### Scenario: Manifest is the navigation authority

- **WHEN** loader 需要确定 phase `wave0` 之后的下一个 phase
- **THEN** loader MUST 从 `manifest.json` 中读取 `phases` 数组的 `next` 字段，NOT 从 node frontmatter 推断

#### Scenario: Final phase is terminal

- **WHEN** loader 读取 `final` phase entry
- **THEN** `gate` MUST 为 `null`，`next` MUST 为 `null`

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

`phase-final.md` SHALL 声明 `gate: none`、`next: none`。它是当前 delivery pass 的 terminal node，SHALL NOT 拥有 outgoing gate 或 normal next phase。

用户 final 后反馈 SHALL NOT 通过 final node 的隐藏循环处理。反馈路径由 HITL2 repair/rerun 承载（属于后续 content change 的职责）。

#### Scenario: Final node is terminal

- **WHEN** loader 读取 `phase-final.md` 的 metadata 或 `manifest.json` 中 final 的 entry
- **THEN** `gate` MUST 为 `null`/`none`，`next` MUST 为 `null`/`none`

### Requirement: Skeleton completeness criteria

骨架阶段不要求 body 有完整内容。每个 skeleton file SHALL 满足：

- Frontmatter 可被正则提取并 JSON.parse
- Agent 能从 frontmatter 确定 `node_type`、`id`、gate/next/stop（phase 适用）或 shared_scope/authority（shared 适用）
- CLI skeleton 可被 `node` 执行且返回合法 JSON
- Gate definition JSON 可被 `JSON.parse` 且包含 `gate`、`description`、`rules` 字段

#### Scenario: Skeleton is parseable not functional

- **WHEN** `check-gate-wave0-complete.mjs` 被 `node` 执行且 `--bundle` 参数提供
- **THEN** 脚本 MUST 返回合法 JSON，MUST NOT 因 `import` 错误或语法错误而崩溃

#### Scenario: Skeleton phase node is loadable

- **WHEN** loader 打开 `phase-wave0.md`
- **THEN** frontmatter MUST 可解析为合法 key-value pairs，`node_type` MUST 为 `phase`
