## Why

`workflow-chain.mjs` 用 `node:vm` 沙箱自动执行 MD 文件里的 JS code block——Agent 不读 MD、不做判断，JS 全自动跑了。这违背项目宪章的核心原则：**MD 是给 Agent 读的，JS 只在关键节点做确定性 check。** 需要去掉 VM 沙箱执行，让 workflow-chain 回归本职：解析 MD 节点、解析依赖闭包、写 trace，把 MD body 留给 Agent 读。

## What Changes

- **BREAKING**: `workflow-chain.mjs` 的 `executeMarkdownFile()` 不再执行 MD 中的 JS code block——不 import `node:vm`，不创建沙箱，不执行代码
- `assessNode()` 改为返回解析后的 MD 内容（frontmatter + body），由 Agent 读取 body 决定行动
- Engine 保留确定性职责：frontmatter schema 验证、依赖完整性检查、trace 写入
- 保留所有非 VM 功能：`parseFrontmatter()`, `readMarkdownFile()`, `resolveDependencyClosure()`, `createState()`, `createWorkflowRuntime()`
- 更新相关 spec 中描述 VM 沙箱行为的文字

## Capabilities

### New Capabilities

（无。本次不引入新 capability，只修正已有 engine 的行为。）

### Modified Capabilities

- **dynamic-node-loading**: `assessNode()` 的行为从 "显示 MD 内容 + VM 执行 code block + 打印状态变化" 改为 "解析 MD 返回 frontmatter + body，Agent 读 body 决策"。去掉 VM 执行相关需求文字。
- **framework-engine**: workflow-chain.mjs 的定位从 "MD loader + VM executor" 改为 "MD loader + dependency resolver"。

## Impact

- `DPT_FRAMEWORK/engine/workflow-chain.mjs` — 去掉 `node:vm` import 和 `executeMarkdownFile()` 中的沙箱执行逻辑
- `tests/engine/workflow-chain.test.mjs` — 删 VM 执行相关测试，保留解析/依赖/trace 测试
- 不影响 `workflow-fsm.mjs`（虽然它 import workflow-chain，但只 import loader 函数，不 import `executeMarkdownFile`）
- 不影响 prototype nodes（prototype 冻结）
