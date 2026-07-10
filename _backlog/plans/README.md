# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-10 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1 closed）

---

## 活跃列表

| Plan | 简述 |
|------|------|
| [bugs-069-075-openspec-change-slicing](bugs-069-075-openspec-change-slicing.md) | 将 6 个活跃 bug 聚成 3 个核心 OpenSpec Change：精简并复用 Wave 检查、HITL1 search/fetch fail-fast、在 Agent 决策点给极短 continuation cue；bootstrap 状态统一暂缓独立处理。 |
| [delegated-attempt-timeout-and-redo-postmortem](delegated-attempt-timeout-and-redo-postmortem.md) | Delegated work-unit 的 timeout/REDO 机制复盘（pragmatic-summit run 触发）。fetch 降级链部分已由 v0.14 落地；**核心 timeout 修复（心跳续期 / late-accept / 产出继承 / pause-aware）未实施，待另起独立 change**。 |
| [ux-user-facing-chinese-first-outside-waves](ux-user-facing-chinese-first-outside-waves.md) | UX 试探（已收窄）：内部 instruction 继续英语、逻辑不碰；只对「漏给用户」的输出加 prefer-Chinese **软提示**。可不立项。 |
