# Design: 2026-09-01-slim-cts-requirements

## Context

CTS 两条巨无霸（278+386 行）内部结构为「散文段 + 场景」的线性排布；`assemble-delta.mjs` 按顶层块（段落/列表/表格/场景，松散列表与 `@deprecated` 引用块并入前属单元）切分，再按前缀映射归组。C3a 同法已验证可行。

## Goals / Non-Goals

**Goals:**

- 2→7 拆分；每新块 ≤ 160 行（实测 55/100/85/70/146/49/98）。
- REMOVED 与 ADDED 内容行多重集合全等（脚本内置校验强制）。
- 66 场景全数保留、仅出现一次；2 个 `@deprecated` 场景原样随块。

**Non-Goals:**

- 不改写任何 normative 文本、不动 header `> req:`（CTS-001..012）、不触碰其他 spec。
- `migrate_legacy` 显式拒绝（mild 项 M1）不在本批——结构锁不锁定该行为文本。

## Decisions

1. **脚本化装配**（映射表内嵌 `assemble-delta.mjs`，未映射即失败）；apply 用同一 delta 反向整块替换。
2. **块3 三分**：原子 workspace/恢复 | 输入绑定与物化（add/update/enrich/mutate 输入形态）| lifecycle 授权窗口。**块4 四分**：非话题面禁触 | packet 写缝 | 路由绑定授权与 slot 后置条件 | layout+post-final 边界。
3. **设计评审三连**：semantic precision — 7 标题各对应一个有界问题；simple reliable control — 纯结构；helper-oriented — 无变化。

## Risks / Trade-offs

- [松散列表/引用块归属错位] → 合并规则（`- `/`> ` 开头单元并入前属）+ 未映射即失败 + 抽审。
- [既有 CTS 测试锁定块结构] → apply 前 `list-doc-locks` 复核；文本未改，行为测试不受影响。

## Migration Plan

纯 spec 结构变更，git revert 即完全回滚。

## Open Questions

无。
