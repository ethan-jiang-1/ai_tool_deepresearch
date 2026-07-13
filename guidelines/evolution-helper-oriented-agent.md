---
guideline_id: helper-oriented-agent
suite: deep-research-guidelines
title: "Evolution Direction: Helper-Oriented Agent"
status: effective
created: 2026-07-12
revised: 2026-07-13
role: charter-companion evolution direction for Agent/user action responsibility
scope: openspec/changes/, DPT_FRAMEWORK/COMMANDS.md, DPT_FRAMEWORK/workflows/, DPT_FRAMEWORK/command_playbook/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
  - guidelines/project-charter.md
siblings:
  - guidelines/project-charter.md
  - guidelines/evolution-simple-reliable-control.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/logging-conventions.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Evolution Direction: Helper-Oriented Agent

> 状态: 生效 | 创建: 2026-07-12 | 修订: 2026-07-13 | 用途: 引导 Agent 从机械工具逐步成为可靠协作者

## Purpose

本项目的 Agent 不只是报告错误或把命令转交给用户的工具。它能读取直接 runtime truth、理解用户目标、调用现有合法路径、完成机械工作，并把需要人判断的最小边界带回用户。

长期方向是：

```text
Agent inspects and acts within existing authority
  -> user decides only new semantics, risk, or permission
  -> Agent resumes the legal mechanical work
  -> Engine audits deterministic truth
```

这是一条 action-responsibility 演进方向，不是 persona、memory、planner、generic repair controller 或新的 lifecycle mode。具体 command、permission、state mutation、reentry、schema、trace 和 audit contract 仍必须通过 OpenSpec 与 executable contracts 定义。

## Standing And Precedence

本文件是 `project-charter.md` 之下的宪章伴随指导：

1. **对新 work 严格**：新的 Agent-facing design MUST 明确谁决定、谁执行、谁裁决，不能默认把普通机械工作推给用户。
2. **对历史实现渐进**：本文件不自动宣布 accepted specs 或当前 runtime 无效。旧 surface 在后续被触碰时局部收敛，不做无验证的 big-bang rewrite。

冲突处理顺序：

```text
AGENTS.md / openspec/config.yaml
  -> accepted specs + executable contracts + runtime truth
  -> project-charter.md 的 authority/layer boundary
  -> evolution-simple-reliable-control.md 的 system-shape discipline
  -> evolution-helper-oriented-agent.md 的 action-responsibility direction
  -> mechanism guideline 的领域说明
```

本文件不能用 prose 创造 permission、override、mutation path、reentry capability 或 Engine verdict。

## Core Direction

**User owns new semantic/risk decisions. Agent owns authorized mechanical execution. Engine owns deterministic judgment.**

当 recorded goal、current permission、accepted contract 与 direct facts 已经足以决定下一步时，Agent SHOULD 自己执行普通命令、可逆修复和同一 checkpoint 的重试。它不应只打印一串命令，让用户成为 pipeline co-runner。

当下一步涉及新语义、破坏性或不可逆选择、权限扩张，或 accepted contract 明确要求人类确认时，Agent MUST 把问题缩到最小 decision boundary。用户决定或完成不可代理动作后，后续合法机械步骤 MUST 回到 Agent。

## Definitions

- **Autonomous**：Agent 在 recorded goal、accepted contracts 和 Engine feedback 下继续执行，没有新的用户指令。
- **Human-directed**：用户明确给出新的语义决定、修正目标、授权或 maintenance/debug instruction。
- **In-run HITL**：accepted lifecycle 内承接 human-directed decision 的交互 checkpoint；当前为 HITL1/HITL2。
- **Out-of-band maintenance/debug**：用户在 lifecycle 外明确进入诊断、恢复或修正协作；它不是新的 lifecycle checkpoint，也不自动创建 mutation/reentry capability。
- **Mechanical action**：目标和合法路径已经确定、主要需要精确执行而非新增语义判断的命令、可逆文件修复、检查或重试。
- **Non-delegable human action**：host policy、外部账户、物理确认或 accepted contract 要求人本人完成的狭窄动作。

## Non-Negotiable Disciplines

### 1. Decision Source Is Not Permission

- `human-directed` MUST 只描述决定或授权来自谁，不得成为 persisted lifecycle mode、override token 或自授权限的 CLI flag。
- 一句用户请求 MUST NOT 自动扩大 host permission、覆盖 Engine verdict 或创造缺失的 mutation/reentry capability。
- 若未来需要 machine-authenticated human authority，OpenSpec MUST 先定义可信 host signal、threat model、audit 与 rollback boundary。

### 2. Agent Executes Legal Mechanical Work

- Existing legal path 已存在、permission 足够且决定已明确时，Agent MUST 执行剩余普通机械步骤。
- Repairable deterministic blocker 有 accepted reversible path 时，Agent MUST 说明直接 blocker、执行 repair，并 rerun same checkpoint。
- Agent MUST NOT 把普通 pipeline command、可逆修复或剩余执行链整体推给用户。

### 3. Escalate Only The Smallest Decision

- Agent MUST 只请求确实需要人的新语义、风险确认、权限选择或不可代理动作。
- Escalation MUST 说明直接前置条件、当前缺口和同意后的下一步，不输出互相竞争的多条恢复路线。
- 用户决定后，Agent MUST 立即恢复自己能够执行的合法步骤，而不是继续要求用户逐条操作。

### 4. Placement Does Not Create A New Lifecycle

- HITL1/HITL2 是 human-directed decision 的 in-run placements；非 HITL `stop:no` phases 仍保持 autonomous and silent。
- Out-of-band maintenance/debug MUST NOT 被描述为第三个 HITL、Final-owned repair loop 或新的 lifecycle state。
- Final 仍是 terminal non-interactive delivery；post-final reentry 是否存在由 accepted content-delivery/runtime contract 决定。

### 5. No Help Through Fabrication

- Helper posture MUST NOT 手写 gate authority、receipt、trace、provenance、status 或 evidence 来制造“已经合法”的外观。
- 没有合法 path 时，Agent MUST 报告 missing contract 或 failed boundary，而不是自建 Engine-invisible parallel namespace。
- Agent MAY inspect、explain and prepare a future change, but MUST NOT overclaim unavailable runtime capability。

### 6. Preserve Agent Intelligence

- Markdown/Agent Flow SHOULD 给 Agent direct facts、clear objective、smallest blocker 和一个最近动作，保留其理解、判断、修复与执行空间。Direct facts 包含 Engine 能从其静态 contract lineage 提供的信息：缺失事实属于哪个 schema、应写到哪个已授权 surface、修复后重跑哪个 checkpoint。Engine 保留这些静态知识即剥夺 Agent 在合法边界内执行机械修复的能力——这与 helper posture 矛盾。
- Engine MUST 保持 deterministic checkpoint，不扩成替 Agent 做语义判断的通用 controller。
- Helper-oriented design MUST 与 `evolution-simple-reliable-control.md` 一起审查，避免用更多状态、条件和 fallback 模拟协作能力。

## Gradual Convergence

历史 surface 不会一次性变成理想 helper。每次触碰 Agent-facing command、HITL、repair、recovery 或 maintenance guidance 时，SHOULD 至少完成一个局部收敛：

- 删除一处把 ordinary command 推给用户的 wording；
- 把一个宽泛求助缩成最小 decision boundary；
- 在用户决定后明确把执行责任还给 Agent；
- 用现有 legal path 替代手改 authority；
- 明确当前没有 capability，而不是暗示用户同意即可绕过；
- 删除一个重复 interaction mode、helper layer 或 context flag。

兼容历史行为时，design MUST 说明当前 accepted path、要停止继续扩张的旧姿态，以及可验证的局部改善。不得以 helper 为名引入第二套 command authority。

## Helper Direction Review

OpenSpec proposal/design/tasks 在进入 apply 前必须先回答：

1. 哪个决定确实需要用户，而不是 Agent 可以在现有授权内完成的机械工作？
2. 用户决定或完成不可代理动作后，哪些步骤应立即回到 Agent 执行？

回答还必须通过 Project Charter 的 authority/layer checks 和 Simple Reliable Control 的 simplicity admission test。答不清时，先缩小 escalation boundary，不要新增 mode、flag、controller 或条件树。

## Boundary

本文件拥有未来 Agent/user action-responsibility direction，但不拥有：

- 当前 permission、Engine verdict、schema、state transition、gate、receipt 或 trace truth；
- arbitrary override、state movement、post-final reentry 或 authorized repair implementation；
- persona、memory、长期关系建模或 generic helper subsystem；
- mechanism-specific workflow behavior；
- 用 Agent 判断替代 deterministic Engine authority。

Helper 不是越权。Helper 是在合法边界内多做执行，把真正需要人的决定缩小，并在边界不存在时诚实指出缺失 contract。
