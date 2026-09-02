# Design: 2026-09-01-slim-dwu-requirements

## Context

DWU 七条巨无霸（envelope/submit-only/tasks-paths/drift-canonicalize/dry-submit/timeout/integrity）各自内部散文段与场景的主题边界清晰，与 engine 模块缝对应（work-unit-envelope / work-unit-submit* / work-unit-dry-submit 语义 / work-unit-timeout-preflight / work-unit-transaction*）。C3a–C3d 同法已验证。supersession（137 行）在 envelope 内保留不动。

## Goals / Non-Goals

**Goals:** 7→15 拆分；142 场景全数保留；REMOVED/ADDED 内容多重集合全等；每新块 ≤160 行。

**Non-Goals:** 不改写 normative 文本（M4/M5 登记不实施）；不动 header `> req:`（DEW-001..029）；不改 header-vs-body 计数断言以外的测试（若 body 计数断言失配，同 change 更新并注明——AGQ 先例）。

## Decisions

1. **每巨无霸 2–3 分**，切点全部落在散文段边界（映射表内嵌脚本，未映射即失败）。
2. **设计评审三连**：semantic precision — 15 标题各对应一个有界问题；simple reliable control — 纯结构；helper-oriented — 无变化。

## Risks / Trade-offs

- [体量最大、映射最多] → 脚本强制守恒 + 逐块 declared==actual 断言 + 抽审。
- [doc-lock 计数断言] → AGQ 先例：同 change 更新并注明。

## Migration Plan

纯 spec 结构变更，git revert 即完全回滚。

## Open Questions

无。
