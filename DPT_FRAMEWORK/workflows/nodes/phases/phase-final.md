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
- **Start here**: Confirm readiness-passed state, then read verified wave artifacts, profile, status, and trace.
- **Path to pass**: Confirm terminal status from readiness (`current_gate: readiness_passed` / `next_gate: none`), generate at least one report under `final/`, and record final delivery through the accepted Agent-side event surface.
- **Completion check**: At least one final artifact exists under `final/`; there is no gate command for this terminal node.
- **Failure posture**: Do not ask the user or start a feedback loop; if delivery state is missing, repair from verified bundle state before reporting completion.

## 1. Stage Goal

从 verified bundle state 生成 final report artifact(s)。Final 是 delivery 动作——把已验证的研究产出打包为可交付的报告——不是 gate checkpoint，也不是下一阶段的输入。

Delivery completion 的 evidence 是 legally entered Final node 中 `final/` 目录下存在至少一份报告文件。Final 是 terminal node（`gate: none`），没有 gate CLI 写 `final_delivery` trace event——delivery 事实由文件存在证明，不由 trace event 证明。

`final/` 文件只有在 readiness gate passed、`enter-phase --node phases/phase-final.md` 写入 route-bound Final `load_complete`、且 `advance-status --to readiness_passed` 同步后才可算 delivery evidence。任何 wave0/wave1/wave2/setup/seed-topics/HITL2/readiness-before-pass/rerun context 写出的 `final/` 文件都是 premature terminal output：可用于诊断，不授权用户可见 final delivery，也不替代 readiness 或 handoff evidence。

## 2. Required Inputs

- Readiness gate passed 的 active `dpt_rb_*` run bundle
- All verified wave artifacts（Wave0 reference、Wave1 skeleton、Wave2 synthesis）
- `rb_profile.yaml`（用户 profile、HITL1/HITL2 decision、final_report_view 偏好）
- `rb_status.json`（确认 readiness passed）
- `rb_trace.jsonl`（完整 trace 记录）

## 3. Allowed Actions

- 读取所有 verified bundle state：wave artifacts、profile、status、trace
- 根据用户 `final_report_view` 偏好（来自 `rb_profile.yaml` HITL2 字段）组织报告结构和侧重点
- 从 verified bundle state 生成至少 1 份 final report artifact 到 `final/` 目录
- 报告格式自由（Markdown、研究摘要、executive brief 等），内容必须引用 bundle 中真实存在的 source artifact
- Report 中的声明使用标准 Markdown link `[label](relative/path.md)` 引用来源
- 确认 `rb_status.json` 已由 readiness §6 写成 `current_gate: readiness_passed` / `next_gate: none`；Final 没有 gate，不再运行 `advance-status`，也不把 status 改成 `none/null`
- 记录 final 完成信息到 `rb_trace.jsonl`（使用 Agent 侧 event，如 `md:final_delivery`）

## 4. Expected Artifacts

- `final/` 目录下至少 1 份报告文件（如 `final/report.md`、`final/executive-summary.md` 等）
- Report content 来自 verified bundle state（wave artifacts、profile、status），不来自 chat memory
- `rb_status.json` 中保持 `current_gate: readiness_passed` / `next_gate: none`
- `final/` 目录存在即证明 delivery 完成

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

**绝对禁止的行为：**
- 向用户提问或请求确认
- 提供 A/B 选项或进度汇报
- 在 `final/` artifact 写入前发送 idle/no-work 或 delivery summary
- 启动 post-delivery feedback loop
- 等待用户反馈后再修改报告
- 回到 HITL2 repair/rerun（用户反馈通过独立路径触发 `phase-hitl2.md`）

Post-delivery 用户反馈入口：用户反馈写入 `rb_profile.yaml` 的 HITL2/user feedback 字段，通过 HITL2 `rerun` 从 `seed-topics` 重新跑。Final node 自身不处理 post-delivery 修改。

## 9. Anti-Cheating Rules

- **Final report MUST 从 verified bundle state 生成**——不能重新凭 chat memory 生成、凭 LLM 内部知识编造内容
- **MUST NOT 暗藏 hidden next、hidden gate 或隐式循环**——final 是 terminal node，无 outgoing transition
- **MUST NOT 在 `final/` 为空时声称 delivery 完成**——至少 1 份报告文件必须真实存在
- **用户 final 后反馈 MUST NOT 通过 final node 处理**——走 HITL2 repair/rerun（`phase-hitl2.md` §7）
- **MUST NOT 写 `final_delivery` trace event 并声称它来自 gate CLI**——final 无 gate CLI，charter 禁止手写 trace event。delivery 由 `final/` 文件存在证明
- **MUST NOT 把 premature `final/` 文件当成 delivery**——没有 readiness-to-final handoff 和 Final entry witness 时，`final/` 只是 phase-boundary violation diagnostic
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:final START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:final END — <summary>"` |
