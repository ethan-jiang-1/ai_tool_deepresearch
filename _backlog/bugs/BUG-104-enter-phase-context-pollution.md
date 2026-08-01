---
bug_id: BUG-104
title: "enter-phase renders full shared context on every transition, causing cumulative context pressure"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
affected: all phase transitions
---

# BUG-104: enter-phase 每次渲染完整 shared context 导致累积上下文压力

## Current Base Recheck (2026-07-28)

This behavior remains objectively present: `enter-phase.mjs` renders every
file in the loaded `result.plan` in full for every invocation. The current
Base does not maintain a session-level loaded-file cache, and that is not
asserted to be an Agent-correctness contract. Repeated full rendering is thus
a bounded operability concern, but its claimed causal link to a particular
Agent stop remains unproven. Keep this card deferred/research-only until a
real-Agent observation isolates the effect; do not add session memory or a
host controller from deterministic fixture evidence.

## Current Swarm Alignment (2026-08-01)

This card records a historical rendering measurement and a context-pressure
hypothesis. Current silent execution is governed by the Chain/Queue/Work Unit
model, including active work-unit polling and deterministic continuation cues;
it does not use session-level loaded-file memory. `case-606` proves cue shape,
not a causal relation between rendered Markdown and a Phase-Agent stop. The
available real-actor canaries have no native completion (`NOT_RUN`).

A fresh current-head Phase-Agent observation must re-measure the actual loaded
closure and retain prompt/transcript plus bundle handoff evidence before this
card can support any DPT-owned proposal. Earlier byte counts and the incident
timeline are historical context, not a current causal finding.

## 现象

每次 `enter-phase --node <next>` 调用都会渲染该 phase 所需的 shared context 文件。例如 enter-phase 到 hitl1 时：

```
<!-- DPT_LOADED_FILE_START shared/shared-profile.md -->
  (shared-profile.md 全文, ~33KB)
<!-- DPT_LOADED_FILE_START shared/shared-agent-ux-guidance.md -->
  (shared-agent-ux-guidance.md 全文)
...
```

本 run 中经历了 5 次 enter-phase：
1. instantiation → hitl1
2. hitl1 → setup
3. setup → seed-topics
4. seed-topics → wave0
5. (wave0 → wave1... 未执行)

每次 transition 都向 agent context 追加 shared context 内容。到 wave0 时，agent context 中已有多次重复加载的 shared-profile.md、shared-schemas.md、shared-silent-execution.md 等。

## 历史解释（未证实）

`enter-phase` 的设计假设每个 phase 是独立 session——但实际 run 中，一个 agent session 会连续穿越多个 phase。同一个 shared context 文件（如 shared-profile.md）被加载了 3-4 次，每次都是相同内容。

这曾被视为 BUG-099 的可能贡献因素；尚无 current-head real-Agent evidence
证明这一因果关系。

## 已排除或尚未采纳的方向

- session-level shared-context de-duplication：这会把 Agent 已读/仍保留的对话状态伪装成 DPT authority
- 只输出引用标记：这会令 fresh Phase Agent 在首个动作前缺少当前控制面
- 将 shared context 变成一次性常驻上下文：这会建立当前系统没有的 session-memory contract
