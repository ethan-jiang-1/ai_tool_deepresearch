---
bug_id: BUG-106
title: "stop: no violation pattern repeats — agent reports status summary instead of loading and executing next phase"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave0→wave1 transition
---

# BUG-106: `stop: no` violation repeats — agent says "continuing" but doesn't execute

## Current Priority (2026-07-27)

This is the same deferred historical operability class as BUG-099. It consumes
an additional user continuation turn, but it is not proof that the underlying
work-unit, evidence-production, or Gate path is unreachable. Current
deterministic swarm contracts have since converged; do not create a
host-liveness controller as a shortcut.

## Current Base Recheck (2026-07-28)

The completed handoff now has a direct continuation cue and a specified
source-gate status synchronization step. Those conditions narrow the DPT-side
entry interface, but do not demonstrate same-turn Agent compliance. Retain
this as a deferred actor-operability observation. Closure requires repeated
independent `agent_flow_e2e` evidence that a real Agent executes the loaded
phase's first legal action after the complete handoff, rather than a
deterministic fixture or a user-provided continuation turn.

## Current Swarm Alignment (2026-08-01)

This card preserves a historical Phase-Agent behavior observation. The current
swarm has a direct handoff/status order, continuation cues, and a delegated
poll-submit-repair-terminalize loop; those are deterministic action-readiness
contracts, not a promise of same-turn host/model liveness. Later real-actor
canaries have no native completion (`NOT_RUN`) and do not exercise or close the
post-handoff Phase-Agent assertion here.

The next valid observation must use a fresh current-head disposable bundle and
retain the completed handoff, prompt/transcript, host/version/mode, and the
first target-phase action. A host-opened extra turn, static guidance check, or
fixture cannot close this card by itself.

## 现象

在 wave0 gate pass（degraded）后，agent 执行了 `enter-phase` 和 `advance-status`，成功进入 wave1。然后 agent 输出了一段 wave0 总结表格，说"继续 wave1 → wave2 → HITL2，静默自主"——但 **没有实际加载和执行 phase-wave1.md 的 instruction**。

这是 BUG-099 模式的再现：agent 在 transition 处用"汇报状态"替代了"执行下一 phase"。

## 与 BUG-099 的关系（历史观察）

BUG-099 描述的是 agent 在 wave0 门口主动提问（"要继续吗？"）。BUG-106 是同一个根因的另一种表现：agent 不提问，但用 summary/report 消耗了当前 turn，然后等待用户回应——这也是一种 de-facto 停顿。

当时提出的共同根因假设：
1. Phase transition 处的 context pressure（shared context 累积）
2. Agent 缺少 "loaded node → must execute immediately" 的强信号
3. `stop: no` 是文本约定，无 Engine 层 enforcement

## 实际影响

- 用户必须再次说"继续"来推动 agent 执行
- 破坏了 silent autonomous 的合约
- 每次停顿消耗一个 user turn + agent turn

## 已排除或尚未采纳的方向

- 再加一个 `enter-phase` action marker 或同义的 no-stop prose：continuation cue 已是现有 deterministic feedback，不构成 scheduler
- 以更多 phase-node 禁止语取代 observation：不能证明模型会在同一 turn 继续
- Engine 检测 chat/tool-call absence：Engine 没有 conversation transport authority，且事后检测不能修复已结束的 turn
