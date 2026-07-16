# Iterative Deep Research — 定位与演进路线

> 状态：方向已明确，待 OpenSpec propose
> 创建：2026-07-16
> 修订：2026-07-16（从单次实操定位稿更新为框架演进路线）
> 来源：`aiewf-2026-community-pulse` 三轮 rerun 实操反思
> Git 来源：commit `17502063bc292f764db73b9994b8f633a0353675`，2026-07-16 12:06:51 +0800
> 设计约束：`guidelines/evolution-helper-oriented-agent.md`、`guidelines/evolution-simple-reliable-control.md`

---

## 一句话定位

**DPT 不是一次性问答式 Deep Research，而是可审阅、可继续深化、可追溯演进的研究协作框架。用户表达研究判断和新的目标，Agent 负责把它翻译成合法的后续研究行动并执行，Engine 只裁决确定性 contract。**

这里的“迭代”不是无限重跑，也不是把旧内容机械堆叠。它表示：

- 用户可以在看到真实证据和 synthesis 后再决定下一步；
- 同一 bundle 保留历史 evidence、provenance、decision 和 gate lineage；
- 当前研究结论可以被补充、修正、降权或 supersede；
- 用户不需要理解内部 phase、enum、CLI、topic mutation 或 repair path。

框架主动发起的人类交互只有两个点：

```text
HITL1：对齐研究目标、范围和投入
  -> 中间阶段：Agent 静默自主执行
  -> HITL2：审阅当前研究，决定交付或继续深化
```

用户在任何阶段主动发起对话是另一回事：Agent 正常回应，但这不是框架主动打扰，也不自动成为第三个 HITL、状态迁移或 mutation permission。
若 HITL2 决定交付，Final 仍会呈现最终报告；这是 terminal delivery，不是第三个需要用户决定的交互点。

---

## 这份文档是什么

这份文档最初不是 implementation plan，而是 2026-07-16 基于一次三轮真实 rerun 写下的定位稿。它抓住了正确的产品方向：研究需求通常在用户看到第一批结果后才变清晰，因此 HITL2→rerun 不应只被看作异常恢复路径。

初稿也把当时的运行经验写成了长期机制结论。当前 framework 已经继续演进，以下说法不再适合作为未来设计依据：

- `rerun_count < 3` 已不是当前 executable limit；当前 Gate definition 允许最多 10 个 rerun cycle，具体上限以 active rule 为 Source of Record。
- topic 不再是“只增不减”；当前 canonical topic-state 已支持 `add_topic`、`update_intent`、rename/reorder/renumber，以及 Engine 证明安全时的 remove。
- “所有已有工作保留、证据只多不少”表述过强。历史 provenance 应保留，但旧结论不应因此永久进入当前 synthesis。
- 用户不应被要求理解 `repair`、`rerun`、`update_intent`、`mutate_layout` 等内部机制后才能表达需求。

因此，本次修订保留战略定位和真实案例，把实现方向重新约束在当前 accepted specs、helper posture 与 simple reliable control 之内。

---

## 核心产品姿态

### 1. 研究是逐步澄清，不是一次完美提问

典型研究过程不是：

```text
用户一次说清全部需求 -> Agent 一次搜完 -> 报告结束
```

而是：

```text
初始问题
  -> Agent 建立第一版证据与判断
  -> 用户审阅“已知 / 不足 / 值得继续的方向”
  -> 用户表达新的研究意图
  -> Agent 增量执行
  -> 形成下一版可审阅研究
```

HITL1 只需要得到一个足够好的起点，不应假设用户在研究开始前已经知道最终正确的 topic decomposition。HITL2 的价值是让用户在拥有更多信息后修正目标。

### 2. 用户决定研究语义，Agent 承担操作翻译

目标责任边界：

```text
User
  说“哪里还不满意、还想知道什么、风险/成本是否接受”
    |
    v
Agent
  读取当前 evidence / gaps / topic state
  推荐最有价值的下一步
  将用户自然语言映射为 accepted decision + legal topic/rerun action
  执行后续普通命令、修复和 checkpoint rerun
    |
    v
Engine
  校验 profile、identity、mutation、receipt、provenance、Gate 与 transition
```

用户不应成为 pipeline co-runner，也不应被迫在内部控制名词之间做技术选择。Agent 可以展示简短快捷选项，但必须同时接受自然语言，并负责翻译。

### 3. 迭代保留历史，不冻结当前判断

正确的 cumulative semantics 是：

- 保留历史 evidence、reference、work-unit、trace、decision 和 provenance；
- 当前轮优先读取 current canonical intent 和 current-round submitted authority；
- 旧证据可以继续复用，但必须仍然相关且没有被更强事实推翻；
- 旧 finding 可以被 supersede、降权或明确标为历史判断；
- rename/layout change 保留历史坐标，但当前导航使用 canonical identity；
- safe remove 由 Engine 基于直接历史事实裁决，不由“只增不减”的口号禁止。

这比“所有东西永远叠加”更符合研究：证据链要保留，结论必须允许进化。

### 4. 两个 HITL 是研究协作面，不是控制台

HITL1 负责把用户最初的问题变成一个足够好的研究起点。Agent 应先理解问题并提出推荐的范围、重点和投入，用户负责确认或修正研究语义。用户不需要先学习 `quick_factual`、`exploratory_map`、`claim_verification` 等内部 profile 才能开始。

HITL2 应先帮助用户理解当前研究：

- 已经能可靠回答什么；
- 主要限制、争议和风险是什么；
- 哪个继续研究方向的边际价值最高；
- 继续深化大致会改变什么，而不是只说“重跑”。

然后用户可以直接表达：

- “够了，按这个出报告”；
- “换成管理层视角”；
- “资本约束这部分还不够，再补一下”；
- “这里的证据似乎有错，先修正”；
- “先停在这里”。

Agent 再映射到内部 `proceed_to_readiness`、`request_view_revision`、`rerun`、`repair`、`stop_blocked`。内部 enum 继续作为 machine contract，但不应成为用户必须学习的主界面。

HITL1 与 HITL2 之间，框架 SHALL 默认静默自主运行：不主动报告进度、不因普通失败求助、不请求继续确认。若用户主动发送消息，Agent 正常回应，不应假装“用户不存在”；但这次回应不改变框架的两个 HITL 结构，用户消息本身也不创造新的 lifecycle checkpoint、permission 或 Engine path。

---

## 当前框架基础与差距

| Surface | 当前已有 | 主要差距 |
|---|---|---|
| HITL interaction | HITL1/HITL2 有 durable profile decision、brief 和 Gate | 两端都以字母菜单、内部分类和 blanket second confirmation 为中心，Agent 推荐与自然语言翻译不足 |
| Silent autonomy | 非 HITL phase 有 `stop:no` silent contract，Engine 会注入 autonomous header 和 continuation cue | contract 正确禁止主动打扰，却把用户主动消息也定义成不可回应；`interaction: prohibited` 等投影也固化了这个过度解释 |
| HITL2→rerun route | 有真实 Gate、transition、route-bound witness 和 rerun-ready checkpoint | 用户仍需理解 repair/rerun 区别；清楚决定之后的机械执行虽已有路径，但 UX 没形成一个短闭环 |
| Topic evolution | 有 canonical UID、add/update/layout mutation、历史坐标解析和 safe-remove guard | 旧文档仍传播“topic 只增不减”；Agent 推荐何种变更的 UX 不够清楚 |
| Round continuity | 有 Engine-owned `rerun_count`、current-round work-unit authority、direction resolver | 多处 Markdown 仍硬编码旧的 `>= 3`，与 active Gate limit 漂移 |
| Evidence continuity | 有 submitted ledger、reference、cache、finding/index 与历史 provenance | 用户文案用“当前结果全部保留”，未区分历史保留与当前结论 supersession |
| Helper posture | Gate/inspect 已逐步提供 `missing_fact`、`write_to`、`rerun` | HITL 环仍普遍要求显式二次确认，Agent 推荐与自动翻译能力发挥不足 |
| Product positioning | `RUN.md` 只简述“多轮、gate、证据包” | root/framework README 与 HITL2 brief 尚未把 iterative research 说成首要体验 |

机械骨架已经存在。首步不应再加 state、CLI、controller 或新 lifecycle，而应让现有机制以正确的 Agent/user responsibility 对用户显现。

---

## 目标交互节奏

### HITL1：一次有意义的方向对齐

Agent 根据原始问题先给出推荐的研究设置：理解后的目标、must-answer、topic preview、建议的深度/广度及其影响。用户可以直接接受，也可以用自然语言修改。

- 用户清楚说“按这个开始”本身就是确认，不再翻译成 enum 后重复问一次。
- 当范围、成本或关键语义仍有实质歧义时，Agent 只追问那个最小边界。
- 用户决定后，profile/topic-state/style/probe/Gate 与后续命令全部由 Agent 执行。
- 字母快捷选项可以保留为辅助，但内部 profile 名不应成为主要交互要求。

### 中间阶段：默认静默自主

- 没有用户主动消息时，Agent 不浮出水面，不发 acknowledgement、进度、错误、idle 或确认请求。
- 普通 Gate/submit/queue failure 仍由 Agent 根据 direct feedback 自行修复并 rerun same checkpoint。
- 用户主动发起对话时，Agent 正常回应；这是用户在说话，不是框架主动浮出，也不自动进入 HITL 环。
- 这次回应本身不改变当前 run；任何后续动作仍受用户实际表达的意图和现有合法路径约束。
- 用户消息不自动授权手改 state、跳 Gate 或创建缺失 mutation path；若当前没有合法路径，Agent 诚实说明最小边界。

本计划不在首个 change 中建设通用 mid-run request queue、pause state 或任意 scope mutation。若真实使用证明需要 durable 中途改向，另行提出最小 accepted path。

### HITL2：研究审阅与下一轮决定

HITL2 继续使用现有 durable `decision-brief.md` 和 profile decision owner，但用户可见内容调整为：

1. 当前结论摘要；
2. 关键证据限制或争议；
3. Agent 推荐的一个下一步及理由；
4. 用户可以直接同意推荐，也可以用自然语言说想继续研究、改视角、纠错或停止；
5. 字母快捷方式可以保留为 affordance，但英文 enum 与内部 phase 不作为主要说明。

### 共同的责任与确认

- 用户自然语言已经清楚表达目标时，Agent SHALL 直接映射并记录，不再要求一次无信息增益的二次确认。
- 不制定“所有选择都确认”或“所有选择都不确认”的新 blanket rule；不可逆语义变更、真实权限/成本扩张或表达有实质歧义时，才请求最小确认。
- 用户说“继续补 X”后，Agent 负责判断它对应 current-attempt repair、topic intent update、add topic、layout change 还是 rerun，并使用现有 inspect/apply/gate path。
- Agent 不得暗中替用户发明新的研究目标；它可以基于 decision brief 推荐，但用户仍拥有新语义决定。
- 用户决定后，所有合法机械执行立即回到 Agent，不再逐步询问或交付命令清单。

### 对外承诺边界

对外可以承诺“可继续深化、历史可追溯、同一研究可演进”，不能承诺：

- 无限 rerun；
- 每轮一定只做增量、不需要重算；
- 所有旧证据永远保持当前有效；
- 用户一句话可以绕过 permission、Gate、provenance 或 topic-state guard；
- Agent 会在没有 accepted path 时自行创造恢复能力。

---

## 建议的第一个 OpenSpec Change

建议 change 名：`simplify-iterative-research-interaction`

### Change 目标

用现有 HITL1/HITL2 profile、brief、Gate、rerun 与 topic-state authority，形成一个完整的人机协作节奏：HITL1 对齐方向，中间静默自主，HITL2 审阅并决定交付或深化。同时收窄 silent contract 的含义：禁止框架主动打扰，不是忽略用户主动发来的消息。

### Scope

1. 在现有 `project-charter.md` 中增加一个短小的 iterative research posture，不新增第三份 evolution guideline：
   - HITL1 / silent autonomy / HITL2 是默认协作节奏；
   - 用户主动发起的对话不是第三个 HITL，也不创造 permission；
   - Final 是 terminal delivery，不是新的决定交互点；
   - history retention 与 current judgment evolution 必须区分。
2. 修改 accepted `hitl-ux` contract，局部收敛两个 HITL：
   - HITL1 以 Agent 理解后的研究设置建议为入口，用户自然语言接受或修正；
   - HITL2 以 research review + one recommendation 为入口；
   - 接受自然语言研究意图，由 Agent 映射到现有 enum；
   - 仅在实质歧义、成本/权限或不可逆风险边界上请求最小确认；
   - 删除所有直接选择都必须重复确认的 shared blanket rule；
   - 用户无需区分 repair 与 rerun 的内部机制。
3. 修改 accepted `silent-wave-execution` / Agent-facing interaction contract：
   - 保持非 HITL 阶段禁止 unsolicited surfacing；
   - 明确 silent 只约束框架不主动浮出，不得将它解释成忽略用户主动发来的消息；
   - 正常回应用户不创建第三个 HITL、state、permission、mutation authority 或 interrupt lifecycle；
   - 回应本身不改变当前执行；用户没有另行改变任务时，原执行继续保持静默自主。
   - 同步收窄 `shared-silent-execution.md`、Engine 注入的 autonomous header 和 continuation cue，不留下一边允许回应、一边又绝对禁止所有 interaction 的冲突指令；
   - 保留现有无状态 continuation cue 与 `next_action`，将 `stop:no` 的 `interaction: prohibited` 收窄为 `interaction: do_not_initiate`；它只提醒 Agent 不主动联系用户，不是新 authority，也不增加第二个 interaction truth 或持久状态。
   - 仅为保持同一行为的 spec 与投影一致，局部更新 `agent-command-surface`、`workflow-node-contract`、`cli-phase-transition` 和 `delegated-work-units`；不扩张 lifecycle、queue 或 work-unit authority。
4. 修改 `run-entry` / relevant shared-node contract：
   - `RUN.md`、framework README、HITL1/HITL2 briefs 统一 iterative positioning；
   - 不写 marketing hero，不扩张入口流程；
   - 清楚说明用户负责研究判断，Agent 负责继续执行，框架只在 HITL1/HITL2 主动邀请并等待用户决定；Final 只作终端交付。
5. 对齐当前 rerun-limit drift：
   - 删除 phase/shared docs 中硬编码的旧 `rerun_count >= 3`；
   - 修正 requirement registry 与 current integration tests 中同一旧常量；
   - 文档引用 active Gate rule 作为 max-rerun Source of Record；
   - 本 change 不改变当前 limit 数值。
6. 增加验证：
   - focused Markdown contract tests 证明两个 HITL 不把内部 enum 当主要操作面，且默认 silent contract 不主动打扰；
   - 运行现有 rerun-ready boundary test，证明它与 active Gate definition 同源；
   - `agent_flow_e2e` 证明 HITL1 用户自然语言接受建议后，Agent 自己完成持久化/Gate 并进入静默阶段；
   - `agent_flow_e2e` 使用真实 disposable bundle，证明用户用自然语言说“继续补某个研究方向”后，Agent 记录真实 decision/rationale、自己消费 Gate/transition 并进入现有 rerun path；
   - 同一实验族证明无用户消息时不主动浮出；普通用户主动回合不被误判成第三个 HITL、checkpoint 或 permission，也不要求建设 async interrupt transport；
   - 不用 mock 或手写 Agent 结果证明行为。

### 明确不做

- 不新增 profile 字段、schema version、CLI、Gate、transition outcome 或 lifecycle node；
- 不新增第三种 `stop` 语义或把 Final 变成交互环；
- 不新增第三份 evolution guideline；
- 不新增 recommendation authority；recommendation 只存在于现有 decision brief / conversation projection；
- 不自动替用户选择新的研究语义；
- 不把 Engine 扩成研究策略或 topic 推荐器；
- 不在本 change 删除 max-rerun guard 或修改 limit；
- 不建设通用 mid-run request queue、pause/resume state、scope-mutation controller；
- 不一次性重写 Final、post-final recovery 和全部 phase；
- 不新增 watcher、planner、memory、retry tree、generic helper controller；
- 不用定位文案覆盖 accepted provenance、mutation 或 reentry contract。

### Simple Reliable Control Review

最短合法闭环：

```text
HITL1: Agent recommendation -> user intent -> existing profile/topic owners
  -> silent autonomous execution
  -> HITL2: research review + one recommendation -> user intent
  -> existing profile decision -> existing Gate and route
```

Net simplification：删除 shared blanket second-confirmation round、减少两个 HITL 暴露的内部 enum/phase 术语、把 silent contract 从“绝对忽略用户”收敛为“不主动打扰”、消除 header/cue 的同一歧义、删除硬编码 rerun-limit 文档/registry/test 副本；不增加新的 truth、checker、guideline 或 controller。

### Helper-Oriented Review

框架需要主动等待用户的只有 HITL1 的研究目标/范围/投入决定，以及 HITL2 的“当前研究是否足够、哪里要继续、希望怎样改变、是否停止”。用户另行主动提出新语义、风险或权限决定时，Agent 响应该请求；这不构成新的等待点。用户决定后，profile 写入、topic-state inspect/apply、Gate、enter-phase、status sync 和后续研究均由 Agent 执行。Engine 继续独占确定性 verdict。

---

## 后续演进，不塞进第一个 Change

### A. Rerun limit 的产品与控制审计

当前 executable limit 已从 3 放宽到 10，但 repo 内仍有旧文案。第一步只修 drift，不改 limit。后续应基于真实 run 数据回答：

- 上限保护的直接风险是成本失控、topic 膨胀、上下文质量下降，还是仅为早期防无限循环？
- 固定 cycle count 是否仍是最直接的风险 proxy？
- 到达上限时，是否应在用户作出 rerun 决定前暴露成本/eligibility，而不是进入 `stop:no` phase 后 silent-unpassable？
- 能否复用现有 active rule 与 HITL2 decision brief，不新增第二个 eligibility checker？

该问题若改变行为，应单独 propose，不能在 UX change 中顺手删除护栏。

### B. Durable mid-run intervention

首个 change 只修正 silent contract 对“框架不主动打扰”的定义：用户主动说话时可正常回应，但不因此创造第三个 HITL 或 authority。如果真实 run 需要在任意 `stop:no` phase 持久化新 scope、暂停、取消或改向，再单独调查：

- 哪些请求可以沿现有 topic/rerun/queue owner 处理；
- 哪些请求只能等到 HITL2；
- 是否存在 chat loss 后必须保留、又无法从现有 direct authority 重建的最小 intent；
- 能否复用现有 checkpoint，而不新增 generic interrupt controller。

### C. Repair / view revision 的真实可达性审计

`request_view_revision`、`repair`、`stop_blocked` 当前是 context-dependent Agent branches，不是 deterministic chain outcomes。需要用真实 bundle 验证：

- Agent 是否能从每个选择得到一个合法且唯一的最近动作；
- `repair` 是否经常因为缺少 accepted mutation path 而成为空承诺；
- view revision 是否能在不重跑研究的情况下回到可交付状态；
- stop/resume 文案是否与真实 reentry capability 一致。

发现缺口时按 direct owner 分 change，不建统一 branch controller。

### D. Current-view / history-view 语义

如果真实多轮 run 仍频繁把旧结论混入当前 synthesis，应先调查现有 finding status、round binding 和 canonical topic intent 是否足以表达 supersession。只有现有 direct authority 不足时，才考虑新增最小字段；不得先造 completion manifest 或第二套 consistency truth。

---

## 真实案例仍然提供的证据

`aiewf-2026-community-pulse` 的三轮 rerun 仍然证明了一件重要的事：用户在看到前一轮结果后发现 06/07/08/09 等新方向，比一开始要求用户一次性设计完所有 topic 更符合真实研究过程。

这个案例不证明“所有研究都该跑三轮”，也不证明“只 add 不 remove”是永久规则。它证明的是：

> 研究框架必须允许用户在拥有更多证据后改变主意，并让 Agent 在同一可追溯研究上下文里继续工作。

这就是本计划要固定的调。

---

## 完成标准

本计划在以下条件全部满足后关闭：

1. iterative research posture 已简短写入 `project-charter.md`，并由 accepted specs 落实，而不是只存在于 backlog；
2. 第一个 OpenSpec change 已 propose、explore、apply、archive；
3. HITL1 用户可以接受或修正 Agent 推荐的研究设置，HITL2 用户可以表达继续研究/改视角/纠错/交付/停止，两端都不需要学习内部 enum；
4. 可恢复且语义清楚的选择不再统一要求无意义二次确认；
5. 用户决定后，Agent 自己执行现有合法机械链；
6. HITL1 与 HITL2 之间默认静默自主，不主动报告进度、错误或请求确认；
7. 用户主动消息可被回应，但不被当作第三个 HITL、Engine permission 或 automatic state mutation；
8. Final 保持 terminal delivery，不成为第三个决定交互点；
9. 定位文案明确 history retention 不等于 stale conclusions 永久有效；
10. repo 不再把 `<3` 当作当前 rerun limit 的硬编码事实，current boundary tests 与 active rule 一致；
11. 真实 `agent_flow_e2e` 覆盖 HITL1→silent execution 与 HITL2→audited rerun 两个协作边界；
12. requirement/spec governance 与 verification routing 全部通过。
