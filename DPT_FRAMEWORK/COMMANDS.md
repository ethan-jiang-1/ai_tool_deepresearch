# COMMANDS

Deep Research Framework 命令索引。

> **最快触发**：把 `RUN.md` 拖进对话即触发框架（前门入口）。

## Audience And Interaction Contract

这些命令是 Agent-facing operating surfaces：由 Phase Agent 或其他 Agent actor 在当前 run 的上下文中调用，不是要求人类/operator 在 autonomous pipeline 中途共同运行命令。

Ordinary authorized command execution and reversible mechanical repair are Agent-owned。Recorded goal、current host permission、accepted contract 和 legal command path 已经决定下一步时，Agent 直接执行；repairable blocker 有现有合法路径时，Agent 说明最小 blocker、完成 repair，并 rerun 同一 checkpoint。没有合法路径时，Agent 报告 missing contract，不手写 authority 或创建 Engine-invisible parallel path。

Human-directed identifies the decision source；它不转移 ordinary command-runner role，也不凭一句用户请求创造 host permission、覆盖 Engine verdict 或补出缺失的 Engine capability。用户作出 contract-required decision 后，剩余合法机械步骤回到 Agent；host policy 若要求一个不可代理动作，只把那一个动作交给用户。

Autonomous execution、HITL1/HITL2 内的 human-directed decision、out-of-band maintenance/debug collaboration，以及 accepted mutation/reentry capability 是四个不同概念。Out-of-band collaboration 不是第三个 lifecycle checkpoint、Final-owned repair loop 或任意 state movement authority。

HITL1 和 HITL2 是唯一的 interactive in-run checkpoints。一次性 pre-pipeline trigger/entry selection 只负责选择 DPT_FRAMEWORK 入口并把控制权交给 Agent；进入 lifecycle 后，非终端 `stop: no` phase 自主静默运行。Final 是 terminal non-interactive delivery：它可以在 `final/` artifacts 已存在后交付最终报告，但不是第三个交互 checkpoint、progress report、confirmation loop 或 Final-owned repair loop。明确的 post-final rerun 只通过 `post_final_rerun` recovery operation记录既有 HITL2 `rerun` semantics并进入现有 rerun node；request metadata不是verified identity、permission token、`--human-directed`、`--override` 或 `--force`。用户决定scope/risk后，request preparation、apply/recover、entry、status sync、audit与rerun pipeline全部回到Agent执行。

Post-final feedback 不自动创造能力：supported rerun走上述audited operation；unsupported repair/state-seed仍报告missing capability，不在Final内循环或手写authority。
这条窄路径仍复用既有 HITL2 repair/rerun semantics，但不会重新加载HITL2来重复询问同一决定。

## Phase Boundary Terms

Short operating note only; deeper terminology canon lives in `guidelines/agentic-execution-model.md` and accepted OpenSpec specs.

- `phase transition`: runtime status synchronization, such as `rb_status.json` current/next gate updates and `phase_transition` trace.
- `phase handoff`: Phase Agent consumes gate CLI `check.next` through `enter-phase` or another accepted loader/check path and receives the next Markdown control surface.
- `work completion`: target phase artifacts plus that phase's own gate/content rules prove the target work is done.
- `witnessing`: Engine-written evidence binding the gate route to later entry, such as `gate_attempt(passed=true,next=...)` plus route-bound `load_complete`.
- `current_node`: when non-null, the durable `rb_status.json` coordinate for the lifecycle Markdown control surface most recently loaded by successful route-bound `enter-phase`.

`enter-phase` / `load_complete` prove target-node entry/loading, not target-phase work completion. `advance-status` synchronizes the just-passed source gate; it does not enter, load, or execute the next phase. `current_node` is a resume coordinate, not gate pass evidence.

`continuation` cues are Agent-facing decision-point projections. Gate and work-unit JSON emit them as top-level objects; `enter-phase` emits a final `DPT_CONTINUATION_CUE` Markdown block. A cue tells the Agent the one immediate next action already implied by direct Engine facts. It is not permission, not a new status field, not routing authority, not completion proof, and not an entry/status/submit witness.

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
- `check-reentry.mjs` is a non-gate structured-output command: `0` clean, `1` blockers/drift, `2` invalid target/args/config/caller request. Loaded/normalized results use schema `1.1.0` and add `recovery.canonical_topic_findings[]` plus one `root_findings[]` entry per independent blocker. A root exposes at most one reachable action; `missing_contract` means the Engine knows the suggested route is unavailable and the Agent must not loop that command or hand-write authority.
- `operate-artifact-persistence.mjs` is a two-operation mechanical durability command: `persist` exits `0` when committed, `1` on a compare-and-swap or accepted-operation blocker, and `2` for invalid invocation/configuration; `sweep` exits `0` when every accepted workspace is finalized/cleaned, `1` when any workspace needs Agent action, and `2` for invalid invocation/configuration. Always read the JSON verdict; sweep requires a quiescent bundle with no concurrent persist.
- `operate-topic-state.mjs` is the single three-operation canonical topic command: `inspect` is read-only and emits a copy-ready layout baseline; sanctioned rerun `apply` accepts one complete `mutate_layout` target for rename/reorder/renumber/safe-remove and commits only plan+listed current seeds; `recover` rolls one accepted workspace forward without new semantics. Historical artifact/reference/output paths remain in place. Context and `human-directed` are not mutation authority, and post-final fresh mutation remains unavailable.
- `operate-post-final-recovery.mjs` is the narrow `inspect|apply|recover` Final→rerun operation. `inspect` is read-only; `apply` consumes one retained request and commits current HITL2 projection plus one Engine-written event; `recover` finishes only exact prepared bytes. Exit `1` means deterministic blocker or exact recovery required, and exit `2` means invalid invocation/configuration/internal failure. It never writes status/topic/queue/final authority or authenticates the human caller.
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
| operate-work-unit.mjs | cli/operate-work-unit.mjs | delegated work-unit 生命周期（`claim`/`submit`/`late-submit`/`recover-declaration`/`fail`/`timeout`/`abandon`/`open-batch`/`inspect`），生产 delegated completion 与 declaration recovery 的唯一 existing-owner CLI；成功 `claim` 输出 poll/inspect continuation cue，普通 `submit` 只接受 claimed，`late-submit` 是 timed_out 的显式审计入口，`recover-declaration <bundle> --work-id <submitted_id>` 只恢复 hash-identical missing ledger row且不接收`--result` |
| work-unit-actor-decision | command_playbook/work-unit-actor-decision.md | queue-front role inspect → 一次真实 native probe → 同一 claim checkpoint；normal batch、单项 Phase Agent fallback 或 no-claim |
| provenance-forensics-guide | command_playbook/provenance-forensics-guide.md | 事后判定 delegated 证据 provenance 真伪；submitted work-unit ledger 是 gate authority |

Already-submitted declaration fault 的唯一 existing-owner operation：

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>
```

该 operation 不接收`--result`，不重跑 research、不完成 queue、不改 index/status hash，也不允许手写 `rb_output_declarations.jsonl`。

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
| enter-phase.mjs | cli/enter-phase.mjs | 消费 gate CLI 返回的 `check.next`，调用 workflow loader 渲染下一 node Markdown，写入 route-bound `load_complete` handoff witness 和 `rb_status.json.current_node`，并在成功 Markdown 末端输出 loaded-node continuation block；不证明 target phase work completion |
| advance-status.mjs | cli/advance-status.mjs | 在 `enter-phase` witness 存在后同步 just-passed source gate；covered handoff 使用真实 `gate_attempt.next` 和 `current_node` 输出 continuation cue；does not enter, load, or execute the next phase |

## Post-Final Rerun Recovery

| 工具 | 文件 | 说明 |
|------|------|------|
| operate-post-final-recovery.mjs | cli/operate-post-final-recovery.mjs | `inspect|apply|recover`；只接受closed `post_final_rerun` retained request，event-last提交profile+one exceptional handoff，崩溃后exact roll-forward；不是gate pass、permission token或generic state mutation |
| post-final-recovery | command_playbook/post-final-recovery.md | Agent copyable完整链：inspect → retained request → apply/exact recover → enter rerun → `advance-status --to hitl2_recorded` → `check-reentry --at hitl2_recorded` → existing C3/rerun pipeline |

## Artifact Persistence

| 工具 | 文件 | 说明 |
|------|------|------|
| operate-artifact-persistence.mjs | cli/operate-artifact-persistence.mjs | 对 completed staging file 执行 CAS + atomic persist，或在无并发 persist 的 quiescent boundary sweep `_diagnostics/artifact-persistence/`；只报告机械 durability，不授予 provenance、submit、gate、handoff 或 delivery authority |
| persist-artifact | command_playbook/persist-artifact.md | Agent copyable 闭环：保留 staging → persist；崩溃后停止并发 persist → sweep；blocked 时检查/移除单个 workspace、retry persist、rerun sweep |

## Canonical Topic State

| 工具 | 文件 | 说明 |
|------|------|------|
| operate-topic-state.mjs | cli/operate-topic-state.mjs | `inspect|apply|recover` canonical topic identity/intent/layout；只写 `rb_plan.md` 与 listed UID-bound current seeds，不改 queue/profile/status/trace/artifacts/reference/history |
| operate-topic-state | command_playbook/operate-topic-state.md | Agent 最短闭环：inspect → drain blocker或complete-target apply → exact recover → named style follow-up → inspect/audit |
