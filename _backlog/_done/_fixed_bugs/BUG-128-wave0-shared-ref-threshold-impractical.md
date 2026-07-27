---
bug_id: BUG-128
title: "wave0_shared_ref_total threshold impractical for single-agent execution — 22 shared refs for 8 topics cannot be met by topic-bound sub-agents"
severity: P3
discovered: 2026-07-26
status: closed_accepted_policy
resolved: 2026-07-27
bundle: dpt_rb_openspec-influence-landscape
phase: wave0
node: phases/phase-wave0.md
---

# BUG-128: `wave0_shared_ref_total` 阈值由公式计算但与实际执行模型不匹配

## Resolution (2026-07-27)

The maintainer decided to retain `claim_verification`'s existing
`wave0_shared_ref = 6 + 2 × topics` formula. This closes BUG-128 as an accepted
product-policy tradeoff: Wave0 may reach its already eligible degraded result
when the shared-reference floor is unmet.

This decision does not claim that 22 references for eight topics are cheap,
automatic, or ordinarily achieved. It preserves the current profile behavior
without a threshold change. The legal `wave0_source_intake` submission path and
repair feedback were separately corrected by archived Change 3. A future
formula change requires a new maintainer decision and a focused OpenSpec change;
it is not authorized by this closed bug record.

## 现象

`apply-research-style.mjs` 为 8 topics + `claim_verification` profile 计算出 `wave0_shared_ref_total: 22`。但实际执行中：
- 8 个 topic-bound sub-agent 每个产出了 11-12 个 topic-specific sources（满足 `wave0_per_topic_source_floor: 12`）
- **0 个 sub-agent 产出了 shared reference files**（`reference/00-shared-*.md`）
- Gate 的 `shared_ref_count_floor` 要求 22 个 shared refs
- Phase Agent 尝试直接创建 shared refs → gate reject（`delegated_bypass`，见 BUG-124）
- Phase Agent 尝试创建新的 delegated work unit 来产出 shared refs → claim 失败（跨 topic 的 queue item 没有合法的 payload schema，见 BUG-125）

最终 gate 以 degraded 状态通过（`passed: true` 但 `shared_ref_count_floor` failed），22 个 shared refs 的硬性要求在实际中无法达成。

## 重现线索

1. 设置 `claim_verification` profile，8 topics
2. `apply-research-style.mjs` 计算出 `wave0_shared_ref_total: 22`
3. Enqueue 8 个 topic-bound `wave0_source_intake` tasks（每 topic 一个）
4. Sub-agent 执行 source intake——每个产出 `source.yaml`，但都不产出 `reference/00-shared-*.md`
5. Gate 报 `shared_ref_count_floor` 失败，0/22
6. Phase Agent 无法通过 agent_action 修复（BUG-124），也无法通过 engine_operation 修复（BUG-125）

## 根因假设

**主因**：`wave0_shared_ref_total` 的计算公式（`base + per_topic × topic_count`）假设 shared ref 的产出是 topic-bound sub-agent 的自然副产物。但实际上，sub-agent 被分配了单一 topic 的 source intake 任务，它的 task card、seed context、和 result schema 都围绕单一 topic 设计。产出跨 topic 的 shared reference 不在 sub-agent 的自然行为范围内——需要 sub-agent 主动识别"这个 source 也适用于其他 topic"并额外产出 shared ref file。

**副因**：Task card 的 `writes_to` 字段写了 `reference/00-shared-<slug>.md`，但 `required_receipts` 只有 `file:artifacts/wave0/{topic.slug}/source.yaml`。Shared ref 不是 required receipt，也不在 `done_condition` 中。Sub-agent 自然会优先满足 required receipts，跳过 optional outputs。

**第三因**：`claim_verification` profile 的阈值偏高。`wave0_shared_ref_total: 22` 意味着平均每个 topic 要额外产出 2-3 个跨 topic shared refs。对于 8 topics × 12 sources 的工作量，22 个 shared refs 是显著的额外负担。

**第四因**：Shared ref 的"跨 topic 性"和 work unit 的"topic-bound"模型之间存在结构性的 mismatch（见 BUG-124、BUG-125）。即使 sub-agent 想产出 shared ref，它也没有合法的输出声明路径——result.json 的 `output_files` 按 topic 组织，shared ref 不知道应该挂在哪个 topic 下。

## 框架层面的问题

1. `apply-research-style.mjs` 的阈值计算公式没有考虑实际的 sub-agent 执行模型——公式假设 shared ref 自然产生，但执行中没有强制机制
2. 同一个 source intake sub-agent 既要产出 topic-specific source.yaml，又要产出跨 topic shared refs，但 task card 只对前者有 required receipt 和 done_condition
3. 阈值计算是纯算术的（base + per_topic × N），没有根据 profile 的难度做边际调整

## 建议方向

- **短期**：在 task card 的 `required_receipts` 中加入 shared ref 产出要求，并在 `done_condition` 中明确指定 shared ref 的最低数量（如 `at least ceil(wave0_shared_ref_total / topic_count) shared reference files`）
- **短期**：降低 `claim_verification` profile 的 base 值，使 `wave0_shared_ref_total` 对 8 topics 来说更现实（如 base=4, per_topic=1 → total=12）
- **中期**：引入独立的 `wave0_shared_reference` work unit kind（不绑定单一 topic），由 Phase Agent 在 topic-specific source intake 完成后，基于 collected sources 的跨 topic 分析来分配
- **中期**：`inspect-wave0-output.mjs` 在 shared ref 全部缺失但 per-topic sources 充足时，给出 degraded pass 路径（类似当前 gate 的实际行为），而不是同时报 `agent_action` 和 `delegated_bypass` 的矛盾提示
- **长期**：公式计算加入"可达成性系数"——基于 topic_count、profile、和实际 sub-agent capacity 调整阈值，而不是纯粹做乘法
