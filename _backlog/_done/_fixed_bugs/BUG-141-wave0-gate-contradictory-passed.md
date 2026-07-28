---
bug_id: BUG-141
title: "Wave0 gate reports passed=true while failed_rule_ids is non-empty"
severity: P1
discovered: 2026-07-28
bundle: dpt_rb_openspec-spec-bloat-context-management
phase: wave0
affected: DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs
status: resolved
resolved: 2026-07-29
resolved_by: openspec/changes/archive/2026-07-29-make-wave-gate-verdict-unambiguous
contracts: [GSK-004, RWG-021]
commit: e2c281133
---

# BUG-141: Wave0 gate 报告 passed=true 但 failed_rule_ids 非空

## Current Disposition (2026-07-29)

**Resolved.** Archived OpenSpec change
[`make-wave-gate-verdict-unambiguous`](../../../openspec/changes/archive/2026-07-29-make-wave-gate-verdict-unambiguous/)
and commit `e2c281133` make the public verdict mutually exclusive:

- blocking failure: `passed: false`, nonempty `failed_rule_ids`, no legal `next`;
- clean pass: `passed: true`, with neither failed nor degraded rules;
- degraded handoff: `passed: true`, `degraded: true`, empty `failed_rule_ids`,
  nonempty `degraded_rules`, and legal `next`.

`shared_ref_count_floor` may remain unresolved only as explicit carried quality
debt in a degraded handoff. It is no longer represented as a blocking failed
rule while routing is legal. `GSK-004` owns this public summary contract and
`RWG-021` owns its shared adapter/consumer interpretation. The historical
output below remains a regression fact, not current behavior.

## 现象

`check-gate-wave0-complete.mjs` 在一次包含 `shared_ref_count_floor` 失败的运行中返回：

```json
{
  "check": {
    "passed": true,
    "failed_rule_ids": ["shared_ref_count_floor"]
  }
}
```

`passed: true` 和 `failed_rule_ids: [...]` 是矛盾的。如果存在 failed rules，`passed` 必须为 `false`。

## 复现

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs \
  --bundle /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-spec-bloat-context-management \
  --current-node phases/phase-wave0.md
```

在 shared_ref_count_floor 未满足（reference files 存在但未通过 delegated work-unit 路径产出）的情况下：
- gate JSON output 同时包含 `"passed": true` 和 `"failed_rule_ids": ["shared_ref_count_floor"]`
- routing.kind = "next"（实际应该 routing.kind = "no_transition" 或 "repair"）
- continuation 指示 consume_check_next（实际应该指示 repair_and_rerun_gate）

## 根因分析

Gate 的 `passed` 字段和 `failed_rule_ids` 数组由不同代码路径分别设置。疑似在某个条件分支中，`failed_rule_ids` 被正确填充但 `passed` 未被同步更新为 `false`。最可能的场景：

1. Gate check 的主循环正确检测到 `shared_ref_count_floor` 失败，将其加入 `failed_rule_ids`
2. 但在最终 verdict 合并时，某个 early-return 或条件覆盖将 `passed` 重置为 `true`
3. 或者 `masked_rule_ids` 逻辑将 `shared_ref_count_floor` 错误地分类为可降级的 advisory（而非 blocking）

## 影响

- Phase Agent 收到矛盾的信号：`passed: true` 意味着可以 advance，但 `failed_rule_ids` 意味着还有未解决的 blocking issue
- Routing 层可能基于 `passed: true` 允许非法 phase transition
- 如果 Agent 不仔细检查 `failed_rule_ids`，可能在 gate 未真正通过时进入下一 phase

## 严重程度

P1 — gate 是 phase transition 的唯一合法 authority。Gate verdict 的矛盾输出直接破坏框架的 integrity guarantee。

## 建议修复

1. Gate 的 `passed` 字段必须是 `failed_rule_ids` 的确定性函数：`passed = (failed_rule_ids.length === 0)`
2. 确保 masked/advisory 规则不会导致 `passed: true` + `failed_rule_ids` 非空的矛盾状态
3. 为所有 gate CLI 添加一致性校验：在输出 JSON 前 assert `(!passed) === (failed_rule_ids.length > 0)` 中的 blocking rules
4. 覆盖所有 gate（不仅是 wave0）——检查其他 gate 是否有同样的问题

## 临时 workaround

Agent 在消费 gate 输出时，必须同时检查 `passed` 和 `failed_rule_ids`，以 `failed_rule_ids` 是否为空作为实际 verdict。不能仅依赖 `passed` 字段。
