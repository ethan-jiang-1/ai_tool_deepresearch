> req: TRT-001, TRT-002, TRT-003, TRT-004

## Purpose

定义 Transition table 层——Node 间状态转移的单一事实来源。当前用静态映射表（`.chain.json`），未来可换 FSM graph（`.fsm.json`）。`ask-next.mjs` 是统一查询入口——Gate 只认接口，不认底下是什么。

## ADDED Requirements

### Requirement: Transition table file naming convention

Transition table 文件 SHALL 命名为 `transitions.<impl>.json`。`<impl>` SHALL 为 `chain`（静态映射表）或 `fsm`（FSM 状态转移图）。

#### Scenario: Chain format recognized by suffix

- **WHEN** `askNext('.../transitions.chain.json', 'gate-x', 'passed')` 被调用
- **THEN** SHALL 使用 chain loader（`loadChain`）加载文件并查询

#### Scenario: FSM format recognized by suffix

- **WHEN** `askNext('.../transitions.fsm.json', 'gate-x', 'passed')` 被调用
- **THEN** SHALL 使用 FSM loader（`loadFSM`）加载文件并查询

### Requirement: transitions.chain.json structure

`transitions.chain.json` SHALL 是 `{ gate_name: { state: next_node } }` 映射表。`state` SHALL 使用约定的状态枚举值（当前：`'passed'`、`'failed'`）。`next_node` SHALL 为相对 node 文件路径或 `null`。

#### Scenario: Known gate and state returns next node

- **WHEN** `resolveTransition(chain, 'instantiation-complete', 'passed')` 被调用
- **THEN** 返回 `{ next: 'phases/phase-hitl1.md', found: true }`
- **AND** `next` SHALL 是完整相对 node 文件路径（含 `phases/` 或 `shared/` 前缀 + `.md` 后缀），MD controller 可直接传给 `assessNode(next, ...)`，无需拼接或查表

#### Scenario: Unknown state returns null

- **WHEN** `resolveTransition(chain, 'instantiation-complete', 'blocked')` 被调用且 chain 中无 `blocked` entry
- **THEN** 返回 `{ next: null, found: false }`

### Requirement: transition-chain.mjs provides chain engine

`transition-chain.mjs` SHALL 提供与 `workflow-fsm.mjs` 对等的接口：

- `ChainDefinition` — Zod schema（验证 `{ [gate]: { [state]: next_node } }` 结构）
- `loadChain(path)` — 读取并验证 `.chain.json` 文件
- `resolveTransition(chain, gate, state)` — 纯函数，返回 `{ next, found }`
- `createChain(path, trace?)` — factory，返回带有 `advance(state)`、`current`、`isComplete` 等属性的对象

#### Scenario: createChain loads and advances

- **WHEN** `const c = createChain('transitions.chain.json', trace); c.advance('passed')`
- **THEN** `c.current` SHALL 更新为 next_node，trace SHALL 记录 transition receipt

### Requirement: ask-next.mjs dispatches by file suffix

`askNext(path, gate, state)` SHALL 根据 `path` 文件后缀选择 loader：
- `.chain.json` → `loadChain()` + `resolveTransition()`
- `.fsm.json` → `loadFSM()` + `resolveTransition()`

返回 `next_node`（string）或 `null`。

#### Scenario: askNext returns next node through chain

- **WHEN** `askNext('transitions.chain.json', 'setup-ready', 'passed')` 被调用
- **THEN** 返回 `'phases/phase-wave0.md'`

#### Scenario: askNext returns null for unknown

- **WHEN** `askNext('transitions.chain.json', 'nonexistent', 'passed')` 被调用
- **THEN** 返回 `null`
