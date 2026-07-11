## Why

`dpt_rb_ai-era-bpm-process-disruption` 暴露的不是一个 post-final reentry 小缺口，而是一条完整的系统性失败链：框架把 autonomous Agent 与明确在场的人类指令按同一套刚性规则处理，Agent 没有合法的 helper 路径去执行用户已授权的修正；工作被迫绕出 gate 后，用户意图、topic 身份、进度、trace 与 canonical artifacts 又没有在开工前物化；一旦中断，恢复只能依赖 chat 记忆和跨多个 surface 的人工归一化。

这条链同时贯穿 `_backlog/plans/human-override-and-state-mutability.md`、`_backlog/plans/breakpoint-recovery-persistence-model.md` 与 `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md`。如果继续按单点 bug 增加 reentry condition、override flag、addendum namespace、progress state 或新 validator，系统会更难理解。现在需要先建立一个能罩住三份来源的统一演进契约，再按依赖逐步落地，而不是继续补丁式扩张。

## Problem Model

当前根因链可以压缩成五步：

```text
human-directed correction is treated as autonomous mutation
  -> no sanctioned helper path
  -> Agent either blocks or creates out-of-gate work
  -> intent/progress/artifacts miss canonical materialization
  -> crash recovery depends on chat memory and manual cross-surface repair
```

因此必须同时坚持四个结果义务：

1. **两种 authority context 必须分清**：Agent 自驱的 `autonomous` 与人明确下达指令的 `human-directed` 不是同一个语义；human-directed 可以发生在既有 HITL，也可以发生在 out-of-band maintenance/debug。
2. **Agent 应是 helper**：已有用户意图、权限和合法路径足够时，Agent 自己完成可逆机械工作，不把命令重新交给用户。
3. **materialize before work**：重要用户输入、canonical identity 和可恢复进度必须先于内容工作落盘。
4. **canonical or blocked**：没有 sanctioned canonical footprint 时不得自建平行命名空间；要么走现有合法路径，要么明确阻塞并通过后续 OpenSpec change 建立路径。

## What Changes

本 change 是覆盖上述系统问题的**基础演进契约**。它本轮会落下指导层、Agent-facing contract 和既有静态验证；它不会假称两个 plan 与 BUG-079 的全部 runtime 能力已经实现，但会把它们从“背景材料”提升为后续 change 必须满足的设计义务和依赖顺序。

- 提升并重构 `guidelines/simple-reliable-control.md`，使其成为 Charter 之后的 repo-wide 渐进演进评审入口，统一承载 net simplification、helper-oriented Agent posture、两种交互上下文、`materialize-before-work` 与 canonicality 方向。
- 将现有重复的 complexity budget、burden of proof、New Work 与 design-review checklist 收束为一个三问 `Change Admission Test`；详细的 fail-closed、state ownership、testability 和真实性纪律继续保留，不用三个问题替代安全底线。
- 最小更新 `guidelines/project-charter.md` 与 `guidelines/README.md` 的既有 precedence、decision route 与 reading order，确认该 guideline 的演进评审地位；Charter 只保留 authority/layer-specific checklist，把重叠的 complexity/convergence 问题指向统一 `Change Admission Test`，但不提升 guideline 为 spec/runtime authority。
- 修改 ACS-001，使 `Agent-facing` 明确包含 Agent 执行普通已授权命令与可逆机械修复，并区分 autonomous execution、既有 HITL 内的 human-directed decision 与 out-of-band maintenance/debug collaboration。
- 修改 ACS-003，使现有 command-surface static regression 覆盖新增的 Agent-owned mechanical execution 和上下文区分 markers；复用现有测试，不创建新的 validator 或 phrase-class subsystem。
- 最小对齐 `DPT_FRAMEWORK/COMMANDS.md` 的现有 audience contract，不新增命令、状态、checkpoint 或 runtime mutation path。
- 明确后续落地顺序：先建立 canonical/integrity 可见性与 crash-safe persistence，再物化 intent/progress，最后在安全网和 canonical truth 已存在后设计 audited authorized repair/state movement。

## Source Coverage

| Source | 本 change 接住的系统义务 | 本轮 apply | 后续独立行为 change |
|---|---|---|---|
| `_backlog/plans/human-override-and-state-mutability.md` | 区分 autonomous 与 human-directed authority context；human-directed 可位于 HITL 或 out-of-band debug；人做决定、Agent 执行、Engine 审计；topic identity 有单一真相源，rename/renumber/repair 不再跨 N 个 surface 手工同步 | 写入演进指导与 Agent-facing 边界；不伪造“human 已被机器认证” | 选择可审计 authorization signal、允许的 mutation 范围、single-source topic identity、atomic rename/renumber、state-seed/reentry contract 与一致性复核 |
| `_backlog/plans/breakpoint-recovery-persistence-model.md` | P1 数据过手即存、P2 状态即意图要存、P3 重要用户输入当刻物化；统一遵循 `materialize-before-work` | 将三条义务固定为后续设计准入条件 | crash-safe write/sweep；canonical topic progress；input materialization |
| `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md` | 不允许 Engine-invisible parallel namespace；新增 scope 必须有 canonical identity、progress、trace 和 audit visibility；diagnostic advice 不得指向已知不可达的循环路径 | 固定 `canonical or blocked` 与 nearest-legal-action 原则，并禁止文档暗示 ad-hoc addendum 是合法路径 | 优先恢复 gated rerun；若确需 addendum，必须另证其一等 canonical contract；扩展既有 integrity audit；修正 impossible gate advice |
| `_backlog/todos/todo-helper-not-tool.md` | Agent 从只报错/给命令逐步转向协作执行者 | 仅吸收 posture 与 escalation boundary | 不实现 persona、memory 或 generic helper subsystem |

## Capabilities

### New Capabilities

无。本 change 不用新 capability 包装新的治理层或 helper 子系统。

### Modified Capabilities

- `agent-command-surface`: 修改 ACS-001 与 ACS-003，完整化 Agent-facing execution responsibility、autonomous/human-directed authority distinction、HITL/out-of-band placement distinction，并让现有 static regression 与新增 audience markers 保持一致。

## Impact

- 指导层：`guidelines/simple-reliable-control.md`、`guidelines/project-charter.md`、`guidelines/README.md`。
- Accepted behavior：修改现有 ACS-001、ACS-003，不分配新 requirement ID。
- Agent-facing docs：最小更新 `DPT_FRAMEWORK/COMMANDS.md`。
- Regression：只扩展现有 `tests/engine/command-contract-docs.test.mjs` 的 positive markers，不新增测试框架或 validator。
- Runtime、schema、state machine、gate、trace event、receipt 与 bundle data：本轮无行为变化；两个 plan 与 BUG-079 不会因本 change 归档而被标记为 runtime-fixed。
- Dependencies：无新增依赖。
- Framework version：不修改 `DPT_FRAMEWORK/` runtime behavior，不需要 version bump。
