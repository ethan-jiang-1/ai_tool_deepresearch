# 推荐方案：Final 内部的 Report Composition Pass

> 状态：当前选择的 plan 设计，不是 accepted spec、实现许可或 runtime contract。
>
> 当前执行者：Final Phase Agent 直接完成整个 Report Composition Pass；暂不引入 Sub-agent。
>
> 相关推敲：组织算法见 `composition-logic-feasibility.md`，view 语义见 `view-contract-sketch.md`，delegation 备选见 `subagent-composition-seam.md`。

## 1. 结论先行

Final 需要一个逻辑上必经的报告编排环节，但不应把它做成 graph 上的新 phase、Gate 或用户交互点。

```text
readiness passed
      |
      v
phase-final
  -> resolve composition brief
  -> Final Phase Agent runs Report Composition Pass
       -> build Answer Inventory
       -> close coverage and materiality
       -> choose one narrative spine
       -> plan placement and omissions
       -> draft retained staging report
  -> Final Phase Agent performs semantic self-check
  -> Engine admits backing and persists final report
  -> deliver
```

这个环节有两个同时成立的性质：

1. **语义上必经**：不能跳过内容盘点和组织判断，直接把 Wave2 改写成报告。
2. **拓扑上内含**：它仍属于 `phase-final`，不新增 lifecycle node、第三个 HITL 或 outgoing Gate。

对用户而言，Final 仍然是一到就出报告。复杂度只存在于内部执行。

## 2. 这个 Module 解决什么问题

Report Composition 不是模板选择器，也不是第二次研究综合。它回答：

> 在当前读者和使用目的下，怎样把已经验证的研究判断组织成一条完整、诚实、有效率的阅读路径？

Wave0 到 Wave2 主要产生事实、证据和研究判断。Final 负责 communicative composition，但不能重新裁决研究事实。

同一 verified state 可以产生不同报告，因为下面这些内容可以变化：

- 从哪个结论进入；
- 以 decision、question、claim、mechanism、topic 或 evidence 为主线；
- 哪些 finding 放在正文前部；
- 技术细节和来源细节展开到什么程度；
- 哪些材料进入 appendix；
- limitation 是就地出现还是集中总结。

以下内容不得随 view 漂移：

- finding 的基本含义；
- status、confidence、priority 和 gap；
- supporting 与 contradicting evidence 的关系；
- material limitation 和 unresolved uncertainty；
- root must-answer coverage；
- provenance 与 submitted backing。

简化地说：可以改变阅读路径，不能改变事实世界。

## 3. 当前责任边界

| Responsibility | Current owner |
|---|---|
| 恢复 reader/use、must-answer 和不可隐藏限制 | Final Phase Agent |
| 扫描 verified surfaces、建立 inventory 和关闭 coverage | Final Phase Agent |
| 选择 spine、安排章节、控制粒度和起草 | Final Phase Agent |
| 检查 finding meaning、confidence 和 limitation 未漂移 | Final Phase Agent |
| Evidence Map structure、submitted backing、durable commit | Engine |
| 新的用途、风险或自定义视角语义 | User at HITL1/HITL2 |

当前不把任何 Composition Pass 步骤委派给 Sub-agent。这里的“暂不引入”不是否认 delegation 可能有价值，而是当前没有真实运行证据证明需要为 Final 增加第二个 production actor。

## 4. 最小 Interface

Report Composition Module 的 Interface 只需要三类输入：

```text
verified research state
+ reader/use composition brief
+ delivery constraints and intended final target
```

一个最小 Agent-readable composition brief 可以是：

```text
Reader/use:
Primary question:
Selected report view:
Root must-answer references:
Non-negotiable findings/limitations:
Allowed verified read surfaces:
Language and length posture:
View contract / preferred spine:
Required delivery shape:
Intended final target:
```

它是 Final Phase Agent 的工作纪律，不是 Agent 间 handoff，也不需要一开始升格为 schema、status、Gate 或 persistent authority。

Module 的 implementation 隐藏：

- artifact join；
- Answer Inventory；
- must-answer coverage；
- materiality；
- finding selection；
- narrative spine 和 placement；
- uncertainty exposure；
- citations 与 Evidence Map；
- semantic self-check。

## 5. 五步 Composition Pass

### Step 1: Reground

先恢复交付目的，不急着写正文：

- `rb_plan.md## Goal`、Purpose、scope 和 User Research Controls；
- `rb_profile.yaml#/root_must_answer_set`；
- HITL1 Alignment Snapshot；
- HITL2 answerability、rationale、主要 limitation 和 `final_report_view`；
- language、length、deliverable shape 和 intended final target。

这一步防止报告“内容正确但交付不对题”。

### Step 2: Build Answer Inventory

不能只读一个“万能 artifact”：

- `finding-index.yaml` 提供 priority/status/confidence/gap，但没有完整 finding meaning；
- Seed Topic return map 提供 `evidence_meaning` 和 navigation，但没有完整 priority/confidence；
- Wave1 artifacts 保留 Topic-local mechanism、counterevidence 和 limitation；
- submitted-backed reference 提供正文引用与 Evidence Map backing。

Final Phase Agent 在内部把这些 surfaces 合并成按 must-answer 组织的 Answer Inventory。它只是 working view，不是新的 runtime authority。

### Step 3: Close Coverage And Materiality

每个 root must-answer 都必须得到 `answered`、`partial` 或 `unavailable`。

一项材料若会改变以下任一内容，就是 material：

- 对 must-answer 的直接答案；
- confidence；
- 适用范围或条件；
- 用户可能作出的决定；
- 对主要机制的理解；
- material contradiction 或 limitation 的可见性。

Material content 必须进入正文或相邻位置。只增加细节的内容可以进入 appendix；重复内容可以省略。P0/P1 material 若被省略，必须保留明确理由。

### Step 4: Choose Spine And Plan Placement

每份主报告只选择一个 primary narrative spine：

| Reader task | Primary spine |
|---|---|
| 快速决策 | Decision-first |
| 回答原始问题 | Question-first |
| 判断主张是否成立 | Claim-first |
| 理解系统如何运作 | Mechanism-first |
| 审核证据强弱 | Evidence-first |
| 建立领域版图 | Topic/relationship-first |

其他 axis 可以作为 section-local structure 或 appendix，但不能同时竞争一级目录。

Narrative plan 至少决定：

- 报告开头承诺回答什么；
- must-answer 的顺序；
- 哪些 findings 必须前置；
- contradiction 和 limitation 在哪里出现；
- 正文与 appendix 的边界；
- P0/P1 material 若不进入正文，为什么可以省略。

### Step 5: Draft, Self-Check, Persist

Final Phase Agent 生成 retained staging Markdown，然后做一轮全局语义自检：

1. 所有 root must-answer 是否均有 answer state。
2. 主结论是否强于现有 finding 的 status/confidence。
3. Material counterevidence、contradiction 和 limitation 是否被隐藏。
4. 是否为了 view 创造了新研究事实或跨 Topic 关系。
5. 正文引用和 mandatory Evidence Map 是否指向合法 backing。
6. 报告是否真正回答“所以呢”，而不是复述材料生产过程。

通过后才调用 `persist-final-report`。只有 Engine 返回 committed，文件才可作为 Final delivery 消费。

## 6. Composition Pass 的 Working Outputs

Final Phase Agent 在同一执行上下文中至少形成：

```text
1. Answer Inventory
2. narrative plan and primary spine
3. must-answer coverage summary
4. material contradictions/limitations -> report locations
5. omitted P0/P1 candidates -> reasons
6. retained staging draft
7. semantic self-check result
```

这些是 Agent working views，不是新 schema、Gate input、runtime authority 或必须单独持久化的 artifact。它们的作用是让盘点、组织和自检可重复，而不是制造第二份报告。

## 7. Engine 和 Agent 的停止点

Final Phase Agent 负责 semantic quality；Engine 只判断它能可靠判断的直接事实：

- safe path；
- mandatory Evidence Map structure；
- submitted backing；
- durable persistence。

Admission rejection 只修复 Engine 指定的 staging row 或合法 backing surface，然后重跑同一 persistence command。它不创建 Final Gate、用户反馈循环、hidden transition 或第二条 success path。

不新增 Report Quality Gate，因为“是否对题、是否把限制放在正确位置、是否形成清楚论证”不是可靠的 deterministic verdict。

## 8. 对现有系统的影响

目标设计不改变：

- Final 仍是 `gate: null` terminal node；
- `transitions.chain.json` 不增加 Final outgoing edge；
- HITL1/HITL2 仍是唯二框架主动交互点；
- readiness 仍只做结构准备检查；
- Wave2 仍拥有 research finding 与 cross-topic epistemic synthesis；
- `persist-final-report` 仍是 Final Markdown 的唯一 admitted persistence path；
- 用户仍只看到“研究完成后交付报告”。

当前 scope 不新增：

- Report Composer role 或 work-unit kind；
- non-search Sub-agent contract；
- delegated draft output role；
- composer claim/submit/recovery；
- `phase_agent_fallback`；
- 根据报告复杂度决定是否 delegation 的分支。

这些不是永久禁令。它们作为备选路径保留在 `subagent-composition-seam.md`，但不进入后续基于当前选择形成的 change。

## 9. Verification

Deterministic verification 只证明结构事实：

- view enum/guidance parity；
- `phase-final` terminal/no-search/no-outgoing-Gate contract；
- mandatory Evidence Map、path safety、submitted backing 和 `persist-final-report` admission；
- 后续 change 没有新增 Final transition、HITL 或 work-unit capability。

报告语义必须用真实 `agent_flow_e2e` 验证，不能用固定 Markdown fixture 冒充：

1. 选择一份真实、完整、readiness-passed 的 run bundle。
2. 保持 verified evidence state 不变。
3. 分别生成 `executive_brief`、`claim_judgment` 和 `technical_deep_dive`。
4. 检查 finding meaning、confidence、limitations、backing 和 must-answer coverage 不漂移。
5. 检查 reader question、primary spine、粒度、evidence exposure 和 body/appendix placement 确实不同。
6. 由 Agent/human 做语义审阅；deterministic tests 不宣称报告质量。

## 10. OpenSpec 落地边界

后续 proposal 仍需明确两个真实 contract gap：

1. `custom` view 的 durable narrative carrier 应复用哪个现有 owner。
2. `not_started` 应在 HITL2 写成 `profile_default`，还是由 Final 透明解析为 `profile_default`。

当前选择的中心句是：

> Final 是 graph 上唯一的 terminal delivery node；其内部必须经过一次由 Final Phase Agent 直接执行的 Report Composition Pass。Final Phase Agent 负责读者问题、内容盘点、覆盖义务、事实边界、章节编排、起草和语义自检，Engine 只做 backing 与 persistence verdict。当前不使用 Sub-agent。
