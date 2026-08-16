## MODIFIED Requirements

### Requirement: transitions.chain.json structure

`transitions.chain.json` SHALL 是 `{ node_ref: { state: next_node } }` 映射表：key 为当前 node 的仓库相对文件 ref（如 `phases/phase-hitl1.md`），`state` SHALL 使用约定的状态枚举值，`next_node` SHALL 为相对 node 文件路径或 `null`。当前编码的状态为 `'passed'` 与 `'rerun'`（`phases/phase-hitl2.md` 编码 `passed` → `phases/phase-readiness.md` 与 `rerun` → `phases/phase-rerun.md`）；`'failed'` 当前无编码 entry。Chain 是故意稀疏的静态映射表：未编码的分支（未列出的 node 或 state）SHALL 由查表返回 `found: false` 并归 Agent decision authority，不新增 chain 语义。

#### Scenario: Known gate and state returns next node

- **WHEN** `resolveTransition(chain, 'phases/phase-hitl1.md', 'passed')` 被调用
- **THEN** 返回 `{ next: 'phases/phase-setup.md', found: true }`

#### Scenario: Encoded rerun branch returns the rerun node

- **WHEN** `resolveTransition(chain, 'phases/phase-hitl2.md', 'rerun')` 被调用
- **THEN** 返回 `{ next: 'phases/phase-rerun.md', found: true }`

#### Scenario: Unknown state returns null

- **WHEN** `resolveTransition(chain, 'phases/phase-instantiation.md', 'blocked')` 被调用且 chain 中无 `blocked` entry
- **THEN** 返回 `{ next: null, found: false }`
