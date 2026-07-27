---
bug_id: BUG-103
title: "rb_status.json gate fields drift between phases, requiring manual advance-status repair"
severity: P3
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phases: hitl1, setup, wave2, hitl2
last_reproduced: 2026-07-27
---

# BUG-103: rb_status.json gate 字段在 phase 之间持续漂移

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

## 根因假设

`enter-phase` 写入 route-bound handoff witness，但不更新 `rb_status.json`。Phase instructions 在 §6 中说 advance-status 是 "just-passed source gate" 的同步——意味着它应该在 gate pass 后立即执行。但如果 agent 在 gate pass 和 advance-status 之间做了其他操作（或忘记执行），status 就会漂移。

更根本地说：`enter-phase` 和 `advance-status` 是两步操作，但它们语义上应该是原子的——"进入新 phase" 就意味着 "status 已同步到新 phase 的 gate window"。

## 建议方向

- 让 `enter-phase` 自动执行 gate status 同步（内部调用 advance-status 逻辑）
- 或者在 `enter-phase` 输出中明确提示 "status 尚未同步，请立即执行 advance-status"
- 让 gate check 在检测到 status drift 时自动修复（而非报 failure），如果 drift 是可自动判定的
