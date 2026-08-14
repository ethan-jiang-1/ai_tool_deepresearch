# RUN.md — DEEP_RESEARCH_HARNESS 入口

## 0. 禁用内置捷径（最高优先）

如果你在当前 agent 的工具列表中看到 `research`、`deep-research` skill、等价 one-shot research shortcut，或直接 WebSearch/WebFetch 能力：**不要把它们用于本 request 的 entry 前或作为 Deep Research Harness flow 的替代品**。本文件（DEEP_RESEARCH_HARNESS）已接管本 request 的 Deep Research 入口；读到本文件即已选定 `RUN.md`，先执行下方 Section 2 的 DEEP_RESEARCH_HARNESS flow，而不是直接搜索、抓取、收集 evidence 或手工综合。

>**这个文件在对话中即触发**
> 你读到这段，说明 DEEP_RESEARCH_HARNESS 已经被选为本次研究的 entry path。
> 这个文件就是"前门"：它的内容会直接进当前 agent 的上下文（Claude Code / Codex / Cursor / Windsurf 等任意 coding agent 通用），把后续命令执行交给 Agent。
> 启动前置：人类应在 trigger 前完成 repo root `SETUP.md` 中的安装与 Coding Agent 权限 preflight。若后续发现宿主权限未准备好，把它当作 pre-trigger setup 漂移；不要把非 HITL `stop: no` phase 变成权限配置对话。

## 1. Entry Selection Is Already Done

当前 agent 可能有内置的"快速研究/搜索"捷径（Claude Code：`deep-research` skill；Codex / Cursor / Windsurf 等：各自的内置搜索/research）——它们通用、一次性、无 gate、无证据包。`DEEP_RESEARCH_HARNESS` 是本项目的 Deep Research Harness：证据可追溯、多轮、gate 门控、产出可校验的 run bundle。此 guidance 不声称能阻止宿主预先匹配 skill 或注入工具；它只规定 Agent 在本 entry 已选定后的下一步。

读到本文件时不要再问用户是否改用内置捷径或是否使用 DEEP_RESEARCH_HARNESS。一次性 trigger 已选择本入口；继续执行 Section 2 的 Agent-run Harness flow。Section 2 及其进入的 HITL1/phase instructions 才单独授权 capability probe 和后续研究工作。若 bundle 尚未创建，唯一允许的前置澄清是 pre-pipeline routing exception，必须发生在 autonomous lifecycle 开始前，且不得削弱 HITL1/HITL2-only interactive in-run boundary。

## 2. 开跑（Harness）
完整步骤见 `command_playbook/start-research.md`，一句话版：

1. 定名（Agent 从 research request 派生 kebab-case，或使用 entry 前已提供的名称）
2. 建 bundle：`B=$(node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>)`
3. 把研究问题写进 `$B/rb_plan.md`
4. 加载 `workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行，之后靠 gate 的 `check.next` 自驱动到 `phase-final`

从 setup onward，gate pass 后不要直接手读下一 phase：先运行 `enter-phase --bundle <path> --node <check.next>` 写入 route-bound handoff witness，再按 phase §6 用 source-gate `advance-status --to <source_gate_enum>` 同步状态。`enter-phase` / `load_complete` 只证明进入 target Markdown control surface，不证明 target phase work completion。

At decision points, read any emitted `continuation` cue immediately: gate pass/fail, successful `enter-phase`, covered `advance-status`, and successful `operate-work-unit claim` now restate one next action. A cue is feedback projection only; it never replaces `check.next`, `load_complete`, `rb_status.current_node`, work-unit submit, gate pass, or Final delivery evidence.

Interactive in-run checkpoints 只有 `hitl1`（Agent 基于已知事实给一个推荐，用户定方向 / profile / topics）和 `hitl2`（Agent 总结当前研究并给一个推荐，用户决定交付或合法 rerun/repair）。两点之间及之后的非终端 `stop: no` phase 静默自主推进：Harness 不主动提问、确认、汇报进度或等待 acknowledgement；若用户主动发来的消息已经是当前 conversation turn，Agent 直接回答当前事实或最小能力边界，但该回答不创建 checkpoint、permission、route、mutation/reentry authority 或持久 mid-run intent，原有 autonomous next action 不变。Final 是 terminal delivery，不是第三个交互 checkpoint；它在 artifacts 存在后交付，明确 post-final rerun 才通过 accepted recovery 重新进入。

Delegated sub-agent work uses the Engine-mediated work-unit path only: queue demand item -> `operate-work-unit claim` -> sub-agent task under bundle-root `_work_units/` -> verified files/cache/result/receipt under the selected current run bundle root -> `operate-work-unit submit` -> submitted ledger row -> gate. Normal `submit` accepts claimed attempts only and rejects terminal attempts. The only terminal recovery exception is explicit audited `operate-work-unit late-submit` for eligible `timed_out` attempts when no replacement has submitted. Do not use queue completion as delegated success; `operate-queue complete` is for non-delegated queue work. Bare runtime paths such as `_work_units/...`, `rb_queue.json`, `reference/`, `artifacts/`, `_cache/`, and `_logs/` resolve under the current run bundle root selected above, not repo root or `DEEP_RESEARCH_HARNESS/`.

`actor_execution` binds one logical work-unit attempt. It does not authenticate a physical writer or prove host/sub-agent liveness; use the existing work-unit receipt and recovery facts for the bounded next action.

For work-unit recovery, preserve the exact command/checkpoint that produced the feedback and read its structured `attempt_disposition`. `busy` separates caller operation/work coordinates from holder transaction/operation/work/queue coordinates and `journal_disposition`; wait without inferring progress or liveness, then rerun the caller's exact same operation. `suspect_transaction` authorizes `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <id>` only when `repair_kind` names that operation for the exact unlocked journal; after a successful or idempotent result, rerun the preserved inspect, dry-submit, timeout-preflight, submit, or Gate checkpoint. Otherwise `missing_contract` is the boundary.

For submitted drift, exact `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>` always takes precedence when offered; run it and rerun the same inspect/Gate checkpoint. Run `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <bundle> --work-id <submitted_id> --reason <audit-reason>` only when Engine feedback names it. Read the returned predecessor `work_id`, predecessor `queue_item_id`, transaction ID, and `successor_queue_item_id`; continue from that successor's returned ordinary location through current actor observation, normal claim/poll, and normal submit or audited late-submit, then rerun the same checkpoint. Never reactivate the predecessor or manually edit ledger, index, status, queue, lock, journal, `result_hash`, or `ledger_record_hash` authority.

If status or terminal output looks suspicious, run `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <path>`. The audit is diagnostic-only: it reports drift, missing witnesses, failed-gate downstream status, or premature `final/` output; it does not repair status. In non-terminal `stop: no`, a caught would-have-surfaced moment is recorded with `log-event.mjs --surfacing-intent` and then aborted; the event is diagnostic-only and never permission to surface.

For bundle recovery, run `node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle <path> --at <target>`. Read `recovery.root_findings[]` before acting: a `reachable` root carries at most one sanctioned nearest action; `missing_contract` is a direct stop boundary, not permission to retry a known-rejected predecessor, hand-edit status/trace, or create an addendum namespace; `not_applicable` leaves semantic reconciliation to the Agent without granting mutation authority.

若用户明确提供当前 workspace 内可达 existing bundle candidate（目录或其中的文件），别重建；先验证同根 `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md`。只有完整 pair 才改读 `command_playbook/continue-run-bundle.md`，将该目录解析为 canonical absolute current run bundle root，读取 pair 后进入 `COMMANDS.md` 的命令体系。显式 candidate 缺少任一文件即报告 `unsupported_current_entry_contract` 并停止：不读 legacy entry、不回落此 `RUN.md`、不创建/另选 bundle、不迁移或 upgrade。扫描发现、只提文件名或不可达路径不选择 run；人仍可在 Harness operation 外直接读历史 Markdown。

## 3. 规则与边界在哪
- 触发规则、运行时边界：`README.md`
- 命令索引：`COMMANDS.md`
- 行为规则：`CLAUDE.md`（Claude Code）/ `AGENTS.md`（Codex、Cursor、Windsurf 等读 `AGENTS.md` 的 agent）

跑某 run bundle 时，以该 current run bundle root 的 verified `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` + `rb_status.json` + `rb_trace.jsonl` 为 reload context；legacy Markdown 不构成 fallback。别靠 chat memory。

恢复时，`rb_status.current_node` 是已加载的 phase coordinate；`current_gate` 只记录最近 gate/status 事实。不要只凭 `current_gate` 推断当前应加载哪个 phase，按 `current_node` 和已有 route-bound witness 进入对应 control surface。
