---
title: Wave execution and gate systemic root-cause analysis
status: analysis_complete_no_remediation_approved
created: 2026-07-24
scope: BUG-099--BUG-113
evidence_bundle: dpt_rb_openspec-large-project-maintenance-patterns
---

# Wave 执行与 Gate 的系统性根因分析

## 结论

`BUG-099` 至 `BUG-113` 不是十五个彼此独立的实现缺陷，但也不能诚实地压缩成一个万能根因。

已被证实的 DPT 系统性机制失配有两条：

1. **M1：contract lineage 没有在生产者的决策点本地闭合。** 直接事实、把它写入权威面的合法操作、Phase-owned closeout 与后续 Gate 分散在 Markdown、shared protocol、CLI、schema 和 Gate 代码中。Agent 因而过晚才知道上游生产错误，或被迫重建 Engine 已经知道的内部顺序。
2. **M2：同一组 Gate authority facts 没有经由统一的反馈和 degradation policy 投影。** 同一 evaluator facts 会变成一堵看似互不相关的修复墙，而各 Wave adapter 又各自实现 eligibility。

还有一条必须独立处理的边界：

3. **H：phase-entry 公共接口与 host/Agent liveness。** `BUG-103` 与 `BUG-104` 是确定性的 DPT handoff/control-surface 缺陷；`BUG-099` 与 `BUG-106` 是发生在同一边界的 Agent 行为观察，不是已证明的 Engine 因果。DPT 能把 handoff 做得合法、直接，但不能可移植地强迫 host 开启下一 turn，或强迫 LLM 发出 tool call。

本报告是取证分析，不是已批准的行为变更。它不授权 generic controller、host integration、放宽 Gate，或修复历史 bundle。

## 权威与证据

### 权威顺序

```text
AGENTS.md + openspec/config.yaml
  -> accepted specs + executable contracts + active runtime truth
  -> project charter 与两份 evolution direction
  -> backlog plans 与历史 bug reports
```

由此得到的 ownership split 不变：

```text
Agent       研究判断、写作、修复推理、Phase-owned projections
Markdown    Agent-facing task flow 与本地决策上下文
Engine/CLI  schemas、receipts、state transitions、trace、deterministic verdicts
Bundle      runtime facts、artifacts、queue、work-unit、ledger state
```

### 证据标签

| 标签 | 含义 | 可以证明什么 |
|---|---|---|
| **Accepted** | 已接受的 OpenSpec requirement | 必要行为与不变量 |
| **Observed-current** | 当前代码或当前 bundle bytes | 实现或 run state 当前实际是什么 |
| **Observed-historical** | 历史 trace、diagnostic 或 bug report | 一个症状或调查线索 |
| **Hypothesis** | 没有 red-capable proof 的合理因果解释 | 应该测试什么，而不是应当宣称什么 |
| **Proposed** | 未来设计方向 | 候选修复，而不是当前行为 |

### Production bundle 只能用于诊断

这个 production bundle 在 Wave1/Wave2 之后不能再作为 causal closure evidence：

- `rb_trace.jsonl:327-328` 为 Wave1 人工插入了 degraded `gate_attempt` 与 `load_complete`；Wave2 在 `:363-364` 也有同样记录。
- 随后的真实 `enter-phase` 事件在文件中更早出现，却引用了未来的人工时间戳（`:343`、`:373`）。因此 trace 已不是按时间排序的合法 handoff 历史。
- 当前 bundle 的 `rb_status.json` 仍是 `state: not_started`，却声称处于 Wave2 status window；`rb_queue.json` 中还保留四个 Wave1 `delegated_in_flight` 记录。

所以，该 bundle 只能用于发现 failure pattern、字节级事实和候选复现，不能证明合法 pass、degraded eligibility、Agent-flow success 或未来修复。所有 closure evidence 都必须来自经正常 instantiator 创建的全新 `dpt_disp_*` bundle，且不得有人工作为的 authority edit。

## 机制地图

### M1：生产者侧的 contract lineage 非本地化

理想路径应当很短：

```text
direct authority
  -> producer-facing local check and legal operation
  -> authoritative commit
  -> Phase-owned projection / closeout
  -> Gate reuses the same facts
```

当前失败并不表示 Agent 应拥有 Engine authority。它表示 Agent-facing path 没有在 Agent 必须行动的决策点持续暴露上述唯一合法闭环。

M1 下有两个 implementation track，因为它们读取不同的 direct authority；不能因此把它们做成一个 generic controller。

| M1 track | Bugs | Direct authorities |
|---|---|---|
| Pre-Wave readiness | 100--102 | `research_access`、canonical topic-state transaction、seed Markdown bytes 与 Gate 的 YAML/schema parser |
| Wave producer 到 closeout | 105、107、108、111、112 | canonical path 与 rich reference content、work-unit result/receipt/cache、submitted ledger row、Phase-owned references/depth/backfill |

以下 current seams 支持这一分类：

- `phase-hitl1.md:135-145` 仍把 access probe 限制为第一个实际 HTTP(S) result。这是当前真实的语义选择，但历史 URL 顺序解释必须有新的真实 search/fetch observation 才能被写成某次 run 的因果。
- `phase-hitl1.md:72,95` 指示 Agent 在 HITL1 intent 持久化后 apply canonical topic state；`canonical-topic-state.mjs:282-287` 又要求 `hitl1_recorded -> setup_ready` status window。低层 guard 本身可能合理；问题是正常的公共路径让 Agent 只能通过晚期失败发现 legal window。
- Seed queue completion 只检查 file receipt（`queue-manager-lifecycle.mjs:35-62`）。frontmatter YAML 由之后的 Gate 才解析，因此坏的 producer output 可以一直走到 phase-end 才得到确定性反馈。
- Wave1 的本地 drain loop 直接给出 formal `submit`（`phase-wave1.md:131-143`）；完整的 `dry-submit -> repair -> submit -> projection` 链却在 shared protocol（`shared-subagent-protocol.md:80-106`）。reference materialization、depth review 和 seed projection 又分别在 `phase-wave1.md:168-226` 的后段出现。

### M2：Gate feedback 与 degradation 是竞争性的投影

理想路径同样应当很短：

```text
one structured evaluator result
  -> smallest independent primary repair set
  -> durable diagnostic detail for dependent symptoms
  -> one fail-closed eligibility decision from the same facts
```

问题不是 Gate 应该变得宽松。queue、receipt、ledger、trace、provenance、binding 与 required structure 仍是 authority failure，必须 fail closed。

Observed-current 代码显示 policy 分裂：

- `wave-contract-findings.mjs:259-288` 保留每一个非 masked blocking finding；`projectInspectContract()` 在 `:327-365` 将每个可行动 blocking finding 变成 primary hint。
- Wave0 在 `check-gate-wave0-complete.mjs:112-159` 硬编码自己的 eligible set。
- Wave1 在 `check-gate-wave1-complete.mjs:122-148` 硬编码另一套 eligible set。
- Wave2 的 `check-gate-wave2-complete.mjs:91-120` 没有对应的 degraded-handoff path。

Accepted `gate-skeleton` contract 要求 primary hints 只包含独立 primary roots，也要求 Engine-owned/provenance failure 指向合法的 Engine path 而非手工编辑。因此 M2 是 projection/policy consistency 问题，不是把独立根因降成不可见 warning 的许可。

### H：direct phase entry 与 host liveness 必须分离

`enter-phase` 当前写入 route-bound load/current node 并渲染完整 resolved plan（`enter-phase.mjs:97-143`）。`advance-status` 再独立确认 witnessed target node 后同步 source Gate window（`advance-status.mjs:169-206`）。每个低层操作都有窄且可辩护的 durable responsibility；但正常 caller 必须知道 target、记住 source Gate、按顺序执行两步，并区分“loaded”与“ready to execute”。

这证明 handoff interface 过浅，不能证明某个 context size、token threshold 或某一句话导致了 Agent stop。Wave entry 的 current direct mandatory Markdown closure 在 [candidate phase-entry analysis](../silent-autonomous-execution/candidate-direct-phase-entry-root-cause.md) 中测得约 95--111 KB；它证明 repeated control surface 过大，不证明模型因果阈值。

候选接口 `consume-phase-handoff --bundle <bundle>` 可能是一个 deep module，因为它将既有 deterministic bookkeeping 隐藏在一个 caller fact 之后。它必须在 partial recovery 与 fresh-session entry-core contract 有 focused proof 后才可成为 change；绝不能扩张成 workflow runner、chat observer、session registry、read cache、goal state、watcher 或 retry tree。

## 每个 Bug 的处置结论

| Bug | 校正后的事实 | 所属机制与 closure boundary |
|---|---|---|
| 099 | 观察到了 Agent pause/question。context pressure 合理但未证实；Engine 不能检查 chat 或推断 stopped turn。 | **H residual actor observation。** 只有在合法 handoff 后，重复独立的 `agent_flow_e2e` 证明 Agent 执行 first entry-core action 才能关闭。 |
| 100 | 当前 first-result-only probe semantics 确实存在。历史上“后续 result 可 fetch”的叙述没有被持久化为可归因的 run record。 | **M1 access observation。** 需新的 bounded real search/fetch evidence 区分 search availability、representative fetchability 与 unavailable environment。 |
| 101 | `enter-phase`/status window 与 topic-state apply 各自严格，但正常 HITL1 producer path 暴露了 ordering problem。 | **M1 readiness。** disposable deterministic case 必须在 HITL1 Gate 前证明合法 producer checkpoint，且不得 direct-edit state。 |
| 102 | Seed completion 验证的是 file receipt，YAML parsing 在更晚的 Gate 才发生。 | **M1 readiness。** 在 authoring 或 batch completion 复用 Gate parser/schema，并证明 invalid YAML 在 phase-end Gate 前被发现。 |
| 103 | entry 后 status 并非天然“drift”：`load_complete` 后再同步 status 是合法的低层拆分。公共 two-command protocol 泄露了该 intermediate state。 | **H deterministic handoff defect。** 证明 normal public handoff 在 status witness 存在前绝不会宣称 target 可执行。 |
| 104 | repeated complete dependency closure 客观上很大，但不能证明特定模型的 context-exhaustion 因果。 | **H control-surface defect。** 证明 entry core 对 fresh session 已足够，并测量缩小后的 normal closure；不得创造“already read” authority。 |
| 105 | 历史 fenced-YAML 理论混淆了 raw `source.yaml`、aggregate shared file 与 rich reference Markdown。 | **M1 authoring contract。** 分别改变 canonical path、rich parser-compatible content 与 submitted backing；每个都必须只诊断自己的 root。 |
| 106 | “先总结再等待”是 actor outcome，不证明 Engine marker 可以检测或强制 continuation。 | **H residual actor observation。** 同 BUG-099 的 closure boundary；不得增加 chat/tool-call detector。 |
| 107 | Bug report 的“5/5 submitted”与 ledger evidence 矛盾：仅一项 Wave1 work unit formal submitted，四项被拒绝。最新 Phase contract 已将 depth review 指给 Phase Agent，但没有把它交付为同等直接的 main-loop action。 | **M1 closeout。** 一个真实 returned work unit 必须 dry-submit、formal submit、追加 ledger row，再触发 Phase-owned reference/depth work。 |
| 108 | Seed return-map/backfill 属于 Phase，并已在 Wave1 后段指导中描述；问题是 control-path delivery，不能因此让 Sub-agent 修改 Phase projection。 | **M1 closeout。** 证明 submitted-row-gated backfill 发生在 inspect 前，且不能用 placeholder-only mechanical substitute 代替。 |
| 109 | 症状是 excessive primary repair projection，而非单纯存在 `masked_rule_ids`。一个 parent failure 不应淹没 Agent。 | **M2 feedback projection。** parent-only 与 independent-root fixtures 必须区分 collapsed dependent feedback 和真的独立 roots。 |
| 110 | Wave1 已有仅针对 `per_topic_ref_md_count_floor` 的窄 degraded path。该 run 有 queue、provenance、structure 与 backing blockers，拒绝 degradation 正确。 | **M2 reclassification。** regression 证明 quality-only eligible degradation，同时保持每个 ineligible authority root failed。 |
| 111 | 当前 `parseReferenceMetadata()` 在 first semantic section 前接受 bullet/colon metadata（`gate-helpers-checks.mjs:327-339`），不是 whitespace-exact YAML parser。noncanonical filename、bare-YAML aggregate 与 backing 是独立事实。 | **M1 authoring contract。** 不把 fenced/bare YAML 加为第二 rich-reference authority。 |
| 112 | rejection 并不全是 `cache_trails`；历史 trace 同时有 cache 和 receipt roots。磁盘上的文件不能制造 declaration 或 provenance。 | **M1 returned-work preflight。** dry-submit 必须暴露真实 root，formal submit 必须 fail closed；不得 scan disk 后补 candidate。 |
| 113 | Wave2 缺少 eligible degradation 的 adapter support，但观察到的 Wave2 failures 含 queue/finding-index/binding roots，之后的 pass 是人工写入。 | **M2 adapter consistency。** 证明 shared policy consumption，同时所有当前 ineligible Wave2 roots 仍失败；synthetic eligible rule 只在 accepted specs 允许时证明 adapter capability。 |

## 历史叙述的重分类

下列叙述不得作为未来 proposal 的事实继续传播：

- `BUG-105` 不能证明 Gate 应接受 fenced YAML rich-reference metadata。
- `BUG-107` 不能证明五个 Wave1 work unit 都 formal submitted。
- `BUG-110` 不能证明缺少 Wave1 degradation mechanism，也不支持 partial advance。
- `BUG-111` 不能证明 parser whitespace-strict。
- `BUG-112` 的范围大于 `cache_trails`，不能通过发现磁盘文件修复。
- `BUG-113` 不能证明这次 Wave2 run 应当 degraded handoff。

这不是纯文字修正。每个错误叙述都会导向不安全的“修复”：放宽格式、伪造 provenance、自动修复 authority，或未经授权的 degraded pass。

## 对现有 Remediation Plan 的复核

现有的 [Wave/Gate remediation plan](../wave-execution-and-gate-remediation.md) 对 `BUG-100`--`BUG-113` 的拆分仍然合理，前提是以本报告校正后的事实作为 requirement，而不是沿用原始标题：

1. `make-pre-wave-readiness-feedback-direct` 拥有三个 M1 readiness facts。
2. `make-wave-producer-contract-and-closeout-direct` 拥有 Wave M1 loop。
3. `simplify-wave-gate-feedback-and-degradation-policy` 拥有 M2。

第二个 change 必须先于第三个：Gate projection 必须消费 truthful submitted-backed producer facts，而不是 filesystem-shaped substitute。三者不得合并为 generic controller。

独立的 [Silent Autonomous Execution](../silent-autonomous-execution.md) research backlog 正确拥有 H。其 candidate direct-handoff design 只能在 deterministic contract 完整后成为 focused OpenSpec change。它不阻塞三个 Wave/Gate changes，也不能因为 host 开了新的 turn 就声称关闭 BUG-099/106。

## 任何 Closure Claim 之前所需的新证据

| Cluster | Red-capable fresh proof | 必须继续为 false / fail closed 的情况 |
|---|---|---|
| Handoff 与 entry（`099, 103, 104, 106`） | 新 bundle 展示旧 ordering problem，再展示含 route-bound load、synchronized status、bounded first action 的合法 handoff。另以重复 real Agent-flow run 断言 first target action。 | host-resumed turn 本身不是 Agent-action proof；DPT 不得观察 chat 或 tool-call absence。 |
| Pre-Wave M1（`100--102`） | 一个 bounded real access observation；invalid topic-state 和 invalid seed 的 deterministic fixture 在 producer checkpoint 失败。 | search snippet、伪造 URL 或把 phase-end Gate 作为首次发现都不能算 readiness proof。 |
| Wave M1（`105, 107, 108, 111, 112`） | controlled fixture 独立改变 path/content/backing；真实 returned work item 先失败 dry-submit，再修同一 attempt、formal submit、到达 Phase closeout。 | filesystem presence、cache scan、手写 receipt 或 Phase Agent 冒充 Sub-agent 都不能制造 coverage。 |
| M2（`109, 110, 113`） | pure evaluator test 覆盖 parent-only 与 independent roots、common-policy adapter；另有 Agent-flow case 消费返回的 feedback。 | queue、receipt、ledger、trace、provenance、binding、required structure 无论 attempt count 都必须 ineligible。 |

每个 fresh bundle 都必须保留 command output 与最终 trace/index/diagnostic hashes；含手写 `gate_attempt`、手写 status/trace 或 direct authority edit 的 bundle 一律不得被用作 proof。

## Design Guardrails

任何后续 proposal 都必须同时满足两份 evolution direction：

- **Shortest correct control loop：** 在 production 与 Gate 时复用 direct authority 和同一个 checker；short-circuit dependent symptom；返回最小 independent root set 与一个 exact rerun。
- **Helper-oriented execution：** Agent 执行普通合法 command 与可逆 mechanical repair；用户只承担新的语义、风险或不可代理 external action。它绝不伪造缺失的 Engine capability。

下列内容仍在范围外：

- generic workflow controller、background watcher、session registry、chat observer、把 task list 当 scheduler 的方案，或第二套 lifecycle state machine；
- 依据不可证明的“already read”事实 session-aware 地压制 shared Markdown；
- 自动修复 status、queue、result、receipt、ledger、trace、cache-trail 或 provenance；
- 把 presentation preference 变为 blocking authority，或把 structural/provenance failure 变为 degradation-eligible quality defect；
- 用 disposable fixture、console summary 或人工修复的 production bundle 声称真实 Agent/Sub-agent evidence。

## 推荐顺序

1. 保留 production bundle 作为 diagnostic snapshot；不要修复它，也不要将它复用为 fixture。
2. 在为相关 M1/M2 cluster proposal 代码 change 之前，先构造对应的 fresh red-capable evidence。
3. 通过 OpenSpec 顺序推进三个 Wave/Gate changes：readiness、producer/closeout、Gate projection/policy。
4. H 保持独立证据轨。只有 public interface、partial recovery、entry-core sufficiency 与 verification boundary 都 decision-complete 时，才 propose direct-handoff module。
5. 只有重复独立的 real-Agent evidence 才能关闭 BUG-099/106；deterministic interface improvement 或 host continuation experiment 均不足够。

## 主要来源

- `guidelines/project-charter.md`
- `guidelines/evolution-simple-reliable-control.md`
- `guidelines/evolution-helper-oriented-agent.md`
- `openspec/specs/gate-skeleton/spec.md`
- `openspec/specs/workflow-node-contract/spec.md`
- `openspec/specs/canonical-topic-state/spec.md`
- `openspec/specs/delegated-work-units/spec.md`
- `DPT_FRAMEWORK/cli/enter-phase.mjs`
- `DPT_FRAMEWORK/cli/advance-status.mjs`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
- `DPT_FRAMEWORK/engine/helpers/wave-contract-findings.mjs`
- `dpt_rb_openspec-large-project-maintenance-patterns/rb_trace.jsonl`
- [Wave/Gate remediation plan](../wave-execution-and-gate-remediation.md)
- [Silent autonomous execution analysis](../silent-autonomous-execution.md)
