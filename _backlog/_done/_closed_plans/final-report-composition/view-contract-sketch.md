# Final Report View Contract Sketch

> 状态：已与当前 handoff contract 对齐的 plan-level view 语义输入；不是 accepted spec、Gate contract 或实现许可。
>
> 当前关系：HITL2 按 `hitl2-final-composition-handoff.md` 收敛 composition intent；所有 view 由 Final Phase Agent 通过同一个 Report Composition Pass 执行。本文件只定义 view transformation，不重复 handoff schema 或执行 actor。

## 1. View 不只是格式

一个有用的 report view 至少应让 Final Phase Agent 知道：

| Dimension | Question |
|---|---|
| Reader | 谁会读？背景和耐心如何？ |
| Use | 读完要判断、决定、理解或核查什么？ |
| Primary focus | 第一优先服务哪个问题、主张、决定或机制？ |
| Spine | 按 decision、question、claim、mechanism、topic 还是 evidence 展开？ |
| Selection | 哪些 finding 必须前置，哪些可附录或省略？ |
| Granularity | 只给结论，还是展开机制、条件和边界？ |
| Evidence exposure | 正文展示多少来源与证据链？ |
| Uncertainty posture | limitation 应就地、集中，还是两者都要？ |
| Appendix posture | 是否需要 Evidence Map 之外的 appendix？ |

如果这些问题仍全靠 Final 临场猜，view enum 就没有形成足够深的 Interface。

## 2. Durable Handoff 与 Final Working Plan

当前设计明确分成两层，不能再用同一个 “composition brief” 同时指代它们。

HITL2 持久化的 `composition_handoff` 是跨节点 schema，包含：

```text
Reader / familiarity
Intended use
Primary focus
Foreground / compress preferences
Language / length / evidence exposure / appendix posture
Optional view instructions
```

Final 再从 accepted handoff 与 verified state 形成不持久化的 working plan：

```text
Narrative spine:
Must-answer order:
Selected key findings:
Material contradictions/limitations:
Evidence exposure:
Main body vs appendix:
Deliberate omissions:
```

Reader/use/primary focus 和 delivery posture 不由 Final 重解；spine、must-answer order、finding placement、limitations 和 omissions 由 Final 在 accepted handoff 与 verified evidence boundary 内判断。Working plan 不是第二个 authority。

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

### Current contract

`custom_slug` 只作标识。一个可执行的 custom view 由通用 handoff fields 加必填 `view_instructions` 组成，至少明确：

- 面向谁；
- 用来做什么；
- 最关注什么；
- 不要什么；
- 希望怎样组织或呈现。

Resolution 顺序：

```text
1. current HITL2 explicit correction
2. accepted HITL1 purpose / delivery control
3. disclosed candidate accepted by the user
4. persist resolved semantics to composition_handoff.view_instructions
```

如果 `view_instructions` 仍为空，`custom` 是 unresolved user decision，HITL2 不得记录 delivery proceed。Final 不能从 `rationale`、controls、chat 或 slug 恢复缺失语义。

历史上考虑过从 `rationale` 或 HITL1 prose 逐层 fallback；当前 contract 已明确不采用，因为它会让 Final 重新解释 raw intent，并形成多个 composition owner。

## 9. `not_started`

`not_started` 只允许作为 pre-HITL2 sentinel。用户选择交付且没有修改 view 时，HITL2 写入 `profile_default`；HITL2 Gate 对 `proceed_to_readiness` 拒绝 `not_started`。Final 不再拥有透明默认分支。

历史上考虑过由 Final 把 `not_started` 解释成 `profile_default`；当前不采用，因为它会让同一合法 run 在不同 Final consumer 中得到不同解释。

## 10. 跨 View 的统一内容盘点

所有 view 先建立同一 coverage table：

| Must-answer | Current answer | Key findings | Confidence | Contradictions/limitations | Primary refs | Placement |
|---|---|---|---|---|---|---|
| Q1 | answered / partial / unavailable | W2F-... / Wave1... | high / medium / low / uncertain | ... | ... | lead / body / appendix |

这张表不需要成为 artifact contract。它让 view 差异发生在 Placement、ordering 和 granularity，而不是让不同 view 各自遗漏不同事实义务。

## 11. Locked Proposal Decisions

1. `custom` semantics 使用 `composition_handoff.view_instructions`；不复用 `rationale`。
2. `not_started` 由 HITL2 normalization 解决；Final 不透明默认。
3. 保留 `evidence_map` enum 名称，并在 guidance 中明确它表示 evidence-led report，不能与 mandatory `## Evidence Map` declaration 混同。
4. v1 默认产出一份 primary report；`delivery.appendix` 只控制 Evidence Map 之外的 appendix。多份 primary deliverables 不进入当前 scope。
5. `profile_default` mapping 提供 transparent starting spine；accepted handoff 优先，具体 section ordering/placement 继续属于 Final judgment。
6. `executive_brief` 只有在 evidence strength 支持时才输出 recommendation；否则输出 decision implications、boundaries 和 unknowns。

这些决定进入后续 proposal，不重新打开 current executor、第三个 HITL 或 Sub-agent。执行路径与备选 actor 的讨论见 `recommended-final-composition-design.md` 和 `subagent-composition-seam.md`。
