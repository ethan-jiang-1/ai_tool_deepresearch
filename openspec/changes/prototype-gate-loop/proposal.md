## Why

Deep Research 是一个长程 agentic 任务，核心执行模型是 **Gate 条件路由 + Repair loop + 动态段加载**——即 LLM-JS C&I 协作原则的具体实现。这些机制不能停留在 config.yaml 里讨论，必须用可运行的 JavaScript 代码验证可行性。实验通过后，成功代码成为后续 engine 包的参考实现。

## What Changes

- **新建** Gate 状态机原型：JavaScript 实现条件路由 `(state) → "pass" | "fail"`，pass 加载下一段，fail 进入 repair
- **新建** Repair loop：修好状态 → 重回 Gate → 重新判决，验证 loopback 模式
- **新建** 动态段加载：Gate 通过后动态决定下一个 workflow 段（不预编译整个 DAG）
- **新建** C&I 反馈环：Check 失败 → Inspect 诊断 → 反馈 → 纠正
- **新建** Agent 辅助测试 playbook：`command_experiments/test-gate-loop-{simple,medium,complex}.md`，3 级复杂度，独立 trace
- **更新** config.yaml：新增 `command_experiments/` 目录 + Agent 辅助测试策略
- 纯 JavaScript (Node.js)，仅用批准的 zod 依赖

## Capabilities

### New Capabilities

- `gate-state-machine`: JavaScript 实现 Gate 条件路由，pass/fail 分叉，Guard-based fork 模式
- `repair-loop`: Repair 段 → 修好后重回 Gate 重判，含 max_iterations 防无限循环
- `dynamic-segment-loading`: Gate 通过后动态解析下一 workflow 段，Late binding 模式
- `check-inspect-feedback`: Check 硬性验证 + Inspect 诊断 + 反馈 → 纠正闭环
- `agent-testing`: Agent 辅助测试 playbook 示范，逐步执行无需理解原理

### Modified Capabilities

（无）

## Impact

- 实验代码放在 `experiments/prototype-gate-loop/` 目录
- `DPT_FRAMEWORK/command_experiments/` 新增 Agent 辅助测试目录
- config.yaml 新增 `command_experiments/` 目录
- 成功的模式和代码提取为 engine 包的参考实现
