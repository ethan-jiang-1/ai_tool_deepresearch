---
bug_id: BUG-113
title: "Wave2 gate also lacks fatigue degradation — same class as BUG-110"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave2
gate: wave2-complete
---

# BUG-113: Wave2 gate 同样无 fatigue degradation

## 现象

Wave2 gate 在 5 次 attempt 后（attempt 5-9，从手工 handoff 修复后计数）仍然不 pass、不 degrade。5 个 content format 规则持续失败（ledger_fixed_sections, finding_index_contract, cross_artifact_references, wave1_evidence_ref, phase_queue_drained）。与 BUG-110（wave1）同类。

## 根因

与 BUG-110 相同：wave2 gate 未实现 fatigue degradation 机制。Quality rules（format/schema/contract）不被视为 degradation-eligible。

## 建议

统一所有 gate 的 fatigue degradation 策略。Wave0 gate 有工作模型（attempt 3 → degraded pass），wave1/wave2 gate 缺失。
