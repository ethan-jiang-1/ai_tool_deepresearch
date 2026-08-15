# Final 报告组织逻辑可行性审查

> 状态：plan 内设计审查结论，不是 accepted spec、实现许可或 runtime contract。
>
> 已定前提：不新增 graph node。Report Composition Pass 位于现有 `phase-final` 内部。
>
> 当前执行者：Final Phase Agent。Delegated Composer 作为备选保留，但当前暂不考虑。

## 1. 总体判断

这套组织逻辑可行，而且不需要重做 Wave0、Wave1、Wave2 或 HITL2。

关键点是不能从 Wave artifacts 直接跳到 narrative spine。Final 必须先建立一个按用户问题组织的临时 Answer Inventory，再根据 report view 排序、分组和控制粒度。

```text
verified production-oriented artifacts
  -> resolve delivery brief
  -> build answer-oriented inventory
  -> close must-answer coverage and materiality
  -> apply one view transformation
  -> produce narrative plan
  -> draft and self-check
  -> persist-final-report
```

这层转换是必要的，因为当前研究材料按生产过程组织：

- Wave0 按来源和 Topic 组织；
- Wave1 按 Topic 的机制、趋势、限制和问题组织；
- Wave2 按 cross-topic finding 和 triage 组织；
- Final 必须按读者要回答、判断或理解的问题组织。

缺少 Answer Inventory 时，“不同视角”很容易退化成改标题、调顺序或改写 `synthesis.md`。

## 2. 当前材料是否足够

### 已经足够的 surfaces

| Final needs | Current readable surface | Assessment |
|---|---|---|
| 研究目的、用途、范围 | `rb_plan.md## Goal`、HITL1 Alignment Snapshot | 足够，属于 narrative reground context |
| Root must-answer | `rb_profile.yaml#/root_must_answer_set` | 足够，结构化直接事实 |
| 用户控制 | `rb_plan.md## Constraints > User Research Controls` | 足够，guidance-only |
| Report view | HITL2 `final_report_view` | 普通 named view 足够 |
| Answerability 和最终限制 | HITL2 decision brief、`answerability_class`、`rationale` | 足够做 Agent judgment |
| Finding triage | Wave2 `finding-index.yaml` | 足够提供 ID、priority、status、decision、confidence、gap |
| Finding reasoning | `cross-topic-ledger.md`、`synthesis.md` | 足够提供关系、矛盾和解释 |
| Topic-local meaning | Seed Topic return maps、Wave1 artifacts | 足够提供机制、趋势、限制和 navigation |
| Consumer backing | `reference/*.md`、submitted `source.yaml` / `evidence-summary.md` | 足够用于正文引用和 Evidence Map |

### 没有万能入口

`finding-index.yaml` 不能单独成为 Final inventory：

- 它有 triage metadata；
- 但没有完整 finding statement/evidence meaning；
- 也没有直接绑定 root must-answer。

Seed Topic return map 也不能单独成为 inventory：

- 它有 `evidence_meaning`、`relationship`、`refs`、`status`、`next_hop`；
- 但没有完整 Wave2 priority、confidence 和 gap status。

因此 Final 需要一个有界 join：

```text
finding-index triage metadata
       +
ledger / Seed Topic return-map semantic meaning
       +
Wave1 topic-local mechanisms, counterevidence and limitations
       +
concrete submitted-backed references
       -> Answer Inventory
```

这个 join 是 Agent semantic work，不应交给 Engine，也不应要求每个 report view 各自重复底层 artifact 拼接规则。

## 3. Report Composition Module 的深度

### Interface

Final Phase Agent 以一个较小的 brief 进入 composition procedure：

```text
Reader/use
Primary question
Selected view contract
Exact root must-answer set
Non-negotiable user constraints and visible limitations
Allowed verified read graph
Language / length / deliverable posture
Intended final target
```

Procedure 形成：

```text
Retained staging draft
Semantic self-check result
```

### Implementation 内部隐藏的复杂度

- 读取哪些 projection，何时下钻；
- 如何把 W2F metadata 与 finding meaning 合并；
- 如何把 finding 映射到 must-answer；
- 如何判断 `answered` / `partial` / `unavailable`；
- 如何识别 material contradiction 和 limitation；
- 如何选择 primary spine；
- 如何决定 lead / body / appendix / omit；
- 如何控制 evidence exposure 和篇幅；
- 如何生成 Evidence Map 和正文引用；
- 如何形成可重复的 semantic self-check。

删除这个 Module 后，同样的 join、coverage、materiality 和 view logic 会重新散落到 `phase-final.md` 和每种 view 模板中。因此它提供真实 leverage；但当前只有一个执行者，不需要额外 delegated adapter 才能证明它存在。

## 4. Answer Inventory 的内部形状

建议使用一个不持久化、不成为 runtime authority 的内部 Answer Unit。每个 root must-answer 至少对应一个主 Answer Unit；cross-cutting finding 可以关联多个 unit。

| Answer Unit field | Purpose | Main source |
|---|---|---|
| `question_ref` | exact must-answer ordinal + text | profile |
| `answer_state` | answered / partial / unavailable | Final Phase Agent judgment |
| `core_answer` | 当前最短、最诚实的回答 | ledger / synthesis / return maps |
| `finding_ids` | 相关 W2F identity | finding index / return maps |
| `status_confidence_gap` | 限制回答强度 | finding index |
| `supporting_material` | 主要支持 | submitted-backed refs / Wave1 artifacts |
| `counter_material` | 反证、冲突、替代解释 | ledger / Wave1 limitations |
| `scope_conditions` | 结论成立边界 | plan / findings / evidence summaries |
| `residual_unknowns` | 仍不知道什么、为什么 | HITL2 brief / ledger / question lists |
| `reader_implication` | 对当前用途意味着什么 | Agent judgment within evidence boundary |
| `placement` | lead / body / appendix / omit | view transformation |

这不是新 schema。它让 Final Phase Agent 从“这道 must-answer 当前得到什么回答”出发，而不必反复按 Wave 生产顺序重建。

## 5. 组织算法

### 5.1 Resolve Delivery Brief

读取 Purpose、Scope、Alignment Snapshot、exact must-answer、controls、HITL2 answerability/rationale/view，以及 language、length 和 target。此时不冻结完整 finding set，也不写正文。

### 5.2 Build Answer Inventory

先按 root must-answer 建空 Answer Units，再补充：

1. 从 finding index 找 P0/P1 和 material P2 metadata。
2. 用 W2F ID 到 ledger/return maps 恢复 finding meaning。
3. 用 Wave1 mechanism/trend/limitation 补充 Topic-local explanation。
4. 用 concrete references 和 submitted artifacts 解析 backing。
5. 将 cross-cutting finding 映射到一个或多个 must-answer。
6. 无法映射但会改变总体判断的 finding 进入 cross-cutting unit，而不是被丢弃。

### 5.3 Close Coverage And Materiality

每个 must-answer 必须得到明确状态：

- `answered`：现有材料足以形成受约束回答；
- `partial`：只能回答一部分，缺口影响完整性；
- `unavailable`：当前 verified state 无法合法回答。

不做数值化“重要性评分”。使用一个简单 materiality test：某项材料是否会改变以下任一内容？

- 直接答案；
- confidence；
- 适用范围或条件；
- 用户可能采取的决定；
- 对主要机制的理解；
- material contradiction/limitation 是否可见。

若会改变，就必须进入正文或在相邻位置显示。只增加细节的材料可以进入 appendix；重复且不增加解释力的材料可以省略，并保留理由。

### 5.4 Apply One View Transformation

View 不重新生成内容，只对同一 Answer Inventory 应用 grouping、ordering 和 detail policy：

| View | Primary grouping/order | Main compression |
|---|---|---|
| `profile_default` | Purpose + must-answer/profile | 非关键来源细节 |
| `executive_brief` | decision impact 和 risk | 机制细节，但不压掉 material caveat |
| `evidence_map` | must-answer/finding -> evidence strength/gap | 背景叙述 |
| `claim_judgment` | claim -> verdict -> support/counterevidence | 与 verdict 无关的背景 |
| `technical_deep_dive` | mechanism/dependency/causal chain | 管理层式 action framing |
| `custom` | recorded reader/use/spine contract | 取决于 durable custom semantics |

### 5.5 Build Narrative Plan

Narrative plan 至少回答：

- 开头承诺回答什么；
- 每个一级 section 对应哪个 Answer Unit/grouping；
- material contradiction/limitation 在哪里出现；
- 哪些内容进入 appendix；
- 哪些 material candidate 被省略以及理由；
- mandatory Evidence Map 包含哪些 selected key findings。

它是内部 working plan，不需要升级为 persisted authority。

### 5.6 Draft With A Local Section Contract

不强制统一标题，但每个主要 answer/claim section 按需要包含：

```text
Current answer or judgment
Why this is the current answer
Supporting evidence
Counterevidence / limitation / scope condition
Confidence or residual unknown
Reader implication
```

不同 view 可以压缩或调换这些元素，但不得压掉会改变答案的反证和限制。

### 5.7 Self-Check And Persist

Final Phase Agent 检查 must-answer coverage、finding meaning/status/confidence、material limitations、new proposition risk、legal backing 和 view differentiation，然后调用 `persist-final-report`。

Engine 继续只判断 path、Evidence Map structure 和 submitted provenance。

## 6. View Contract 可行性结论

- `profile_default`：可行，但 precedence 必须是 explicit user controls/Purpose -> must-answer -> profile default。
- `executive_brief`：可行，不应强制 recommendation；证据不足时给 implications/boundaries。
- `evidence_map`：可行，但要区分 evidence-led report 与 mandatory `## Evidence Map` declaration。
- `claim_judgment`：可行，claim 优先来自用户明确主张和 must-answer，不机械改写所有问题。
- `technical_deep_dive`：可行，默认按 mechanism/dependency/causal chain，而不是简单按 Topic。
- `custom`：当前不完全可行，`custom_slug` 不能恢复 reader/use/spine。
- `not_started`：需要 proposal 明确透明默认规则。

详细语义与失败形态见 `view-contract-sketch.md`。

## 7. Backing 逻辑

Final Phase Agent 必须区分 reasoning surface 与合法 backing：

- finding index、ledger 和 synthesis 可以帮助理解和选材；
- 它们不能自动成为 mandatory Evidence Map backing；
- Evidence Map 必须指向 submitted `source_yaml` / `evidence_summary`，或 submitted-backed `reference/*.md` projection；
- `reference/_INDEX.md`、`final/`、`_cache/`、finding index 和 ledger 不是合法 backing target。

Composition brief 必须提供 intended final target，Final Phase Agent 才能写出相对于 `final/report.md` 正确解析的 Markdown links。Staging 文件位置不能改变链接语义。

## 8. Execution Path Feasibility

### Current path: Phase Agent direct

当前路径不要求第二个 actor。Final Phase Agent 已拥有所需 semantic judgment，并可在现有 Final boundary 内使用 bounded brief、bounded read graph、working views 和 persistence path。

### Deferred path: formal Report Composer

从语义上，Composer 可以消费同一 brief 并输出 draft/summary；但当前 runtime 没有 non-search report-composer role、assignment kind 或 output contract。接入它会触及：

- Final 是否 work-unit-capable；
- non-search actor policy；
- staging ownership；
- claim/submit/recovery；
- terminal node 在 actor unavailable/in-flight/failed 时的行为。

这些问题不影响组织算法本身的可行性，但会把 change 扩展到执行层。因此当前暂不考虑，完整推敲保留在 `subagent-composition-seam.md`。

## 9. 行不通或当前不采用的组织方式

- 只改写 `synthesis.md`；
- 只读 `finding-index.yaml` 就写报告；
- 按 Wave0 -> Wave1 -> Wave2 的生产顺序组织普通用户报告；
- 每个 view 维护一套互相独立的大模板；
- 同一报告同时使用多个一级 narrative spine；
- 把所有 P0/P1 原样堆进正文而不做 must-answer mapping；
- 用数值打分或标题检查建立 Report Quality Gate；
- 让 delegated actor 绕过 `persist-final-report` 直接写 committed `final/*.md`；
- 用 finding index、ledger、reference index 或 cache 作为 Evidence Map backing。

## 10. 结论

组织逻辑可行，且现有 bundle 已提供足够材料。真正缺失的不是另一个 Wave 或 graph node，而是 Final 内部从 production-oriented artifacts 转成 answer-oriented inventory 的语义 Module。

当前可以定下：

1. Final topology 不变，Composition Pass 内含于 Final。
2. Answer Inventory 是必经 working view，但不是 runtime authority。
3. 所有 view 复用同一 inventory，只改变 grouping、ordering、detail 和 evidence exposure。
4. 当前由 Final Phase Agent 直接负责 brief、join、coverage、materiality、spine、placement、drafting 和 self-check。
5. `custom` 和 `not_started` 仍需 proposal 明确 contract。
6. Formal Sub-agent path 暂不考虑，但保留为有条件重开的执行层备选。

剩余风险必须通过真实 readiness-passed bundle 的多-view Agent-flow experiment 验证，不能用固定 Markdown fixture 证明报告语义质量。
