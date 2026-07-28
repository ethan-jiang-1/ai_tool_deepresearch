---
bug_id: BUG-099
title: "stop: no phase agent halted at wave0 — de-facto HITL created"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave0
node: phases/phase-wave0.md
---

# BUG-099: `stop: no` phase agent halted at wave0

## Current Priority (2026-07-27)

This is a deferred operability issue, not the current delivery blocker. A
premature stop costs an extra user continuation turn but does not itself make
the bundle's work-unit, evidence-production, or Gate contracts unreachable.
Prioritize making real bundles run those contracts reliably first; revisit the
bounded DPT handoff defect only after that path is routinely successful. Do not
attempt to solve host/Agent turn liveness by adding a DPT watcher or controller.

## Current Base Recheck (2026-07-28)

The Base now emits an explicit final continuation cue after successful
`enter-phase`, and normal handoff guidance requires source-gate status
synchronization before target-phase execution. These deterministic entry facts
make a bounded next action available, but they do not prove that a real Agent
will execute it. Keep this card deferred until repeated independent
`agent_flow_e2e` observations show whether an Agent executes the first legal
action after a completed handoff. A fixture, static Markdown assertion, or a
host-resumed user turn is not closure evidence.

## 现象

Agent 在 wave0 phase（`stop: no`）主动停下来，向用户提问"要继续让框架 spawn sub-agent 跑完吗？"，创建了一个框架合约之外的 de-facto HITL checkpoint。

## 重现线索

1. Conversation 从 instantiation → HITL1 → setup → seed-topics → wave0，连续执行 50+ tool calls
2. 每次 `enter-phase` 加载 shared context（如 shared-profile.md）输出 33KB+ 到 agent context
3. 到达 wave0 时，agent 面对 work-unit sub-agent spawn 的复杂性 + context exhaustion 压力
4. Agent 违反 `stop: no` 合约，主动向用户提问

## 根因假设

**主因**：`enter-phase` 的 shared context 渲染对 agent context window 造成累积压力。5 个 phase transition × 每次 20-50KB shared context = agent 在 wave0 时 context 已近饱和。Agent 面对 sub-agent spawn（也是一个 expensive 操作）时，选择"停下来问用户"作为自我保护策略。

**副因**：work-unit sub-agent spawn 对 phase agent 来说是一个 high-friction 操作——需要 claim、prompt 组装、sub-agent 调用、dry-submit、submit。当前 phase-wave0.md 的 instruction 将这描述为多个步骤，但没有给 phase agent 明确的"你必须不停顿地完成这些步骤"的强度信号。

## 框架层面的问题

1. `stop: no` 的 enforcement 是纯文本约定，没有 Engine 层面的硬阻断——Agent 可以违反而不被 gate 拦截
2. `enter-phase` 没有做 context budget 感知——它总是渲染 full shared context，不管 agent 是否已经加载过
3. 缺失一个机制：当 phase agent 在 `stop: no` phase 主动提问时，Engine 应该能检测到"用户消息被当作了 checkpoint"并发出 diagnostic

## 建议方向

- `enter-phase` 对重复加载的 shared context 做幂等去重（基于 node id hash）
- wave0 work-unit claim → sub-agent spawn → submit 的 loop 需要更简化的单次指令（而非多步骤解析）
- 考虑 Engine 层面的 `stop: no` violation detection：检测到 phase agent 在非 HITL phase 发出提问式消息时，在 trace 中记录 `silent_contract_violation`
