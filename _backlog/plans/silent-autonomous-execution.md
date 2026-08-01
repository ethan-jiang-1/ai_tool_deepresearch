---
title: Silent autonomous execution
status: deferred_current_head_observation__no_active_openspec_change
created: 2026-07-24
revised: 2026-08-01
source_bugs: BUG-099, BUG-104, BUG-106
current_execution_model: chain_queue_work_unit
---

# Silent Autonomous Execution

## 1. Current Decision

这份计划只保留 `BUG-099`、`BUG-104` 与 `BUG-106` 的**当前 swarm 残余观察边界**。它不再承接一个 phase-handoff implementation candidate，也不预设新的 OpenSpec change。

当前生产执行模型是 [Chain / Queue / Work Unit](../../guidelines/agentic-execution-model.md)：

```text
gate -> chain handoff -> phase-local queue demand
     -> work unit -> Sub-agent -> submit -> ledger -> gate
```

Phase Agent 负责读取 Markdown 控制面、运行确定性 checkpoint，并在 delegated work 已在飞行时主动 poll、submit、repair 或 terminalize；Sub-agent 只执行受限 work unit，不能改 queue、ledger、Gate 或 phase 路由。这个模型取代了旧计划中把“停在 phase entry”与一个拟议的单命令 handoff 绑定的叙事。

BUG-103 的 handoff guidance 缺口已由 archived `align-phase-handoff-status-sync-guidance` 关闭。当前 handoff 仍按既有权威消费 `check.next`：`enter-phase` 见证目标 Markdown entry，随后仅在当前 source-gate window 要求时运行 `advance-status`，目标 phase 才执行自己的合法动作。它提供 action readiness，不承诺模型会再发一次 tool call，也不承诺 host 会开启下一 turn。

## 2. Current Swarm Contract

- `stop: no` 的 Phase Agent 不主动把进度、问题、确认或 continuation request 浮出给用户；它按 [shared silent-execution contract](../../DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md) repair、换策略、消费合法 handoff 或 silent hold。
- delegated phase 采用 active poll-submit-repair-terminalize loop：从 bundle truth 重建 in-flight work，使用 `operate-work-unit inspect`，不等待 task notification、用户续跑或外部 workflow 状态。
- 每次 delegated claim 先有 exact-role native probe，再在 `delegated_subagent` 与明确的 `phase_agent_fallback` 之间作已接受的选择。这个 execution actor 绑定 authorship 与 submit 边界，不证明物理 actor 身份或 host/sub-agent liveness；见 [actor decision loop](../../DPT_FRAMEWORK/command_playbook/work-unit-actor-decision.md)。
- continuation cue 是现有确定性反馈，不是 scheduler。`case-606` 只证明 cue 在真实 CLI 输出中可见，明确不证明 Agent behavior。

## 3. Evidence Boundary

已归档的 framework-contract remediation 已把 current deterministic contracts 和 real-actor canary checkpoint 对齐；它没有把 actor behavior 改写成 PASS。2026-07-31 的三次真实 Actor canary（case-406、case-604、case-221）都未产生 native completion，因此是 host-scoped `NOT_RUN`，不是成功、失败或 DPT host-liveness defect。见 [CLS-042 closure record](../_done/_closed_plans/framework-contract-remediation-openspec-sequence.md)。

因此，目前没有下列任何一种结论：

- 没有 current-head Phase Agent observation 证明 BUG-099/106 的旧 stop/report 行为仍会在完整 handoff 后复现。
- 没有证据把旧 incident 的 stop 归因于 repeated `enter-phase` rendering、某个 byte count、模型状态或单句 Markdown。
- 没有可移植的 DPT authority 能启动 host 的下一 turn，或保证 Sub-agent/Phase Agent 会完成。

旧的 `make-phase-handoff-entry-direct` / `consume-phase-handoff` 方案、entry-core projection、session-level loaded-file cache 与 host-specific continuation research 都不再是本计划的当前方向。

## 4. Reopen Gate

只有出现新的 current-head disposable `agent_flow_e2e` observation 时，才重新评估本计划。该 observation 必须保留 Subject prompt/transcript、host/version/mode、是否启用 host-native continuation、bundle `rb_trace.jsonl`、status/handoff evidence，以及 completed handoff 后的第一个 Phase-Agent action。

评估时先区分事实类型：

1. 若 direct trace/status/queue/work-unit contract 有确定性缺陷，才为该缺陷提出一个有界 OpenSpec change。
2. 若 Phase Agent 未执行首个合法动作，保留为 actor-behavior observation；同一 host 的额外 turn 只记录 host evidence，不能单独关闭 BUG-099/106。
3. 若只观察到 context correlation，先记录 current dependency/render measurement，不把它升级为因果或 session-memory contract。

任何 future proposal 都必须继续保留 `queue demand -> work unit -> sub-agent -> submit -> ledger -> gate` 的单一路径，并明确其不会承诺 host turn liveness。

## 5. Non-Goals

- 不重开已归档的 handoff guidance change，不引入 `consume-phase-handoff` 或第二 lifecycle writer。
- 不把 Codex/Claude 的 goal、task list、hook、loop 或 token budget feature 复制进 bundle state。
- 不添加 idle watcher、chat/tool-call observer、session registry、loaded-file read cache、workflow walker 或 hidden retry controller。
- 不用 fixture、静态 Markdown、console output、host-resumed turn 或 `NOT_RUN` 伪造 Phase-Agent/Sub-agent behavior evidence。
