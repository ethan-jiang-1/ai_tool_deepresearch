# Proposal: harden-test-guards-before-carving

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W1，§5；依据 AUD-3 测试层审计）。意图：在 W2/W3 对 `canonical-topic-state.mjs`（1879 行）与 gate-helpers 家族动刀之前，先补齐守护网——修真实缺陷、消除并发竞态、建立切缝前的行为基线。

## Why

AUD-3 发现三类问题：①C4 切分后两个负向扫描测试的文件清单没有覆盖 5 个新模块（回归逃逸洞）+ 一个无边界守卫的结构锁；②`check-all aggregation` 在全量并发下偶发失败（根因实测：test script 无并发上限 + 测试 2 在真实 `openspec/changes` 树建删 fixture 与并行 checker 竞态 + `waitForFile` 3s/5s 不一致）；③`canonical-topic-state.mjs` 切缝前需要行为基线（W2 的安全带）。

## What Changes

- **测试缺陷修复**：残余 token 负向扫描改为 glob 覆盖全部 `engine/work-unit-*.mjs`（含 5 个新 C4 模块）；`rerun-added-topic-wave0` 的 normalOwners 清单补 5 个新 C4 模块；attempt-recovery 结构锁 `indexOf` 加边界守卫（缺锚点即明确报错）。
- **零边际断言**：`evaluateWorkUnitSubmitIntegrity` 调用计数 `>= 3` 附精确计数注记。
- **check-all 竞态缓解**：`package.json` test script 加 `--test-concurrency=4`（实测 node v22 默认 cores-1）；`work-unit-transaction.test.mjs` 的 `waitForFile` 3s→10s（与 operate-work-unit 5s 对齐并加余量）。
- **canonical-topic-state 行为基线**：新增 `tests/engine/helpers/canonical-topic-state-baseline.test.mjs`——公开导出面断言 + apply/inspect/recover 端到端 smoke（W2 切缝的漂移捕捉器）。
- **不产出**：任何生产代码（engine/schema/cli）变化；不改 check-all.mjs 本体（AUD-3 选项 c 的 `--root` 透传缓期——需 governance CLI 契约变更，登记为遗留）；不改场景墙。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

（无——纯测试与测试基建，`skip_specs: true`。）

## Impact

- 测试：4 个既有文件小修 + 1 个新基线文件；`package.json` 一行。
- 零生产改动；全量 `npm test` 必须绿 ×2（并发限流后全量时长会增加，属预期）。

## Capability Discovery

Evidence read：AUD-3 报告全部命中区域 + `package.json` + `openspec/governance/check-all.mjs`（确认不改动本体）。

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/framework-engine` | work-unit 模块布局（C4 后） | Excluded | 纯测试守护，生产零改动 |
| `agent/delegated-work-units` | DEW 现行文本 | Excluded | 测试文件变化不触及 requirement |
