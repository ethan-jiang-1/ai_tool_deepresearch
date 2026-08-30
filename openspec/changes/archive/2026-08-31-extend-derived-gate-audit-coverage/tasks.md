## 0. Review Markers（feedback lifecycle）

- [x] 0.1 在首次 target edit 前完成 openspec-feedback:plan-review —— 通读 proposal/design/tasks/verification-plan 做整体连贯性审查 + 风险主导审查（重点：GSK-011 相容性逐条对照、派生正则的假绿风险、skip_specs 判定）+ plan 模式检查基线。发现转为普通未勾选任务，无 open finding 方可勾选。
- [x] 0.2 归档前完成 openspec-feedback:closeout-review —— 复核 change 范围实际 diff、工件与验证证据；确认零行为变更声明成立（wrapper 迁移前后降级行为一致）；无 open finding 后勾选，以 finalizer 作为唯一归档终态。

## 1. Apply 前置检查

- [x] 1.1 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`（预期 exit 0——本 change 无新 ID）；`node openspec/governance/check-semantic-closure.mjs --change 2026-08-31-extend-derived-gate-audit-coverage --mode plan`（not_applicable record）与 `node openspec/governance/check-verification-routing.mjs --change 2026-08-31-extend-derived-gate-audit-coverage --mode plan`。Done condition：三者输出记录且符合预期。
- [x] 1.2 盘点：`node scripts/list-doc-locks.mjs` 于 3 个 wave wrapper、`tests/schema/gate-rule-audit.test.mjs`、`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-handoff.mjs`（若存在降级相关锁）；grep 既有测试对 `maybeDegradedHandoff`/阈值 `3`/节点清单的断言清单。Done condition：清单记录，受影响断言的更新落在 4.x。

## 2. 降级策略单一真相源

- [x] 2.1 新建 `DEEP_RESEARCH_HARNESS/engine/helpers/gate-degradation-policy.mjs`：导出 `WAVE_FATIGUE_PHASE_NODES = ['phases/phase-wave0.md', 'phases/phase-wave1.md', 'phases/phase-wave2.md']` 与 `FATIGUE_ATTEMPT_THRESHOLD = 3`（带 @impl 注记指向本 change 对齐的 requirement）。Done condition：模块可被 import 且导出值与现字面量逐字一致。
- [x] 2.2 迁移 `cli/gates/check-gate-wave{0,1,2}-complete.mjs`：import 共享常量，删除各自节点清单数组与 `< 3` 阈值字面量。Done condition：3 文件 `git diff` 仅显示 import 行与字面量替换；`grep -c "effectiveAttemptCount < 3" cli/gates/*.mjs` 为 0 且行为测试绿（4.2）。

## 3. 派生审计扩展（tests/schema/gate-rule-audit.test.mjs）

- [x] 3.1 新增分发覆盖用例：正则 `/rule\.check === '([a-z_]+)'/g` 扫描 `engine/helpers/wave-contract-evaluators.mjs` 派生已实现集合，断言全部活跃 definition 的 `rule.check` 值 ⊆ 集合；apply 期以 33 值全集逐一对照派生结果，未命中的扩展扫描面并记录。Done condition：用例绿；派生集合与全集对照表记录在完成备注。
- [x] 3.2 新增反向注入自防用例：在审计逻辑层验证"未知 check 名会导致覆盖断言失败"（例如以临时 fixture definition 或对派生函数的单元断言证明审计能红）。Done condition：注入验证绿，证明审计非恒真。
- [x] 3.3 新增降级去重用例：3 个 wave wrapper 源码包含共享模块引用；`WAVE_FATIGUE_PHASE_NODES`/`FATIGUE_ATTEMPT_THRESHOLD` 在共享模块恰好定义一次；wrapper 源码不含节点清单数组字面量与 `< 3` 阈值字面量。Done condition：用例绿。
- [x] 3.4 审计内注释明示与运行时 fail-closed 的分工（静态前置防线 vs evaluator `configuration_integrity` 兜底）及 GSK-011 姿态依据（派生自实现源码、无永久目录、不碰 failure_message）。Done condition：注释存在且不与退役目录名冲突（既有"retired catalogs"用例保持绿）。

## 4. 验证

- [x] 4.1 运行 `node --test tests/schema/gate-rule-audit.test.mjs` 与 3 个 wrapper 相关既有套件（`gate-failure-sources` 等）。Done condition：全绿。
- [x] 4.2 运行 `node scripts/list-doc-locks.mjs` 确认的受影响锁 + `npm run governance:check`。Done condition：全绿。

## 5. 收尾硬性检查（归档前置）

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-08-31-extend-derived-gate-audit-coverage` 必须 PASS。Done condition：退出码 0。
- [x] 5.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。Done condition：退出码 0。
- [x] 5.3 全量 `npm test` 退出码 0。Done condition：直接重跑确认非偶发后退出码 0。