## Context

`DPT_FRAMEWORK/engine/workflow-chain.mjs` 目前有两个职责：
1. **MD 解析 + 依赖闭包**：frontmatter 解析、DFS 依赖解析、动态加载、trace/receipt
2. **VM 沙箱执行**：提取 MD 中的 JS code block，在 `node:vm` 沙箱中执行，线程化 workflow state

职责 2 违背项目宪章 "MD 是给 Agent 读的，JS 只在关键节点做确定性 check"。本次 change 只去掉职责 2，保留并强化职责 1。

## Goals / Non-Goals

**Goals:**
- 去掉 `workflow-chain.mjs` 的 VM 沙箱执行——不 import `node:vm`，不创建沙箱，不 `runInContext`
- `assessNode()` 改为返回解析后的 MD（frontmatter + body），由 Agent 读 body 决定行动
- Engine 保留确定性职责：frontmatter schema 验证、依赖完整性检查、trace 写入
- 测试覆盖修改后的行为

**Non-Goals:**
- 不新建 engine、spec 目录、CLI
- 不动 `workflow-fsm.mjs`
- 不动 prototype nodes（prototype 冻结）
- 不动 registry（WML-001 等已 DEPRECATED）

## Decisions

### 1. 去掉 `executeMarkdownFile()` 的 VM 执行，改为返回解析内容

**选择**：`executeMarkdownFile()` 不再执行 code block，改为验证 fileRef 已在 cache 中 + 返回 entry（`{ md, frontmatter }`）。去掉 `node:vm` import。

**替代方案**：新建一个独立 engine 做纯 MD 加载。被否决——workflow-chain 已经在做加载，不需要拆成两个 engine。

### 2. `assessNode()` 返回结构不变，Engine 写 state 替代 VM 写 state

**选择**：`assessNode()` 保持返回 `{ state, status, runtime, plan }`。`executeLoadPlan` 在遍历 plan 时由 Engine 写入 `state.executionOrder`（按 plan 顺序 push fileRef）和 `state.counters`（per-fileRef 计数），替代原来 VM 沙箱 code block 写入。`plan` 保持 `string[]` 类型不变。

**替代方案**：大改 `assessNode()` 签名和返回值。被否决——接口兼容性更好。

### 3. `WorkflowState` schema 和 `createState()` 保留

**选择**：保留——Agent 可能仍需要 Engine 维护的确定性状态（counter、executionOrder 等）。但状态不再由 VM 沙箱代码块写入，而是由 Engine 自己的 trace/receipt 机制写入。

**替代方案**：删除 `WorkflowState`。被否决——workflow-fsm.mjs 可能引用，且未来 chain runner 需要。

### 4. `CODE_BLOCK_RE` 和 code block 提取逻辑去掉

**选择**：完全去掉——MD 中的 code block 不再被 Engine 特殊对待。`executeMarkdownFile()` 不再搜索 code block，统一视为 Agent-readable 内容。

**替代方案**：保留 code block 提取但只返回不执行。被否决——这暗示 Engine 仍参与 code block 处理，违背 "MD 是给 Agent 读的" 原则。

## Risks / Trade-offs

- **[Risk] 测试中依赖 VM 沙箱执行的 state 突变会消失** → Mitigation: `executeLoadPlan` 改为在加载时由 Engine 写入 `state.executionOrder`（按 plan 顺序）和 `state.counters`（per-fileRef 计数），替代原来 VM code block 写入。测试从断言 "JS block 写入 state" 改为断言 "Engine 加载时写入 state"。
- **[Risk] prototype nodes 中的 JS code block 不再有效** → Accept: prototype 冻结，不随 framework 变化。测试用的 node MD 在 `experiments/prototype-workflow-chain/nodes-workflow-chain/` 下，受实验体系保护。
