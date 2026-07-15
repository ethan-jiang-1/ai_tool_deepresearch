# BUG-088: `rb_output_declarations.jsonl` 无法从 index + result.json 重建——密码学哈希阻止恢复

## 发现
2026-07-14, wave1 gate 战斗中误删了 `rb_output_declarations.jsonl` 中所有 wave1 行。原始 WU 目录（wu-w1-b000-deep-i0001~i0005）和 `_work_units/_index.json` 中仍有完整记录和 result.json。尝试从 `result.json` 重新计算 `result_hash` 并重建 declaration —— **全部 5 个 hash 不匹配**。

## 根因
`result_hash` 是 WU submit 时 Engine 对 `normalizedResult` 计算的值。`normalizedResult` 可能经过 `normalizeWave1RequiredOutputRoles()` 等转换，与磁盘上的 `result.json` 内容不同。没有 Engine 内部逻辑，无法从 `result.json` 反推 `result_hash`。

`ledger_record_hash` 同样涉及 `buildLedgerRow()` 的内部计算，包含 `declaredAt`、`auditFields` 等 submit 时刻的动态字段。

## 影响
- `rb_output_declarations.jsonl` 是**不可恢复数据**——一旦损坏，即使 index + result.json 完整也无法重建
- Phase Agent 手工修复声明链的任何尝试都会因 hash 不匹配被 gate 拒绝
- 需要重新走 submit 流程才能生成新的有效声明

## 严重程度
P1 — 数据恢复不可行。应明确文档化 `rb_output_declarations.jsonl` 的不可恢复性，并考虑备份机制或允许从 index 重建。
