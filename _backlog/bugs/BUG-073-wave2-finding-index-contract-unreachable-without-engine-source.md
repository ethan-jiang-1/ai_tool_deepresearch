# BUG-073 — Wave2 finding-index contract 无法单靠 phase MD 满足

| 属性 | 值 |
|------|-----|
| ID | BUG-073 |
| 发现日期 | 2026-07-10 |
| 严重级别 | P1 |
| 来源 | `dpt_rb_aiewf-2026-community-pulse` 正式 run |
| 关联 | [[BUG-069]] 根因 meta-bug — FP6 的具象化：Wave2 phase MD 不完整，Agent 需读 engine 源码才能知道 finding-index 完整字段 |

## 症状

Wave2 gate 在 25 次 attempt 后仍 55 failures。核心问题：`finding-index.yaml` 需要 15 个字段（含 `hitl2_handoff: true` boolean、`appears_in_synthesis`、`search_required`、`independent_backing_refs`），但 `phase-wave2.md` 未枚举完整字段列表。真相在 `engine/helpers/wave-depth-contracts.mjs:516`。

## 根因

与 [[BUG-069]] FP6 一致：phase MD 告诉 Agent "要交 finding-index.yaml"，但没枚举 15 个必需字段、6 个 enum 的合法值、`W2F-\d{3}` 格式。Agent 必须读 `wave-depth-contracts.mjs` 才能知道完整 contract。

## 与 BUG-069 的关系

BUG-069 §6 (FP6) 已记录此问题："Wave2 phase MD 不完整——phase MD 告诉你'要交 finding-index.yaml'，但没告诉你里面 11 个字段分别叫什么"。本次 run 证实：实际是 15 个字段（含 `hitl2_handoff`、`appears_in_synthesis`、`search_required`、`independent_backing_refs`），比 BUG-069 记录的 11 个更多。且 `hitl2_handoff` 必须是 boolean `true`，不是 string `"ready_for_review"`——这个类型约束完全不在 phase MD 中。
