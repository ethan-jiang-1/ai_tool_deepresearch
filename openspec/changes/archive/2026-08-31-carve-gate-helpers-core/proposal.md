# Proposal: carve-gate-helpers-core

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W3b；AUD-1 §2）。**流程注记**：两次前序尝试已回滚（第一次 export const 缺陷、第二次 facade 忘记 re-export），本次为第三次尝试——修复了全部已知根因。

## Why

`gate-helpers-core.mjs`（1443 行）有五个自然关注簇，仅 5 个直接消费者（其余 ~20 经 `gate-helpers.mjs` 桶），facade 切分对消费者不可见。零模块级可变状态、无环。

## What Changes

- 4 个新模块（move-only + export 前缀）：`gate-helpers-invocation.mjs`（~284）、`gate-helpers-result.mjs`（~186）、`gate-helpers-attempt-audit.mjs`（~656，含 mid-file logger import）、`gate-helpers-plan-progress.mjs`（~61）。
- 主文件 → facade（`__dirname`/`WORKFLOW_NODES_DIR` export + 17 公开名 re-export 分块指向新模块）。
- **不产出**：行为变化；barrel `gate-helpers.mjs` 不动。

## Capabilities

### New Capabilities
（无。）
### Modified Capabilities
（无——`skip_specs: true`。）

## Impact

- 4 新模块 + facade 化；barrel/4 gate CLI 零改动；全量 0 fail。

## Capability Discovery

Evidence read：GSK 相关 main spec + 消费者盘点。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/gate-skeleton` | GSK-001..013 现行文本 | Excluded | 纯内部布局搬动，requirement 零变化 |
| `engine/framework-engine` | 导出面 grep 对照 | Excluded | facade re-export 保持公开面 |
