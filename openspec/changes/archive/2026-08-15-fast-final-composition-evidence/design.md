## Context

见 [proposal.md](proposal.md) 的 Why。已归档的 `final-report-composition`
Change 已证明 HITL2 -> Readiness -> Final 的 deterministic contract，但它明确没有声称
real-Agent interaction 或报告语义质量。`case-136` 是保留在
`experiments_playbook/exp_extrem_slow/` 的诊断：它在四个 bundle 中串行运行多轮 HITL2、
Final 和 AI judge，两次均在约 600 秒 timeout，因而不是可接受的 active evidence path。

本 Change 以 `CDE-003` 的完整 requirement modification 纳入 case-137，只使用现有 Autorun、Subject launcher、Final phase、
`persist-final-report` 和 native completion surfaces。它不改变生产 Final 的行为，也不新建
runtime schema、Gate、report-quality verdict 或 retry controller。

## Goals / Non-Goals

**Goals:**

- 建立一条单 bundle、单 Subject、单 report 的 `agent_flow_e2e` 路径；只有保留的
  Supervisor result 满足 `duration_ms <= 60000` 时，才可作为快速 evidence。
- 让每个可成立的 PASS 都能回溯到 fixture boundary 之后的 Subject prompt/transcript/result、
  persistence result、report bytes 和 trace-bound native completion。
- 让不成立的运行一次性停止、保留诊断并退出 active route，而不是用重试掩盖成本或结果。
- 用静态 integration asset 验证 playbook/frontmatter、最小 fixture、30/45/5 秒进程时限、
  60 秒 retained-result threshold 和 case-135/136 exclusion 与 CDE-003 保持一致。

**Non-Goals:**

- 不证明读者适配、报告质量、结论正确性、must-answer coverage、跨-view 差异、HITL2
  recommendation 或自然语言交互质量。
- 不新增 Final production Sub-agent、AI judge、Final Gate、Engine semantic verdict、
  per-case timeout schema 或全局 60 秒 regression policy。
- 不修复、重跑或回迁 case-135/136，也不因本 case 的失败开始第二轮试验。

## Decisions

### One minimal existing-Final path

`case-137-standard-fast-final-composition.md` 将建立一个 `final` role 的 disposable
bundle。setup-only fixture 负责写入一个 root must-answer、一个 submitted-backed finding、
其 Evidence Map backing、当前 round 已接受的 `composition_handoff`，并通过既有 legal
predecessor path 进入 Final。它不写 Final report、Subject prompt/transcript/result 或 native
completion。

fixture 之后，Playbook Agent 通过既有 `run-iterative-interaction-subject.mjs` 启动一名独立
Subject Agent。该 Subject 只读取本 bundle、以一条 message 执行既有 `phase-final.md`、使用
`persist-final-report` 持久化一份不超过 1,600 UTF-8 bytes、恰有一个 Evidence Map row 的
primary report，然后停止。它只获得 `Bash,Glob,Grep,Read,Write`，不获得 `Task`、网络或
production delegation。实现增加 case-137 的窄配置和 observation，而不是给 Final 增加
测试专用分支或新 actor abstraction。

替代方案是缩减 case-136 的四个 view；拒绝它，因为其多轮 HITL2、cross-view comparison 和
AI judge 仍把最短路径扩大为多个独立 Agent turn。另一替代是用 Playbook Agent 自己的输出
证明行为；拒绝它，因为现有 verification routing 明确不允许其替代 Subject behavior。

### Small process bounds plus an observed fast-evidence threshold

case-137 的 Subject launcher 配置 `timeoutMs: 30_000`；Headless Playbook Agent 只获得
45 秒，唯一 health target 只获得 5 秒。Change 的唯一 evidence invocation 是：

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --case case-137-standard-fast-final-composition \
  --timeout 45000 \
  --health-timeout 5000 \
  --max-total-budget-usd <approved-positive-budget>
```

现有实现中，这两个 timeout 分别约束 Headless Playbook Agent 和 health target；setup、audit
与报告完成不在一个可取消的总 deadline 内。此 Change 不把它误写成 Supervisor hard cap，
也不添加 frontmatter field、per-case scheduler 或新的 host policy。Change-level fast PASS
只在保留 Supervisor result 的 `duration_ms <= 60000`、`native_outcome: PASS`、
`lifecycle_outcome: null` 与 `health: CLEAN` 同时成立时才可声明。30 秒 Subject boundary、
45/5 秒 host boundary、记录时长或任一 native/lifecycle/health 结果不满足时，该次运行
只是诊断而不是 retry trigger。

### Narrow native evidence, no semantic judge

case 的 strict checks 只验证以下事实：一名 independent Subject 的保留 runtime evidence
存在；其 result 说明完成；`persist-final-report` committed；正好一份不超过 1,600 UTF-8
bytes、恰有一个 Evidence Map row 的 primary Markdown report；Final 没有问题、Gate 或 outgoing
transition；以及 completion 带有全部声明 evidence roles。它可读取 report bytes 用于 identity、
size、Evidence Map row count 与 persistence checks，但不解析 prose 来给质量打分。

因此 `verification-plan.yaml` 对该 playbook 声明：

| Field | Value |
|---|---|
| `test_class` | `agent_flow_e2e` |
| `proof_subject` | `agent_behavior` |
| `subject_execution` | `real_agent` |
| `fixture` | `setup_only` |
| `runtime` | `real_disposable_bundle` |
| `external_calls` | `none` |
| `verdict_judge` | `deterministic` |
| native completion authority | `trace_jsonl` through native completion |
| fast-evidence record | retained Supervisor report/audit for `duration_ms`, lifecycle, and health |

`tests/integration/md/case-137-fast-final-composition-contract.test.mjs` 是一个独立的
deterministic asset：它只检查 source playbook、manifest、Subject configuration 和
exclusion wording 的结构一致性，不能产出或替代 Agent-behavior PASS。

### Fail once, quarantine once

满足上述 fast-PASS evidence 条件时，case-137 保留在 active manifest，作为 explicit assurance/calibration candidate，
但不会被 fast regression 自动选择，因为 `agent_behavior` 仍不属于其 scope。若该唯一
小进程边界和 60 秒 observed threshold 未产生 clean result，Apply 立即完成以下有限操作：保留 Supervisor
report/audit 和 run root；从 active manifest 删除 case-137；将 playbook 移至
`exp_extrem_slow/`；在 Change evidence 中记录 `no-evidence`，不写 CDE-003 PASS claim；
然后停止。这个 failure branch 是实验的正常收口，不是重新设计、重跑或悄悄替换 source。

### Semantic closure is not applicable

本 Change 不更改或新增 Deep Research Harness 的 deterministic runtime semantic resolver、
authority-establishing Engine surface 或 verdict consumer。它只新增一个 experiment asset 和
其测试 Subject configuration；case runtime 的 trace/completion 仍由既有 Autorun capability
拥有。因此 change-root `semantic-closure.yaml` 使用严格的 `not_applicable` branch，而不是把
test evidence 误登记为新的 Harness runtime fact family。

### Constitutional boundary

这个 Change 没有引入新的 production state、projection、view 或 Gate；semantic-precision
review 的对象只是一个证据问题：维护者能否在 native completion 处停止，并准确说“观察到
一个 bounded real-Agent execution”或“没有此证据”。Source of Record 是 Supervisor-bound
native completion 和其 retained Subject evidence，而不是 chat、static test 或 report prose。

最短合法闭环就是 fixture -> Subject -> existing persistence -> native completion。它通过移除
case-136 的三份额外 bundle、多个 Agent turn 和 judge，减少 control shape；没有重试和
fallback。用户只决定是否批准这条独立的 evidence Change；Agent 依法执行 playbook；
Supervisor/Engine 仅裁决 timeout、trace、completion 与 health 的确定性事实，绝不裁决
报告语义质量。

## Risks / Trade-offs

- [最小 case 没有在 60 秒观察阈值内留下 clean result] -> 一次运行后隔离并记录 `no-evidence`；不扩大 timeout、
  不自动重试，也不阻塞 Change closeout。
- [setup fixture 被误读为真实 HITL2 或 research proof] -> frontmatter/verification plan 标记
  `setup_only`，native checks 只把 fixture 作为 precondition，并在 outcome text 明确排除。
- [静态 asset 被误报为 Agent evidence] -> 独立 claim 明确其 `deterministic_contract` 边界；
  CDE-003 的 case-137 PASS 只能由 retained native completion 建立。
- [单一 view 未覆盖其他 report form] -> claim 只描述一个 existing Final path；四-view 比较
  继续为未选范围，case-136 仅保留诊断价值。
- [源代码仍可被手工用更大 timeout 调用] -> 这不满足 Change 的唯一 evidence invocation；
  static contract 明确 30/45/5 秒时限，closeout 只接受该 command 的 report/audit。

## Migration Plan

1. 添加 CDE-003 delta、change-local verification plan 和 `not_applicable` semantic closure；
   通过 plan-mode governance checks 后才编辑 target assets。
2. 新增 case-137、Subject configuration、manifest registration 和静态 integration contract
   test；通过 route/assets checks 与 selected deterministic test。
3. 使用唯一的 `--timeout 45000 --health-timeout 5000` command 运行一次并保存 native
   report/audit，读取保留的 `duration_ms`、native、lifecycle 与 health fields；该命令本身不被
   表述为总 case deadline。
4. 若 60 秒阈值内的 clean PASS，在 Change closeout 中链接该 run 的真实 evidence，并保留 case-137
   active。若不是 clean native PASS，执行一次 quarantine branch，记录 no-evidence result，
   不再重跑，然后以无 CDE-003 case-137 PASS claim 的实验结论关闭。

没有数据 migration 或 production rollback。PASS 后若将来发现 case-137 不再适合 active
suite，也只能由后续 Change 决定；本 Change 不预设第二次 mutation。

## Applied Outcome

The one allowed invocation ran with the specified 30/45/5-second boundaries
and a 20 USD maximum total budget. Its retained Supervisor result reported
`duration_ms: 45177`, native `null`, lifecycle `ERROR`, health `null`, and
`agent_timeout`; actual cost was `$0.328053`. This selects the existing
no-evidence branch: the diagnostic remains retained, case-137 is quarantined
outside the active manifest, and the verification plan retains only the
deterministic source-contract claim. No production behavior, retry, or
Agent-behavior PASS claim is added.
