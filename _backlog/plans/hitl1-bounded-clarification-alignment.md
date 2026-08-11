# HITL1 有界澄清与研究对齐计划

状态：active（仅规划，尚未创建 OpenSpec change 或修改 Harness）

来源：`dpt_rb_enterprise-ai-harness-adoption-open-source` 完成后回顾。该
bundle 的 `rb_profile.yaml` 已有合法的 `research_profile`、must-answer
questions 与 HITL1 记录，但它不足以说明用户真正想用这份研究做什么，因而
很难审计最初的研究语义是否对齐。

## 结论

应在现有 **HITL1** 完成这件事，不增加新的生命周期 checkpoint，也不把
HITL2 变成上游范围修复点。

HITL1 需要从“展示推荐，允许用户自行修正”增强为“展示推荐，并在 Agent
认为一个看似清楚的理解仍存在会改变研究路线的歧义时，主动给用户一个小而
明确的反问机会”。这必须同时保留两条正常路径：

1. 用户说“我不知道，你先研究/按你的建议开始”时，Agent 给出可审阅的推荐
   后可直接进入既有流程，不强迫用户填问卷。
2. 用户希望澄清，或 Agent 识别到 material ambiguity 时，Agent 只提出当前
   已具备前提的少量高价值问题；用户回答后再决定下一批，而不是一次性穷举。

这借用 `grilling` 的两个有益部分：先形成 decision tree、一次只问当前
frontier；不采用其“relentless”语气、穷尽所有分支或把用户变成事实检索者的
做法。

## 已确认的边界

- `brief/hitl1.md` 已是 recommendation-first 入口，`phase-hitl1.md` 已允许
  用户直接接受、自然语言修正或继续提问；`hitl-ux` 也已要求不确定的用户可
  接受 Agent 的具体建议。因此这是现有 HITL1 能力的强化和可审计化，不是
  第三个 HITL。
- `rb_profile.yaml` 是 Engine 所需的窄结构化投影：profile、must-answer、
  access observation 与 checkpoint。它不应被扩成完整的意图/偏好/对话模型。
- `rb_plan.md` 是当前 run 的叙事性研究锚点，适合记录“用户最终接受或委托给
  Agent 的研究理解”。`User Research Controls` 仍只承载额外控制和 focus，
  不应被重载为通用 HITL 审计日志。
- HITL1 Gate 只能验证确定性结构和既有字段；它不能、也不应，给研究意图做
  假装客观的语义评分。
- 已完成的 bundle 不是可随意回写的样本。本计划不修改当前 bundle；若用户
  后续给出真实的目标修正，应按已有 post-final rerun 或新 run 的合法路径处理。

## 推荐的交互契约

HITL1 在持久化任何 canonical profile、Topic state 或 status 前生成一个
**研究对齐草案**。它至少包含：

- Agent 对用户目标、对象、预期交付/决策用途和范围的简明理解；
- 推荐的 must-answer set、Topic map 和研究 profile；
- 仅在有 material ambiguity 时出现的反问；
- 每个反问的推荐答案及其会改变什么；
- 清楚的直接出口，例如“按这个建议开始”或“你来决定并继续”。

反问的判定标准是：答案会实质改变至少一个既有结构化决策（must-answer、
Topic map、研究深度、明确排除、证据/来源约束或交付重点）。以下情况不应
主动打断用户：Agent 能以透明默认值处理的细枝末节、不会改变研究路线的偏
好，或仅为了让输入“完整”而提出的问题。

当前 accepted contract 只明确授权每个 material ambiguity 的一个最小问题。若要
保留“三问”这一 normal-form，必须先在 HIU-002 加入 HITL1-specific qualification：
普通首轮最多放三个相互独立、当前可回答且各自会改变既有结构化决定的 frontier
问题。某个问题依赖另一个未决答案时，必须等下一轮。用户可以回答其中一部分、
说“按推荐继续”、或委托 Agent 作剩余判断；Agent 随即重新陈述更新后的理解并进入
既有 HITL1 写入/Topic state/probe/Gate 链。没有固定轮数和没有“所有潜在问题都
问完”这一完成条件；若该 qualification 不获接受，方案收窄为一次一个问题。

```text
原始请求
  |
  v
Agent: 研究对齐草案 + 推荐
  |
  +-- 无 material ambiguity，或用户委托 ------> 接受推荐 / 直接继续
  |
  +-- 有会改路线的歧义 -----------------------> 一组 1-3 个 frontier 反问
                                                     |
                                                     v
                                              用户修正 / 接受 / 委托
                                                     |
                                                     v
                                           更新草案，再走现有 HITL1 退出
                                                     |
                                                     v
                     rb_plan narrative + rb_profile structured projection
                                                     |
                                                     v
                       existing Topic-state -> access probe -> HITL1 Gate
```

## 持久化与责任边界

推荐为新 bundle 的 `rb_plan.md## Goal` 增加一个 template-owned 的
`### HITL1 Alignment Snapshot`。它不是新 schema、state、Gate input 或对话
逐字日志；它是后续 Agent/human 重新加载 run 时可以读懂的受控叙事快照。

其最小内容应为：

1. 用户确认的目标，或用户明确授权 Agent 采用推荐的事实；
2. Agent 最终理解的研究对象、交付用途和范围；
3. 已澄清的 material fork，以及仍按透明默认值处理的假设；
4. 由此派生并已写入既有 `root_must_answer_set` / Topic map / profile 的简短
   对应关系。

使用 template-owned required-fill marker 可以复用现有 setup-ready 的
“未填模板标记”检查，提示正常模板路径中尚未替换的 snapshot 占位符，但不新增
任何 Gate rule，也不声称该检查验证了语义质量、named heading 仍存在或快照未被
删除。对 autopilot 路径，快照应明确记录“用户委托按 Agent 推荐推进”，而不是
留下空内容。

Source of Record 分工如下：

| 事实 | Owner | 不承担的职责 |
|---|---|---|
| 可验证的研究 profile、must-answer、access、HITL marker | `rb_profile.yaml` | 保存完整自然语言意图 |
| 当前研究语义、澄清结果、透明默认值 | `rb_plan.md## Goal > HITL1 Alignment Snapshot` | Engine/Gate 语义裁决 |
| 用户额外来源/证据/交付控制与 focus | 现有 `User Research Controls` snapshot | 替代主研究目标 |
| schema、topic UID、Gate verdict、trace | Engine/CLI | 判断用户想要什么 |

## 不做的方案

- **不新增 HITL0 或第三个 checkpoint。** 这会破坏当前“只有 HITL1/HITL2”的
  交互契约，并把普通研究对齐误建成生命周期状态。
- **不引入 `clarification_mode`、问答队列、轮数计数或文本 sentinel。** 是否要
  澄清是当前 HITL1 的 Agent judgment；用户可用自然语言触发或跳过。
- **不让 Gate 评分或解析 alignment prose。** 这会把 Agent 的语义判断伪装成
  deterministic truth。
- **不照搬高压 grilling。** 反问必须服务于一个可说明的研究路线分叉，并永远
  保留推荐和直接退出。
- **不回填/重写已完成 run。** 当前 bundle 只能作为失败信号与回顾材料，不能
  据此编造原始意图。

## 实施前的验证与 OpenSpec 范围

在提出 change 前，先完成一轮小型设计验证，而不是立即改文案：

1. 让用户用一两句说明本 bundle 真正遗漏的目标或决策用途。现有 durable
   artifacts 只可靠地保留了“资料限 2026+”，不足以逆推出这个答案。
2. 用至少三个真实 intake 例子检验草案：
   - 模糊且完全委托给 Agent 的用户；
   - 看似明确、但“研究对象/决策用途”有两种会导致不同 Topic map 的解释；
   - 已有详细 brief、只需要直接接受的用户。
3. 验证每个例子都能在不额外创建 HITL 的前提下，落到现有 profile、canonical
   topic-state、style projection、probe 和 Gate 链。
4. 只有这些例子证明 prompt 需要改变时，创建一个有界 OpenSpec change；暂定
   名称为 `strengthen-hitl1-bounded-clarification`，名称在 propose 时再确认。

预计的 change 边界：

- 修改 `agent/hitl-ux`：定义 proactive-but-bounded clarification、delegation
  exit、materiality 与反复澄清的停止条件；
- 修改 `research/pre-research-phase-content`：规定 HITL1 草案、持久化顺序和
  不新增 lifecycle authority 的边界；
- 修改 `research/plan-hostfile-sections`：定义 alignment snapshot 的模板位置、
  叙事职责和旧 bundle 兼容性；
- 修改 `brief/hitl1.md`、`phase-hitl1.md`、`shared-agent-ux-guidance.md` 与
  `rb_plan.md.tmpl`；如 topic-state/host-file preservation 试验显示需要，才
  修改相应 helper，不能预先假定需要 Engine 扩张；
- 不修改 `ProfileSchema`、HITL1 Gate definition、research-style schema 或
  lifecycle transition 枚举，除非 OpenSpec exploration 发现一个当前 contract
  无法表达的确定性事实。

## 验收与测试策略

计划中的测试应放在根 `tests/`，并区分“文字/结构契约”和“真实 Agent 对话”：

1. Markdown contract tests 验证 HITL1 brief/phase 明确含有：主动解释、只问
   material frontier、最多三个首轮问题、推荐与直接 delegation exit、以及不
   新增 checkpoint 的禁令。
2. Host-file/template tests 验证新 bundle 有 alignment placeholder，HITL1
   完成时可替换，且 canonical topic-state、Progress writer 和 controls snapshot
   不会误改或丢失它；旧 bundle 保持可读兼容。
3. Gate regression tests 验证 setup-ready 只继续检查既有 template marker，
   不把 prose 内容当作新的语义 Gate。
4. 仅在真实宿主能力和真实 Agent 工具可用时，运行一个 `agent_flow_e2e`：
   验证“我什么都不知道，按建议继续”和“此处有 material ambiguity”两种
   行为均能到达同一个 HITL1 exit。不能用 mock 对话声称已证明 Agent judgment。

## 已作决定与待确认项

已作决定：复用 HITL1、保留自主委托、允许 Agent 主动反问、使用有界 frontier、
将丰富叙事留在 plan 而不是 profile、保持 Engine 不裁决语义。

待用户在下一轮探索中确认：

1. 当前 bundle 实际遗漏的“研究对象/决策用途”是什么；这会校验反问模板是否
   击中真实问题，而不是抽象地增加摩擦。
2. alignment snapshot 是否应始终保存（推荐），还是只在用户修正或 Agent 发问
   时保存。推荐始终保存，因为“按你建议”本身也是一个后续必须看得懂的决定。
3. 首轮“三问”是否是适合的默认上限；推荐保留它作为 normal-form，而不是把它
   变成绕不过的机械限制。

在这三个点明确前，不创建 proposal、不修改 framework，也不触碰该已完成
bundle 的 runtime truth。

## 可行性与最小实施建议（基于当前 contract）

### 已验证结论

**有条件可行，且低影响路径不需要扩张 Engine、ProfileSchema、lifecycle
transition 或 HITL1 Gate。** 当前 HITL1 已是 recommendation-first loop：用户可
直接接受、自然语言修正或继续提问，清楚决定后由 Agent 写入既有 owner 并继续
同一合法链（`openspec/specs/agent/hitl-ux/spec.md` HIU-001 L11-L20；
HIU-002 L101-L114；`DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md`
L18-L42、`phase-hitl1.md` L80-L101）。因此“对齐草案 + 委托出口”可留在
现有 HITL1，而非新增 checkpoint。现有 `stop: yes` 也已经只等待真实缺失的
用户决定，随后由 Agent 重跑同一 Gate（`phase-hitl1.md` L197-L203），不需要
`clarification_mode` 或新的 pause state。

`rb_plan.md## Goal` 是合适的叙事落点：它是 Agent/human 重新加载 run 时的
research objective anchor；`PlanSchema` 只校验 frontmatter，canonical topic-state
只刷新其 Topic Registry presentation 并保留其余 body。因此新 snapshot 可作为
Goal 下的 Markdown，而不是 profile field（`plan-hostfile-sections` PHS-001/PHS-002
L13-L15、L27-L47；`schema/contracts/plan.mjs` L4-L66；
`engine/helpers/canonical-topic-state.mjs` L813-L843、L1898-L1903）。

**需先补齐的 contract tension：** HIU-001 对一个 material ambiguity 要求“只询问
区分该边界所需的一个最小问题”（`hitl-ux` HIU-001 L16-L18、L52-L56）。这可以
理解为“每个边界一个问题”，但当前 accepted text 没有授权 Agent 主动一次展示
1-3 个 frontier questions。若保留“三问”，proposal 必须在 HIU-002 显式加入
HITL1-specific qualification（必要时向 HIU-001 加窄 cross-reference）：
仅可批量展示至多三个彼此独立、当前可回答且各自改变既有结构化决定的 material
fork；每题给 recommendation/default 与影响；依赖题推迟；始终保留直接接受/委托
出口；不引入轮数、状态或 Gate 逻辑。否则将方案收窄为一次一个问题。这个上限是
prompt shape，不得变成 HIU-004 禁止的 round counter（HIU-004 L87-L97）。

**对 marker 机制的必要修正：** 现有 `setup-ready` 只扫描 template-owned body 中
是否残留 `(待填充` / `(尚无话题)`，并不验证 named heading 存在或 prose 是否真实
对齐（PHS-005 L134-L161；`gate-setup-ready.definition.json` L170-L185；
`check-gate-setup-ready.mjs` L395-L409）。删除 snapshot heading 和 marker 仍可通过。
所以 marker 只能作为“正常模板未填”的防漏提示，不能被表述为“防止完全遗漏”的
结构保证；后者会需要新的 parser/Gate rule，应明确排除在本低影响 change 外。

### 最低影响集（建议）

1. 在 `agent/hitl-ux` 中定义上述 HITL1-specific bounded batch，保留每个 material
   boundary 的最小化、无固定轮次和 delegation exit；在 `brief/hitl1.md` 与
   `shared-agent-ux-guidance.md` 落地同一用户可见契约。
2. 在 `research/pre-research-phase-content` 与 `phase-hitl1.md` 要求 Agent 先展示
   对齐草案、解析必要 frontier，再在写 profile/status/topic-state 前写入
   `## Goal > ### HITL1 Alignment Snapshot`；继续沿现有 controls snapshot、status
   synchronization、topic-state、style、probe、same HITL1 Gate 的顺序。
3. 在 `research/plan-hostfile-sections` 与 `rb_plan.md.tmpl` 增加该 template-owned
   heading 及 required-fill marker，说明它只是叙事快照、不是 Gate semantic input。
   不复用 `User Research Controls`：该 subsection 的 exact compatibility form 只拥有
   optional controls/focus（`user-research-controls` URC-001 L13-L38）。
4. 更新现有 Markdown contract、template/gate-marker 和 topic-state body-preservation
   tests；只有真实 Subject Agent 的两个 intake path 才可作为 `agent_flow_e2e` 的
   `agent_behavior` 证据，JS tests 只能证明 deterministic contract
   （`verification-routing` VER-001 L11-L38、VER-002 L69-L94）。

### 生命周期、风险与顺序（建议）

- 先让用户给出实际遗漏的 research object/decision use，并在“一次一个”与
  “最多三个独立问题”之间作出明确选择；再用 `/opsx:propose` 创建有界 change，
  以 `/opsx:explore` 固化上述 wording 和三个真实 intake 例子。Harness、tests 与
  experiments 在 `/opsx:apply` 前保持只读（`AGENTS.md` L59-L72）。
- apply 前按 change 的 `tasks.md` 完成 plan review、verification-routing plan check 和
  semantic-closure plan check；若 tasks 含 feedback markers，还须取得当前 operation
  guidance（`governance/change-feedback-loop` CHF-001/CHF-002 L14-L24、L108-L113）。
- 实施时不回填已完成 bundle、不让 snapshot 覆盖 `rb_profile.yaml` 或 Topic identity、
  不让 Gate 解析/评分 prose，也不引入 clarification queue、counter、sentinel 或第三个
  HITL。snapshot 必须在现有 topic-state apply 与 setup-ready handoff 前写入，避免在
  route-bound plan bytes 之后再改动 host file（`pre-research-phase-content` PRP-012
  L348-L379；`tests/e2e/setup-ready-hostfile-handoff.test.mjs` L56-L84）。
