# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-11 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
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
| [delegated-attempt-timeout-and-redo-postmortem](delegated-attempt-timeout-and-redo-postmortem.md) | Delegated work-unit 的 timeout/REDO 机制复盘（pragmatic-summit run 触发）。fetch 降级链部分已由 v0.14 落地；**核心 timeout 修复（心跳续期 / late-accept / 产出继承 / pause-aware）未实施，待另起独立 change**。 |
| [breakpoint-recovery-persistence-model](breakpoint-recovery-persistence-model.md) | 断点恢复的三条持久化义务（ai-era-bpm-process-disruption 崩溃恢复触发）：数据过手即存(crash-safe，冒烟点=孤儿 `.tmp`)、状态即意图要存(rb_status 对 addendum 零感知)、重要用户输入请求当刻物化(06/07 意图只在 chat)。根因=work-first→应 materialize-before-work；建议切 3 个 OpenSpec change。 |
| [human-override-and-state-mutability](human-override-and-state-mutability.md) | 两条 lane 必须分开判：静默自主该硬堵，明晃晃的人在交互使唤/开发者调试不是自主启停那条 lane，该走**有审计的 human-override**（显式授权+记 who/when/why）。作弊=静默无审计;override=显式有审计。派生能力:单一真相源 + 原子 `rename-topic` + `human-override`(含 state-seed 调试) + `audit-bundle-integrity`。症状实证 BUG-078/079。 |
