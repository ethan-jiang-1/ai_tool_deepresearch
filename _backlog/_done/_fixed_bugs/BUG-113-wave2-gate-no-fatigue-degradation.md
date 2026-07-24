---
bug_id: BUG-113
title: "Wave2 adapter lacks shared eligible-degradation projection; observed roots remain ineligible"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: wave2
gate: wave2-complete
---

# BUG-113: Wave2 adapter policy 与 observed failure 必须分开

## 现象

Wave2 gate 在多次 attempt 后仍然不 pass、不 degrade。observed failures 包含 queue、finding-index、cross-artifact 和 reference-binding roots；它们不是 quality-only degradation counterexample。之后的 pass 由手工 handoff 写入，不能当作 runtime proof。

## 校正后的事实

Wave2 adapter 尚未消费 generic eligible-degradation policy；这是一致性 defect。当前 active Wave2 definitions 没有 accepted eligible rule，且这次 failures 有 ineligible authority roots，所以 Gate 必须继续 fail closed。它不是 Wave2 本次应 degraded handoff 的理由。

## 建议

Change 3 应让三条 Wave adapters 消费同一个 metadata-backed evaluator，default false。delta spec 可授权一个 inactive test-only Wave2 eligible quality fixture 证明正向 adapter path；不得新增 production Wave2 eligible rule、automatic downgrade 或 partial advance。
