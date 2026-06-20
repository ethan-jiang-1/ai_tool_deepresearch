## MODIFIED Requirements

### Requirement: Phase node metadata contract

所有 phase node SHALL 包含以下 frontmatter 字段，字段值 MUST 与 `manifest.json` 中的对应 entry 一致。`gate` 使用 hyphen 形式；phase frontmatter SHALL NOT 声明 `next`。`manifest.json` 的 `phases` 数组只表示 Agent-readable lifecycle inventory/order，不是 runtime next-node authority。

| Field | Required | Meaning |
|-------|----------|---------|
| `node_type` | yes | `"phase"` |
| `id` | yes | Stable identifier，与文件名语义一致（如 `phase-wave0`） |
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

#### Scenario: Phase node metadata matches manifest

- **WHEN** `phase-wave0.md` 的 frontmatter 声明 `gate: wave0-complete`
- **THEN** `manifest.json` 中 phase `wave0` 的 `gate` MUST 也是 `wave0-complete`
- **AND** 该 phase 的位置 MUST 可由 `phases` 数组顺序识别，NOT 由 `next` 字段决定
- **AND** runtime next-node lookup MUST NOT be inferred from phase frontmatter

### Requirement: Phase manifest structure

`DPT_FRAMEWORK/workflows/manifest.json` SHALL 定义完整的 lifecycle inventory/index：

- `phases` 数组 MUST 包含 9 个元素，按 `instantiation → hitl1 → setup → wave0 → wave1 → wave2 → hitl2 → readiness → final` 顺序排列
- 每个 phase entry MUST 包含 `key`、`node`（相对 manifest 的路径）、`gate` 字段
- `next` 不是 manifest contract 的一部分；phase 顺序仅作为 Agent-readable inventory/index，由数组位置表示
- Runtime next-node lookup MUST come from gate CLI `check.next`, sourced from the transition table / `askNext()` contract
- `final` phase 的 `gate` MUST 为 `null`
- `shared` 数组 MUST 列出所有 shared node 的相对路径

#### Scenario: Manifest is the lifecycle inventory

- **WHEN** loader or Agent 需要识别已知 phase、展示 lifecycle order、或校验 phase metadata
- **THEN** it MUST read the `phases` array as the lifecycle inventory/index
- **AND** it MUST NOT infer runtime next-node transition from the `phases` array, node frontmatter, or a manifest `next` field

#### Scenario: Transition table owns next-node lookup

- **WHEN** gate `wave0-complete` passes and the gate response contains `check.next`
- **THEN** that next node reference MUST come from transition table lookup through the accepted `askNext()` contract
- **AND** Markdown/Agent MAY load the returned node reference after reading the gate feedback

#### Scenario: Final phase is terminal

- **WHEN** loader 读取 `final` phase entry
- **THEN** `gate` MUST 为 `null`
- **AND** `final` MUST 是当前 delivery pass 的 terminal phase
