---
bug_id: BUG-104
title: "resolved: default enter-phase output is bounded; full closure requires --full"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
affected: explicit `--full` phase entries only; the default path is bounded
status: resolved
updated: 2026-08-08
---

# BUG-104: 默认 enter-phase 全量 shared context 渲染（已解决）

## 研究结论 (2026-08-08)

**结论：原卡片所述的 current-head default 行为已不成立，BUG 可关闭。**
`DPT_LOADED_FILE_START ... <full markdown> ... DPT_LOADED_FILE_END` 的拼接位于
`invocation.values.full` 的真分支；无 `--full` 时 `fullClosure` 为 `null`，stdout 只输出
bounded presentation（continuation、source-gate status-sync command、target 的
`## 0. Execution Brief` 和 target-excluding dependency ref manifest）。见
`DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs:181-197` 及
`DEEP_RESEARCH_HARNESS/engine/helpers/phase-entry-presentation.mjs:46-68`。

这不是 session-level loaded-file cache 修复：每个 CLI invocation 仍新建一个 process-local
workflow runtime，并由 `assessNode()` 解析、读取和加载完整 dependency closure，以完成既有的
load/witness 责任；它不等于把该 Markdown 全文写入 Agent conversation。见
`DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs:145-154`、
`DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs:208-216` 和
`DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs:619-667`。

### 根因与已落地的修复

原卡片把第 193 行当成无条件输出，漏掉了其外层的 `invocation.values.full ? ... : null`
条件。该默认输出曾是完整 closure；归档 change
`openspec/changes/archive/2026-07-30-make-agent-operation-contracts-direct/proposal.md:59-64,79-81`
将其明确改为 breaking change，且其完成任务要求 default bounded presentation、完整 closure
仅保留在显式 `--full`（`openspec/changes/archive/2026-07-30-make-agent-operation-contracts-direct/tasks.md:27-32`）。当前已接受的
`openspec/specs/engine/cli-phase-transition/spec.md:127-140,240-256` 将该行为固定为契约：
default 不得拼接完整 dependency closure，`--full` 才额外返回它。

### 受影响的契约边界

1. **Engine loader 与 Agent-facing presentation**：Engine 仍必须加载 closure 以建立
   `load_complete`/`current_node`；默认 stdout 只投影下一步所需的 bounded 信息，不能把内部 load
   误读为 Agent context 注入。
2. **默认调用与显式 reference view**：`--full` 是保留的、明确 opt-in 的完整 reference view，
   不是默认 phase handoff。`DEEP_RESEARCH_HARNESS/RUN.md:117` 也规定仅在需要完整 reference
   closure 时使用它；标准 handoff 指引不附带该 flag（`DEEP_RESEARCH_HARNESS/command_playbook/start-research.md:64-75`）。
3. **Agent context 与 deterministic authority**：default bounded view 不建立 session memory、
   loaded-file authority 或新的 transition writer；它只是已经 witnessed handoff 的呈现。该边界由
   `openspec/specs/workflow/workflow-node-contract/spec.md:323-329` 固化。

### 验证

- 已运行：`node --test tests/engine/helpers/phase-entry-presentation.test.mjs tests/integration/cli/enter-phase.test.mjs`
  （16/16 通过）。
- `tests/integration/cli/enter-phase.test.mjs:84-122` 直接断言默认调用不含
  `DPT_LOADED_FILE_START`，而带 `--full` 的调用包含它；
  `tests/engine/helpers/phase-entry-presentation.test.mjs:54-72` 断言 bounded presentation
  不渲染 full-closure marker。
- 这是 deterministic CLI/presentation evidence，不声称已经观测到 real Agent 的 token 使用、
  停顿或上下文窗口行为。

### 建议处置

不应在本卡基础上新增 session cache、node-id 去重或“一次性常驻上下文”机制：它们会改变
Agent context boundary，而现有 default contract 已解决所报告的输出污染。将本卡标记为
**resolved**。若未来有具体运行证据表明某个 caller/playbook 误将 `--full` 用作正常 handoff，
先定位该 caller 并改回默认调用；只有确实要改变 `--full` 的公开语义或引入跨调用 context
记忆时，才应先提出新的 OpenSpec change。

## 历史记录（不再是 current-head 事实）

- **因果关系未证实**：早期认为这是 BUG-099 的贡献因素，但无 current-head real-Agent
  evidence 证明"渲染量 → Agent 停顿"。该因果主张已撤下。
- **曾考虑的三个修复方向**：
  - session 级 shared-context 去重 → 会把 Agent 已读/仍保留的对话状态伪装成 DPT
    authority；
  - 只输出引用标记 → 会让 fresh Phase Agent 在首个动作前缺少当前控制面；
  - 把 shared context 变成一次性常驻上下文 → 会建立当前系统没有的 session-memory
    contract。
  当前的 bounded-default + explicit-`--full` 方案已经避免前两种风险所针对的默认输出问题，
  无需把这些替代方案作为待修方向。
