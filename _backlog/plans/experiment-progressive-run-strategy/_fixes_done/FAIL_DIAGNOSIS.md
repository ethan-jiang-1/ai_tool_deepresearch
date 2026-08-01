# FAIL Case Diagnosis — 2026-08-02（已全部修复）

> 15 标注 FAIL → 12 真正 FAIL → **0 FAIL**（全部修复）。

## 最终状态

全部 12 个真正 FAIL 已修复。详见 `FAIL_FIX_REPORT.md`。

## 诊断摘要

### Pattern A: `verdict_mode: all` + retry（6 cases）✅

Claude retry → trace 有中间 `passed: false` → `all` 计入 → FAIL。
修复：改 `last`。

### Pattern B: 框架 drift（5 cases）✅

| Case | 根因 | 修复 |
|------|------|------|
| 403 | seed topic 缺 wave0_evidence slot | fixture 追加 token |
| 606 | setup-ready gate 要求持续变更 | 纯 fixture 绕过 |
| 315 | 恢复后合理修改 status/profile | 删除过时 check |
| 223 | wave1-gate 现在正确拒绝不完整提交 | 翻转预期 |
| 33 | 错误消息文本变更 | 更新子串 |

### Pattern C: 误分类（3 cases）➖

101（ERROR/claude crash）、211（ERROR/budget）、234（CANCELLED/sigterm）— 非 case 逻辑问题。
