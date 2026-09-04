# RUN.md — DEEP_RESEARCH_HARNESS 入口

## 0. 禁用内置捷径（最高优先）

如果你在当前 agent 的工具列表中看到 `research`、`deep-research` skill、等价 one-shot research shortcut，或直接 WebSearch/WebFetch 能力：**不要把它们用于本 request 的 entry 前或作为 Deep Research Harness flow 的替代品**。本文件（DEEP_RESEARCH_HARNESS）已接管本 request 的 Deep Research 入口；读到本文件即已选定 `RUN.md`，先执行下方 Section 2 的 DEEP_RESEARCH_HARNESS flow，而不是直接搜索、抓取、收集 evidence 或手工综合。

若 Agent 是以代码探索、文档阅读等非研究意图自行读到本文件，用户没有研究意图、也没有把本文件作为 entry 提供，则本次阅读不构成 entry 选择，不授权开始 Section 2 的研究 flow。

>**这个文件在对话中即触发**
> 你读到这段，说明 DEEP_RESEARCH_HARNESS 已经被选为本次研究的 entry path。
> 这个文件就是"前门"：它的内容会直接进当前 agent 的上下文（Claude Code / Codex / Cursor / Windsurf 等任意 coding agent 通用），把后续命令执行交给 Agent。
> 启动前置：人类应在 trigger 前完成 repo root `SETUP.md` 中的安装与 Coding Agent 权限 preflight。若后续发现宿主权限未准备好，把它当作 pre-trigger setup 漂移；不要把非 HITL `stop: no` phase 变成权限配置对话。

## 1. Entry Selection Is Already Done

当前 agent 可能有内置的"快速研究/搜索"捷径（Claude Code：`deep-research` skill；Codex / Cursor / Windsurf 等：各自的内置搜索/research）——它们通用、一次性、无 gate、无证据包。`DEEP_RESEARCH_HARNESS` 是本项目的 Deep Research Harness：证据可追溯、多轮、gate 门控、产出可校验的 run bundle。此 guidance 不声称能阻止宿主预先匹配 skill 或注入工具；它只规定 Agent 在本 entry 已选定后的下一步。

读到本文件时不要再问用户是否改用内置捷径或是否使用 DEEP_RESEARCH_HARNESS。一次性 trigger 已选择本入口；继续执行 Section 2 的 Agent-run Harness flow。Section 2 及其进入的 HITL1/phase instructions 才单独授权 capability probe 和后续研究工作。若 bundle 尚未创建，唯一允许的前置澄清是 pre-pipeline routing exception（定义见 [agent-command-surface spec](../openspec/specs/agent/agent-command-surface/spec.md) 的 "Entry docs distinguish trigger from command execution" requirement 中 pre-pipeline routing exception 条款），必须发生在 autonomous lifecycle 开始前，且不得削弱 HITL1/HITL2-only interactive in-run boundary。

若用户其实给了 existing bundle candidate，完整规则只在 `command_playbook/continue-run-bundle.md` 的 "Entry Selection (canonical)" 节；此处只放指针。该节定义 `unsupported_current_entry_contract`。

## 2. 开跑（Harness）
完整步骤见 `command_playbook/start-research.md`，一句话版：

1. 定名（Agent 从 research request 派生 kebab-case，或使用 entry 前已提供的名称）
2. 建 bundle：`B=$(node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>)`
3. 把研究问题写进 `$B/rb_plan.md`
4. 加载 `workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行，之后靠 gate 的 `check.next` 自驱动到 `phase-final`

从 setup onward，gate pass 后不要直接手读下一 phase：先运行 `enter-phase --bundle <path> --node <check.next>` 写入 route-bound handoff witness，再按 phase §6 用 source-gate `advance-status --to <source_gate_enum>` 同步状态。`enter-phase` / `load_complete` 只证明进入 target Markdown control surface，不证明 target phase work completion。

At decision points, read any emitted `continuation` cue immediately: gate pass/fail, successful `enter-phase`, covered `advance-status`, and successful `operate-work-unit claim` now restate one next action. A cue is feedback projection only; it never replaces `check.next`, `load_complete`, `rb_status.current_node`, work-unit submit, gate pass, or Final delivery evidence.

| 触发/主题 | 规则 | Owner(canonical home) |
|---|---|---|
| Interactive checkpoints | 只有 `hitl1`（Agent 基于已知事实给一个推荐，用户定方向 / profile / topics）和 `hitl2`（Agent 总结当前研究并给一个推荐，用户决定交付或合法 rerun/repair），两者是仅有的 interactive in-run checkpoints | `../openspec/specs/agent/hitl-ux/spec.md` |
| 静默自律 | 两点之间及之后的非终端 `stop: no` phase 静默自主推进：Harness 不主动提问、确认、汇报进度或等待 acknowledgement | `../openspec/specs/workflow/silent-wave-execution/spec.md` |
| 用户主动消息边界 | 用户主动发来的消息已是当前 conversation turn 时，Agent 直接回答当前事实或最小能力边界；该回答不创建 checkpoint、permission、route、mutation/reentry authority 或持久 mid-run intent，原有 autonomous next action 不变 | `../openspec/specs/workflow/silent-wave-execution/spec.md` |
| Final 交付 | Final 仍是 terminal lifecycle delivery，不是第三个 checkpoint：合法 entry 后先执行 exact `advance-status --to readiness_passed`，empty bundle 发布 `final/final.md`，admitted post-ReopenResearchPass return 发布 next global version，然后停留在 Final 接受 presentation feedback 并追加 immutable revision | `../openspec/specs/bundle/artifact-persistence-recovery/spec.md` |
| 结束与重入 | 满意结束当前 turn、不写事实；只有新证据/研究扩张才通过 accepted ReopenResearchPass recovery 重新进入 | `../openspec/specs/research/post-final-recovery/spec.md` |

| 触发/主题 | 规则 | Owner(canonical home) |
|---|---|---|
| Delegated 唯一路径 | Delegated sub-agent work 只走 Engine-mediated work-unit path：queue demand item -> `operate-work-unit claim` -> sub-agent task under bundle-root `_work_units/` -> verified files/cache/result/receipt under the selected current run bundle root -> `operate-work-unit submit` -> submitted ledger row -> gate | `../openspec/specs/agent/delegated-work-units/spec.md` |
 Submit 受纳 | Normal `submit` accepts claimed attempts only；resubmitting the exact same hash 是幂等成功，只有 different-content duplicate 被拒绝 | `../openspec/specs/agent/work-unit-submission/spec.md` |
 终态恢复例外 | 唯一终态恢复例外是 explicit audited `operate-work-unit late-submit`，仅针对 eligible `timed_out` 且尚无替补提交的 attempts | `../openspec/specs/agent/work-unit-correction/spec.md` |
| 完成语义边界 | 不把 queue completion 当 delegated success；`operate-queue complete` 只用于 non-delegated queue work | `../openspec/specs/agent/agentic-queue/spec.md` |
| Bare path 归属 | `_work_units/...`、`rb_queue.json`、`reference/`、`artifacts/`、`_cache/`、`_logs/` 等 bare runtime paths 都 resolve under 当前选定的 run bundle root，不是 repo root 或 `DEEP_RESEARCH_HARNESS/` | `../openspec/specs/workflow/workflow-directory-contract/spec.md` |

`actor_execution` binds one logical work-unit attempt. It does not authenticate a physical writer or prove host/sub-agent liveness; use the existing work-unit receipt and recovery facts for the bounded next action.

| 触发/主题 | 规则 | Owner(canonical home) |
|---|---|---|
| 恢复起点 | 保留产生反馈的 exact command/checkpoint，并读其结构化 `attempt_disposition` + `next` | `../openspec/specs/engine/check-inspect-feedback/spec.md` |
| 五反馈面同形 | 五个 work-unit 反馈面（submit rejection、late-submit rejection、transaction blocking、dry-submit、inspect）emit 同一 shape：`attempt_disposition` 指名 disposition root 与 owner；`next` 携带一个 `recovery_action`（work-unit 面 closed enum，部分值即 CLI 动词拼写）、exact command 或 `write_to`、以及同一个待重跑 checkpoint | `../openspec/specs/engine/check-inspect-feedback/spec.md` |
| 值→动词映射 | 值→动词映射以 `engine/work-unit-repair-vocabulary.mjs` 的 `REPAIR_KIND_CLI_VERB` 与下方决策表为准 | executable contract：`engine/work-unit-repair-vocabulary.mjs` |
| 永非死路 | Recovery results（含 `recover-transaction` / `recover-declaration`）are never a dead end: they carry the same `next` rerun coordinate. Rerun the same checkpoint after a successful or idempotent result | `../openspec/specs/engine/check-inspect-feedback/spec.md` |

The test-locked decision table below is the single disposition → `recovery_action` → CLI verb → rerun map:

| 适用情形/触发条件 | `recovery_action` | CLI 动词(exact 命令) | 重跑什么 |
|---|---|---|---|
| `busy`(transaction 阻塞 / submit 争用) | `wait` | 调用者同一 operation(区分 caller 与 holder 的 transaction/operation/work/queue 坐标,读 `journal_disposition`;不推断进度或 liveness) | 等待后重跑调用者完全相同的 operation |
| `suspect_transaction`(锁定/日志残缺) | `recover-transaction` | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <id>`(仅当无全局锁、`repair_kind` 指名该 operation、且该未锁 v2 journal 可完整比对 before-image) | 成功或幂等结果后,重跑产生反馈的同一 inspect / dry-submit / timeout-preflight / submit / Gate checkpoint;否则 `missing_contract` 是边界 |
| `declaration_recovery_required`(已 submit 缺 ledger 行且可精确重建) | `recover-declaration` | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>`(takes precedence over `supersede` 始终优先) | 同一 inspect / Gate checkpoint |
| `supersede`(提交后漂移且不可声明重建) | `supersede` | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <bundle> --work-id <submitted_id> --reason <audit-reason>`(仅当 Engine feedback 指名) | 读返回的顶层 predecessor `work_id`、`queue_item_id`、`tx_id`、`successor_queue_item_id`;从 successor 返回的普通位置经 actor observation、正常 claim/poll、正常 submit 或 audited late-submit 继续,然后重跑同一 checkpoint |
| `missing_contract` | `missing_contract` | 无合法恢复路径 | 直接停止边界(do not manually edit ledger/index/status/queue/lock/journal/result_hash/ledger_record_hash authority);不重试已知被拒的 predecessor |
| 已 claim 且 delegated actor 作者路由 | `wait_for_delegated_candidate` | 无 CLI 动词;等待该 delegated actor 正常产出该 exact attempt | 同一 checkpoint 重跑 |
| 已 claim 且 Phase Agent fallback 作者路由 | `author_exact_fallback_attempt` | 无 CLI 动词;按 `next.write_to`(identity.result_path) 作者该 exact attempt 后正常 submit | 同一 checkpoint 重跑 |
| 已 submit 且仍 current | `semantic_boundary` | 无 CLI 动词 | 停止边界:更丰富的晚到内容不构成确定性替换授权 |
| 历史 leaf 在 active_window/refill_pool | `claim_successor` | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim` | 从 successor `queue_item_id` 正常 claim/poll/submit 后重跑同一 checkpoint |
| 历史 leaf 其他位置 | `inspect_current_lineage_leaf` | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect` | 读取返回坐标后继续,重跑同一 checkpoint |

| 触发/主题 | 规则 | Owner(canonical home) |
|---|---|---|
 晚交恢复 | 晚交恢复(late-submit)是唯一终态恢复：仅当 `timed_out` + 有效候选 + 该 `queue_item_id` 无替补时，audited `operate-work-unit late-submit` 接受后重跑同一 checkpoint | `../openspec/specs/agent/work-unit-correction/spec.md` |
| 只读预检 | `timeout-preflight` 是只读预检，其 `recommended_action` 为 submit / repair / wait / timeout / inspect / block(`--force` 例外) | `../openspec/specs/engine/check-inspect-feedback/spec.md` |
| 表派生与锁定 | 本表的行集从 `engine/work-unit-repair-vocabulary.mjs` 的 `WORK_UNIT_RECOVERY_ACTIONS` 导出派生，并由 `../tests/engine/work-unit-recovery-decision-table.test.mjs` 锁定：engine 可发出的每个 attempt-owned recovery `recovery_action` 都必须有表行与匹配 CLI 动词（或显式等待/作者/停止边界），四个发射模块不得出现裸 `repair_kind` 字符串字面量 | `../openspec/specs/engine/check-inspect-feedback/spec.md` |

If status or terminal output looks suspicious, run `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <path>`. The audit is diagnostic-only: it reports drift, missing witnesses, failed-gate downstream status, or premature `final/` output; it does not repair status. In non-terminal `stop: no`, a caught would-have-surfaced moment is recorded with `log-event.mjs --surfacing-intent` and then aborted; the event is diagnostic-only and never permission to surface.

For bundle recovery, run `node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle <path> --at <target>`. Read `recovery.root_findings[]` before acting: a `reachable` root carries at most one sanctioned nearest action; `missing_contract` is a direct stop boundary, not permission to retry a known-rejected predecessor, hand-edit status/trace, or create an addendum namespace; `not_applicable` leaves semantic reconciliation to the Agent without granting mutation authority.

## 3. 规则与边界在哪
- 触发规则、运行时边界：`README.md`
- 命令索引：`COMMANDS.md`
- 行为规则：`CLAUDE.md`（Claude Code）/ `AGENTS.md`（Codex、Cursor、Windsurf 等读 `AGENTS.md` 的 agent）

跑某 run bundle 时，以该 current run bundle root 的 verified `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` + `rb_status.json` + `rb_trace.jsonl` 为 reload context；legacy Markdown 不构成 fallback。别靠 chat memory。

恢复时，`rb_status.current_node` 是已加载的 phase coordinate；`current_gate` 只记录最近 gate/status 事实。不要只凭 `current_gate` 推断当前应加载哪个 phase，按 `current_node` 和已有 route-bound witness 进入对应 control surface。
