## Why

Gate CLI 当前通过 `--next` flag 获取路由信息——Playbook 从 manifest 读出 `next` 值后传给 gate，gate 原样 echo。这要求 MD controller 每步都手动查 manifest、拼参数——负担全在 Controller 身上。

正确模型：Gate 自己问 Transition table。Transition table 是独立数据层（`(gate, state) → next_node`），Gate 调统一接口 `askNext()` 获取 `next`。背后可以是静态映射表（`.chain.json`）或 FSM 状态转移图（`.fsm.json`）——Gate 不认识，只认接口。

本 change 创建 transition table 数据文件 + chain 引擎 + `askNext` 统一分发层，确保 chain 和 FSM 提供相同的查询接口，文件命名遵循 `transitions.<impl>.json` 约定。

## What Changes

**New Capability: `transition-table`**

| 文件 | 角色 |
|------|------|
| `DPT_FRAMEWORK/workflows/transitions.chain.json` | (gate, state) → next_node 静态转移表 |
| `DPT_FRAMEWORK/engine/ask-next.mjs` | 统一分发：`askNext(path, gate, state)` → `next_node \| null` |
| `DPT_FRAMEWORK/engine/transition-chain.mjs` | chain 引擎：`loadChain()`, `resolveTransition()`, Zod schema（与 FSM 引擎对等） |

**Modified Capability: `gate-skeleton`**
- 8 个 gate CLI：去掉 `--next` flag，改为调用 `askNext(TRANSITIONS_PATH, gate, state)`
- `check.next` 从 `askNext()` 返回值填充

**Modified Capability: `workflow-node-contract`**
- manifest.json 去掉 `next` 字段（路由权威移到 transition table）

**Experiment: `exp_wff_validation`**
- 两个 playbook 去掉所有 `--next` flag
- 验证 gate CLI 响应的 `next` 字段来自 transition table

## Impact

- **新文件**：`transitions.chain.json`、`ask-next.mjs`、`transition-chain.mjs`
- **修改**：8 个 gate CLI、manifest.json、prototype manifest、2 个 playbook、walk-lifecycle.mjs
- **删除**：gate CLI 的 `--next` flag、manifest 的 `next` 字段
- **未来**：`transitions.fsm.json`（FSM graph）+ `askNext` 透明切换
