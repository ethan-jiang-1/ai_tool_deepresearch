---
bug_id: BUG-103
title: "Phase-handoff guidance omits required source-gate status synchronization"
severity: P3
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phases: hitl1, setup, wave2, hitl2
last_reproduced: 2026-07-27
status: guidance_handoff_order_defect
---

# BUG-103: Phase handoff 指引遗漏 source-gate status synchronization

## Current Disposition (2026-07-28)

The current Base deliberately keeps two durable responsibilities separate:
`enter-phase` writes the route-bound `load_complete` witness and
`rb_status.current_node`, while `advance-status --to <source_gate>`
synchronizes the `current_gate` / `next_gate` window. The distinction is
executable: `enter-phase` integration coverage asserts that it leaves the gate
window unchanged. It is also documented in `RUN.md` and `COMMANDS.md`.

Therefore this is not a request to merge the lifecycle writers, nor evidence
that status drift is an Engine state-model defect. The active defect is in the
Agent-facing `command_playbook/start-research.md`: its gate-pass sequence says
`enter-phase` and return to phase flow, omitting the required immediate
`advance-status --to <source_gate>` step. That omission makes the otherwise
intentional split easy to execute in the wrong order.

Keep this card active as a bounded guidance/handoff-order repair. A future
change should align all active entry paths to this sequence:

```text
gate pass -> enter-phase -> advance-status --to <source gate> -> execute loaded phase
```

It must not introduce a lifecycle walker, automatic gate repair, or a merged
status/entry mutation.

## 现象

每次进入新 phase 后首次跑 gate，`rb_status.json` 的 `current_gate` / `next_gate` 总是落后一个 phase。本 run 中发生了两次：

### Instance 1: HITL1 → Setup

```
enter-phase --node phases/phase-setup.md (after HITL1 gate pass)
→ rb_status.json 仍是 current_gate: hitl1_recorded / next_gate: setup_ready
→ check-gate-setup-ready 期望 current_gate: setup_ready / next_gate: seed_topics_ready
→ GATE FAIL: status_current_gate + status_next_gate
→ Agent 执行 advance-status --to setup_ready → gate pass
```

### Instance 2: Setup → Seed-topics

```
enter-phase --node phases/phase-seed-topics.md (after setup gate pass)
→ rb_status.json 仍是 current_gate: setup_ready / next_gate: seed_topics_ready
→ 但这次 seed-topics gate 也期望 current_gate: seed_topics_ready... 等下
```

实际上 seed-topics gate check 没有报 status drift（它直接 pass 了），因为 seed-topics gate 在进入 phase 之前已经通过 advance-status 同步过了。但 HITL1→Setup 的 transition 确实每次都触发 status drift。

### Fresh reproduction: Wave2 → HITL2

在 `dpt_rb_openspec-derivative-frameworks` 本次 run 中，Wave2 Gate 已通过并返回
`phases/phase-hitl2.md`。随后 `enter-phase` 成功加载 HITL2，但直接运行 HITL2
Gate 时，`rb_status.json` 仍停留在 Wave1 窗口，得到：

```text
rb_status.json#/current_gate expected "wave2_complete", got "wave1_complete"
rb_status.json#/next_gate expected "hitl2_recorded", got "wave2_complete"
```

按 Gate advice 执行：

```bash
node DPT_FRAMEWORK/cli/advance-status.mjs \\
  --bundle dpt_rb_openspec-derivative-frameworks \\
  --to wave2_complete
```

之后 HITL2 Gate 通过。该记录是 BUG-103 的又一次 fresh reproduction，
不是新 bug 编号；它说明问题跨越的不只是早期 phase transition。

## Historical Observation And Root Cause

`enter-phase` 写入 route-bound handoff witness，但不更新 `rb_status.json`。Phase instructions 在 §6 中说 advance-status 是 "just-passed source gate" 的同步——意味着它应该在 gate pass 后立即执行。但如果 agent 在 gate pass 和 advance-status 之间做了其他操作（或忘记执行），status 就会漂移。

The prior conclusion that these writes should be atomic is superseded by the
current accepted ownership boundary. The historical reproductions instead show
why a missing instruction between the two intentional operations is harmful.

## Repair Direction

- Update active Agent-facing handoff guidance to state the complete required
  order, including `advance-status --to <source_gate>`.
- Preserve the current division of durable authority and the existing gate
  diagnostic behavior.
