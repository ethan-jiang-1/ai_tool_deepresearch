---
node_type: phase
id: phase-final
phase: final
gate: none
next: none
stop: "no"
requires: []
suggested_context:
  - shared-schemas
---

# Phase: Final — Delivery

> **Terminal Node**: 这是当前 delivery pass 的 terminal node。没有 outgoing gate，也没有 normal next phase。

## 1. Stage Goal

从已验证 bundle state 生成 final report artifact(s)。Final 是 delivery 动作，不是 gate checkpoint。

## 2. Required Inputs

- Readiness gate passed 的 active `dpt_rb_*` run bundle
- 所有 verified wave artifacts
- `rb_profile.yaml`（用户 profile 和 HITL2 decision）
- `rb_status.json`

## 3. Allowed Actions

- 从 verified bundle state 生成 final report artifact(s) 到 `final/`
- 记录 delivery evidence 到 trace
- 更新 `rb_status.json`

## 4. Expected Artifacts

- `final/` 下至少 1 个 final report artifact
- Trace 中有 delivery evidence
- Report content 来自 verified bundle state

## 5. Gate Command

无——final 是 terminal node，没有 outgoing gate。

## 6. On Gate Pass

N/A — final 无 outgoing gate。

## 7. On Gate Fail

N/A。

## 8. Stop Behavior

`stop: no` — Agent 自主完成 final delivery。

## 9. Anti-cheating Rules

- Final report MUST 从 verified bundle state 生成，不能重新凭 chat memory 生成
- MUST NOT 暗藏 hidden next、hidden gate 或隐式循环
- 用户 final 后反馈 MUST NOT 通过 final node 处理——走 HITL2 repair/rerun（`phase-hitl2.md`）
