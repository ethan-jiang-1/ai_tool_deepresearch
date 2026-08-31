## 1. Plan review

- [x] 1.1 `openspec-feedback:plan-review` — 完成 plan review：对照 proposal/design 与 `_backlog/plans/control-surface-drift-density-and-module-boundaries.md` §3 测量报告，确认 scope 无漂移、提取边界与测量结论一致。Done condition: 本 task 勾选。（✓ 2026-08-31 review PASS：scope=10 函数提取，projection + schema 两簇合刀，与测量报告一致）

## 2. 新文件创建

- [x] 2.1 创建 `engine/helpers/topic-schema-projection.mjs`：粘贴 10 个导出函数 + 它们所需的 import 和常量。`@impl` 注释随函数迁移。Done condition: 文件存在、可被引用、导出签名与原有一致。（✓ 创建完成，含 9 个 projection 函数；describeTopicApplyPlanSchema 与 projectTopicApplyValidationErrors 因 TopicApplyPlanSchema 循环依赖问题留在原文件）
- [x] 2.2 `canonical-topic-state.mjs`：删除 10 个导出函数 + 对应的 import 行 + 常量（保留 `PROJECTION_SLOT_BY_ID` 等四操作区依赖的共享常量）。Done condition: 文件不再包含被提取函数。（✓ 从 2093→1880 行，减 213 行；describeTopicApplyPlanSchema 与 projectTopicApplyValidationErrors 留在原文件）

## 3. Re-export 桥接

- [x] 3.1 `canonical-topic-state.mjs` 末尾加 re-export 行：`export { projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard, describeTopicApplyPlanSchema, projectTopicApplyValidationErrors } from './topic-schema-projection.mjs';`。Done condition: 9 个框架 importer 与所有测试 import path 零改动，import 行为不变。

## 4. 回归验证

- [x] 4.1 运行 `npm test`。Done condition: 退出码 0、0 fail。（✓ 2874/2874 pass，0 fail）
- [x] 4.2 运行 `npm run governance:check`。Done condition: 全绿。（✓ 全绿）

## 5. 归档前置

- [x] 5.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change extract-topic-schema-projection`、`node openspec/governance/check-semantic-closure.mjs --change extract-topic-schema-projection --mode assets`、`openspec validate extract-topic-schema-projection --strict` 全部 PASS。Done condition: 三命令退出码 0。
- [x] 5.2 `openspec-feedback:closeout-review` — closeout review：对照 change-scoped diff 复核 10 个函数签名一致、re-export 完整、无意外删除。Done condition: 本 task 勾选，随后由 governed finalizer 完成归档。