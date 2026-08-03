---
bug_id: BUG-193
title: "Wave1 sub-agent wait same no-progress-visibility pattern as wave0 — active-poll contract vs blocking host wait confirmed across phases"
severity: P3
discovered: 2026-08-03
bundle: dpt_rb_agentic-rd-org-delivery-systems-2026
phase: wave1
node: phases/phase-wave1.md
related: BUG-188 (wave0 sibling — same root cause)
---

# BUG-193: Wave1 sub-agent wait — confirmed same pattern as BUG-188

## 现象

和 BUG-188 完全一样的 pattern，但在 wave1：

- 主 Agent spawn 5 个 `dpt-evidence-extractor` sub-agent
- TUI 显示 "✻ Waiting for 5 background agents to finish"
- Sub-agent 列表可见（每个都在消耗 token），但 wait 指示器静态无动画
- 用户合理怀疑是否 freeze

## 这是否是新问题

**不是。** 和 BUG-188 完全相同的根因，出现在不同 phase。wave1 使用同样的
合约和同样的 host 原语：

- `stop: no`（phase-wave1.md:6）—— wave0 和 wave1 的 stop contract 相同
- `Actively poll result/receipt/output/cache readiness without waiting for
  user continuation or task notification`（phase-wave1.md:159）—— 和
  phase-wave0.md:155 完全一样的文本
- `requires: shared/shared-subagent-protocol`（phase-wave1.md:16）—— 和
  wave0 用同一个 sub-agent protocol，没有 phase-specific 差异
- `shared-silent-execution.md` "Active poll-submit-repair-terminalize loop"
  适用于所有 delegated `stop: no` phase

唯一的差异是 sub-agent role：wave0 用 `dpt-source-intake`，wave1 用
`dpt-evidence-extractor`——角色不同但工作流程相同（claim → spawn → wait →
poll → dry-submit → submit → gate）。

## 代码核查：引擎逻辑 vs host 原语

同 BUG-188 的代码核查结论（`work-unit-inspect.mjs` → `work-unit-core.mjs` →
`work-unit-timeout-preflight.mjs` → submit chain）：

- **Engine 逻辑无缺陷**：inspect 是纯轮询工具，timeout-preflight 是 progress-aware
  （读 runtime-receipt 延长 idle lease），submit 有 read-repair-rerun 循环
- **框架文档 vs host 原语契约不匹配**：文档要求 "actively poll"，但 host 只提供
  阻塞式 `agent_wait`
- **TUI 渲染**：静态 "Waiting"，无动画——纯交互问题（次要）

## 为什么单独开一个 card

虽然根因一致，但 wave1 独立开 card 有两个价值：

1. **确认 pattern 跨 phase 可复现**：wave0 和 wave1 都有同样的无进度可见性问题，
   不是孤立事件
2. **为 BUG-188 的修复验证提供第二个 phase 的测试目标**：未来修 BUG-188 时，
   需要同时验证 wave1 sub-agent wait 也有进度反馈

## 建议修复方向

和 BUG-188 完全一致——在 agent 进入阻塞 wait 之前输出一次
`operate-work-unit inspect` 快照。修改共享的 `shared-subagent-protocol.md`
或 `shared-silent-execution.md` 即可同时覆盖 wave0 和 wave1。

## 后续观察（2026-08-03）— 自我恢复确认 + 1:1 duplicate

与 BUG-188 确认为 1:1 duplicate：同样的 root cause（active-poll 契约 vs
阻塞 host wait），同样的 host 唤醒机制。用户实测：主 Agent 在第一个
sub-agent 返回后自动恢复执行，没有死锁。本 card 保留为 BUG-188 的
wave1 复现证据，修复时按 BUG-188 统一处理。
