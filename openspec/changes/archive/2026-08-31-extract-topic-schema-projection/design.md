## Context

- `canonical-topic-state.mjs` 当前 2093 行，经测量报告（2026-08-31 聚类分析）确认三类职责：projection 渲染（8 导出，~564 行）、schema 自省（2 导出，~333 行）、四操作（5 导出，~596 行）。前两类是纯函数/叶子依赖，不依赖四操作区的 import。
- 提取目标函数依赖的 import：zod、yaml、`CanonicalPlanSchema`、`WorkUnitManifestSchema`、`topic-layout`、`rerun-direction`、`plan-hostfile-sections`、`seed-topic-authoring-evaluator`、`research-style-projection`、`wave-depth-contracts`。这些 import 在 canonical-topic-state 中都已存在，新文件只需复制需要的 import 子集。
- 9 个框架 importer + 20+ 测试 importer 全部通过 `import { ... } from './canonical-topic-state.mjs'` 导入。re-export 行保持接口兼容。

## Goals / Non-Goals

**Goals:**
- canonical-topic-state.mjs 从 2093→~1200 行，减 43%
- 新文件 topic-schema-projection.mjs ~900 行，职责单一
- 9 个框架 importer + 所有测试 **零文件改动**（re-export 桥接）

**Non-Goals:**
- 不改任何行为、逻辑、schema、枚举、CLI、退出码
- 不改四操作区的 5 个导出函数（inspect/apply/recover）
- 不新增测试——行为不变以 `npm test 0 fail` 证明

## Decisions

- **D1 提取范围**：projection 渲染 8 个 + schema 自省 2 个 = 10 个导出函数合入同一文件 `topic-schema-projection.mjs`。理由：schema 自省函数（`describeTopicApplyPlanSchema`、`projectTopicApplyValidationErrors`）与 projection 渲染共享 zod schema 定义和 `PROJECTION_SLOT_BY_ID` 常量，拆到两个文件会引入跨文件共享，不如合为一刀。
- **D2 re-export 方式**：`canonical-topic-state.mjs` 末尾加一行 `export { ... } from './topic-schema-projection.mjs'`，列出 10 个导出名。零 importer 变更。
- **D3 新文件位置**：`engine/helpers/topic-schema-projection.mjs`，与 canonical-topic-state 同目录，与其他 helper 文件一致（`handoff-helpers`、`topic-layout`、`rerun-direction` 等）。
- **D4 import 精简**：新文件只 imports 被提取函数实际使用的依赖（zod、yaml、schema 等），不 copy canonical-topic-state 的全部 import 行。`@impl` 注释随函数迁移。

## Risks / Trade-offs

- [re-export 行增加维护成本] → 后续若投影面新增函数，需同时在两个文件中添加。但这是标准的有界抽取模式（work-unit 家族已有成熟先例），且 plan 接受此 trade-off。
- [提取后 canonical-topic-state 的 import 减少不彻底] → 一些 import 在被提取函数和保留函数中同时使用，将保留在原文件。这是安全做法（不改变 import 图），不产生实质问题。

## Migration Plan

1. 创建 `topic-schema-projection.mjs`，粘贴 10 个导出函数 + 所需 import + 所需常量
2. 从 `canonical-topic-state.mjs` 删除这 10 个函数 + 对应的 import + 常量（保留被四操作区使用的共享常量如 `PROJECTION_SLOT_BY_ID`）
3. 在 canonical-topic-state.mjs 末尾加 re-export 行
4. `npm test` 全绿证明行为不变

## Open Questions

无。