## Why

`prototype-gate-loop` 验证了 1→1 路径（Gate → Repair → 重判 → 下一段）。但真实 workflow 中 Gate 经常需要**分叉**——根据状态值路由到不同分支。两个实验互补：loop = 修得对，fork = 走得对。

## What Changes

- **新建** Gate 分叉路由：`(state) → "branch_a" | "branch_b" | "branch_c"` 多路分发
- **新建** 条件分支段：每个分支独立执行不同逻辑
- **新建** 分叉后合流 + repair 统一入口：多个分支的 fail 可以汇聚到共享 repair
- 纯 JavaScript，放 `experiments/prototype-gate-fork/`

## Capabilities

### New Capabilities

- `gate-fork-router`: Gate 检查状态值 → 分叉到 2+ 个不同 workflow 段，Guard-based 多路路由
- `conditional-segments`: 每个分支独立执行，不同状态走不同逻辑路径
- `fork-repair-converge`: 多分支 fail 汇聚到共享 repair → 修好回到 Gate 重判 → 重新分叉

### Modified Capabilities

（无）

## Impact

- 与 `prototype-gate-loop` 互补：loop 验证 1→1 修复闭环，fork 验证 1→N 多路径分发
- 合并后形成完整的 Gate 路由模型：单路径修复 + 多路径分叉
