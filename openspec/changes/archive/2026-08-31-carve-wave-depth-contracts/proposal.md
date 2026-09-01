# Proposal: carve-wave-depth-contracts

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W3a；AUD-1 §3 判定 wave-depth-contracts 为四文件中"技术最干净"的切分，无 e2e 依赖；gate-helpers-core 部分因语义耦合归入后续 W3b，见 plan 重入指引）。

## Why

`wave-depth-contracts.mjs`（1358 行）的 Wave1 与 Wave2 契约簇除 37 行 verdict trio 外互不调用——AUD-1 判定为四文件中切分边界最干净者。切分使每个契约簇独立可维护，barrel 消费者零改动。

## What Changes

- 4 个新模块（move-only + export 前缀）：
  - `wave-depth-verdicts.mjs`（~90）：共享 verdict trio（readYamlObject/issueResult/depthFinding）+ `submittedFactByRef`/`canonicalizeSubmittedWorkUnitRef`/`safeRel` 索引原语（wave1/wave2 共用，下沉消环）；
  - `wave1-source-claim-mapping.mjs`（~230）：Wave1 source-claim/cache-mapping/floor 簇；
  - `wave1-depth-review-contract.mjs`（~614）：Wave1 depth-review + focus-coverage 契约；
  - `wave2-finding-index-contract.mjs`（~566）：Wave2 finding-index 契约簇。
- 原文件 → 11 公开名的纯 re-export facade。
- **不产出**：任何行为变化；barrel `gate-helpers.mjs` 不动。

## Capabilities

### New Capabilities
（无。）
### Modified Capabilities
（无——`skip_specs: true`。）

## Impact

- 4 新模块 + facade 化原文件；11 个消费者（含 barrel 8 符号）零改动。
- 3 个测试文件的源文本/引用锚点微调（见 tasks）。

## Capability Discovery

Evidence read：`research/wave1-intake`、`research/wave2-synthesis`、`engine/gate-skeleton` 现行文本 + 11 消费者盘点。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/wave1-intake` | WAI-005/008 现行文本 | Excluded | 纯内部布局搬动，requirement 零变化 |
| `research/wave2-synthesis` | WTS-004..010 现行文本 | Excluded | 同上 |
| `engine/framework-engine` | 导出面 grep 对照 | Excluded | facade 保持 11 公开名 |
