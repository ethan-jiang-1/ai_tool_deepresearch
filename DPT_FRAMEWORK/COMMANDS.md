# COMMANDS

Deep Research Framework 命令索引。

> **最快触发**：把 `RUN.md` 拖进对话即触发框架（前门入口）。

## Audience And Interaction Contract

这些命令是 Agent-facing operating surfaces：由 Phase Agent 或其他 Agent actor 在当前 run 的上下文中调用，不是要求人类/operator 在 autonomous pipeline 中途共同运行命令。

HITL1 和 HITL2 是唯一的 interactive in-run checkpoints。一次性 pre-pipeline trigger/entry selection 只负责选择 DPT_FRAMEWORK 入口并把控制权交给 Agent；进入 lifecycle 后，非终端 `stop: no` phase 自主静默运行。Final 是 terminal non-interactive delivery：它可以在 `final/` artifacts 已存在后交付最终报告，但不是第三个交互 checkpoint、progress report、confirmation loop 或 Final-owned repair loop。Post-final feedback 若被 content-delivery contract 支持，必须通过 HITL2 repair/rerun 重新进入，而不是在 Final 内隐藏循环。

## Phase Boundary Terms

Short operating note only; deeper terminology canon lives in `guidelines/agentic-execution-model.md` and accepted OpenSpec specs.

- `phase transition`: runtime status synchronization, such as `rb_status.json` current/next gate updates and `phase_transition` trace.
- `phase handoff`: Phase Agent consumes gate CLI `check.next` through `enter-phase` or another accepted loader/check path and receives the next Markdown control surface.
- `work completion`: target phase artifacts plus that phase's own gate/content rules prove the target work is done.
- `witnessing`: Engine-written evidence binding the gate route to later entry, such as `gate_attempt(passed=true,next=...)` plus route-bound `load_complete`.
- `current_node`: when non-null, the durable `rb_status.json` coordinate for the lifecycle Markdown control surface most recently loaded by successful route-bound `enter-phase`.

`enter-phase` / `load_complete` prove target-node entry/loading, not target-phase work completion. `advance-status` synchronizes the just-passed source gate; it does not enter, load, or execute the next phase. `current_node` is a resume coordinate, not gate pass evidence.

## CLI Exit-Code Convention

Exit codes are a canonical interpretation and target convention for Agent callers, not proof that every current CLI shares one runtime helper. Use them for coarse shell/runner branching; always read stdout JSON or documented structured output before deciding the next action.

| Code | Canonical meaning |
| --- | --- |
| `0` | command succeeded, or gate passed |
| `1` | normal repairable failure, validation failure, gate rule failure, or business error |
| `2` | configuration, routing contract, or invocation/caller error |

Current inventory:

- Gate CLIs use the shared gate result helper and emit structured stdout `{ check, routing, inspect, advice }`; `routing.kind` of `invalid_input` or `config_error` exits `2`, gate failure exits `1`, pass exits `0`.
- Inspect-wave CLIs are non-gate structured-output commands; stdout `{ check, inspect, advice }` is the Agent decision surface, with `2` reserved for caller invocation errors such as missing bundle input.
- `check-reentry.mjs` is a non-gate structured-output command: `0` clean, `1` blockers/drift, `2` invalid target/args/config/caller request.
- Many current utility validators are binary `0/1` and do not yet share a common exit helper.
- `log-event.mjs` is an always-`0` diagnostic/logging exception; logging failure must not be treated as proof that a load-bearing trace event was written.
- Known doc/code drift: `validate-workflow-package.mjs` header documents code `2` for invocation errors, but current code only exits `0` or `1`; record this as future reconciliation, not current behavior.

Exit codes SHALL NOT encode morale, reassurance, retry strategy, progress pressure, fatigue, or autonomous-continuation reminders. Those signals belong in `advice[]`, structured diagnostics, or Agent-readable Markdown. Exit code alone must never be treated as the full contract.

## 实例化与开始 Research
| 命令 | 文件 | 说明 |
|------|------|------|
| run（drag-trigger） | RUN.md | 把本文件拖进对话即触发框架的前门入口 |
| instantiate-run-bundle | command_playbook/instantiate-run-bundle.md | 生产新的 Runtime Bundle |
| start-research | command_playbook/start-research.md | 从零开始一次完整的 Deep Research（创建 bundle → 写问题 → 加载第一个 phase） |

Existing active bundle reload uses `<bundle>/BUNDLE_MAP.md` plus `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`. Prefer non-null `rb_status.json.current_node` as the lifecycle Markdown coordinate; if it is missing, use reentry diagnostics rather than `current_gate` guessing. Legacy `START_FROM_HERE.md` is deprecated fallback only for old bundles.

## Subagent 环境
| 命令 | 文件 | 说明 |
|------|------|------|
| setup-real-subagents | command_playbook/setup-real-subagents.md | 设置 Codex/Claude Code 项目级 real subagent 定义 |
| operate-work-unit.mjs | cli/operate-work-unit.mjs | delegated work-unit 生命周期（`claim`/`submit`/`fail`/`timeout`/`abandon`/`open-batch`/`inspect`），生产 delegated completion 的唯一 CLI |
| provenance-forensics-guide | command_playbook/provenance-forensics-guide.md | 事后判定 delegated 证据 provenance 真伪；submitted work-unit ledger 是 gate authority |

## 质量检查
| 工具 | 文件 | 说明 |
|------|------|------|
| validate-bundle.mjs | cli/validate-bundle.mjs | Zod 校验 bundle 控制文件 |
| validate-phase-templates.mjs | cli/validate-phase-templates.mjs | 校验 phase MD 模板保持 controller + delegates 合约 |
| validate-work-unit-hygiene.mjs | cli/validate-work-unit-hygiene.mjs | 静态阻止旧 delegated relay/slot authority、旧 gate check 名、queue demand `work_id`、以及 filesystem/index pass-coverage wording 回到 active production surface |
| inspect-bundle.mjs | cli/inspect-bundle.mjs | bundle 目录结构完整性 |

## Phase Handoff
| 工具 | 文件 | 说明 |
|------|------|------|
| enter-phase.mjs | cli/enter-phase.mjs | 消费 gate CLI 返回的 `check.next`，调用 workflow loader 渲染下一 node Markdown，并写入 route-bound `load_complete` handoff witness 和 `rb_status.json.current_node`；不证明 target phase work completion |
| advance-status.mjs | cli/advance-status.mjs | 在 `enter-phase` witness 存在后同步 just-passed source gate；covered handoff 使用真实 `gate_attempt.next`，不是默认 `passed` target |
