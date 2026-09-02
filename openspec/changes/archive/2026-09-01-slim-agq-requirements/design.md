# Design: 2026-09-01-slim-agq-requirements

## Context

"Producer rule topic_deepening" 块内部三主题边界清晰（demand 形态 / assignment-mode 修复 / 多项 claim），与 `operate-queue.mjs repair` 与 `operate-work-unit` claim 的实现缝对应。C3a–C3c 同法已验证。

## Goals / Non-Goals

**Goals:**

- 1→3 拆分；场景 16 全数保留（6+9+1）；REMOVED/ADDED 内容多重集合全等（脚本强制）。

**Non-Goals:**

- 不改 queue/work-unit 行为；不动 header `> req:`；不触碰 `residual-spec-drift-text-locks` 的 AGQ-007/027 verbatim 对比对（所涉块不在本批）。

## Decisions

1. **三分**：demand 绑定（P1-P7 + 6 场景）| assignment-mode 审计修复（P8-P11 + 9 场景）| 多项 claim（P12-P13 + 1 场景）。
2. **设计评审三连**：semantic precision — 3 标题各对应一个有界问题；simple reliable control — 纯结构；helper-oriented — 无变化。

## Risks / Trade-offs

- [verbatim 对比对误伤] → 本批仅动 `topic_deepening` 块；AGQ-007/027 块不涉。
- [场景区间映射错位] → 序号闭区间 + 总数断言。

## Migration Plan

纯 spec 结构变更，git revert 即完全回滚。

## Open Questions

无。
