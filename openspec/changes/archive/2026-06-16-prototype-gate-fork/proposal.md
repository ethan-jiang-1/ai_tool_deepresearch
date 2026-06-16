## Why

`prototype-gate-loop` 验证了 1→1 路径（Gate → Repair → 重判 → 下一段）。但真实 workflow 中 Gate 经常需要**分叉**——根据状态值路由到不同分支。两个实验互补：loop = 修得对，fork = 走得对。

## What Changes

- **新建** Gate 分叉路由：`(state) → "pass" | "fail_a" | "fail_b" | "blocked"` 多路分发
- **新建** 条件分支段：4 个分支各自独立执行不同逻辑，每个分支产生不同的 state mutation
- **新建** 分叉后合流 + repair 统一入口：多个 fail 分支汇聚到共享 repair，修好重回 Gate 重判
- **新建** 动态段加载（fork variant）：`segmentRegistry` + `loadNextSegment()`，与 gate-loop 命名一致
- **新建** Loop + Fork 组合：`runForkPipeline()` 串联 fork → converge → re-fork → pass → dynamic load
- **扩展** WorkflowState schema：在 gate-loop 的 `{ ref_count, ref_floor }` 基础上增加 `topicReadiness` 字段，支持多维路由
- **设计决策** 优先级路由：`blocked > fail_b > fail_a > pass`，确保多维条件重叠时结果确定
- **设计决策** 实验独立：不 import gate-loop 代码，但命名对齐，便于将来抽象
- 纯 JavaScript，放 `experiments/prototype-gate-fork/`

## Capabilities

### New Capabilities

- `gate-fork-router`: Gate 检查多维状态值 → 按优先级分叉到 4 个不同 workflow 段，显式 `Map<Branch, Step>` 路由表
- `conditional-segments`: 每个分支独立执行，不同状态走不同逻辑路径。包含动态段加载（`segmentRegistry` + `loadNextSegment`）
- `fork-repair-converge`: 多分支 fail 汇聚到共享 repair → 修好回到 Gate 重判 → 重新分叉。含 stall 检测 + maxIterations 保护

### Modified Capabilities

（无）

## Impact

- 与 `prototype-gate-loop` 互补：loop 验证 1→1 修复闭环（`repairLoop`），fork 验证 1→N 多路径分发（`forkRouter` + `convergeRepair`）
- `runForkPipeline()` 证明两者可组合：fork 决定"去哪里"，converge（内部 loopback）决定"怎么修"
- 合并后形成完整的 Gate 路由模型：单路径修复 + 多路径分叉
- 两个实验共享一致的命名约定（`evaluate`/`evaluateBranch`、`gateRouter`/`forkRouter`、`segmentRegistry`、`Step`、`trace.mjs`），为将来抽象到共用库做好准备
