## Why

当前 `DPT_FRAMEWORK/command_playbook/start-research.md` 的通用 gate-pass
流程在成功 `enter-phase` 后直接回到 phase flow，遗漏了既有的
`advance-status --to <source_gate_enum>`。这使 Agent 可以正确写入
route-bound `load_complete` 与 `current_node`，却带着旧的 gate window
开始下一 phase，随后才由 gate 暴露可避免的 status drift。

这不是生命周期状态机缺陷。现有 `enter-phase`、`advance-status`、trace
和 gate contracts 已明确且保持正确；需要修复的是入口 guidance 对同一
accepted handoff chain 的不完整投射。来源：
[`_backlog/bugs/BUG-103-status-gate-drift-between-phases.md`](../../../_backlog/bugs/BUG-103-status-gate-drift-between-phases.md)。

## What Changes

- 在 `start-research.md` 的普通 gate-pass 指引中明确完整顺序：
  `gate pass -> enter-phase -> advance-status --to <source gate> -> execute loaded phase`。
- 说明 `enter-phase` 仅消费 handoff 并写入 entry witness，
  `advance-status` 仅同步刚通过的 source-gate window；两者都不证明 target
  phase 的 work completion。
- 增加 focused regression，防止入口 playbook 再次省略 status
  synchronization 或反转两条命令。

不合并 lifecycle writers，不新增 CLI、status、schema、validator、自动
repair、controller、override 或 host/Agent liveness guarantee。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `cli-phase-transition`: 修改 CPT-008 的 Agent-facing handoff guidance
  要求，使通用入口 playbook 完整交付既有、已接受的 normal handoff chain。

## Impact

- 目标 Markdown：`DPT_FRAMEWORK/command_playbook/start-research.md`。
- 目标 spec delta：`cli-phase-transition`（CPT-008）；无需新 requirement ID
  或 registry 修改。
- 目标 regression：位于 `tests/` 的 Markdown/command-playbook contract
  coverage；不声称真实 Agent 同 turn 执行证明。
- 不改 JavaScript、CLI API、schema、runtime bundle state 或 trace grammar；
  因而不需要 framework version bump。

语义精度：面向从通用入口继续 lifecycle 的 Agent，问题是“gate pass 后在
当前已接受合约下下一组必须完成的机械动作是什么”。该答案必须保留 entry
witness 与 source-gate status sync 的区别，正常读者可在这条短序列停止，
不必重新推导 CLI 实现或 trace。

最短合法闭环直接复用 `check.next`、`enter-phase`、既有 source-gate
`advance-status` 与已加载 phase Markdown；本 change 避免了把遗漏修成新的
writer、自动修复或 controller。用户不作新的决定；当前 Agent 读取 gate
output 后执行已获授权的机械命令，Engine 继续裁决 entry、status 和 gate
truth。
