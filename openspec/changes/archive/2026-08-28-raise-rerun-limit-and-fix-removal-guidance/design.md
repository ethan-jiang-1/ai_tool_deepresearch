# Design: 提升 rerun 上限并修正 rerun 剔除指引

## Context

rerun 边界值的单一真相源 = `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json` 的 `rerun_count_valid` 规则。唯一语义解释 = `DEEP_RESEARCH_HARNESS/engine/helpers/rerun-availability.mjs#evaluateRerunAvailability`（读 `rule.value` 为 `exclusiveLimit`，算 `available = evaluatedCount < exclusiveLimit`）。三个消费者（formal gate `includeNextIncrement:false`、HITL2 advice `includeNextIncrement:true`、post-final recovery guard）都复用该 evaluator，不各自持有数字。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 把 rerun 最大次数从 10 提到 32，且只在单一真相源改动。
- 修掉 `phase-rerun.md` Stage 2 与 Stage 3 / operate-topic-state.md 的指引矛盾。

**Non-Goals:**

- 不新增 per-topic 深度/广度控制、不新增「已研究 topic 原地 retire」语义（留待后续 change）。
- 不改 `evaluateRerunAvailability` 的语义形状，不改任何其他消费者。

## Decisions

- **D1：只改 definition 数值，不在 spec/doc 复制数字。** 依据 REI-003「boundary owned only by definition rule, no duplicate number」。备选：在多个表面硬编码 32 —— 否决（违反单一真相源，会漂移）。
- **D2：`value: 33`（exclusive）表达「最多 32 次」。** `evaluateRerunAvailability` 计算 `available = evaluatedCount < exclusiveLimit`；`value: 33` 使 `rerun_count ≤ 32` 通过、`33` 起失败。备选：改 evaluator 加 `≤` 算子 —— 否决（无必要，改语义形状）。
- **D3：B1-a 只改 Markdown，不动 spec。** `phase-rerun.md` Stage 2 那行是 legacy imperative 形状的残留；accepted spec（REI 与 canonical-topic-state）文本已正确，只修正 Markdown 指引与 spec 对齐。备选：改 spec —— 否决（spec 无 drift）。

## 责任边界（semantic precision → simple reliable control → helper-oriented）

- 语义边界：边界值是一个「definition 拥有的数字」，不是新具名概念；safe-remove（未开工 topic）与「已研究 topic 剔除 = 新 bundle」是两个不同语义，Markdown 中不得混写。
- Source of Record：单一 definition 数值 + 单一 evaluator；最短合法闭环 = 改 definition → boundary 回归（读 production 值证 `<33` 通过 / `==33`、`>33` 失败）→ 全量测试。
- Net simplification：无新增 state/check/fallback/retry/recovery；消除 Stage 2/Stage 3 指引冲突。
- 责任：上限耗尽「accept-current / new-bundle」= user decision；改写数值与 Markdown、跑测试 = Agent mechanical；`evaluateRerunAvailability` = Engine verdict。

## Risks / Trade-offs

- [改 definition 值会让在飞 post-final recovery 判定 `rerun_rule_drift`] → 新 run 无影响；在飞 guard 因 `definition_sha256` 变化 fail-closed，是预期边界，不额外处理，仅在此标注。
- [B1-a 文案与既有 spec 语义不一致的风险] → 以 accepted spec（rerun-incremental-node、canonical-topic-state）为唯一语义源，Markdown 只引用不改写。

## Migration Plan

- 无数据迁移。改 definition + 改 Markdown 即完成。
- 回滚：恢复 `value: 11` 与旧文案即可；definition 是纯数据，无兼容负担。

## Open Questions

（无——不改变 spec / approach / task 拆分的未知项均已在本 change 内决定。）
