---
guideline_id: abstraction-semantic-precision
suite: deep-research-guidelines
title: "Evolution Direction: Abstraction as Semantic Precision"
status: effective
created: 2026-07-25
revised: 2026-07-25
role: charter-companion evolution direction for justified semantic levels and precise bounded reasoning
scope: openspec/changes/, guidelines/, DPT_FRAMEWORK/, tests/, experiments_playbook/
authority: guidance
defers_to:
  - guidelines/project-charter.md
siblings:
  - guidelines/project-charter.md
  - guidelines/evolution-simple-reliable-control.md
  - guidelines/evolution-helper-oriented-agent.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Evolution Direction: Abstraction as Semantic Precision

> 状态: 生效 | 创建: 2026-07-25 | 修订: 2026-07-25 | 用途: 让新增概念先成为可精确推理的语义层

## Purpose

本项目不是靠持续增加 state、status、projection、Module、command 或流程名词来获得可靠性。一个新东西只有在它让某个明确读者能够针对一个明确问题，用更少却足够准确的语义作出判断时，才值得存在。

本文件是 Project Charter 之下的 charter-companion direction，也是当前 review route 的第一步。它先问：

> **这个新抽象究竟创造了什么可以精确推理的语义层？**

只有这个问题先答清，才进入后两条方向：

    abstraction as semantic precision
      -> simple reliable control
      -> helper-oriented responsibility

本文件定义的是设计姿态和反思入口，不是新的 runtime spec。schema、authority、state transition、Gate、receipt、trace、permission、legal repair 与 concrete command 仍须由 Project Charter、accepted specs 和 executable contracts 决定。

## Dijkstra 原文与语境

Edsger W. Dijkstra 在 1972 年图灵奖演讲《The Humble Programmer》的 EWD 340、Argument Four 中讨论的是：设计或理解程序所需的智力工作，是否必然会随着程序长度失去控制。下面保留名句所在的完整原文段落，而不是只摘取一句格言：

> Argument four has to do with the way in which the amount of intellectual effort needed to design a program depends on the program length. It has been suggested that there is some kind of law of nature telling us that the amount of intellectual effort needed grows with the square of program length. But, thank goodness, no one has been able to prove this law. And this is because it need not be true. We all know that the only mental tool by means of which a very finite piece of reasoning can cover a myriad cases is called “abstraction”; as a result the effective exploitation of his powers of abstraction must be regarded as one of the most vital activities of a competent programmer. In this connection it might be worth-while to point out that the purpose of abstracting is not to be vague, but to create a new semantic level in which one can be absolutely precise. Of course I have tried to find a fundamental cause that would prevent our abstraction mechanisms from being sufficiently effective. But no matter how hard I tried, I did not find such a cause. As a result I tend to the assumption — up till now not disproved by experience — that by suitable application of our powers of abstraction, the intellectual effort needed to conceive or to understand a program need not grow more than proportional to program length. But a by-product of these investigations may be of much greater practical significance, and is, in fact, the basis of my fourth argument. The by-product was the identification of a number of patterns of abstraction that play a vital role in the whole process of composing programs. Enough is now known about these patterns of abstraction that you could devote a lecture to about each of them. What the familiarity and conscious knowledge of these patterns of abstraction imply dawned upon me when I realized that, had they been common knowledge fifteen years ago, the step from BNF to syntax-directed compilers, for instance, could have taken a few minutes instead of a few years. Therefore I present our recent knowledge of vital abstraction patterns as the fourth argument.

— Edsger W. Dijkstra, [EWD 340: The Humble Programmer](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html), Argument Four

### 这在本项目意味着什么

下文是本项目对原文的工程解读，不是 Dijkstra 的原话。

他不是在赞美含糊、把细节藏起来，或给任意复杂机制起一个更漂亮的名字。他的关切是 intellectual manageability：有限的推理怎样覆盖大量情形，且不因系统增长而失去把握。一个好的 abstraction 因而不是“知道得更少”，而是让读者在一个选定的问题上，能用更小、更合适的词汇说得更准确。

这也不是“所有信息都可在高层无损恢复”的主张。一个语义层可以有意不携带某些底层细节；它只须不抹掉会改变该层问题答案的区别。它可以精确地说“unknown”“unresolved”或“此层不足以判断”，而不把不确定性伪装成事实。

所以，本项目采用这句原话时，问的不是“能否再包一层”，而是：

> **这一层是否让有限的读者可以停止向下重建，并对一个有界问题作出更精确的判断？**

## Standing And Precedence

本方向严格影响未来 design，但不以 prose 推翻当前 accepted behavior：

1. 适用于该事实的 authoritative behavior contract、executable contract 与 runtime truth 仍决定当前行为。
2. Project Charter 决定 layer、authority 与 Source of Record 的归属。
3. 本文件决定新概念是否形成值得引入的语义层。
4. Simple Reliable Control 决定围绕该语义层最小正确的控制形状。
5. Helper-Oriented Agent 决定在该合法形状中谁作决定、谁执行、谁裁决。

若既有实现还没有理想的语义层，不要用本文件宣布它无效。把差距视为 design debt：停止继续叠加含混概念，并在后续触碰该 surface 时通过 focused OpenSpec change 局部收敛。

## Core Direction

**抽象不是给已有事实换一个名字；抽象是创造一个新的语义层，使一个明确读者能针对一个明确问题精确推理。**

一个 semantic level 至少有三个彼此约束的部分：

- **问题**：它明确回答哪个有界问题，而不是笼统地“描述系统”。
- **区别**：它保留会改变该问题答案的差异，并只合并在该问题上真正等价的情况。
- **停止点**：正常读者可以在这一层得出结论，或准确地承认 unknown / unresolved，不必重新拼装底层实现、多个文档或历史上下文。

这里的“读者”可以是未来维护者、Coding Agent、用户，或处理确定性事实的 Engine。若 reader 是 Engine，其可推理范围仍由 accepted executable contract 限定；本文件不把语义判断自动变成 deterministic verdict。

## 引入一个新东西之前，先退后一步

当你想新增或重命名一个 state、status、projection、field group、Module、command、流程概念或 reader-facing view 时，不要先问“放在哪个文件”“再加什么 check”。先退后一步。

### 它到底回答什么？

说清它让谁能够对什么问题作判断。例如，“这个 attempt 对 actor 而言还缺什么完成义务？”和“这次 attempt 的所有 runtime truth 是什么？”不是同一个问题，因而不应被一个含混的“task status”替代。

若无法用一两句说清问题，先不要把它固化成新概念。它可能只是一个临时实现细节、一个尚未分开的 concern，或几个不同问题被误塞进同一个名词。

### 哪些区别必须留下？

两个具体情况只有在**这个问题**上导致同一结论、同一可表达后果时，才可在该层合并。只要差异会改变答案、证据范围、责任归属、可见风险或下一步的种类，它就仍是该层必须保留的区别。

不要为了得到一个看似简单的 status 而把“未观察到”“观察到但无效”“合法地不可用”“未知”压成同一个词。相反，也不要把对当前问题无关的实现差异全部搬到高层，迫使读者带着无关细节思考。

### 读者能否在这里停下来？

一个新层没有让读者免于正常路径上的底层重建，就还没有完成抽象。读者不应为了回答这个层所宣称的问题，反复从 schema、cache、late gate failure、历史 trace 与分散 prose 中重新推导同一含义。

“停下来”不等于永远不能下钻。authority、审计和异常诊断仍可需要更低层的事实；要求只是：对于这个层已经声明的普通问题，读者有足够、明确而不误导的工作词汇。

## Precision Is Scoped

精确从来不是脱离问题的全知。

- 一个 projection 可以是非 authority 的，并且仍然是优秀 abstraction；它为某个 reader 组织事实，不因此成为新的 truth source。
- 一个概念可以把多个底层情况合并，只要这些情况对它所回答的问题确实等价；换一个问题，原先被合并的差异可能必须重新出现。
- 一个 semantic judgment 可以有明确 evidence 或 review boundary，却不必成为机器 pass/fail。
- “unknown”“not observed”“not applicable”“unresolved”在语义清楚时是精确结果，不是失败的空白。

不要把本原则误解为：所有细节都要暴露、所有结论都要由 Engine 证明、或新 representation 必须复制全部 lower-level truth。抽象的目标是消除与当前推理无关的杂乱，同时放大真正决定答案的内容。

## Relationship To The Other Directions

三个方向是顺序关系，不是三套竞争的 validator：

| 先后 | 它问什么 | 它不拥有 |
|------|----------|----------|
| Abstraction as Semantic Precision | 什么对象、问题和区别构成可精确推理的语义层？ | authority、permission、具体 repair 或 controller |
| Simple Reliable Control | 围绕该语义层，最小正确的 control loop 是什么？ | 重新定义对象的语义，或把复杂机制预先合理化 |
| Helper-Oriented Agent | 在该合法形状中，谁决定、谁执行、谁作 deterministic judgment？ | 创建 capability、permission 或第二套 authority |

若一个提案先有了 controller、state tree 或 retry path，再倒推一个概念为它辩护，顺序已经反了。先审视这个概念能否让读者精确推理；再决定需要多少控制；最后分配责任。

## Gradual Convergence

既有名称、状态和 projection 不会因本文件立即重写。每次触碰一个复杂或含混 surface 时，优先完成一个局部收敛：

- 把一个含混词拆成它真正要回答的问题；
- 让一个 derived view 清楚说明它的适用问题和不覆盖什么；
- 恢复一个被过度压缩、会改变结论的差异；
- 删除一个只重复底层细节、却没有提供新推理层的概念；
- 把零散前提收进一个 reader 能正常使用的、非权威的工作视图。

这些动作必须通过 focused OpenSpec change 与现有 authority contracts 落地。不要以“更抽象”为名做 unscoped rewrite，也不要为了形式统一而抹掉必要的 provenance、schema、receipt 或 runtime truth。

## Boundary

本文件拥有“什么样的抽象值得引入”的未来方向，但不拥有：

- 当前 runtime truth、schema、state transition、Gate、receipt、trace、CLI 或 test verdict；
- Source of Record、permission、legal mutation、retry/recovery、writer 或 reentry capability；
- 研究相关性、证据选择、综合质量或其他需要 Agent/human judgment 的最终答案；
- 把 Markdown 升格为机器 authority，或把 Engine 扩张成 Agent Flow controller；
- 对历史实现的即时否定，或任何没有 OpenSpec change 支持的行为改变。

抽象做对，不是让系统看起来更高级；是让有限的读者能对更少、但真正重要的东西说得更准确。

## Related Guidance

- [Project Charter](project-charter.md) — repo-wide authority and layer boundaries.
- [Simple Reliable Control](evolution-simple-reliable-control.md) — minimum correct control shape after the semantic level is clear.
- [Helper-Oriented Agent](evolution-helper-oriented-agent.md) — decision, legal execution, and deterministic-judgment responsibility after the control shape is clear.
- [Guidelines Index](README.md) — suite entrypoint and reading order.
