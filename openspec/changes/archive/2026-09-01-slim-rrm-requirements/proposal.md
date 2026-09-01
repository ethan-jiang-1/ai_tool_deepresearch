# Proposal: 2026-09-01-slim-rrm-requirements

## Why

`research/research-return-map` 的 RRM-007 巨无霸 requirement（589 行、158 个 SHALL、59 个场景，占全 spec 61%）使审阅成本高到漂移容易存活（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.4；全库 requirement 中位 26 行、p90=100 行，586 行是最大异常值）。C3 批次目标：拆为常规体量 requirement，语义逐字保持。

## What Changes

- **一个 requirement 拆为八个**：RRM-007 "Return-map inspection SHALL verify current-round projection identities" 按既有散文/场景的自然主题边界拆为 8 个新 requirement（见 design 分组表）。**每一行既有文本逐字节保留，唯一新增是 8 个标题行**；59 个场景按主题归入对应新 requirement，顺序保持。
- **header `> req:` 不变**：RRM-001..008 全保留（checker 明文允许 body 数 > header 数；registry alive 语义只依赖 header 行）。
- **不产出**：无 normative 语义变更、无行为变更、无代码变更、无新 capability。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-return-map` | 主 spec 全文 + RRM-007 块结构勘察（8 段散文 L299-434 + 59 场景 L435-885，主题边界与散文段落一一对应） | Modify | requirement 结构重组（1→8），文本逐字保持；属 requirement 拆分，无行为变更。 |
| `engine/check-inspect-feedback` | catalog 行 | Excluded | 反馈面词汇无涉；本 change 不触碰 hint/advice 语义。 |
| `research/seed-topic-materialization` | catalog 行 | Excluded | 相邻 capability 无需感知本次结构重组。 |

拆分清单（新标题 → 承载散文段 → 场景数）：

| # | 新 requirement 标题 | 散文段 | 场景数 |
|---|---|---|---|
| 1 | Projection-readiness evaluator SHALL own per-wave slot families on one shared result | 总纲+slot 表 | 1 |
| 2 | Wave0 candidates SHALL come from the submitted contribution reader and its declared ordinals | Wave0 reader 全段 | 8 |
| 3 | Wave1 and Wave2 identity sources SHALL use the shared slot map and bounded heading grammar | W1/W2 sources 段 | 10 |
| 4 | Wave2 entries SHALL select findings by exact W2F identity binding | W2F 段 | 6 |
| 5 | Evaluation SHALL root-short-circuit in one declared order and mask dependent symptoms | root 顺序段 | 10 |
| 6 | Wave0 coverage SHALL bind exact candidate coordinates and batch omissions as one ordered root | Wave0 coverage 段 | 17 |
| 7 | Wave1 and Wave2 coverage SHALL bind current work and W2F identities or explicit dispositions | W1/W2 coverage 段 | 4 |
| 8 | Formal gates SHALL consume the shared evaluator result through per-invocation facts | gate+facts 两段 | 3 |

（59 = 1+8+10+6+10+17+4+3；OpenSpec 要求每个 requirement 至少一个场景，故"单一共享结果"主题的场景归 N1）

## Impact

- `openspec/specs/research/research-return-map/spec.md`：REM（RRM-007 旧块）+ ADD（8 个新块）；总行数 +8（标题行）。
- 零代码/测试行为触点；既有 RRM 文本锁（`rrm-spec-truth-sync-text-locks.test.mjs`）为全文件 grep，不依赖块结构，无需改动。
- `residual-spec-drift-text-locks` 的 verbatim 对比对仅锁 CIF/DEW/AGQ/CDP，不含 RRM，无冲突。

## Source of Record 与责任边界

- Source of Record 不变：同一 evaluator 行为，spec 描述的结构重组。最短合法闭环：零语义改写，纯结构。Net simplification：审阅粒度回归仓库常态（≤~150 行/条），后续 change 的 diff 面大幅缩小。
- Semantic-precision reflection：8 个新标题各自给读者一个有界问题（Wave0 候选来源 / W1W2 语法 / W2F 绑定 / root 顺序 / 覆盖与 batching / gate 消费），正常推理停止点不变——同一 evaluator、同一份结构化 findings。
- 责任边界：无 user decision、无 permission 变化；Engine verdict 面零触碰。
