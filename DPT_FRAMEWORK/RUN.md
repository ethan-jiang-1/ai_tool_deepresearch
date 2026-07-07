# RUN.md — DPT_FRAMEWORK 入口

> **DPT_FRAMEWORK v0.4**

>**这个文件在对话中即触发**
> 你读到这段，说明 DPT_FRAMEWORK 已经被选为本次研究的 entry path。
> 这个文件就是"前门"：它的内容会直接进当前 agent 的上下文（Claude Code / Codex / Cursor / Windsurf 等任意 coding agent 通用），把后续命令执行交给 Agent。

## 0. 禁用内置捷径（最高优先）

如果你在当前 agent 的工具列表中看到 `deep-research` skill 或等价的 research shortcut：**不要调用它**。本文件（DPT_FRAMEWORK）已接管 Deep Research 的全部职责——读到本文件即已选定 DPT_FRAMEWORK 入口，内置捷径与本入口互斥。直接执行下方 Section 2 的 DPT_FRAMEWORK 流程。

## 1. Entry Selection Is Already Done

当前 agent 可能有内置的"快速研究/搜索"捷径（Claude Code：`deep-research` skill；Codex / Cursor / Windsurf 等：各自的内置搜索/research）——它们通用、一次性、无 gate、无证据包。`DPT_FRAMEWORK` 是本项目的 Deep Research 引擎：证据可追溯、多轮、gate 门控、产出可校验的 bundle。

读到本文件时不要再问用户是否改用内置捷径或是否使用 DPT_FRAMEWORK。一次性 trigger 已选择本入口；继续执行 Section 2 的 Agent-run framework flow。若 bundle 尚未创建，唯一允许的前置澄清是 pre-pipeline routing exception，必须发生在 autonomous lifecycle 开始前，且不得削弱 HITL1/HITL2-only interactive in-run boundary。

## 2. 开跑（框架）
完整步骤见 `command_playbook/start-research.md`，一句话版：

1. 定名（Agent 从 research request 派生 kebab-case，或使用 entry 前已提供的名称）
2. 建 bundle：`B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>)`
3. 把研究问题写进 `$B/rb_plan.md`
4. 加载 `workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行，之后靠 gate 的 `check.next` 自驱动到 `phase-final`

从 setup onward，gate pass 后不要直接手读下一 phase：先运行 `enter-phase --bundle <path> --node <check.next>` 写入 route-bound handoff witness，再按 phase §6 用 source-gate `advance-status --to <source_gate_enum>` 同步状态。`enter-phase` / `load_complete` 只证明进入 target Markdown control surface，不证明 target phase work completion。

Interactive in-run checkpoints 只有 `hitl1`（定方向 / profile / topics）和 `hitl2`（审 synthesis）。Final 是 terminal non-interactive delivery，不是第三个交互 checkpoint；post-final feedback 通过 HITL2 repair/rerun 重新进入。其余 phase 均 `stop: no`，Agent 自行推进。

Delegated sub-agent work uses the v0.4 work-unit path only: queue demand item -> `operate-work-unit claim` -> sub-agent task under `_work_units/` -> `operate-work-unit submit` -> submitted ledger row -> gate. Do not use queue completion as delegated success; `operate-queue complete` is for non-delegated queue work.

若已有 active bundle：别重建，打开该 bundle 的 `START_FROM_HERE.md`，读 `rb_status.json` 的 `current_gate` 续跑。

## 3. 规则与边界在哪
- 触发规则、运行时边界：`README.md`
- 命令索引：`COMMANDS.md`
- 行为规则：`CLAUDE.md`（Claude Code）/ `AGENTS.md`（Codex、Cursor、Windsurf 等读 `AGENTS.md` 的 agent）

跑某 bundle 时，以该 bundle 的 `START_FROM_HERE.md` + `rb_status.json` + `rb_trace.jsonl` 为准，别靠 chat memory。
