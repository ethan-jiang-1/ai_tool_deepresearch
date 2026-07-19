## Why

`_backlog/bugs/BUG-092-add-topic-seed-template-drift.md` 暴露了 seed topic 回填可以用自由叙述替代结构化 return-map 的实际 false pass。进一步审计 `_backlog/plans/seed-topic-projection-contract-repair.md`、accepted `research-return-map` spec 和归档 change `seed-backfill-round-continuity` 后确认：`RRM-007` 已要求按目标 section 逐条验证 current-round authority，但当前 `inspectSeedTopicReturnMaps()` 仍把整个 seed 文件交给通用校验器，导致一个 wave 的合法字段可以掩盖另一个 wave 的缺失或畸形 projection。

现在修复是必要的，因为归档 tasks 7.2/7.3 曾把 section-scoped/per-row contract 标为完成，accepted spec、CHANGELOG 与 executable contract 已发生漂移；继续在此基础上叠加模板或 rerun UX 会把 false pass 固化为新的隐含兼容行为。

## What Changes

- 落实既有 `RRM-007`：Wave0/Wave1/Wave2 inspect 只解析当前 wave 拥有的 seed sections，不再用全文件字段满足目标 section contract。
- Wave0/Wave1 复用现有 current-round eligible submitted-row authority，逐条要求 `work_id` 被目标 section projection 引用，或存在满足 accepted contract 的 no-projection disposition。
- Wave2 按既有 `created_in_rerun_count` contract 检查 current-round finding projection，并保留 legacy finding 的 accepted advisory compatibility。
- 复用现有 return-map evaluator 与 inspect CLI 聚合入口，输出目标 seed path、section、遗漏的 work/finding id、合法写入位置和同一 inspect 命令；不新增 CLI、state、gate family、第二套 validator 或自动修复路径。
- 增加 cross-section masking、partial-row projection、合法 disposition、prior-round compatibility、Wave2 current/legacy finding 和 prerequisite short-circuit 的 focused verification。
- 记录并纠正历史 traceability：归档 checkbox 和 CHANGELOG 不能继续作为 `RRM-007` 已有 executable proof。
- 修改框架 verdict，版本从 `v0.34` bump 到 **`v0.35`**；apply 时同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。
- 不重命名 seed section，不重新注入 `__BACKFILL_*__` token，不修改 rerun direction 格式，不建设通用 output linter，不迁移历史 runtime bundle。

最短合法闭环保持为：current-round submitted row / finding-index direct authority → 同一个目标-section checker → 一个最近的 seed projection 修复坐标 → Agent 机械修复 → 重跑同一 inspect。净简化来自删除全文件隐式匹配和避免另建 validator；没有新增持久状态或恢复分支。

责任边界保持不变：用户只拥有新的研究语义或风险决定；Agent 从已接受 authority 派生并修复 return-map projection；Engine 只裁决 section、字段、round binding、引用和 disposition 等确定性事实。`human-directed` 不创造写入 permission、evidence authority 或 bypass。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `research-return-map`：澄清并落实既有 `RRM-007` 的 target-section extraction、Wave0/Wave1 current-round per-row projection/disposition 和 Wave2 current/legacy finding 检查；不分配新的 requirement ID。
- `cli-inspect-output-conventions`：要求 Wave inspect 对上述 shared deterministic finding 给出与 pass/fail 一致的 blocking/advisory classification、root-first repair coordinate 和 exact same-check rerun，并保持 no-write/non-routing contract；复用既有 `IOC-001` 至 `IOC-005`。

## Impact

- 主要实现候选：`DPT_FRAMEWORK/engine/helpers/return-map.mjs`，以及为复用 direct authority 所需的现有 work-unit/finding reader；Wave inspect CLI 只在需要传递明确 context 时做最小调整。
- 验证资产位于 `tests/engine/helpers/`、`tests/integration/cli/`，并复用或扩展 `tests/e2e/rerun-round-continuity.test.mjs` 的 deterministic chain。
- 不新增依赖；继续使用 Node.js ESM、现有 `yaml`/`zod` 和 Node built-ins。
- 不修改 runtime bundle schema、queue、status、trace、transition、receipt、work-unit lifecycle 或 Agent Flow。
- 原始问题来源：`_backlog/bugs/BUG-092-add-topic-seed-template-drift.md`；拆分与 BUG-093/094 disposition 见 `_backlog/plans/seed-topic-projection-contract-repair.md`。BUG-093/094 的模板与 direction 工作不在本 change 内。
