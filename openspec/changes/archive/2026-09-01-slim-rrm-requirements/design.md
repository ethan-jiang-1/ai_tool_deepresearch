# Design: 2026-09-01-slim-rrm-requirements

## Context

RRM-007 块（L297–885，589 行）的内部结构是「9 段连续散文（L299–434）+ 59 个场景（L435–885）」。散文段落边界与行为主题一一对应，因此拆分可以做成**纯结构性重组**：文本逐字节保留，唯一编辑是删 1 个旧标题、插 8 个新标题、场景按主题搬到对应新块。

## Goals / Non-Goals

**Goals:**

- 1→8 拆分（分组表见 proposal）；每个新 requirement ≤ ~160 行。
- 行集守恒：`旧块行集 ∪ {旧标题行} == 新块行集 − {8 个新标题行}`（逐字节）。
- delta 用 `## REMOVED Requirements`（旧块原文）+ `## ADDED Requirements`（8 个新块）表达。

**Non-Goals:**

- 不改写任何 normative 文本、不增删场景、不改 header `> req:`。
- 不动 C1 已同步的 RRM-003/006 文本（它们的块不受影响）。
- 不动其他 spec（C3b–C3e 各自处理）。

## Decisions

1. **脚本化装配，人工只审标题**：段落/场景的切割与归组由脚本按精确行号+标题名完成，消除手搬 589 行的抄写风险；apply 反向执行同一映射。
2. **场景按主题归组、组内保持原相对顺序**（分组表见 proposal；59 场景全数映射，计数在 tasks 中复核）。
3. **G8（gate 集成 + 退役规则名）与 G9（per-invocation facts）合为 N8**：同属"evaluator 结果如何被消费"。
4. **RRM-007 的语义身份落位 N1**（evaluator 所有权总纲）：header 子集语义无需逐条绑定，但文档叙事上 N1 是承接者。
5. **设计评审三连**：semantic precision — 8 个标题各对应一个有界问题；simple reliable control — 纯结构、零新增控制面；helper-oriented — 无变化。

## Risks / Trade-offs

- [场景归组错位] → 映射表经人工核对（本 design + proposal），脚本按标题名精确匹配，未知标题直接报错终止。
- [结构锁与行为测试互相干扰] → 新结构锁只断言行集守恒与标题唯一性；行为测试（inspect-wave-return-map 等）不依赖 spec 文本。
- [块边界漂移] → apply 前重核 `### Requirement:` 边界（C1/C2 同法）。

## Migration Plan

纯 spec 结构变更，git revert 即完全回滚。

## Open Questions

无。
