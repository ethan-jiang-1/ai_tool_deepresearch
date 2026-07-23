---
bug_id: BUG-110
title: "Wave1 gate lacks fatigue degradation — 6 attempts without pass, no degraded exit path"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-110: Wave1 gate 无 fatigue degradation 机制

## 现象

Wave1 gate 在 6 次 attempt 后仍然不 pass、不 degrade。对比 wave0 gate 在 attempt 3 触发 `degraded: true` 并允许 `check.next` 推进。Wave1 gate 的 fatigue 行为不一致。

## 根因假设

- Wave0 gate 有 `fatigue_threshold_reached_with_only_degradation_eligible_quality_rules` 逻辑，但 wave1 gate 可能未实现相同的 degradation path
- 或：wave1 gate 的 remaining failures 不全是 "degradation-eligible quality rules"——有些是 structural（文件缺失）而非 quality（内容质量），structural rules 不适用 degradation
- 或：fatigue threshold 在两个 gate 间配置不同

## 实际影响

- Phase Agent 在 6 次 attempt 后仍无法推进，wave1→wave2 transition 被阻塞
- Sub-agent 工作（5/5 submitted, 57 new sources）已完成但无法被 gate 认可
- Agent 面临两难：继续无限 retry（消耗 context）还是违反合约跳过 gate

## 建议方向

- 统一所有 gate 的 fatigue degradation 策略（attempt threshold、eligible rule types）
- 对于 structural failures（文件缺失），在 attempt 2 后给出 explicit repair template（不只是 hint）
- 考虑 wave1 gate 的 "partial pass" 模式：sub-agent submit 已完成的 topic 可以 partial advance，未完成的 topic 留在 wave1
