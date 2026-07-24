---
bug_id: BUG-110
title: "Wave1 observed fatigue failure is correctly fail-closed for authority blockers"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave1
gate: wave1-complete
---

# BUG-110: Wave1 observed fatigue failure 的原始归因错误

## 现象

Wave1 gate 在多次 attempt 后仍然不 pass、不 degrade。Wave0 曾在仅剩 eligible quality failure 时合法 degraded；这个对比曾被误读为 Wave1 缺少 degradation path。

## 校正后的事实

Wave1 已有仅允许 `per_topic_ref_md_count_floor` 的窄 degradation path。该 production run 同时有 queue、submitted provenance、required structure、reference/backing 与 depth-review roots；这些都是 authority blockers，永远不 fatigue-degradable。因此 fail-closed verdict 正确，不是应放宽 Gate 的 counterexample。

## 实际影响

- Phase Agent 需要先走 direct producer/closeout repair，而不是以 attempt count 请求 handoff。
- 原始“5/5 submitted”叙述与 ledger evidence 不符；只有一项 formal submitted。

## 建议方向

- Change 3 应把既有 eligible policy 迁入 shared metadata-backed evaluator，并 regression-prove quality-only degraded pass。
- queue、provenance、receipt, structure、binding 与 backing roots 必须继续 fail closed；不增加 partial pass 或按次数放宽的路径。
