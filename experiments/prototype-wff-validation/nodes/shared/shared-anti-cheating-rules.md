---
node_type: shared
id: shared-anti-cheating-rules
shared_scope: rules
authority: guidance-only
requires: []
suggested_context: []
---

# Shared: Anti-Cheating Rules

## Purpose

定义 Workflow Foundation 运行中 Agent 绝对不能做的事。这些规则是跨 phase 共享的底线约束。

## What This Covers

- MUST NOT 伪造 evidence、receipt、trace 或 state
- MUST NOT 用 mock action 或 hand-written fake output 通过 gate
- MUST NOT 自我声明 gate 通过——gate pass/fail 只来自 CLI output
- MUST NOT 跳过 gate 直接进入下一 phase
- MUST NOT 将 runtime state 写回 `DPT_FRAMEWORK/`
- MUST NOT 依赖 chat memory 或 console output 作为 pass/fail proof
- MUST NOT 在 `stop: no` phase 主动问用户——除非触发 explicit escalation 条件

## Authority Boundary

- 此 shared node 是 guidance。违反这些规则的具体后果由 gate CLI、schema validation 和 trace audit 强制执行。
- 如果某 phase node 的 anti-cheating 规则与此 shared node 冲突，以此 shared node 为准（它是跨 phase 的底线）。
