## Why

深挖计划（`_backlog/plans/spec-semantic-drift-remediation.md` B3）指出 gate 链路存在最大的人肉同步面。propose 期核实后收敛为两个真缺口（且都在 GSK-011 既有姿态内可解）：

1. **rule.check 静态分发覆盖缺失**：33 个活跃 definition check 值的正确性目前只由运行时 fail-closed 兜底（`wave-contract-evaluators.mjs` 对未知 check 返回 `configuration_integrity`）。而 `research/research-wave-gate-implementation` spec 的 "Wave gate definitions, helpers, and phase docs SHALL align as one judgment layer" requirement 明文要求 "unknown active check name fails hygiene / static gate audit SHALL fail"——静态审计缺失意味着该 requirement 的这一 scenario 目前无机器执行者。
2. **降级策略三处硬编码**：`cli/gates/check-gate-wave{0,1,2}-complete.mjs` 各自内联 `maybeDegradedHandoff` 的疲劳阈值 `3` 与 wave phase 节点清单数组——同一策略事实三份拷贝，改阈值需同步 3 处且无校验。

现有 GSK-011 派生审计（`tests/schema/gate-rule-audit.test.mjs`）已覆盖 definition↔CLI 双射、共享 schema 解析、共享 reader 路由，并已显式退役规则级目录（`CHECK_IMPLEMENTATION_ROUTES` 等）——本 change 在其上做**派生式扩展**，不复活任何目录。

## What Changes

- **派生式分发覆盖审计**：`tests/schema/gate-rule-audit.test.mjs` 新增用例——从 `engine/helpers/wave-contract-evaluators.mjs` 源码反射派生已实现 check 名集合（`rule\.check === '([a-z_]+)'` 全量扫描，discovery 而非永久目录），断言全部活跃 definition 的 `rule.check` 值 ∈ 该集合。注入未知 check 名的 fixture 测试验证审计会失败。
- **降级策略单一真相源**：新增 `DEEP_RESEARCH_HARNESS/engine/helpers/gate-degradation-policy.mjs` 导出 `WAVE_FATIGUE_PHASE_NODES` 与 `FATIGUE_ATTEMPT_THRESHOLD`；3 个 wave wrapper 改为 import 共享常量，删除各自字面量；审计新增断言——3 个 wrapper 源码引用共享模块且不再含阈值/节点清单字面量。
- **skip_specs（零 requirement 变更）**：分发覆盖审计是 `research-wave-gate-implementation` 既有 "static gate audit SHALL fail" scenario 的机器执行者（无 spec 文本变更）；配置抽取是纯重构（同值同行为）。不产出：不改 evaluator 判定逻辑、不改 wrapper 的降级行为语义、不迁移 reference-target descriptor（弹性任务，评估后暂缓——见 design D3）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-wave-gate-implementation` | spec L1108-1131 对齐 requirement 全文 + `tests/schema/gate-rule-audit.test.mjs` 全文 + `engine/helpers/wave-contract-evaluators.mjs` 分发面 + 3 个 wave wrapper | Verify-only | 既有 "static gate audit SHALL fail" scenario 由本 change 的审计扩展首次获得机器执行者；requirement 文本本身不变，无 delta |
| `engine/gate-skeleton` | GSK-011 requirement（共享 parser/派生审计/退役目录姿态） | Excluded | 本 change 完全在 GSK-011 姿态内工作（派生自实现源码、discovery 式），gate-skeleton spec 文本不变；gate-definition schema 不改 |
| `engine/gate-state-machine` | 非 wave 的 lifecycle gate 定义（setup/hitl/readiness/rerun-ready）同样被审计全集扫描覆盖 | Excluded | 只读覆盖面扩大，无行为变更 |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无——本 change 零 requirement 变更：审计扩展实现既有 requirement 的既有 scenario；配置抽取为纯重构。）

## Impact

- 新增 `DEEP_RESEARCH_HARNESS/engine/helpers/gate-degradation-policy.mjs`（约 15 行）。
- 修改 `cli/gates/check-gate-wave{0,1,2}-complete.mjs`（import 共享常量，删字面量）。
- 修改 `tests/schema/gate-rule-audit.test.mjs`（+2 个审计用例）。
- 责任边界：evaluator 判定逻辑、gate verdict、exit code、降级行为语义全部不变；Agent/User/Engine 责任划分不变；静态审计只读源码与 definition JSON，不引入运行时开销。
- Source of Record 不变：check 的实现真相 = evaluator 源码；降级策略真相 = 新共享模块（唯一化正是本 change 目的）。