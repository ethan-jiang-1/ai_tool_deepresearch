> req: TRT-001, TRT-002, TRT-003, TRT-004, TRT-005

## Purpose

定义 Transition table 层的当前 Source of Record。`.chain.json` 是可查询的 transition table，`ask-next.mjs` 根据后缀分发到对应 loader。Engine 只负责确定性查表，不负责 Agent Flow 编排。
## Requirements
### Requirement: Transition table file naming convention

Transition table 文件 SHALL 命名为 `transitions.<impl>.json`。`<impl>` SHALL 为 `chain`（静态映射表）。

#### Scenario: Chain format recognized by suffix

- **WHEN** `askNext('.../transitions.chain.json', 'gate-x', 'passed')` 被调用
- **THEN** SHALL 使用 chain loader（`loadChain`）加载文件并查询

### Requirement: transitions.chain.json structure

`transitions.chain.json` SHALL 是 `{ gate_name: { state: next_node } }` 映射表。`state` SHALL 使用约定的状态枚举值（当前：`'passed'`、`'failed'`）。`next_node` SHALL 为相对 node 文件路径或 `null`。

#### Scenario: Known gate and state returns next node

- **WHEN** `resolveTransition(chain, 'instantiation-complete', 'passed')` 被调用
- **THEN** 返回 `{ next: 'phases/phase-hitl1.md', found: true }`

#### Scenario: Unknown state returns null

- **WHEN** `resolveTransition(chain, 'instantiation-complete', 'blocked')` 被调用且 chain 中无 `blocked` entry
- **THEN** 返回 `{ next: null, found: false }`

### Requirement: Detailed node-result router dispatches by file suffix

`resolveNodeTransitionDetailed(path, currentNodeRef, outcome, context)` SHALL route by `path` suffix:

- `.chain.json` -> `loadChain()` + `resolveTransition()`

Unknown suffixes SHALL return `kind: 'config_error'`. The detailed router SHALL NOT accept gate-key routing as a public contract and SHALL NOT expose the retired `askNext(path, gate, state)` API.

#### Scenario: Chain suffix uses chain backend

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the chain backend SHALL produce the detailed routing result

#### Scenario: Retired askNext contract is absent

- **WHEN** a developer searches for the accepted router contract
- **THEN** there SHALL be no public `askNext(path, gate, state)` contract in this capability

#### Scenario: Retired chain tracker contract is absent

- **WHEN** a developer searches for the accepted chain tracker contract
- **THEN** there SHALL be no public `createChain(pathOrDef, trace?)` contract in this capability

#### Scenario: Canonical fileRef is accepted

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** `currentNodeRef` SHALL be treated as the canonical routing identity

#### Scenario: Invalid fileRef is rejected

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'wave0-complete', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'invalid_input'`

### Requirement: transition-chain.mjs provides node-keyed chain lookup

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

### Requirement: Detailed node-result router contract

`resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)` SHALL be the detailed public router contract. It SHALL select the backend by file suffix, validate the inputs that the backend needs, and return a discriminated result object.

`context` SHALL be a caller-owned plain object. It MAY carry explicit routing inputs such as normalized workflow node directory, manifest/binding data, and validator hints. The router SHALL only read documented inputs and SHALL NOT infer routing authority from Markdown prose, process globals, or hidden mutable state.

The returned result SHALL classify routing into exactly one of:

- `next` - a next node exists
- `terminal` - the current node ends the flow without a next node
- `no_transition` - no matching branch exists
- `invalid_input` - the caller supplied an invalid current node ref or outcome
- `config_error` - the transition data, supported suffix, or supplied context is malformed

When `kind` is `next`, the result SHALL include the next node file reference.

The result object SHALL always expose a `next` field. It SHALL be the next node file reference when `kind` is `next`, and SHALL be `null` for `terminal`, `no_transition`, `invalid_input`, and `config_error`.

The detailed router result SHALL be preserved by consumers that need diagnostics. `check.next` is a convenience mirror for downstream MD flow, not the only surviving representation of routing truth.

`currentNodeRef` and returned next node references SHALL be canonical relative node file references under the workflow node directory. The router SHALL reject empty refs, normalize path separators to the project canonical form, and SHALL NOT accept gate keys, phase keys, or frontmatter ids as routing identifiers.

#### Scenario: Successful chain lookup returns next

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called and the chain has a matching entry
- **THEN** the result SHALL have `kind: 'next'`
- **AND** the result SHALL include the next node file reference

#### Scenario: Terminal lookup returns terminal

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-final.md', 'passed', context)` is called and the table maps that branch to `null`
- **THEN** the result SHALL have `kind: 'terminal'`

#### Scenario: Missing branch returns no_transition

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'failed', context)` is called and no `failed` branch exists
- **THEN** the result SHALL have `kind: 'no_transition'`

#### Scenario: Invalid inputs return invalid_input

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', '', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'invalid_input'`

#### Scenario: Malformed routing data returns config_error

- **WHEN** the transition table or supplied context is structurally invalid
- **THEN** the result SHALL have `kind: 'config_error'`

#### Scenario: Unsupported suffix returns config_error

- **WHEN** `resolveNodeTransitionDetailed('transitions.yaml', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'config_error'`
