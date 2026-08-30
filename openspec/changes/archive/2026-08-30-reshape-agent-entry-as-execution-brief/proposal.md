## Why

Always-loaded Agent 入口（根 / Harness `AGENTS.md` 与对应 README 预读）把「先读 Charter 再读 `CONTEXT.md`」写成每个实质性任务的第一步。完成条件是「对齐了」，不是「下一个文件已打开」。Agent 的过程因此不稳定：研究支被宪法预读挡住，改行为支和已有 CLI `next` 也付同一笔封面税。入口选择规则本身没有坏；坏的是封面没有动作核。来源：本会话对 Agent 过程的收敛，以及用户确认的 Execution Brief 稿。

## What Changes

- 根 `AGENTS.md`（`CLAUDE.md` 为其 symlink）以 `## 0. Execution Brief` 起笔：三行分支，各有打开哪个文件、完成条件、此刻不要做什么。退役 `## Before Anything Else`。
- Charter → `CONTEXT.md` 只在「下一步取决于所有权 / 架构词汇」时必读（改行为 / 新契约 / 动框架，或术语打架要查 glossary 行）。跑研究、执行已有 phase / `tasks.md` / CLI `next` 时，不再先读两本书。
- `## Deep Research Routing` 留下入口防错句（pair、`unsupported_current_entry_contract`、禁止 fallback、扫描不选 run、entry 前不搜）。完整决策树仍只在 `command_playbook/continue-run-bundle.md` 的 Entry Selection (canonical)。
- Harness `AGENTS.md` 同样以 Execution Brief 起笔；`## 共享项目上下文` 改为声明 Charter / `CONTEXT.md` 不是 research entry，跑研究不必先读。改本目录行为走根 Brief 的「改行为」行。
- 根 `README.md` 与 `DEEP_RESEARCH_HARNESS/README.md` 的强制 Charter-then-context 预读与 ACR 新过程对齐；不改入口选择、不改 Harness 触发语义。
- 锁旧顺序的回归改锁新过程：`tests/integration/md/agent-context-routing-contract.test.mjs`，以及 GCO-008 的 `tests/integration/md/project-guidance-topology-contract.test.mjs`（根同步块从 `## Before Anything Else` 改到 `## 0. Execution Brief`）。既有入口选择回归保持绿，不改决策树。
- Harness 退役 `## ⚡ 第一优先`；`## 共享项目上下文` 仍写出 Charter 与 `CONTEXT.md` 坐标（Charter 在前），并写明它们不是 research pre-read。
- **不改** Engine / Gate / phase 正文 / `CONTEXT.md` 术语表 / `RUN.md` 恢复决策表。不新增 capability、不新增 requirement ID、不新增路由概念。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent/agent-context-routing`: ACR-002 / ACR-004 从「凡实质性任务 Charter-then-context」改为「Execution Brief 点名下一文件；Charter-then-context 仅在所有权词汇是下一步时必读」。ACR-001 / ACR-003 不动。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md` | Modify | ACR-002/004 正是 always-loaded 预读与六处入口回归的 owner。 |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md`（Purpose 与 ACS-001 入口/命令责任） | Excluded | 命令观众、HITL、legal repair、入口选择 canonical 面都不改。 |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md` 与 `command_playbook/continue-run-bundle.md` Entry Selection (canonical) | Excluded | 选 run 的两条分支与 `unsupported_current_entry_contract` 仍只在该节。 |
| `governance/guidance-constitution` | `openspec/specs/governance/guidance-constitution/spec.md` GCO-001 与 GCO-008 | Verify-only | `invariants-brief` 仍从 Execution Brief 首屏指向。GCO-008 只要求「同步块」存在且成对一致，不点名 `Before Anything Else`；apply 改拓扑测试的定位，不改 GCO 正文。 |
| `workflow/workflow-node-contract` | `openspec/specs/workflow/workflow-node-contract/spec.md` Execution Brief 要求 | Excluded | Phase 的 `## 0. Execution Brief` 契约不动；入口只复用同一体裁。 |

## Semantic Precision

读者是拿到本轮用户话的 Coding Agent。有界问题：**下一个打开的文件是哪一个，打开了是否算这步完成。** 必须保留的区别：研究/续跑、改行为、已有 named next。正常推理停止点是 Brief 点名的那一份文件已在上下文（或那一个 `next` 已执行）。不新增「任务分类器」概念或第四张路由表。

## Control And Responsibility

direct Source of Record：选 run 仍是 `continue-run-bundle.md` Entry Selection (canonical)；所有权边界仍是 Charter；术语仍是根 `CONTEXT.md`；确定性裁决仍是 Engine。最短闭环：用户话 → Brief 一行 → 打开一个 owner。net simplification：删掉「凡 substantive 必读两本书」和 `## Before Anything Else`，不增加 check / state / recovery。User 仍只在 HITL1/HITL2 做语义决定；Agent 执行 Brief 点名的机械下一步；Engine 不解释 Brief。

## Impact

- 根 / Harness `AGENTS.md`（symlink `CLAUDE.md` 不另写）
- 根 `README.md`、`DEEP_RESEARCH_HARNESS/README.md` 的预读段
- `openspec/specs/agent/agent-context-routing/spec.md` 与 `req-registry.yaml` 中 ACR-002/004 描述
- `tests/integration/md/agent-context-routing-contract.test.mjs`
- `tests/integration/md/project-guidance-topology-contract.test.mjs`
- 无 CLI / schema / gate / runtime bundle 行为变化
