# COMMANDS

Deep Research Harness 命令索引。

> **最快触发**：把 `RUN.md` 拖进对话即触发框架（前门入口）。

## Audience And Interaction Contract

这些命令是 Agent-facing operating surfaces：由 Phase Agent 或其他 Agent actor 在当前 run 的上下文中调用，不是要求人类/operator 在 autonomous pipeline 中途共同运行命令。

Ordinary authorized command execution and reversible mechanical repair are Agent-owned。Recorded goal、current host permission、accepted contract 和 legal command path 已经决定下一步时，Agent 直接执行；repairable blocker 有现有合法路径时，Agent 说明最小 blocker、完成 repair，并 rerun 同一 checkpoint。没有合法路径时，Agent 报告 missing contract，不手写 authority 或创建 Engine-invisible parallel path。

Human-directed identifies the decision source；它不转移 ordinary command-runner role，也不凭一句用户请求创造 host permission、覆盖 Engine verdict 或补出缺失的 Engine capability。用户作出 contract-required decision 后，剩余合法机械步骤回到 Agent；host policy 若要求一个不可代理动作，只把那一个动作交给用户。

Autonomous execution、HITL1/HITL2 内的 human-directed decision、out-of-band maintenance/debug collaboration，以及 accepted mutation/reentry capability 是四个不同概念。Out-of-band collaboration 不是第三个 lifecycle checkpoint、Final-owned repair loop 或任意 state movement authority。

HITL1 和 HITL2 是唯一的 interactive in-run checkpoints：两者都由 Agent 基于当前事实先给一个可修正的推荐，分别完成研究对齐与研究审阅。一次性 pre-pipeline trigger/entry selection 只负责选择 DEEP_RESEARCH_HARNESS 入口并把控制权交给 Agent；进入 lifecycle 后，非终端 `stop: no` phase 自主静默运行，框架不主动提问、确认、汇报或等待 acknowledgement。用户主动消息若已是当前 conversation turn，Agent 正常回答事实或最小边界，但回答不创建 checkpoint、permission、route、mutation/reentry authority 或 durable intent，也不改变原有 next action。Final 是 terminal lifecycle delivery：entry admission 后先同步 Readiness status，再由 `publish-final-report` 立即写 current lineage 缺失的 base/next global version；该报告可在同一 Final node 因 clear presentation feedback 追加 immutable revision。它不是第三个交互 checkpoint、Gate、confirmation loop、profile rewrite 或 satisfaction state。满意不写 runtime fact。只有 evidence/research expansion 通过 `post_final_rerun` recovery operation 记录既有 HITL2 `rerun` semantics并进入现有 rerun node；request metadata不是verified identity、permission token、`--human-directed`、`--override` 或 `--force`。用户决定scope/risk后，request preparation、apply/recover、entry、status sync、audit与rerun pipeline全部回到Agent执行。

Post-final feedback 不自动创造能力：presentation-only feedback 留在 Final，由 Agent 准备 retained staging 后调用 publisher；supported evidence-expanding rerun 才走上述 audited operation；unsupported repair/state-seed仍报告missing capability，不手写authority。

## Phase Boundary Terms

Short operating note only; deeper terminology canon lives in `../openspec/guidance/models/agentic-execution-model.md` and accepted OpenSpec specs.

- `phase transition`: runtime status synchronization, such as `rb_status.json` current/next gate updates and `phase_transition` trace.
- `phase handoff`: Phase Agent consumes gate CLI `check.next` through `enter-phase` or another accepted loader/check path and receives the next Markdown control surface.
- `work completion`: target phase artifacts plus that phase's own gate/content rules prove the target work is done.
- `witnessing`: Engine-written evidence binding the gate route to later entry, such as `gate_attempt(passed=true,next=...)` plus route-bound `load_complete`.
- `current_node`: when non-null, the durable `rb_status.json` coordinate for the lifecycle Markdown control surface most recently loaded by successful route-bound `enter-phase`.

`enter-phase` / `load_complete` prove target-node entry/loading, not target-phase work completion. `advance-status` synchronizes the just-passed source gate; it does not enter, load, or execute the next phase. `current_node` is a resume coordinate, not gate pass evidence.

`continuation` cues are Agent-facing decision-point projections. Gate and lifecycle outputs use `interaction: do_not_initiate|required|terminal_delivery`; successful claim output is action-only because claim does not own lifecycle placement. `enter-phase` presents its `DPT_CONTINUATION_CUE` first, followed by the exact existing source-gate `advance-status` command, the target action core, and a target-excluding shared-file manifest. A cue tells the Agent the one immediate next action already implied by direct Engine facts. It is not permission, not a new status field, not routing authority, not completion proof, and not an entry/status/submit witness.

## CLI Exit-Code Convention

Exit codes are a canonical interpretation and target convention for Agent callers, not proof that every current CLI shares one runtime helper. Use them for coarse shell/runner branching; always read stdout JSON or documented structured output before deciding the next action.

| Code | Canonical meaning |
| --- | --- |
| `0` | command succeeded, or gate passed |
| `1` | normal repairable failure, validation failure, gate rule failure, or business error |
| `2` | configuration, routing contract, or invocation/caller error |

Current inventory:

- Gate CLIs use the shared gate result helper and emit structured stdout `{ check, routing, inspect, advice }`; `routing.kind` of `invalid_input` or `config_error` exits `2`, gate failure exits `1`, pass exits `0`.
- Inspect-wave CLIs are non-gate structured-output commands; stdout `{ check, inspect, advice, hints }` is the Agent decision surface, with `2` reserved for caller invocation errors such as missing bundle input.
- `check-reentry.mjs` is a non-gate structured-output command: `0` clean, `1` blockers/drift, `2` invalid target/args/config/caller request. Loaded/normalized results use schema `1.1.0` and add `recovery.canonical_topic_findings[]` plus one `root_findings[]` entry per independent blocker. A root exposes at most one reachable action; `missing_contract` means the Engine knows the suggested route is unavailable and the Agent must not loop that command or hand-write authority.
- `operate-artifact-persistence.mjs` is a durability command: generic `persist` commits non-primary content but rejects reserved `final/final*.md`; `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist-final-report --bundle <path> --source <file> --target <final/non-primary.md> (--expect-absent | --expect-sha256 <digest>)` persists a safe non-primary Final Markdown target with Evidence Map backing admission; `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs publish-final-report --bundle <path> --source <retained-staging> [--feature <safe_snake_case>]` alone admits the primary Final Evidence Map, resolves the one canonical inventory, allocates base/global version, and commits no-clobber bytes without caller target/version/CAS/overwrite input. `sweep` finalizes/cleans exact retained workspaces without reallocating. Results are mechanical backing/durability facts, not Final entry, report-quality, feedback, or satisfaction verdicts. Invalid invocation/configuration exits `2`.
- `operate-topic-state.mjs` is the single four-operation canonical topic command: read-only `inspect` emits a copy-ready layout baseline; read-only `schema --context <context>` derives a bounded authoring projection from the actual accepted input schema; sanctioned rerun `apply` accepts one complete `mutate_layout` target for rename/reorder/renumber/safe-remove and commits only plan+listed current seeds; `recover` rolls one accepted workspace forward without new semantics. Invalid retained `apply` input exposes bounded safe `validation_errors[]` from the existing Zod validator. Historical artifact/reference/output paths remain in place. Context and `human-directed` are not mutation authority, and post-final fresh mutation remains unavailable.
- `operate-post-final-recovery.mjs` is the narrow `inspect|apply|recover` Final→rerun operation. `inspect` is read-only; `apply` consumes one retained request and commits current HITL2 projection plus one Engine-written event; `recover` finishes only exact prepared bytes. Exit `1` means deterministic blocker or exact recovery required, and exit `2` means invalid invocation/configuration/internal failure. It never writes status/topic/queue/final authority or authenticates the human caller.
- Many current utility validators are binary `0/1` and do not yet share a common exit helper.
- `log-event.mjs` is an always-`0` diagnostic/logging exception; logging failure must not be treated as proof that a load-bearing trace event was written.
- `validate-workflow-package.mjs` is a reconciled tri-state surface: `0` consistent, `1` consistency issues, `2` invocation/configuration error (missing/unreadable required context or unknown flags).

Exit codes SHALL NOT encode morale, reassurance, retry strategy, progress pressure, fatigue, or autonomous-continuation reminders. Those signals belong in `advice[]`, structured diagnostics, or Agent-readable Markdown. Exit code alone must never be treated as the full contract.

### Selected Operation Invocation Contract

The following selected public operations share a narrow discoverability boundary. Standalone `--help` or `-h` prints usage, exits `0`, and does not read a bundle, input, workspace, trace, or status. Every non-help form below is exact: required named options occur once, and unknown, duplicate, mixed, positional, missing-value, or unusable explicit path forms return one structured code-`2` invocation/configuration root before domain work. Never copy an unvalidated argument token into a repair coordinate, `write_to`, or rerun command.

| Operation | Exact non-help form | Agent-visible result |
| --- | --- | --- |
| Wave inspect | `inspect-wave{0,1,2}-output.mjs --bundle <bundle-path>` | `{ check, inspect, advice, hints }`; read `hints[]` for one direct repair or owner boundary. |
| Canonical topic state | `operate-topic-state.mjs inspect --bundle <bundle-path>`; `schema --context <context>`; `apply --bundle <bundle-path> --input <input-path>`; `recover --bundle <bundle-path> --operation-id <operation-id>` | `schema` is read-only discovery. Invalid retained `apply` input exposes safe `validation_errors[]`; correct that input and rerun the same `apply`. |
| Phase entry | `enter-phase.mjs --bundle <bundle-path> --node <file-ref> [--full]` | Default output is cue first, exact source-gate status sync, target `Execution Brief`, then ordered target-excluding manifest. `--full` adds the complete loaded closure; neither form completes target work or mutates status. |
| Status synchronization | `advance-status.mjs --bundle <bundle-path> --to <source-gate-enum>` | This command alone synchronizes the just-passed source gate after the existing entry witness. It does not enter, load, or execute the target phase. |
| HITL1 controls renderer | `plan-hostfile-sections.mjs render-no-controls`; `render-supplied-controls --input <snapshot-path>` | Prints deterministic section text only. The Agent writes it only at the existing host-file coordinate; the renderer never selects or writes a bundle. |

This selected contract does not normalize unrelated utilities. Their documented invocation and output classes remain authoritative.

`--to` 的 `<source-gate-enum>` 是 `schema/enums.mjs` `CurrentGate` 的 snake_case 值；它与 `workflows/manifest.json` gate key 的对应是机械的 `-` ↔ `_` 替换（例如 `wave0-complete` → `wave0_complete`）。两个单一真相源是 manifest（kebab key、生命周期序）与 enums.mjs（snake enum）；文档不另立手写对照表。

## 实例化与开始 Research
| 命令 | 文件 | 说明 |
|------|------|------|
| run（drag-trigger） | RUN.md | 把本文件拖进对话即触发框架的前门入口 |
| instantiate-run-bundle | command_playbook/instantiate-run-bundle.md | 生产新的 Runtime Bundle |
| start-research | command_playbook/start-research.md | `RUN.md` 选定新研究 entry 后的下游 playbook：创建 bundle → 写问题 → 加载第一个 phase |
| continue-run-bundle | command_playbook/continue-run-bundle.md | 入口选择与 existing bundle reload 的完整规则只在该 playbook 的 "Entry Selection (canonical)" 节；显式 candidate 先过同根 `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` pair，缺任一文件即 `unsupported_current_entry_contract` |

Existing run-bundle reload resolves the supplied directory to the current run bundle root, verifies the same-root `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` pair before reading either file, then resolves the Harness coordinate and delegates to `COMMANDS.md` for all operations. A supplied incomplete candidate is `unsupported_current_entry_contract` and stops. The complete entry-selection rule is stated only in `command_playbook/continue-run-bundle.md` ("Entry Selection (canonical)"); this entry is a pointer.

## Subagent 环境
| 命令 | 文件 | 说明 |
|------|------|------|
| setup-real-subagents | command_playbook/setup-real-subagents.md | 设置 Codex/Claude Code 项目级 real subagent 定义 |
| operate-work-unit.mjs | cli/operate-work-unit.mjs | delegated work-unit 生命周期（`claim`/`dry-submit`/`submit`/`late-submit`/`recover-declaration`/`recover-transaction`/`replace`/`supersede`/`fail`/`timeout`/`timeout-preflight`/`abandon`/`open-batch`/`inspect`）；成功 `claim` 输出 poll/inspect continuation cue，普通 `submit` 只接受 claimed，`replace` 处理 failed/abandoned，`supersede` 为 eligible submitted drift 建一个 fresh successor，两个 recovery operation 均保持既有 authority 边界 |
| work-unit-actor-decision | command_playbook/work-unit-actor-decision.md | queue-front role inspect → 一次真实 native probe → 同一 claim checkpoint；normal batch、单项 Phase Agent fallback 或 no-claim |
| provenance-forensics-guide | command_playbook/provenance-forensics-guide.md | 事后判定 delegated 证据 provenance 真伪；submitted work-unit ledger 是 gate authority |

Mode-absent unclaimed Wave1 demand uses only the narrow queue repair; it does not infer mode or edit claimed attempts:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs repair <bundle> --queue-item-id <id> --set-assignment-mode <primary|supplementary>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs dry-submit <bundle> --work-id <id> --result <result.json>
```

Dry-submit is predictive and read-only. Formal submit remains the delegated acceptance and success owner.

Eligible terminal replacement uses the work-unit authority, not a hand-authored queue card:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs replace <bundle> --work-id <failed_or_abandoned_id>
```

`replace` exits `0` for a newly created demand or an idempotent live successor and emits exactly one JSON document on stdout. A new or queued successor names the ordinary exact-role `claim` checkpoint and has no newly allocated work ID. An already in-flight idempotent successor reports only its existing allocated work ID for reconstruction/polling; it does not authorize another claim. A timed-out, submitted, claimed, mismatched, conflicting, or terminal-successor request emits structured stdout with non-zero exit and does not mutate queue, work-unit, receipt, result, cache, ledger, or parent terminal authority. Invocation and runtime faults use stderr.

Generic `operate-queue.mjs fail <bundle> --failure <failure.json>` accepts only
`queue_item_id` and `reason`. For a current non-delegated demand it records a
terminal `terminal_no_successor` row and creates no repair demand. A delegated
demand is rejected at the Queue boundary; use its existing work-unit
terminal/replacement authority. Queue inspect, projection, and the relevant
Wave Gate surface the same no-successor boundary. Do not hand-author a repair
card or edit `rb_queue.json` to bypass it.

Already-submitted declaration fault 的唯一 existing-owner operation：

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>
```

该 operation 不接收`--result`，不重跑 research、不完成 queue、不改 index/status hash，也不允许手写 `rb_output_declarations.jsonl`。

### Work-Unit Attempt Recovery

Always preserve the exact inspect, dry-submit, timeout-preflight, formal-submit, or Gate command that exposed the root. The structured projection binds the caller's operation and `work_id` separately from any holder `tx_id`, holder operation, target work/queue coordinates, and journal disposition.

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <id>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <bundle> --work-id <submitted_id> --reason <audit-reason>
```

- `busy` requires a schema-valid lock owner paired with its readable non-suspect v2 journal. Wait, then rerun the exact caller operation for the same work/checkpoint. The holder is not actor ownership, progress, process-death, or liveness evidence.
- `suspect_transaction` is not a wait or force-timeout cue. Run the exact `recover-transaction` command only when `repair_kind: recover-transaction` names one unlocked v2 `started`/`suspect` journal and its `write_to`/`tx_id`; then rerun the preserved checkpoint. A valid holder remains `busy`; legacy, incomplete, unsafe, drifted, or held-suspect proof is `missing_contract`, with no lock deletion or original-target edit.
- Exact `recover-declaration` takes precedence over `supersede`; after declaration recovery succeeds, rerun the same inspect/Gate. `supersede` is legal only when Engine feedback selects attributable post-submit drift after declaration recovery is unavailable. Its result binds the exact predecessor work/queue IDs, committing transaction ID, and one `successor_queue_item_id`.
- Continue from the returned successor's ordinary location. A queued successor uses a current role observation and normal claim; an in-flight successor is polled by its existing work ID; a terminal successor follows only its own ordinary replacement/retry/supersession contract. Only the unique current lineage leaf's normal submit or audited late-submit can restore coverage, after which the same inspect/Gate reruns.

Logical `actor_execution` plus exact `work_id` and `receipt_nonce` guides which route authors a claimed candidate. Only `phase_agent_fallback` lets the Phase Agent author that exact fallback candidate; for `delegated_subagent`, it may inspect and submit the returned candidate but must not author substitute content under the same binding. This is not physical actor authentication or host/sub-agent liveness proof. Never manually edit `rb_output_declarations.jsonl`, `_work_units/_index.json`, `_work_units/waveN/<work_id>/_status.json` (work-unit 级;bundle 级状态是 `rb_status.json`), `rb_queue.json`, `_work_units/.lock`, transaction journals, `result_hash`, or `ledger_record_hash`.

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
| enter-phase.mjs | cli/enter-phase.mjs | 消费 gate CLI 返回的 `check.next`，调用 workflow loader 渲染下一 node Markdown，写入 route-bound `load_complete` handoff witness 和 `rb_status.json.current_node`；默认输出 cue-first 的 source-gate sync、target action core 与 target-excluding manifest，`--full` 才附加 complete closure；不证明 target phase work completion |
| advance-status.mjs | cli/advance-status.mjs | 在 `enter-phase` witness 存在后同步 just-passed source gate；covered handoff 使用真实 `gate_attempt.next` 和 `current_node` 输出 continuation cue；does not enter, load, or execute the next phase |

## Post-Final Rerun Recovery

| 工具 | 文件 | 说明 |
|------|------|------|
| operate-post-final-recovery.mjs | cli/operate-post-final-recovery.mjs | `inspect|apply|recover`；只接受closed `post_final_rerun` retained request，event-last提交profile+one exceptional handoff，崩溃后exact roll-forward；不是gate pass、permission token或generic state mutation |
| post-final-recovery | command_playbook/post-final-recovery.md | Agent copyable完整链：inspect → retained request → apply/exact recover → enter rerun → `advance-status --to hitl2_recorded` → `check-reentry --at hitl2_recorded` → existing C3/rerun pipeline |

### Post-Final 迭代意图路由（navigation only）

用户在已完成 Final 交付的 bundle 上表达迭代诉求时，先按措辞族找到既有路由再执行。示例词只是导航线索，不是分类 enum：语义边界（evidence-expanding vs presentation）仍由 Final Agent 判定，混合或含混请求先问最小澄清，不做自动选路。

- **evidence-expanding 族**（示例：再挖一轮 / 继续挖 / rerun / 需要新来源、新 Topic、新证据或新研究结论）→ `command_playbook/post-final-recovery.md`（本节 `operate-post-final-recovery.mjs` 完整链；有 `_diagnostics/` next-dig-list 时按该 playbook 的 dig-list intake 成形 scope）。
- **presentation 族**（示例：整理 / 重写 / 自包含版 / 换个读者版本 / 只改结构、篇幅、措辞、强调或证据呈现）→ `workflows/nodes/phases/phase-final.md` 就地 refinement + `command_playbook/persist-artifact.md` 发布路径；不建 C5 request。

本映射是导航文本：不改变上方受众声明与责任边界，不创设第二条路由、checkpoint 或权限；映射内不复制命令行（可执行命令以各工具行与 playbook 为准）。

## Artifact Persistence

| 工具 | 文件 | 说明 |
|------|------|------|
| operate-artifact-persistence.mjs | cli/operate-artifact-persistence.mjs | 对非-primary staging file 执行 generic CAS + atomic persist；安全 non-primary `final/` Markdown 目标经 `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist-final-report` 先做 Evidence Map backing admission 再 commit；primary Final 只经 `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs publish-final-report --bundle <path> --source <retained-staging> [--feature <safe_snake_case>]` 分配 immutable base/global version、检查 Evidence Map submitted backing 并 no-clobber commit；quiescent `sweep` 复用记录 binding，不重新分配。它不授予 semantic support、submit、gate、handoff、delivery、quality 或 satisfaction authority |
| persist-artifact | command_playbook/persist-artifact.md | Agent copyable 闭环：保留 staging → non-primary `persist` 或 admitted Final `publish-final-report`；崩溃后停止并发 persist → sweep；blocked 时按 named workspace/retained staging repair，retry the named operation，rerun sweep |

## Canonical Topic State

| 工具 | 文件 | 说明 |
|------|------|------|
| operate-topic-state.mjs | cli/operate-topic-state.mjs | `inspect|apply|recover` canonical topic identity/intent/layout；只写 `rb_plan.md` 与 listed UID-bound current seeds，不改 queue/profile/status/trace/artifacts/reference/history |
| operate-topic-state | command_playbook/operate-topic-state.md | Agent 最短闭环：inspect → drain blocker或complete-target apply → exact recover → named style follow-up → inspect/audit |
