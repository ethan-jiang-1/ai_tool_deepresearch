---
bug_id: BUG-175
title: exploratory_map count-floor calibration remains a product-policy decision
severity: P2
phase: wave0
status: suspended_pending_product_policy_evidence
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
revised: 2026-08-08
---

# BUG-175: exploratory_map count-floor calibration

## Triage Disposition (2026-08-08)

**Suspended as a product-policy residual, not an active implementation bug.**
The original report alleged that Wave0 count floors were absolute Gate blockers
with no lawful exit. Current code and focused regressions show that the two
Wave0 count floors are degradation-eligible after the bounded fatigue path;
the claimed Engine defect is therefore already absent from current head.

There is also no current, auditable real `exploratory_map` run bundle showing
that the selected `10` per-topic and `4 + N` shared-reference clean-pass
targets create unacceptable friction or carry unacceptable degraded debt.
Deterministic tests establish the Gate/profile contract, but cannot determine
that product calibration question. Do not lower floors, add another degraded
path, or start an implementation change from the historical report alone.

Reopen only when a reachable current run bundle and native Agent receipts show
the above policy cost, and a user or product decision explicitly asks to
rebalance coverage against cost. That work must be a policy-only OpenSpec
change that preserves the existing Gate contract; the missing active
`per_topic_count_floor` degraded-handoff CLI regression may be added as part
of that future change, but is not itself a runtime defect.

## 当前代码状态 (2026-08-08)

**原始的"count floor 是绝对 Gate blocker、无降级路径"实现诊断已关闭。** 当前
`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave0-complete.definition.json`
中 `shared_ref_count_floor` 与 `per_topic_count_floor` 均标记 `degradation_eligible:
true`。fatigue threshold 后，当这些是唯一未解决 rules 时，Gate 发出合法 degraded
handoff（`degraded_rules`），而非硬 pass。任何 queue/provenance/structural/trace 等
ineligible blocker 仍在时，Gate 保持 fail-closed。

## 研究结论 (2026-08-08)

### 判定

- 原 BUG 的 Engine 断言不成立：Wave0 的两个 count floor 不是无限期的绝对
  blocker。当前定义将 `shared_ref_count_floor` 和 `per_topic_count_floor` 都声明为
  definition-owned `required_floor` 且 `degradation_eligible: true`
  （`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave0-complete.definition.json:37-45,
  74-82`）。
- 这不是无条件放松。正式 Wave0 Gate 仅在有效尝试数至少为 3、所有未 mask 的
  blocking finding 都通过精确 rule-id 的资格检查、且正常 passed route 存在时，才生成
  degraded handoff；写入 durable `gate_attempt` 失败也会把候选 handoff 压回 fail-closed
  （`DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs:120-162,165-227`；
  `DEEP_RESEARCH_HARNESS/engine/helpers/wave-degradation-eligibility.mjs:8-37`）。
  因此 floor 在 fatigue 前仍是干净通过的 blocker，但不再是没有合法出口的 blocker；
  queue、provenance、结构、trace、route 等任一独立根仍会拒绝降级。这与已接受的
  Gate contract 一致（`openspec/specs/engine/gate-skeleton/spec.md:469-478,852-892`）。
- `exploratory_map` 的数值是 profile policy，而非 Gate 写死的质量常量：其每 topic
  floor 为 10，shared 值为 `base: 4` 加每 topic 1
  （`DEEP_RESEARCH_HARNESS/schema/research-styles/exploratory_map.json:2-13`）；唯一的
  参数投影计算为 `base + per_topic * topicCount`
  （`DEEP_RESEARCH_HARNESS/engine/helpers/research-style-params.mjs:20-33`）。所以 5 个
  topic 的正常 clean-pass 目标正是 50 个 per-topic entries 与 9 个 shared references。
  HITL1 由用户在可见 profile 中选择该深度，并由唯一 writer 写入参数
  （`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:109-120,202-206`）。

### 验证与证据边界

- 2026-08-08 定向回归通过：
  `node --test tests/schema/gate-definition-degradation-eligibility.test.mjs tests/engine/helpers/wave-degradation-eligibility.test.mjs tests/engine/helpers/wave-gate-verdict.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs`
  为 36/36；`node --test tests/engine/helpers/research-style-params.test.mjs` 为 9/9；
  Wave0 动态阈值 name-pattern 回归为 5/5。尤其 Wave0 CLI fixture 证明在所有提交候选
  都明确 deferred、仅 shared floor 尚缺且 attempt=3 时，结果为
  `passed: true`、`degraded: true`、`degraded_rules: ['shared_ref_count_floor']`
  （`tests/integration/cli/check-gate-wave0-complete.test.mjs:522-534`）；缺少 submitted
  work-unit 等 runtime-truth blocker 时仍拒绝降级
  （`tests/integration/cli/check-gate-wave0-complete.test.mjs:553-568`）。
- 当前测试直接覆盖 shared-floor 的 active degraded handoff
  （`tests/integration/cli/check-gate-wave0-complete.test.mjs:522-534`）；共用 helper 也
  覆盖 topic-scoped floor 的精确 stable rule-id 资格路径
  （`tests/engine/helpers/wave-degradation-eligibility.test.mjs:53-65`）。但同一 Wave0
  CLI suite 对 active `per_topic_count_floor` 只断言普通 floor failure/masking
  （`tests/integration/cli/check-gate-wave0-complete.test.mjs:669-690`），没有单独把该
  active rule 断言为 `degraded_rules`。这是未来收紧回归覆盖的候选，不是已观察到的
  runtime defect。
- 以上仅证明确定性 Gate/profile 行为，不证明 10/9 对真实 Agent 研究是否可行或适当。
  本次未提供可审计的 live run bundle 或真实 Agent receipt；归档变更也明确将静态
  fixture 与 console 输出排除在 live Agent Flow 证据之外
  （`openspec/changes/archive/2026-07-24-simplify-wave-gate-feedback-and-degradation-policy/proposal.md:28-33`）。
  另有一条未用于本结论的 Wave1 动态阈值 fixture 失败
  （`tests/integration/cli/gate-dynamic-threshold.test.mjs:314`）；未在本卡诊断或归因。

## 保留的产品政策问题

一个 5-topic `exploratory_map` run 的 clean-pass 目标是 50 个 per-topic source entries
加 9 个 shared references（degraded 前）。是否应降低默认值，只有在可审计的真实运行
证明其成本不可接受时才重新成为问题；fabricated sources、synthetic source entries 和
invented cross-topic references 仍被禁止，degraded handoff 不是创建它们的许可。
