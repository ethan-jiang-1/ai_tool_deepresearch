# Proposal: extract-topic-schema-projection

## Why

`engine/helpers/canonical-topic-state.mjs` 当前 2093 行、85 函数、9 个框架内 importer，内部混着三类正交职责：projection slot 渲染（8 个导出函数）、schema-introspection/示例生成（2 个导出函数）、四操作（inspect/apply/recover，5 个导出函数）。承接 `_backlog/plans/control-surface-drift-density-and-module-boundaries.md` §3 的 C3 测量报告（2026-08-31 聚类分析）：projection 渲染 + schema 自省两簇共约 900 行，是纯函数、叶子依赖，与四操作区的调用关系为单向（四操作消费 projection 但 projection 不依赖四操作），是**最安全的首刀提取**。

## What Changes

- 新增 `engine/helpers/topic-schema-projection.mjs`：从 `canonical-topic-state.mjs` 迁移 10 个导出函数：
  - Projection slot 渲染（8 个）：`projectionSlotForId`、`projectionSlotsForWave`、`projectionSlotHeadingMatches`、`locateSeedProjectionSlots`、`renderSeedProjectionCard`、`renderSeedProjectionSlot`、`renderSeedProjectionAppendix`、`splitSeedProjectionCard`
  - Schema-introspection/示例生成（2 个）：`describeTopicApplyPlanSchema`、`projectTopicApplyValidationErrors`
- 原文件 re-export 全部 10 个导出函数，现有 9 个框架 importer 与所有测试文件的 import path **零改动**。
- `@impl` 注释随函数迁移，新文件加上 `@impl CAN-*` 标注。
- 无 **BREAKING**：无行为变更、无枚举/CLI/退出码改动、无 schema 新增。

## Capabilities

### New Capabilities

无——纯重构，不产生新 observable behavior。

### Modified Capabilities

无；`.openspec.yaml` 声明 `skip_specs: true`。delta-spec 不适用的原因：本 change 只移动函数位置（不改变其行为、签名、输入/输出），不修改任何 requirement 或 observable behavior。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/canonical-topic-state` | catalog 行（canonical topic identity、progress projection、atomic mutation） | Verify-only | 本 change 只移动该 capability 的 projection 子职责到新文件，不改其 requirement 或 observable behavior |
| `engine/check-inspect-feedback` | catalog 行（check/inspect 反馈词汇） | Excluded | 不触及 |
| `engine/gate-state-machine` | catalog 行（gate 状态转换语义） | Excluded | 不触及 gate 判定、转换与枚举语义 |

## Impact

- 新增：`engine/helpers/topic-schema-projection.mjs`（~900 行，10 个导出函数，叶子依赖 import 集与 canonical-topic-state 当前一致）
- 修改：`engine/helpers/canonical-topic-state.mjs`（删除 10 个导出函数 + 对应 import，加入 re-export 行，剩余 ~1200 行、5 个导出函数）
- 零 importer 变更：9 个框架 importer 与 20+ 测试 importer 的 `import { ... } from './canonical-topic-state.mjs'` 不变（re-export 保持接口）
- 依赖：新文件共享 zod/yaml/已导入 schema 等已有依赖，无新增

## 简化与责任边界

- **Direct Source of Record**：projection 渲染与 schema 自省是纯函数/叶子职责，在 canonical-topic-state 中属于二次 stata/projection，不参与四操作的 authority 判断。拆分后离它们 reader（gate 检测、topic inspect）更近。
- **Net simplification**：大文件 2093→1200 行减 43%，新文件 ~900 行职责单一。import 图不变（re-export 列桥），零 importer 变更，无新增控制复杂度。
- **Semantic-precision reflection**：新模块名 `topic-schema-projection` 即其语义层——读者（gate、topic inspect CLI、seed-topic evaluator）的有界问题是「给定 topic state，当前 projection 的 slot 结构是什么、schema 的 apply 计划是什么」；必须保留的区别：projection slot（渲染位置/形状）vs 四操作（mutate authority）；正常推理停止点：读到 slot 结构或 schema 计划即停，无需理解四操作如何影响 state。
- **责任边界**：Engine 只移动函数位置，不改行为；Agent 与用户路径不变。