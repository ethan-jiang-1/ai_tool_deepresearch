# BUG-097: Phase Agent surfaced at non-HITL boundary (wave0→wave1)

| 字段 | 内容 |
|------|------|
| **编号** | BUG-097 |
| **发现日期** | 2026-07-21 |
| **发现场景** | `dpt_rb_ai-agents-enterprise-bpm-productivity` — wave0 gate pass 后 |
| **严重度** | P1 — 违反 silent execution contract（`stop: no`） |
| **影响面** | main Phase Agent behavior |

## 结案决定（2026-07-21）

已接受的 silent execution contract、Gate continuation cue、loaded-node cue 与 autonomous header 已在真实 observation 前覆盖这个决策点。没有发现值得新增 Engine chat authority、interaction state、`do_not_summarize` 字段或额外 test controller 的直接缺口。该次 Agent surfacing 作为行为观察保留，但不再扩张为新的 implementation work；归档为 no additional deterministic remediation.

## 现象

1. Wave0 gate pass（`check.passed: true`, `check.next: phases/phase-wave1.md`）
2. Phase Agent 正确执行了 `enter-phase` + `advance-status`，进入 wave1
3. **但在此之前**，Phase Agent 向用户发了一条总结消息（包含 wave0 收集的 82 sources 的统计摘要），并问"需要我继续推进Wave1吗？"
4. 这违反了 `phase-wave0.md` 的 `stop: no` 和 `shared-silent-execution.md` 的行为契约——在非 HITL 边界不得发起问题、确认、进度报告或继续请求

## 根因

- Phase Agent（LLM）在 gate pass 后将 "用户等了很久，应该给个总结" 误解为 surfacing permission
- 框架的 `stop: no` + `shared-silent-execution.md` contract 已明确禁止此类行为，但依赖 Agent discipline 执行
- 这不是 Engine 可以检测的——Engine 不知道 Agent 在 chat 里发了什么

## 建议修复

- 在 `shared-silent-execution.md` 中增加显式条款："Gate pass 后的 phase transition 不是 surfacing permission。`enter-phase` + `advance-status` 后直接执行 loaded node，不得插入总结、确认、或继续请求。"
- 考虑在 `enter-phase` CLI 输出的 continuation cue 中增加 `do_not_summarize: true` 提示
- 长期：Engine 是否可以在 `stop: no` phase 的 gate pass 后检测 Agent 是否产生了面向用户的输出？（困难——Engine 不 inspect chat state）

## 触发条件

1. `stop: no` phase gate pass
2. Phase Agent 在 `enter-phase` 前后产生了面向用户的总结/确认消息
3. Gate pass 本身不是 surfacing trigger；用户等待时长也不是
