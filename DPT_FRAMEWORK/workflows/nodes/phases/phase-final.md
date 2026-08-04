---
node_type: phase
id: phase-final
phase: final
gate: null
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-schemas
  - shared/shared-anti-cheating-rules
---

# Phase: Final — Delivery

> **Terminal Node**: 这是当前 delivery pass 的 terminal node。`gate: null`，`next: null`。`transitions.chain.json` 不包含 `phases/phase-final.md` 的条目。没有 outgoing gate，没有 hidden loop。

## 0. Execution Brief

- **Objective**: Deliver final report artifacts from verified bundle state.
- **Start here**: Confirm readiness-passed state, then read verified wave artifacts, profile, status, trace, and, when present, `rb_plan.md## Constraints > User Research Controls`.
- **Path to pass**: Confirm terminal status from readiness (`current_gate: readiness_passed` / `next_gate: none`) and generate at least one report under `final/`; optional diagnostic logs do not prove delivery.
- **Completion check**: At least one final artifact exists under `final/`; there is no gate command for this terminal node.
- **Failure posture**: Do not ask the user or start a feedback loop; if delivery state is missing, repair from verified bundle state before reporting completion.

## 1. Stage Goal

从 verified bundle state 生成 final report artifact(s)。Final 是 delivery 动作——把已验证的研究产出打包为可交付的报告——不是 gate checkpoint，也不是下一阶段的输入。

Delivery completion 的 evidence 是 legally entered Final node 中 `final/` 目录下存在至少一份报告文件。Final 是 terminal node（`gate: null`），没有 gate CLI 写 `final_delivery` trace event——delivery 事实由文件存在证明，不由 trace event 证明。

`final/` 文件只有在 readiness gate passed、`enter-phase --node phases/phase-final.md` 写入 route-bound Final `load_complete`、且 `advance-status --to readiness_passed` 同步后才可算 delivery evidence。任何 wave0/wave1/wave2/setup/seed-topics/HITL2/readiness-before-pass/rerun context 写出的 `final/` 文件都是 premature terminal output：可用于诊断，不授权用户可见 final delivery，也不替代 readiness 或 handoff evidence。

## 2. Required Inputs

- Readiness gate passed 的 active `dpt_rb_*` run bundle
- All verified wave artifacts（Wave0 reference、Wave1 skeleton、Wave2 synthesis）
- `rb_profile.yaml`（用户 profile、HITL1/HITL2 decision、final_report_view 偏好）
- `rb_status.json`（确认 readiness passed）
- `rb_trace.jsonl`（完整 trace 记录）

User controls remain guidance only: apply them against verified evidence and existing delivery contracts, never as an override for provenance, source floors, Gate or lifecycle truth. If a material control could not be met, make the limitation visible in the lawful final/accepted limitation surface; do not silently claim satisfaction or invent evidence.

## 3. Allowed Actions

- 读取所有 verified bundle state：wave artifacts、profile、status、trace
- 根据用户 `final_report_view` 偏好（来自 `rb_profile.yaml` HITL2 字段）组织报告结构和侧重点
- 从 verified bundle state 生成至少 1 份 final report artifact 到 `final/` 目录
- Final Markdown report 必须在 retained staging file 中包含一个 `Evidence Map`：每个 selected key finding 一行，使用 `Finding ID`、`Declared Key Finding`、`Submitted Backing` 三列，并在 backing cell 用标准 Markdown link 指向已 submitted 的 `source_yaml` / `evidence_summary` 或已有 submitted-backed `reference/` projection
- 对 safe `final/*.md` staging report，只能用 `operate-artifact-persistence.mjs persist-final-report` 提交；读取其 `check` / `inspect` / `advice`，若 admission rejected，只修复命名的 staging row 或合法 backing surface 后重跑同一 command。只有 `committed` 后才消费该文件；generic `persist` 不能提交 Final Markdown。崩溃恢复使用无并发 persist 的 quiescent `sweep`
- 报告格式自由（Markdown、研究摘要、executive brief 等），内容必须引用 bundle 中真实存在的 source artifact；Engine 只检查 Evidence Map 的结构、路径安全和 submitted provenance，不判断链接是否在语义上充分支持 finding
- 用户未指定其他输出语言时，final report narrative 和 terminal delivery summary 优先使用中文；citations、source titles、paths、commands、field names、enum values 保持 canonical/source form
- Report 中的声明使用标准 Markdown link `[label](relative/path.md)` 引用来源
- 确认 `rb_status.json` 已由 readiness §6 写成 `current_gate: readiness_passed` / `next_gate: none`；Final 没有 gate，不再运行 `advance-status`，也不把 status 改成 `none/null`
- 可通过 `_logs/run.log` 记录 diagnostic completion summary；不要写 `final_delivery` trace event，也不要把 log/chat summary 当作 delivery evidence

## 4. Expected Artifacts

- `final/` 目录下至少 1 份报告文件（如 `final/report.md`、`final/executive-summary.md` 等）
- 每个 Final Markdown report 的 `Evidence Map` 是 reader-facing declaration，不是新的 ledger、Gate、trace event 或 report-wide citation scanner
- Report content 来自 verified bundle state（wave artifacts、profile、status），不来自 chat memory
- 用户未指定其他输出语言时，用户可见报告叙述和 terminal delivery summary 优先中文；canonical tokens 与来源标题保持原样
- `rb_status.json` 中保持 `current_gate: readiness_passed` / `next_gate: none`
- `final/` 目录存在即证明 delivery 完成
- Persistence 只证明 bytes durable；它不替代 readiness pass、Final entry witness 或本节的 delivery 条件

## 5. Gate Command

无——final 是 terminal node（`gate: null`）。`transitions.chain.json` 不包含 `phases/phase-final.md` 的条目。没有 gate CLI 可运行。

## 6. On Gate Pass

N/A — final 无 outgoing gate。

## 7. On Gate Fail

N/A — final 无 gate。Final 是 terminal delivery node。

## 8. Stop Behavior — Terminal Delivery

`stop: no` + `gate: null` — Agent 在 `final/` artifact 写入后交付最终报告。这是 terminal delivery point：

**允许的行为：**
- 从 verified bundle state 写入 `final/` artifact（至少 1 份报告文件）
- 保持 readiness 已同步的 terminal status：`current_gate: readiness_passed` / `next_gate: none`
- 在 `final/` artifact 写入后交付 terminal delivery summary；用户未指定其他输出语言时，该 summary 优先中文
- 若一个用户主动的 current factual turn 已经到达，基于当前 verified facts 直接回答；该回答不创建 checkpoint、state、permission、mutation 或 reentry authority
- `final/` artifact 尚为空时，factual reply 必须明确尚未交付报告，不得把回答、进度或 chat summary 冒充 terminal delivery
- Final Markdown backing rejection 是 retained staging 的 ordinary Agent repair：修复 JSON feedback 指定的 map row 或合法 backing，重跑 `persist-final-report`，不要求用户运行命令，也不创建 Final Gate、Final trace event、Final interaction 或 hidden transition

**Final 不得主动发起提问、等待、反馈循环或 repair loop：**
- 提问、请求确认或等待用户
- A/B 选项、进度汇报或 repair loop
- 在 `final/` artifact 写入前发送 idle/no-work 或 delivery summary
- 把 prefer-Chinese guidance、log event、trace event 或 chat summary 当成 delivery evidence
- 启动 post-delivery feedback loop
- 等待用户反馈后再修改报告
- 从 Final 内回到 HITL2 或重复提问同一决定

回答一个已经收到的 factual turn 不是 Final 发起交互，也不是第三个框架 checkpoint。只有明确 post-delivery rerun 决定才使用 accepted post-final recovery；普通事实问答不强制进入 recovery。

Post-delivery 用户反馈入口：若用户明确决定 rerun scope/risk，Agent使用 `operate-post-final-recovery.mjs inspect|apply|recover` 将决定记录为现有 HITL2 `rerun` profile semantics和一个lineage-bound `post_final_reentry` event；然后执行 `enter-phase --node phases/phase-rerun.md`、`advance-status --to hitl2_recorded`、`check-reentry --at hitl2_recorded` 和现有 C3/rerun pipeline。Final node 自身不处理修改、不重问同一决定，也不把request metadata当作verified identity或permission。

## 9. Anti-Cheating Rules

- **Final report MUST 从 verified bundle state 生成**——不能重新凭 chat memory 生成、凭 LLM 内部知识编造内容
- **MUST NOT 暗藏 hidden next、hidden gate 或隐式循环**——final 是 terminal node，无 outgoing transition
- **MUST NOT 在 `final/` 为空时声称 delivery 完成**——至少 1 份报告文件必须真实存在
- **用户 final 后反馈 MUST NOT 通过 final node 处理**——明确rerun只走audited post-final recovery → existing HITL2 rerun semantics → `phase-rerun.md`
- **MUST NOT 写 `final_delivery` trace event 或用 log/chat summary 证明 delivery**——final 无 gate CLI，charter 禁止手写 trace event。delivery 由 legal Final entry 后的 `final/` 文件存在证明
- **MUST NOT 用 generic `persist` 绕过 Final Markdown Evidence Map admission**——safe `final/*.md` 只经 `persist-final-report` durable commit；admission pass 仍不替代 readiness pass、Final entry 或 Agent/human semantic review
- **MUST NOT 把 premature `final/` 文件当成 delivery**——没有 readiness-to-final handoff 和 Final entry witness 时，`final/` 只是 phase-boundary violation diagnostic
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:final START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:final END — <summary>"` |
