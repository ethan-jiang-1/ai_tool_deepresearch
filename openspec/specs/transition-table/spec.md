> req: TRT-001, TRT-002, TRT-003, TRT-004

## Purpose

定义 Transition table 层的当前 Source of Record。`.chain.json` 和 `.fsm.json` 都是可查询的 transition tables，`ask-next.mjs` 根据后缀分发到对应 loader。Engine 只负责确定性查表，不负责 Agent Flow 编排。

## Requirements

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

#### Scenario: Unknown state returns null

- **WHEN** `resolveTransition(chain, 'instantiation-complete', 'blocked')` 被调用且 chain 中无 `blocked` entry
- **THEN** 返回 `{ next: null, found: false }`

### Requirement: transition-chain.mjs provides chain tracker

`transition-chain.mjs` SHALL 提供以下接口：

- `ChainDefinition` — Zod schema，验证 `{ [gate]: { [state]: next_node } }` 结构
- `loadChain(path)` — 读取并验证 `.chain.json` 文件
- `resolveTransition(chain, gate, state)` — 纯函数，返回 `{ next, found }`
- `createChain(pathOrDef, trace?)` — factory，返回 `Chain` tracker

`Chain` tracker SHALL 具有以下属性和方法：

- `current` — 最近一次查询的 gate
- `next` — 最近一次查询得到的 next_node
- `outcome` — `running` 或 `complete`
- `isComplete` — `outcome === 'complete'`
- `receipts` — transition receipt 数组
- `iterations` — 已查询次数
- `askNext(gate, state)` — 查询 transition，记录 receipt，并更新 tracker 状态

#### Scenario: createChain records queries

- **WHEN** `const c = createChain('transitions.chain.json', trace); c.askNext('gate-a', 'passed')`
- **THEN** `c.current` SHALL 更新为 `gate-a`
- **AND** `c.next` SHALL 更新为查询结果
- **AND** `c.receipts` SHALL 追加一条 transition receipt

#### Scenario: createChain marks terminal results complete

- **WHEN** `c.askNext('gate-final', 'passed')` returns `next: null`
- **THEN** `c.isComplete` SHALL 为 `true`

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
