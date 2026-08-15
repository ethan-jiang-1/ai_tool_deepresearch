# Final Report View Contract Sketch

> 状态：供后续 OpenSpec proposal 推敲的语义草图，不是 schema、accepted spec、Gate contract 或实现任务。
>
> 当前关系：所有 view 由 Final Phase Agent 通过同一个 Report Composition Pass 执行；本文件不决定执行 actor。

## 1. View 不只是格式

一个有用的 report view 至少应让 Final Phase Agent 知道：

| Dimension | Question |
|---|---|
| Reader | 谁会读？背景和耐心如何？ |
| Use | 读完要判断、决定、理解或核查什么？ |
| Primary question | 第一优先回答哪个问题？ |
| Spine | 按 decision、question、claim、mechanism、topic 还是 evidence 展开？ |
| Selection | 哪些 finding 必须前置，哪些可附录或省略？ |
| Granularity | 只给结论，还是展开机制、条件和边界？ |
| Evidence exposure | 正文展示多少来源与证据链？ |
| Uncertainty posture | limitation 应就地、集中，还是两者都要？ |
| Deliverable shape | 一份主报告，还是主报告加 appendix/brief？ |

如果这些问题仍全靠 Final 临场猜，view enum 就没有形成足够深的 Interface。

## 2. 通用 Composition Brief

不建议一开始把它做成 schema。先把它当作 Final Phase Agent 的短写作计划：

```text
Reader/use:
Primary question:
Narrative spine:
Must-answer order:
Selected key findings:
Material contradictions/limitations:
Evidence exposure:
Main body vs appendix:
Deliberate omissions:
```

前四项主要由 HITL1/HITL2 已记录语义决定；后五项由 Final Phase Agent 从 verified state 做授权范围内的写作判断。

## 3. `profile_default`

### Reader question

“按我已经选择的研究方式，直接给出这次研究最自然、最完整的回答。”

### Precedence

```text
explicit user controls / Purpose and use
  -> exact must-answer shape
  -> research profile default mapping
```

Profile 只表达 research posture，不完整表达报告用途。

| Research profile | Default spine | Default emphasis |
|---|---|---|
| `quick_factual` | Question-first | 直接答案、关键依据、最小必要 caveat |
| `exploratory_map` | Topic/relationship-first | 版图、模式、分歧、未知、后续路径 |
| `claim_verification` | Claim-first | verdict、支持与反证、confidence、成立条件 |
| `debug` | 不面向普通用户 | 不应成为正常用户报告 view 的语义来源 |

### Candidate shape

```text
1. 直接回答 / 总体结论
2. 按 must-answer 展开的核心发现
3. 关键跨 Topic 关系
4. 限制与仍未解决的问题
5. Evidence Map
```

### Failure modes

- 固定通用模板；
- 简单按 Topic 顺序拼接；
- 只改写 `synthesis.md`；
- 让 research profile 覆盖更具体的 Purpose/controls。

## 4. `executive_brief`

### Reader question

“我需要迅速判断这件事意味着什么、该关注什么、有哪些决策或风险。”

### Primary spine

Decision-first。

### Selection rules

- 优先 P0/P1、material contradiction、decision-relevant limitation；
- 机制细节只保留解释结论所需的最小部分；
- 不按来源或 Wave 讲研究过程；
- recommendation 必须与 evidence strength 匹配；依据不足时输出 decision implications/boundaries，不制造 action certainty。

### Candidate shape

```text
1. Bottom line
2. Why it matters now
3. Three to five decision-relevant findings
4. Options / implications / tradeoffs
5. Material risks and unknowns
6. Evidence Map
7. Optional evidence appendix
```

### Failure modes

- 只是把完整报告缩短；
- 全是结论，没有条件和风险；
- 把 low-confidence finding 写成确定建议；
- 为简洁省掉会改变决策的反证。

## 5. `evidence_map`

### Reader question

“每个重要结论由什么支持，证据强弱、冲突和缺口在哪里？”

### Primary spine

Evidence-first 或 question-to-evidence。

### Naming distinction

这个 enum 表示整份报告采用 evidence-led organization。每份 Final Markdown 强制包含的 `## Evidence Map` 只是 bounded submitted-backing declaration table，二者不能互相替代。

### Selection rules

- 以 must-answer 或 key finding 为行/节；
- 同时展示 supporting、contradicting 和 limiting evidence；
- 明确 source quality、confidence 和 gap；
- 可以更像审计矩阵，但仍需综合判断，不能只列链接。

### Candidate shape

```text
1. Scope and evidence standard
2. Must-answer coverage matrix
3. Finding-by-finding evidence assessment
4. Contradictions and unresolved gaps
5. Overall confidence and answerability
6. Mandatory Evidence Map declaration
```

### Failure modes

- 把 reference index 复制到正文；
- 有来源，没有“这些证据说明什么”；
- 只展示 supporting evidence；
- 把 backing admission 当成 semantic support verdict。

## 6. `claim_judgment`

### Reader question

“某个或若干核心主张成立、不成立，还是只能有条件成立？”

### Primary spine

Claim-first，带 adversarial posture。

### Per-claim contract

```text
Claim
Current judgment
Supporting evidence
Counterevidence / alternative explanation
Conditions and scope
Confidence
Residual unknowns
```

### Selection rules

- 优先用户明确主张、root must-answer 和 W2F P0/P1 finding；
- verdict wording 受 status/confidence 约束；
- Wave1 limitation/dispute/failure mode 不得被 Wave2 summary 遮蔽；
- 多个 claim 相互依赖时显式展示 dependency。

### Failure modes

- 只有正反清单，没有 judgment；
- verdict 比 evidence 更强；
- 把 `uncertain` 写成“基本成立”；
- 忽略 claim 的适用条件。

## 7. `technical_deep_dive`

### Reader question

“这个系统、机制或技术问题怎样运作，各部分如何相互作用，边界和失败模式是什么？”

### Primary spine

Mechanism/dependency/causal-chain first。

### Selection rules

- Wave1 mechanism/trend/limitation 是主要材料；
- Wave2 finding 用于解释跨 Topic 关系、矛盾和全局影响；
- Wave0/source details 只在定义、基准或方法差异重要时进入正文；
- 显式区分 observed fact、inferred mechanism 和 unresolved hypothesis。

### Candidate shape

```text
1. System model and scope
2. Core mechanisms
3. Interactions across Topics
4. Constraints, edge cases and failure modes
5. Competing explanations / contradictions
6. Operational or design implications
7. Evidence Map
8. Detailed source / method appendix
```

### Failure modes

- 以术语密度冒充深度；
- 只有 Topic 局部细节，没有跨 Topic system model；
- inferred mechanism 没标 evidence boundary；
- 把所有 reference 都塞进正文。

## 8. `custom`

### Reader question

由用户在 HITL1 controls 或 HITL2 view discussion 中明确表达。

### Current contract gap

`custom_slug` 只适合做标识，不足以让 Final 恢复 custom view。一个可执行的 custom view 至少需要 durable narrative semantics：

- 面向谁；
- 用来做什么；
- 最关注什么；
- 不要什么；
- 希望怎样组织或呈现。

候选恢复顺序：

```text
1. HITL2 rationale 中明确的 view wording
2. User Research Controls 中的 delivery needs / analytical lens
3. HITL1 Alignment Snapshot 和 Purpose
4. custom_slug 仅作名字，不作为语义来源
```

如果这些位置都没有足够信息，`custom` 是 unresolved user decision。正常修复位置应在 HITL2；Final 不能在 terminal delivery 中主动补问，也不能只凭 slug 猜测。

## 9. `not_started`

当前 schema 允许 `final_report_view: not_started`，HITL2 Gate 又不强制 view。Final 不能每次临场猜。

后续 proposal 应明确二选一：

1. HITL2 在用户直接选择交付且未改 view 时写入 `profile_default`；或
2. Final 透明地把 `not_started` 解析为 `profile_default`。

前者让 Final 读取已解析决定；后者改动更小。两者都不应新增第三个 checkpoint。

## 10. 跨 View 的统一内容盘点

所有 view 先建立同一 coverage table：

| Must-answer | Current answer | Key findings | Confidence | Contradictions/limitations | Primary refs | Placement |
|---|---|---|---|---|---|---|
| Q1 | answered / partial / unavailable | W2F-... / Wave1... | high / medium / low / uncertain | ... | ... | lead / body / appendix |

这张表不需要成为 artifact contract。它让 view 差异发生在 Placement、ordering 和 granularity，而不是让不同 view 各自遗漏不同事实义务。

## 11. 仍需 Proposal 决定的问题

1. `custom` semantics 最终复用 HITL2 rationale、User Research Controls，还是另一个 existing narrative owner？
2. `not_started` 采用 HITL2 normalization 还是 Final transparent default？
3. `evidence_map` 是否只在 guidance 中称作 evidence-led report，还是未来需要 enum rename？
4. 一次 delivery 默认只产一份 primary report，还是允许 primary report + optional appendix/brief package？
5. `profile_default` mapping 是否足够稳定，哪些部分必须继续留给 Agent judgment？
6. executive brief 中 recommendation 何时适用，何时只能输出 decision implications？

这些是 view semantics 的真实未决问题，不重新打开已经选定的 current executor。执行路径与备选 actor 的讨论见 `recommended-final-composition-design.md` 和 `subagent-composition-seam.md`。
