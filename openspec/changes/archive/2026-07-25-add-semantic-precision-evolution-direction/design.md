## Context

guidelines/evolution-simple-reliable-control.md 与 guidelines/evolution-helper-oriented-agent.md 已分别拥有控制复杂度和行动责任两个 charter-companion 方向。它们不应被第三份文件重复；第三份文件要处理的是更上游的判断：一个新名字、新状态、新 projection 或新 reader-facing view 是否真的创造了可精确推理的语义层。

本 change 的一手依据是 [EWD 340, The Humble Programmer](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html)。Dijkstra 的原句位于 Argument Four：他正在讨论设计或理解程序所需的智力工作会如何随程序规模增长，并说 abstraction 让有限的推理覆盖大量情形：

> “The purpose of abstracting is not to be vague, but to create a new semantic level in which one can be absolutely precise.”

因此，这里不是把引文当作“隐藏实现细节”的格言，也不是把它扩张成“所有信息在高层都必须可恢复”的 lossless-compression 主张。它是本项目的设计提醒：工具、术语和表示必须让有限的读者在合适层次保持 intellectual manageability。EWD 447 对 separation of concerns 的阐释可帮助理解这一点：隔离一个 concern 是为了在该 concern 内保持一致性，不是假装其他 concern 不存在；它不需要成为第二条宪章引文。

用户提供的两份研究稿仅是探索输入：

- /Users/bowhead/ai_dev_harness_paper/study_08_structagent/followup_research/dijkstra-abstraction-guideline-insertion.md
- /Users/bowhead/ai_dev_harness_paper/study_08_structagent/followup_research/dijkstra-abstraction-semantic-level.md

正式 guidance 只引用 EWD 340 一手来源，不复制研究稿，也不采用其关于模型训练分布、狼羊菜案例或“无损压缩”的扩展表述。

## Goals / Non-Goals

**Goals:**

- 建立一份与现有两份 evolution 文件同层、可反复阅读的 charter companion。
- 让 Coding Agent 在引入一个有名字的新东西之前先退后一步：明确它服务的判断、保留的区别和可停止的推理层。
- 用短而稳定的语境保留 Dijkstra 原意，并使它成为设计思考的触发器而非装饰性题词。
- 让 Charter、Guidelines Index、OpenSpec config 与三份 companion 形成有序的当前三方向入口，并使所有有效 guideline 共享清楚的 Charter 根和同层导航边界。

**Non-Goals:**

- 不创建 state、schema、CLI、Gate、receipt、trace、controller、retry path、workflow transition 或 runtime authority。
- 不把 semantic precision 变成 Engine 可执行 validator、固定模板、四格 checklist 或对每个微小编辑的行政负担。
- 不要求高层 representation 无损、可逆，或代替 lower-level authority。
- 不把研究相关性、证据选择或综合质量伪装为 deterministic verdict。
- 不重写所有 mechanism/support guideline 的机制正文、运行时事实或局部论证；此次只统一它们的 frontmatter 与导航层级，并保留按直接问题的选择性正文链接。

## Decisions

### 1. Name the direction for the intellectual move, not only its result

Canonical path is guidelines/evolution-abstraction-semantic-precision.md. Its title is:

> Evolution Direction: Abstraction as Semantic Precision

“semantic precision”说明目标；“abstraction”提醒读者这是 Dijkstra 所说的思维动作，而不是额外质量门。相比只叫 semantic precision，这个名字更能阻止“抽象等于含糊”的日常误读。

### 2. Use a Dijkstra-first reflective charter architecture

新文件采用下列结构，而不是复刻 Simple 文件的长规则清单：

1. Purpose：文件的独有职责与现有 authority 边界。
2. Historical Context：名句所在的完整 EWD 340 Argument Four 原文段落、链接，以及紧随其后的“这在本项目意味着什么”解读；两者必须清楚分开，避免把项目推论伪装成 Dijkstra 原话。
3. Core Direction：新抽象的理由是让一个明确读者针对一个明确问题在此层精确推理。
4. 引入一个新东西之前，先退后一步：三条相互关联的反思。
5. Precision Is Scoped：解释“对这个问题等价”与“必须保留的差异”，并允许精确的 unknown。
6. Relationship To The Other Directions：说明有序三角关系。
7. Gradual Convergence 与 Boundary：使已有 accepted behavior 保持有效，并明确该文件不能创造 authority、permission、机制或 verdict。

这保持 charter-grade 的清晰边界，但把重点放在思考，而非制造一张需要填写的表。

### 3. Make the semantic-level criterion small, concrete, and non-mechanical

“引入一个新东西之前，先退后一步”应让设计者连贯地回答：

1. **问题**：它让谁能够就什么有界问题作出或表达更精确的判断？
2. **区别**：对这个问题，哪些具体情况的答案和后果相同，因而可以合并；哪些差异会改变结论、可采取的下一步或证据范围，因而必须保留？
3. **停止点**：正常读者能否在这个层得到精确结论，或精确地说 unknown / unresolved，而无需从多个底层文件、术语或阶段重建语义？

这三项不是 independent schema fields。相关 proposal/design 只需留下一小段能被 reviewer 读懂的推理；若不能自然短答，通常说明概念尚未找准，或范围应缩小。

“精确”始终受声明的问题和证据边界约束。一个 projection 可以有意省去对它无关的信息；它不能因为省略而改写 source of record，也不能把不确定性伪装为事实。读者偶尔可以下钻审计；要求是正常判断不必依赖这种重建。

### 4. Keep the three directions orthogonal and ordered

The current review route is:

semantic precision
  → 什么对象、问题和区别构成一个可推理的语义层？
simple reliable control
  → 围绕该语义层，最小正确的确定性控制是什么？
helper-oriented responsibility
  → 在该合法形状中，用户、Agent、Engine 分别决定、执行和裁决什么？

Semantic precision does not own Source of Record selection, same-check repair, legal writer/retry paths, permission, or Agent escalation. Those questions remain with Project Charter, Simple Reliable Control, and Helper-Oriented Agent. Conversely，这两份 companion 继续假定“要建模的对象”已经先被认真审视。

真实项目中的三个对照例子只用于本设计判断，不进入 durable guideline：actor observation 中 omitted、malformed 与 valid-unavailable 不能塌缩，因为它们改变 continuation；Completion Contract 是 attempt obligation 的 projection 而非第二 authority；selected primary root 精确回答“先修什么”，而 independently evaluable diagnostics 回答另一个问题。这说明同一事实能否合并永远取决于所问的问题。

### 5. Establish one complete guideline hierarchy, not a blanket mechanism rewrite

The user-directed apply target is every effective Markdown document under `guidelines/`, plus the already selected config, governance artifacts, and integration test. The seven supporting/mechanism files are included because their frontmatter still points outside the suite or omits the new direction; this is a hierarchy inconsistency, not a reason to rewrite their mechanism claims.

The hierarchy is deliberately small:

```text
Project Charter
  └─ every other effective guideline
```

Project Charter has no `defers_to`. Every other effective guideline has exactly one `defers_to` entry, `guidelines/project-charter.md`. In `siblings`, Charter presents the current triad in semantic → simple → helper order; non-Charter documents put Charter first and keep that order among whichever charter companions they list. This makes the root, the review order, and the sibling layer legible without pretending that the current triad is permanently closed.

Constitutional navigation stays within `guidelines/`: frontmatter, Reading Order, and Related Guidance do not route readers to `AGENTS.md`, `openspec/config.yaml`, capability specs, framework files, experiments, or runtime bundles. A primary source embedded as source context (the EWD 340 link) is not a constitutional navigation target. Mechanism prose can still state necessary facts about its subject and keep a focused same-layer link; it is not mechanically purged of domain vocabulary.

Project Charter gives the short Dijkstra entry context and exposes same-layer guidance. Guidelines Index provides the suite reading route. OpenSpec config remains outside this hierarchy and only requires relevant proposal/design work to leave a brief semantic reflection before control/responsibility review; it does not become a parent of a guideline.

### 6. Verify routing and provenance, not future comprehension

Focused integration coverage will assert:

- canonical new path、title、EWD 340 quotation/source/context marker；
- Charter、Guidelines Index 与 OpenSpec config 的 current ordered triad；
- every effective guideline obeys the Charter-only `defers_to` hierarchy and applicable ordered sibling route;
- same-layer navigation has no external/downstream target;
- 两份既有 companion 能够路由回新方向；
- config 要求的是短语义反思，而不是 runtime contract。

The test SHALL NOT assert that a model understood the quotation, that every active guideline lists every direction, or that exactly three directions can ever exist. Those are not deterministic documentation contracts.

## Risks / Trade-offs

- [A famous quote becomes decoration] → 在引文后立即写明 Argument Four 的有限推理和 intellectual-manageability 语境，并让“退后一步”成为文档中心。
- [Reflection becomes a ritual checklist] → config 只要求一小段连贯说明；新文件不命名四格 admission form。
- [The direction duplicates control/authority guidance] → 将 Source of Record、legal repair、permission、rerun 与 escalation 明确委托给既有文件。
- [“Absolutely precise” is read as automatic certainty] → 明确 precision 可以是受证据边界约束的 unknown，而非 Engine 对所有语义的裁决。
- [A current triad becomes a permanent numeric constitution] → 使用 current triad 和 explicit paths，避免测试或 requirement 使用 exactly three。
- [Navigation migration causes noise] → 审计所有有效 guideline 的 frontmatter/导航块，但不重写它们的机制正文或运行时说明。

## Migration Plan

1. 在 apply 前先把 change-root verification-plan.yaml 收束为本设计的 focused routing/provenance claim，并重新运行 planning validation；该文件不属于当前 OpenSpec schema 的 editable artifact set，因此在本次 update 中不直接改写。
2. 在 approved tasks 下创建新 guidance，并同步 Charter、Index、config、所有其余 guideline 的 Charter-only hierarchy、registry/main-spec lifecycle artifacts 和 focused integration test。
3. 运行 routing、OpenSpec、registry、spec-structure 与 diff checks；记录 guidance-only、no-version-bump 结果。
4. 通过显式 sync/archive 使 GCO-007/GCO-008 进入 accepted guidance-constitution spec。

原文段落不是外部研究链接的替代物，也不是仅用于测试的 marker。它和项目解读都属于最终 guidance 的正式正文：前者让读者进入 Dijkstra 所讨论的有限推理、规模与 intellectual manageability 语境；后者明确本项目采用的是“可在一个问题上精确推理”的含义，而非隐藏细节、无损压缩或自动化语义裁决。

## Open Questions

None. 文件名、核心命题、轻量反思形式、Dijkstra 来源范围、三方向顺序和 suite-wide Charter hierarchy 已收敛；后续唯一需要的是按此设计进行正式 apply。
