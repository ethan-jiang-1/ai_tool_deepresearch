---
title: Guidelines systemic audit for Wave execution and Gate remediation
status: analysis_complete_no_guideline_change_approved
created: 2026-07-24
scope: guidelines/ against M1, M2, and H in systemic-root-cause-analysis.md
depends_on: systemic-root-cause-analysis.md
---

# 指导原则系统审计

## 结论

**有需要修正和补强的地方，但不是两条新 evolution direction 的方向错了。**

`evolution-simple-reliable-control.md` 和
`evolution-helper-oriented-agent.md` 的核心判断仍然成立：

- Agent 负责有合法路径的内容判断和机械执行；Engine 保留确定性 authority；
- 控制路径应读取直接事实、复用同一个 checker、短路派生症状，并 fail closed；
- 不能以本次故障为由引入 generic controller、watcher、chat observer、第二状态机或自动伪造 authority。

问题在于：这些原则大多是正确的**姿态**，却没有被提升为每条正常 Agent 路径都必须满足的**完整性义务和证明义务**。因此它们能正确否决坏方案，却没有阻止一些看似简单的高层流程遗漏关键合法步骤。

这次发现的根因与指南的关系如下：

| 根因 | 审计结论 | 指南处置 |
|---|---|---|
| M1：producer-side contract lineage 非本地化 | 存在真实的指南缺口和若干高层流程漂移。 | 补 producer-to-gate lineage、dry-submit/closeout、无合法写入路径的反馈契约。 |
| M2：Gate facts 的投影和 degradation policy 不一致 | 主要是实现未遵守已有 simple-control 原则。 | 不以新增大段原则替代代码/规格收敛；只澄清最小独立根因集的措辞。 |
| H：phase entry 公共接口与 host/Agent liveness 混淆 | 存在 handoff/entry-core 缺口和 liveness 表述张力。 | 补 action-readiness、fresh-session entry core、确定性证明与 actor 证明的边界。 |
| 证据污染 | 现有“真实执行”规则不足以区分可诊断字节和可用于 closure 的证据。 | 增加 evidence-admissibility 纪律，不增加防篡改系统。 |

所以建议不是“重写 guidelines”，而是以少量明确的 review contract 让现有两条方向真正可执行。它们应在未来 OpenSpec proposal/design 中被逐项回答和验证，而不是变成又一层 Engine runtime controller。

## 审计方法与边界

本审计以 [系统性根因分析](systemic-root-cause-analysis.md) 的证据标签为准：

- accepted spec、executable contract 和 active runtime truth 决定当前行为；
- guideline 只定义稳定原则、边界和设计评审标准；
- 被人工写入 gate/status/trace 的 production bundle 只能诊断，不能闭合因果或 pass/degradation/actor-flow claim；
- 观察到 Agent pause 不等于已经证明 Engine、context size 或某条 Markdown 文案是因果；
- 这里不批准任何 runtime 行为变更，也不授权修改 `DPT_FRAMEWORK/`、tests 或现有 guidelines。

审计的关键不是把每个 BUG 映射到一条 prose，而是检查一个未来 change 是否能让 Agent 在**最早合法且可修的决策点**完成唯一链路：

```text
M1 producer path
direct authority
  -> legal producer operation
  -> last reversible local check
  -> authoritative commit / receipt
  -> named Phase closeout
  -> Gate reuses the same fact

H phase entry
caller intent
  -> public deterministic handoff
  -> synchronized action-ready state
  -> bounded fresh-session entry core
  -> first legal Agent action

M2 consumer path
one evaluator result
  -> smallest independent root set
  -> durable dependent diagnostics
  -> shared inspect / gate / degradation policy projection
```

任何一条箭头缺失，不能把剩余步骤交给 Agent 通过阅读大量源码、猜格式或手改 authority 来补齐。

## 需要补强或修正的指导

### G-01：缺少 producer-to-gate contract-lineage 完整性义务

**严重度：高。影响：M1 / BUG-100--102、105、107、108、111、112。**

现有 simple-control 已经要求 direct facts、one rule source、decision-point proximity 和 same-check repair（`guidelines/evolution-simple-reliable-control.md:116-183`）。Project Charter 也在 `:345` 正确要求把 bug 当作 contract-class probe。

但它们没有要求 proposal/design 明确一项 blocking fact 从生产到 Gate 的完整责任链。于是下面的东西可以分别“正确”，但整体对 Agent 不可执行：

- Gate 能解析并拒绝坏 YAML 或不完整 work-unit result；
- submit 能正式写 ledger；
- Phase 能做 reference/depth/backfill closeout；
- Markdown 又只在 gate 失败后才提示其中某一个步骤。

这正是 M1：合法 writer、最近可逆检查、formal commit、Phase-owned projection 和 Gate consumer 分散在不同表面。

**应补的原则：Contract-Lineage Completeness。** 每个新增或变更的 blocking fact，在 proposal/design 中必须回答：

```text
direct authority
-> owner
-> legal producer operation
-> last reversible local check
-> authoritative commit / receipt
-> named projection or closeout owner
-> Gate reuse of the same evaluator/fact
-> Agent-visible feedback and same-check rerun
```

如果其中任一环没有合法 owner 或公开操作，结论应是 `missing contract`，不是让 Markdown 补一段猜测、让用户手工编辑 runtime state，或让 Gate 静默修复它。这只是一个设计审查表，不是新 controller。

**建议落点：**在 Project Charter 的 bug/contract-class probe 纪律和 simple-control 的 admission test 之间建立交叉要求；具体 schema/CLI/closeout 行为仍留在 OpenSpec/specs。

### G-02：高层 delegated canonical flow 遗漏 dry-submit 和 Phase-owned closeout

**严重度：高。影响：M1 / BUG-107、108、112，并放大 BUG-109。**

`agentic-execution-model.md:29-35`、`:121-130` 和 `:168-180` 将正常路径概括为：

```text
queue demand -> work unit -> sub-agent -> submit -> ledger -> gate
```

`agentic-subagent-mechanism.md:81-94` 和 `:202-212` 也将 submit 后直接接 phase drain/gate。这个概括对 authority ownership 是正确的，却遗漏了两个对正常 Agent 路径至关重要的步骤：

1. returned candidate 必须先 `dry-submit`，在同一 `work_id` 上修复，再 formal submit；
2. formal submitted ledger row 之后，Phase Agent 必须按该 phase contract 做 submitted-backed reference/index/depth/backfill closeout，之后才 inspect/gate。

现有 shared protocol 已有更完整的 `dry-submit -> repair -> submit` 指导，但高层 canonical model 把它抹掉，正好复制了 Wave1 main path 的缺口。结果是“formal submit 能跑”和“Gate 最终能拒绝”都成立，但 Agent 在最早可修点没有被交付唯一合法 loop。

**应修正为的概念链：**

```text
claim
-> bounded actor return
-> dry-submit
-> repair same candidate / same work_id
-> formal submit and Engine-written ledger row
-> named Phase-owned submitted-backed closeout
-> inspect / gate
```

这不授权 Sub-agent 写 Phase projection，也不允许 disk scan 自动补 declaration；它只让高层指南不再省略已存在的合法 transaction。哪些 closeout 存在仍由各 phase accepted spec 决定。

**建议落点：**更新 execution model 的 canonical flow；queue/subagent guideline 只需引用这一完整链，避免三份文本再各自复制一份不一致的 protocol。

### G-03：workflow 把“已 load”误写为“可执行 handoff”

**严重度：高。影响：H / BUG-101、103。**

`agentic-workflow-mechanism.md:61-68` 和 `:76-105` 将正常 phase handoff 描述为：

```text
gate -> check.next -> target-node load
```

它也在 `:120-126` 要求 MD phase body 是完整控制面，并在 `:203-205` 正确说 `load_complete` 只证明 entry/loading。但当前真实低层路径里，`enter-phase` 和 `advance-status` 分别拥有 load witness 和 source-gate/status synchronization；target work 在后者完成前不应被宣称为 action-ready。

因此问题不在低层两步各自是否合理，而在正常 caller 被迫知道内部顺序、source gate 和 bootstrap 特例。把它称为“一跳 load”会掩盖一个内部状态窗口，而不是简化它。

**应补的原则：Public Action-Readiness Handoff。**

- 每个正常 handoff 对 Agent 暴露一个完整、可恢复的 public operation/protocol；
- 在公开 `execute_loaded_node` 或目标第一动作前，必须已有 route-bound load witness、所需 status/gate synchronization 和明确的 `ready` 结果；
- partial state 必须有一个 nearest recovery result，低层 `enter-phase`/`advance-status` 可以保留为 recovery seam；
- 这个 deep-but-narrow deterministic module 不得选择研究动作、推进 workflow loop、推断 Agent intent 或成为 chat/host controller。

这条原则澄清了“JS 不得当 workflow runner”和“JS 可以把一个 caller intent 下的确定性 bookkeeping 封装成一个可靠 public handoff”之间的边界。

**文档卫生：**workflow 文件在 `:35` 声称机制“当前已实现并验证”。在 public handoff 尚未收敛时，应该降格为可核查的 current snapshot，或链接 accepted spec/verification evidence；guideline prose 不应自己宣布完整性已被验证。

### G-04：动态加载缺少 fresh-session、bounded entry-core 不变量

**严重度：中高。影响：H / BUG-104 的确定性部分。**

`agentic-workflow-mechanism.md:151-159` 正确禁止预加载整个 phase graph，`:201-205` 正确解释 on-demand loading 的 gate-chain 意义。但“只在到达 node 后加载”不等于“第一次行动需要读的控制面足够小、足够本地”。当前 normal entry 反复渲染完整 dependency closure，测得约 95--111 KB；它证明 control surface 过大，不证明某一个 Agent stop 的原因。

应该明确区分：

- **graph-level on demand**：不要预加载尚未被 Gate 授权的其他 phase；
- **entry-level locality**：已经授权的 phase 也不能把所有罕见分支、修复协议和角色说明塞进首个 entry closure。

**应补的原则：Fresh-Session Entry Core。** 每个 phase 应有一个 canonical、bounded entry core，让全新 Agent 不依赖“上次已经读过”或 session cache 即可执行第一合法动作；晚期/罕见分支通过 entry core 中明确的 canonical reference 在触发时加载。应验证所有首次动作所需事实都在 core 中、所有 later branch ref 可解析，并记录 render bytes 作为 regression signal，而不要把任意 token/byte 阈值做成 runtime authority。

这不是 summary、memory mirror 或第二 Source of Record，而是把既有 canonical Markdown 按首动作边界分解。

### G-05：action-readiness 与 host/Agent liveness 的措辞需要分开

**严重度：中高。影响：H / BUG-099、106 的错误归因风险。**

`evolution-helper-oriented-agent.md:68-80` 对行动责任的方向正确：当已有授权和合法路径时，Agent 应执行机械工作。问题是 `Autonomous` 的定义以及 queue 文本会被读成 DPT 可以保证 host/LLM 继续行动：

- `agentic-queue-mechanism.md:53-55` 称 queue 让 Phase Agent 在一个连续 run 中继续移动；
- `:242-246` 又说 `unauthorized_continue_required` 时 “Phase Agent must continue”，同时承认这不是 enforced。

这些表述会把 BUG-099/106 从“actor outcome observation”误读为“Engine 没有实施足够强的停止控制”。实际 DPT 能确定性保证的是：**当前 live turn 可见的下一合法动作、相应的 authority 和 repair cue**；它不能可移植地保证 host 发起下一 turn 或模型一定发出 tool call。

**应补的三层表述：**

| 层 | 可以保证 / 证明 | 不可以声称 |
|---|---|---|
| DPT deterministic contract | 合法 handoff、action readiness、直接反馈、fail-closed state | host 自动续 turn、聊天/tool-call absence 的检测 |
| Agent responsibility | 在已有授权和可见动作时应该继续执行 | 所有 Agent runtime 必然继续 |
| actor experiment | 一个真实 Agent 在明确 host/mode 下实际采取首个目标动作 | 任意 host/模型的通用 liveness |

Queue 的 cue、`stop: no` 和 helper posture 应保留，但文案必须从“保证继续”改为“定义当前 turn 的继续义务和可观察的下一个合法动作”。不得用 stronger prose、watcher、chat interception 或 session registry 弥补这条平台边界。

### G-06：反馈契约错误地假设每个 blocker 都有 Agent 可写的 surface

**严重度：中高。影响：M1 和 helper boundary。**

simple-control 在 `:189-217` 提出很好的 contract-lineage-aware rejection：告诉 Agent 缺什么、写在哪里、重跑哪个 checkpoint。但措辞将“每一个 Inspect/gate rejection”都视为有一个当前 Agent 可合法写入的 deterministic repair surface。

这是过强的承诺。实际失败还包括：

- Phase-owned projection 或语义判断；
- Engine-owned receipt/provenance/status binding；
- external access 的未知或 unavailable state；
- 根本不存在合法 producer/reentry path 的 missing contract。

这与 helper guideline `:109-113` 的“没有合法 path 时必须报告 missing contract”尚未收敛。

**应把反馈显式分成两类：**

1. `actor-repairable`：direct fact、合法 producer operation/已授权 surface、same-check rerun；
2. `owner-routed` 或 `no-legal-path`：direct fact、owner、为何不能手改、唯一合法 command/terminal boundary，或明确的 missing contract。

Engine 只应承诺传递它能从静态 deterministic lineage 得到的事实，不应假装拥有全部 Phase 语义流程。这样既给 Agent 可执行路径，也不诱导伪造 status/receipt/ledger。

### G-07：缺少 evidence-admissibility 规则

**严重度：中高。影响：所有 closure claim。**

Charter 已正确禁止伪造和手写 authority（`project-charter.md:85, 254-271`）；simple-control `:326-332` 也要求真实 controlled/production observation；command experiments `:98-106` 有 real events 和 proof-distance 规则。

但这些规则还没有区分：文件字节确实来自一次历史 run，和这份 bundle 仍能证明完整因果/closure，是不同命题。当前 production bundle 在人工写入 `gate_attempt` / `load_complete` 后还保存着真实 trace 字节，但从污染点起不再能证明 legal pass、degradation、handoff 或 Agent flow。

**应补的原则：Evidence Admissibility。**

- direct authority、trace、receipt 或 status 一旦被手工编辑、绕过 normal writer 写入，或其时间/identity lineage 不再自洽，bundle 从该点起标为 `diagnostic-only`；
- 它仍可用于发现症状、设计 red case 和保存历史；
- closure 必须在新的 disposable bundle 中通过真实 command/actor path 重建，保存 command output、trace/index/diagnostic hash；
- deterministic contract、real Agent behavior 和 host lifecycle evidence 必须分别命名，不能互相代替。

这不要求在 runtime 增加签名、watchdog 或防篡改系统；它只是约束我们如何引用和归档已经存在的证据。

### G-08：两处 wording 会反向鼓励错误实现

**严重度：中。影响：M1/M2 的设计评审。**

1. Charter `:291` 要求新 CLI 的 demand-side wiring，方向正确，但“a validator must lock the wording”与 simple-control `:117-118` 的 tolerant presentation 和 `:304-315` 的反 regex/blocking-presentation 原则冲突。文字锁定也不能证明 main loop 真正使用了 canonical action。应验证 **canonical action 的可达性和语义角色**，不是 exact Markdown sentence；只有 machine-readable accepted contract 才锁定格式。
2. Charter `:79` 的 “one clear next action”可能被理解为全局只能返回一个动作；simple-control `:181-183` 实际更精确：**最小独立 root set 中，每个独立 root 有一个最近动作，派生症状进入 durable diagnostic**。应将 Charter 的简写改成后一种表述，避免为了“短”而隐藏真实独立 authority blocker。

此外，queue 的 `retry 3 times max`（`agentic-queue-mechanism.md:188-193`）应明确只是当前 repair guidance 的 diagnostic/escalation cue，绝不是次数到达后获得 degradation/pass 权利。eligibility 仍只由 accepted Gate contract 和 shared evaluator policy 决定，默认 fail closed。

## 明确不是指导原则错误的部分

以下问题不能借本审计扩大为“修改原则即可解决”：

1. **M2 primary hint 墙和 Wave adapter policy 分裂。**这直接违反既有 simple-control 的 one truth path、prerequisite short-circuit、smallest actionable root set 和 inspect/gate shared result 规则（`evolution-simple-reliable-control.md:116-183, 326-332`）。应由 Change 3 的 evaluator/policy 实现与测试收敛，不需要新 generic dependency-graph framework。
2. **BUG-110 的 fail-closed 结果。** Wave1 的 queue/provenance/structure/backing roots 不应因 fatigue 变为可降级；不应改 guideline 来鼓励更多 degradation。
3. **BUG-099/106 的 actor pause。**不能修改 Engine 让它检测 chat、tool call 或 stopped turn。只能用重复独立的 real-Agent evidence 检验 public handoff 改进后的首个目标动作。
4. **BUG-105/111 的 rich-reference/YAML 误判。**不能引入泛 YAML linter、fenced-YAML authority 或 whitespace-exact parser。正确的原则已经是 canonical path、rich content、submitted backing 分开诊断。
5. **provenance/ledger/receipt 的严格性。**不能为了让 Agent 更顺畅而允许 filesystem presence、cache scan 或手写 declaration 充当 coverage。

## 建议的指南收敛包

以下不是现在批准的文件编辑，而是后续需要在 OpenSpec-aligned guidance update 中落下的最小内容。目标是补 review contract，不把具体 runtime behavior 写回 prose。

| 主题 | 主文件 | 必须补的内容 | 不应加入的内容 |
|---|---|---|---|
| Producer lineage | `evolution-simple-reliable-control.md` + Charter | G-01 complete lineage table；G-06 两类反馈。 | 通用 repair controller、自动修复 authority。 |
| Delegated normal path | `agentic-execution-model.md`，queue/subagent 交叉引用 | G-02 dry-submit/same-attempt repair/formal submit/Phase closeout。 | 让 Sub-agent 写 ledger/projection，或让 queue 当 Gate。 |
| Public handoff | `agentic-workflow-mechanism.md` | G-03 ready/partial recovery；G-04 fresh-session entry core。 | JS phase runner、cursor、chat observer、session cache。 |
| Action vs liveness | helper + queue mechanism | G-05 三层保证/证明表。 | 把 `stop: no` 变 host scheduler。 |
| Evidence admissibility | Charter + command experiments/logging cross-reference | G-07 diagnostic-only / fresh closure rule。 | 防篡改 daemon、第二 verdict。 |
| Demand-side verification | Charter | G-08 验证 action role/reachability，不锁 prose 字面。 | Markdown presentation blocker。 |

这些文本应该成对审查：simple-control 决定最短控制形状，helper-oriented 决定 action responsibility；任何机制文件只定义它们之下的 domain-specific boundary。

## 进入修复前的设计门槛

对接下来的三个 Wave/Gate changes 和独立 H research track，建议在 proposal 进入 apply 前统一填写下表。它把现有两份 evolution direction 变成可审计门槛，同时避免把 guideline 变成 runtime spec。

| 必答项 | 需要给出的答案 |
|---|---|
| Direct authority | 哪个直接文件/transaction/evaluator 是唯一 truth？ |
| Producer lineage | 谁写、用哪个合法 operation、最后一次可逆检查在哪里、什么 commit/receipt 使其权威化？ |
| Closeout | formal commit 后谁基于哪份 submitted-backed fact 做什么 Phase-owned projection/judgment？ |
| Consumer reuse | inspect/gate/degradation 是否消费同一 evaluator/result；独立根如何与派生症状分开？ |
| Public Agent action | Agent 在该决策点实际调用的一个完整可恢复 operation/protocol 是什么？ |
| No legal path | 若 Agent 不能合法修复，owner、terminal boundary 或 missing contract 如何明确返回？ |
| Entry locality | fresh session 的第一合法动作需要哪些 canonical bytes；哪些 later branches 延迟加载？ |
| Evidence class | deterministic test、real Agent observation、external action、host lifecycle 各自证明什么，哪些不能证明？ |
| Net simplification | 删除、合并或降级了什么现有复杂度？若没有，为什么是确定性底线？ |

## 建议顺序

1. 将本审计视为对现有 guideline suite 的修订需求，而不是立即修改代码的授权。
2. 在 `make-pre-wave-readiness-feedback-direct` 和 `make-wave-producer-contract-and-closeout-direct` proposal 中使用 G-01/G-02/G-06 的表格；先证明 producer local feedback 和 submitted-backed closeout，再动 Gate projection。
3. 在 `simplify-wave-gate-feedback-and-degradation-policy` 中把 M2 作为已有原则的实现收敛：shared evaluator、最小独立 roots、fail-closed eligibility，不新增“更多 degradation”原则。
4. H 继续留在 `silent-autonomous-execution.md` 的独立证据轨；只在 public handoff、partial recovery、entry core 和 proof boundary 完整后考虑 focused proposal。
5. 将 G-05/G-07/G-08 的澄清作为小型 guidance update 处理，并在同一 change 中链接到相应 accepted evidence；不要把它们混成一次全系统文档重写。

## 最终判断

原有指导原则的**架构边界是对的**，尤其是“Markdown controls Agent Flow、Engine owns deterministic checkpoints”“fail closed”“不建设 generic controller”和“用户只承担必要决策”。

不足在于它们还没有规定：一个正确的 deterministic checker 如何成为一个对 Agent 可完成的生产者闭环；一个正常 handoff 如何从 low-level load 升级为 action-ready public interface；以及什么证据才足以宣布一个真实 Agent/workflow 问题被关闭。

这三项补齐后，未来修复会有明确约束：不再靠在 Gate 末端堆 validator，不再把 Agent 停顿归咎于 Engine 不够强，也不再让一份被人工接管过的历史 bundle 承担它无法承担的证明责任。
