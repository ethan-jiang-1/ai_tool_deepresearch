# Tasks: prototype-gate-fork

## 1. 实验目录和类型

- [x] 1.1 创建 `experiments/prototype-gate-fork/` 目录，定义独立类型（与 gate-loop 命名对齐）
- [x] 1.2 定义 `Branch` enum（`pass`, `fail_a`, `fail_b`, `blocked`）

## 2. Gate 分叉路由

- [x] 2.1 实现 `evaluateBranch(state): Branch`：根据状态值返回分支标识
- [x] 2.2 实现 `forkRouter`：`Map<Branch, Step>` 多路分发
- [x] 2.3 模拟场景：pass → 下一段, fail_a → repair, fail_b → 另一种 repair

## 3. 条件分支段

- [x] 3.1 实现 4 个独立 Step（passStep, failAStep, failBStep, blockedStep）
- [x] 3.2 验证每分支产生不同的 state mutation
- [x] 3.3 模拟场景：同一 state 走不同分支，结果各不相同

## 4. 分叉 + Repair 汇聚

- [x] 4.1 实现 `convergeRepair`：多 fail 分支汇聚到共享 repair
- [x] 4.2 Repair 后重回 Gate 重判（自包含 loopback 逻辑）
- [x] 4.3 模拟场景：fail_a → repair → Gate → pass

## 5. Loop + Fork 组合

- [x] 5.1 实现 `runForkPipeline`：自包含 fork → loopback → re-fork → pass 组合（实验独立，不 import gate-loop）
- [x] 5.2 `node:test` 端到端测试：验证 loopback + fork 可组合
- [x] 5.3 文档：`EXPERIMENT.md` 记录组合模式和结论
