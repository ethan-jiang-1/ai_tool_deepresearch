## Why

BUG-020 暴露了 phase handoff 的状态层漏洞：Agent 在 wave0 gate 经过多次修复后通过，执行 `advance-status --to wave1_complete` 写出干净状态，却没有真正消费 `check.next` 进入 wave1，随后直接在 chat 中交付提前报告并询问用户是否继续。

本 change 的原始需求来自：
- `_backlog/bugs/BUG-020-phase-agent-self-halts-delivers-premature-report.md`
- `_backlog/bugs/BUG-020-deep-analysis-and-governance.md`

深度分析的结论是：这不是“stop:no 文案不够强”，而是出站 handoff 没有 deterministic witness。`assessNode()` 注入的 AUTONOMOUS-MODE header 和 `load_complete` 事件没有真实 runtime 调用者；`advance-status` 又可在下一 phase 被见证前写出“已 transition”的状态。需要把 `check.next` 的消费从散文要求提升为 trace 可见、gate/CLI 可检查的 checkpoint。

## What Changes

- 新增 `enter-phase` Agent-facing CLI：Agent 将 gate CLI 返回的 `check.next` 作为 `--node` 传入；CLI 调用现有 `assessNode()`，写入 `load_complete` trace，并渲染加载后的 Agent-readable Markdown。
- 强化 `advance-status`：写入 `rb_status.json` 前必须能在 `rb_trace.jsonl` 中看到对应 gate 的真实 `gate_attempt(passed=true)`；对明显未见证 handoff 给出 `enter-phase` 补救 advice。
- 给 lifecycle gate 增加 handoff preflight：当前 node 的 gate 在评估自身 rules 之前，先检查前一 deterministic gate pass 与当前 node 的 `load_complete` witness。
- 增加 wiring validator / regression test，确保所有适用 gate CLI 真正调用 shared handoff preflight，避免新机制变成未接线死代码。
- 增强 gate 诊断：基于 Engine 可见 trace/diagnostics 计算 attempt count、cross-attempt delta、pass-side fatigue advice；Wave0 级联失败以 diagnostic mask 呈现，减少“越修越乱”的疲劳感。
- 更新 phase node §6 控制面：gate pass 后先通过 `enter-phase` 消费 `check.next`，不要把 `advance-status` 表述成进入下一 phase 的动作。
- 更新 silent execution 契约：加入 “Why Continue”/terminal delivery visibility，明确最终报告会在 `phase-final` 交付，提前 chat synthesis 是不合法且更不有用的行为。
- 明确拒绝以下方案作为核心修复：
  - prose-only fix；
  - 拦截 chat channel 的 runtime wrapper；
  - 用全新 `dangling_transition` / `handoff_pending` 机制替代现有 trace precedent；
  - 声称同一轮 chat halt 可被完全预防。
- **Version bump**：需要。目标版本 `v0.4`。Apply 阶段需更新 `DPT_FRAMEWORK/CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。本 change 不引入新的 capability 分类；它强化现有 phase transition、gate skeleton、workflow node、silent execution、agent testing 能力。

### Modified Capabilities

- `cli-phase-transition`: 增加 `enter-phase`，并给 `advance-status` 增加 trace-backed handoff/pass precondition。
- `gate-skeleton`: 增加 lifecycle gate handoff preflight、wiring enforcement、engine-derived attempt/delta diagnostics 和 pass-side fatigue advice。
- `workflow-node-contract`: phase §6 handoff wiring 改为通过 `enter-phase` 消费 `check.next`。
- `silent-wave-execution`: 增加 positive continuation / terminal delivery visibility，防止把提前 synthesis 误当作更有帮助。
- `agent-testing`: 增加 handoff witnessing 的标准 E2E 覆盖和可选 heavy canary。

## Impact

- Affected framework surfaces:
  - `DPT_FRAMEWORK/cli/`
  - `DPT_FRAMEWORK/cli/gates/`
  - `DPT_FRAMEWORK/engine/helpers/`
  - `DPT_FRAMEWORK/workflows/nodes/phases/`
  - `DPT_FRAMEWORK/workflows/nodes/shared/`
  - `DPT_FRAMEWORK/schema/gate_definitions/`
- Affected tests and experiments:
  - `tests/`
  - `experiments_playbook/`
- No new npm dependencies.
- Engine remains passive: it checks trace/state and refuses invalid certification; it does not select routes, execute research work, or intercept user-facing chat.
- Accepted success claim: silent, launderable mid-pipeline truncation becomes loud, diagnosable state failure with a concrete `enter-phase` remedy. 同一轮 chat halt 仍是 Layer-1 residual，只能在恢复或下一次 Engine touch 时暴露。
