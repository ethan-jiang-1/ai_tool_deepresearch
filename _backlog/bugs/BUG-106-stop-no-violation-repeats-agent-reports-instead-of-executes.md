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

This is the same deferred operability class as BUG-099. It consumes an
additional user continuation turn, but it is not currently a proof that the
underlying work-unit, evidence-production, or Gate path is unreachable. Defer
the silent-autonomy improvement until those core runtime paths have first been
made routinely runnable; do not create a host-liveness controller as a shortcut.

## 现象

在 wave0 gate pass（degraded）后，agent 执行了 `enter-phase` 和 `advance-status`，成功进入 wave1。然后 agent 输出了一段 wave0 总结表格，说"继续 wave1 → wave2 → HITL2，静默自主"——但 **没有实际加载和执行 phase-wave1.md 的 instruction**。

这是 BUG-099 模式的再现：agent 在 transition 处用"汇报状态"替代了"执行下一 phase"。

## 与 BUG-099 的关系

BUG-099 描述的是 agent 在 wave0 门口主动提问（"要继续吗？"）。BUG-106 是同一个根因的另一种表现：agent 不提问，但用 summary/report 消耗了当前 turn，然后等待用户回应——这也是一种 de-facto 停顿。

两案的共同根因：
1. Phase transition 处的 context pressure（shared context 累积）
2. Agent 缺少 "loaded node → must execute immediately" 的强信号
3. `stop: no` 是文本约定，无 Engine 层 enforcement

## 实际影响

- 用户必须再次说"继续"来推动 agent 执行
- 破坏了 silent autonomous 的合约
- 每次停顿消耗一个 user turn + agent turn

## 建议方向

- `enter-phase` 输出中加入 explicit action marker：`<!-- DPT_ACTION_REQUIRED: execute_loaded_node_IMMEDIATELY -->`
- Phase node 在开头增加 "DO NOT SUMMARIZE. DO NOT REPORT STATUS. Execute §0 immediately." 指令
- Engine 层检测：如果 agent 在 `stop: no` phase 的输出不包含 tool call（Bash/Agent/Write），记录 `silent_contract_violation`
