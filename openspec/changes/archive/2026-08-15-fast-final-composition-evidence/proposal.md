## Why

`final-report-composition` 已以 deterministic contract 归档：HITL2 的
`composition_handoff`、Readiness witness 与 Final 的 terminal guidance 均已具备，
但这不证明真实 Agent 曾在该边界内完成过 Final composition。原先承担该问题的
`case-136` 同时测试四个 view、HITL2 多轮交互和独立 AI judge；两次 native run 都在约
600 秒后超时，已隔离为诊断历史，不能继续阻塞交付。

本 Change 只补一条窄而诚实的真实 Agent 证据：一个独立 Subject Agent 在已有合法
Final entry、已接受 handoff 和小型 verified-state 前提下，完成一次 terminal report
composition。原始需求和边界来自
[`_backlog/plans/final-report-composition/progressive-plan.md`](../../../_backlog/plans/final-report-composition/progressive-plan.md)
的 `Next Recommended Work`；该索引明确要求另开 Change、以 60 秒作为快速证据阈值，
且不得把 fixture/static check 表述为报告语义质量证明。

## What Changes

- 一次性注册并执行了 `case-137-standard-fast-final-composition.md`：它只运行一个真实
  Subject Agent、一个 view 和一个 Final report；setup-only fixture 只建立合法 Final
  predecessor、一个 must-answer、一个 submitted-backed finding 和一个 Evidence Map
  backing，不产生 Subject-attributed pass fact。该路径在唯一运行超时后已移出 active
  manifest 并隔离。
- Subject Agent 仅在实验中执行一次现有的 Final Phase Agent 路径：以一条 instruction 读取已
  接受的 `composition_handoff` 和 verified state，通过 `persist-final-report` 写出一份
  1,600 UTF-8 bytes 以内、含一个 Evidence Map row 的 primary Markdown report 后停止。它不
  执行 HITL2 interaction、不发起 Final question/Gate/transition、不启动 production Sub-agent，
  也不使用网络检索、`Task` 或独立 AI judge。
- Change completion 的唯一真实运行命令必须使用 `--timeout 45000 --health-timeout 5000`。
  这是现有 Headless Playbook Agent 与单一 health target 的进程时限，不是整个 Supervisor
  的未实现总 deadline。只有保留的 Supervisor result 同时为 `duration_ms <= 60000`、native
  `PASS`、null lifecycle 和 `CLEAN` health 时，才可建立本 Change 的快速 evidence。其他一次性
  结果保留为诊断而不重试；该 case 立即退出 active manifest 并移入
  `experiments_playbook/exp_extrem_slow/`。这比既有 120 秒 slow-case rule 更严格，只适用
  于本 Change 的证据路径。
- 记录一条 runtime-bound `agent_behavior` claim：真实 Subject Agent 在 fixture boundary
  之后保留其 prompt/transcript/result、Final persistence result 和 report bytes，并满足
  一份 report、一次 `persist-final-report` committed result、无 Final question/Gate/transition
  的可检查终端纪律。该 claim 不评价文笔、读者适配、结论正确性、coverage 或跨-view 差异。
- 保留 `case-135` 与 `case-136` 在 `exp_extrem_slow/` 的诊断定位，不重启、不回迁、也不把
  它们的历史报告混入本 Change 的 completion evidence。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/content-delivery-experiments` | `openspec/specs/research/content-delivery-experiments/spec.md` | Modify | CDE 已拥有 delivery-phase playbook、case-135/136 quarantine 和 future fast evidence 的明确边界；新增 case-137 是同一 capability 的一个窄 requirement。 |
| `verification/experiment-agent-autorun` | `openspec/specs/verification/experiment-agent-autorun/spec.md` | Verify-only | 现有 Supervisor 已提供 Headless Playbook Agent、独立 Subject Agent evidence、native completion 和显式 `--timeout`；本 Change 不修改其 schema、lifecycle 或 authority。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 现有 taxonomy 已允许 setup-only、`agent_behavior`、`real_agent` 和 deterministic judge；本 Change 只按该 route 声明 proof，不修改 taxonomy 或 checker。 |
| `verification/experiment-run-strategy` | `openspec/specs/verification/experiment-run-strategy/spec.md` | Excluded | 60 秒是本 Change 的 retained fast-evidence threshold，不改变其 120 秒 regression SLO、selection projection 或任何全局 batch policy。 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md` 与已归档 Final guidance | Excluded | Final production guidance 与 executor 不变；case-137 只观察既有 path，不改变 Final 行为。 |
| `agent/subagent-node-contract` | `openspec/specs/README.md`、`openspec/specs/verification/verification-routing/spec.md` | Excluded | 独立 Subject Agent 只存在于 experiment evidence；不新增或修改 production delegated/Sub-agent path。 |

## Capabilities

### New Capabilities

无。现有 `research/content-delivery-experiments` 已拥有 delivery-phase
playbook 的可观察行为与 quarantine 规则。

### Modified Capabilities

- `research/content-delivery-experiments`: 增加一条单场景、60 秒 retained-evidence threshold
  的真实 Subject-Agent Final composition requirement，并规定其证明边界和隔离。

## Semantic Precision

`fast-final-composition-evidence` 回答的有界问题是：**在已被确定性路径合法送入 Final
的一个 finding / 一个 must-answer 最小状态上，一个真实 Subject Agent 能否完成一次现有
terminal composition path，并留下 `duration_ms <= 60000` 的可审计 native evidence？**

它保留会改变答案的区别：真实 Subject runtime 与 Playbook Agent、setup-only fixture 与
Subject-produced facts、native completion 与 host health、PASS/NOT_RUN/ERROR、以及本次
60 秒观察阈值、45/30/5 秒进程时限与一般 120 秒 slow-case policy。它刻意不合并或判断 reader-value、
HITL2 interaction、四个 view、自然语言质量、报告内容正确性或语义质量。

正常停止点是 native completion 及其 retained runtime evidence：PASS 只回答上述单一
执行问题；NOT_RUN、FAIL、ERROR 或 timeout 只触发隔离，不允许以 fixture、Playbook Agent
参与或历史 case-136 记录补出成功。

## Control And Responsibility

现有 Supervisor、case-owned trace 与 native completion 仍是运行结果的 Source of Record；
Change-root `verification-plan.yaml` 只选择证明 route，不能生成 PASS。Subject Agent 负责
读取既有 Final guidance、完成一次 composition 与持久化报告；Playbook Agent 负责执行
Markdown procedure 并发布 native completion；Supervisor 负责 45 秒 Headless 进程超时、5 秒
health target 超时、audit 和保留；Engine 继续只判断既有 schema、entry 与 persistence，
不判断报告质量。

最短合法闭环是：

```text
setup-only legal Final predecessor
  -> one real Subject Agent executes existing Final guidance
  -> persist-final-report commits one report
  -> playbook records strict native checks and completion
  -> Supervisor preserves a result whose recorded duration is checked against 60 seconds
```

该闭环删除 case-136 的四个 isolated bundles、HITL2 多轮互动、cross-view comparison 与
AI judge。它不创造新 Engine verdict、report-quality rubric、Final Gate、retry loop 或
production Sub-agent capability。

## Impact

- 实际 target assets 限于一个已隔离 delivery playbook、quarantine manifest listing、Subject
  runtime scenario/configuration 和其窄的 static contract test；不修改
  `DEEP_RESEARCH_HARNESS/` 的 production schema、Gate、Final phase 或 Supervisor
  implementation。
- Change 的最终 verification plan 只保留 integration 的 deterministic source-contract
  proof；唯一 real-Agent execution 已作为 no-evidence diagnostic 保留，`agent_flow_e2e`
  不再承载 PASS claim；unit 与 deterministic E2E 不适用。
- 无依赖变更、无 TypeScript、无 production compatibility migration，也不复活
  `case-135`/`case-136`。

## Applied Outcome

The one authorized case-137 invocation retained `duration_ms: 45177`, native
`null`, lifecycle `ERROR`, and health `null` after the 45-second Headless
timeout. It therefore produced no fast Agent-behavior evidence. The case is
quarantined at
`experiments_playbook/exp_extrem_slow/case-137-extreme-slow-final-composition.md`,
outside the active manifest; `agent-run-evidence.md` indexes the run-owned
diagnostics. This Change neither retries the run nor claims CDE-003 PASS.
