## Context

当前 lifecycle 已经有正确的结构骨架：`phase-hitl1.md` 和 `phase-hitl2.md` 是仅有的两个 in-run `stop: yes` 决定点，其他非终端 phase 为 `stop: no`，Final 是 `stop: no` + `gate: null` 的 terminal delivery exception。HITL durable decision 已由 `rb_profile.yaml` 和对应 Gate 持有，HITL2 `proceed_to_readiness` / `rerun` 已有 deterministic `check.next` 路径。

问题主要在 Agent-facing projection，而不在 lifecycle machinery：

- `hitl-ux` 和 shared UX 强制字母菜单、英文内部分类与统一二次确认，使 Agent 不能把已清楚的自然语言决定直接映射到现有 contract。
- `silent-wave-execution`、`shared-silent-execution.md` 和 Engine 注入 header 把“不主动打扰”表达成“不允许任何回应”，并明确要求忽略用户主动消息。
- 无状态 continuation projection 的 `interaction: prohibited` 在 Gate、`enter-phase`、`advance-status` 和 work-unit claim 边界重复这个过度语义。
- `phase-rerun.md`、shared silent prose、requirement registry 和 rerun-ready integration tests 仍保留旧 `<3` 常量，而 active Gate definition 的 `less_than: 11` 才是当前 executable Source of Record。
- HITL UX 还通过固定第 3/5 轮阈值驱动轻推，并把用户的“不确定”原话当作 `gap_queue_backed` 文本暗号交给 Seed Topics；两者都没有结构化 owner，却增加了 Agent 必须记住的隐式控制。
- active rerun experiment/runner index 仍把 `rerun_count=3` 当失败边界，accepted version requirements 还永久固定历史 v0.6/v0.7；这些都是当前 direct authority 已经存在时留下的副本。
- accepted `check-inspect-feedback`、Wave phase 和 dry-submit contracts 仍把 `user_decision|external_action|missing_contract` classification 写成立即 surface/escalate 用户。若只改 silent prose，这些旧 owner 会在 `stop:no` 中继续制造 HITL1/HITL2 之外的框架主动等待。
- stop:no Gate/Inspect producer 也会把相同 classification 写成 action-bearing “ask user”“return to HITL”或“surface blocker” advice；仅改 Markdown consumer 仍会在最近决策点注入相反指令。
- HITL2 当前会先接受 `rerun`，而 `phase-rerun.md` 在 increment 后才由 rerun-ready Gate 发现 active limit 已 exhausted；这会把用户送进一个已知 silent-unpassable 的 stop:no dead end。

本 design paired-read `guidelines/evolution-simple-reliable-control.md` 和 `guidelines/evolution-helper-oriented-agent.md`。它不增加 interaction controller，而是删除重复控制，并把 Agent/user/Engine 责任放回现有 owner。

## Goals / Non-Goals

**Goals:**

- 固定一个默认协作节奏：HITL1 对齐研究 -> Agent 静默自主研究 -> HITL2 审阅/决定 -> Final 终端交付或现有 rerun path。
- 让 HITL1/HITL2 以 Agent 对当前 direct facts 的一个推荐为起点，支持自然语言接受/修正，但不替用户发明新研究语义。
- 只在实质歧义、新风险/成本/权限或不可逆边界请求最小确认；清楚决定后所有合法机械执行立即回到 Agent。
- 保留 `stop:no` 禁止 unsolicited surfacing 和自主 repair/continue 的约束，同时要求 Agent 对用户主动发来的当前 conversation turn 做正常回应。
- 让 failure hint 只分配行动责任和诚实边界，交互时机唯一服从当前 lifecycle `stop` contract。
- 在 HITL2 decision point 用 current count + loader-returned exact supported active rule 排除已知不可执行的 rerun，但不复制 formal Gate verdict。
- 使 accepted spec、shared Markdown、Engine header 和 continuation cue 对同一行为使用同一含义。
- 删除固定轮数轻推和文本暗号式不确定状态，让 Agent 根据语义进展引导对话，并先提出可接受/可修改的具体 must-answer。
- 只清理 rerun-limit drift，不改变当前 limit 或 guard。

**Non-Goals:**

- 不新增第三个 HITL、第三种 `stop`、lifecycle node、transition outcome、Gate、CLI、profile field 或 schema version。
- 不新增 mid-run message queue、pause/resume state、interrupt transport、scope-mutation controller、watcher、planner、memory 或 retry/recovery tree。
- 不承诺用户中途消息会持久化、更改当前 run 或立即获得 mutation/reentry path。
- 不改变 HITL enum、profile schema、Gate rule set、transition table、receipt、trace authority 或 Final terminal semantics。
- 不在此 change 系统解决 `request_view_revision`、`repair`、`stop_blocked` 三个 context-dependent branch 的全部可达性；强 end-to-end route 承诺仍仅针对 `proceed_to_readiness` 和 `rerun`。
- 不新增 evolution guideline，不用 guidance prose 代替 accepted behavior。
- 不改变 active rerun limit，不删除 loop protection。
- 不承诺所有 context-dependent HITL2 action 当前都有合法 path；缺失时必须保持诚实边界。

## Decisions

### 1. 一个 change 交付一个完整的纵向体验

这个 change 同时修改 HITL1、silent middle 和 HITL2，因为用户可感知的原子结果是：

```text
HITL1 recommendation + user intent
  -> existing profile/topic owners
  -> silent autonomous execution
  -> HITL2 review + one recommendation + user intent
  -> existing decision/Gate/route
```

把它拆成“只改 prompt”、“只改 silent”和“只改 rerun UX”会留下互相矛盾的中间体验。但这个 change 不吸收 durable mid-run intervention、rerun product policy 或 context-dependent branch redesign；它们没有同一个 direct owner。

替代方案：拆成三个 change。不采用，因为任意一步单独 archive 都会让 accepted surfaces 在一段时间内对“什么时候回应/等待用户”给出不同答案。

### 2. 不创建新 capability，局部修改现有 Source of Record

`iterative research interaction` 是一个产品主题，不是独立行为 owner。HITL 对话仍属于 `hitl-ux`，phase 责任仍属于 pre-research/content-delivery specs，静默自律仍属于 `silent-wave-execution`，cue 仍属于现有 phase-transition/work-unit projection contract。

所有 delta 复用现有 requirement ID，不新分配 ID。`project-charter.md` 只增加一段稳定姿态，具体行为以本 change 归档后的 accepted specs 和 executable contracts 为准。

替代方案：新增 `iterative-research-interaction` capability 和 guideline。不采用，因为它会复制多个现有 owner 的行为，创造第二套 Source of Record。

### 3. HITL 以 Agent 的一个推荐开始，内部 enum 只是出口 contract

HITL1 入口先展示 Agent 对初始问题的理解和一个推荐设置：研究目标、must-answer、topic preview、建议的深度/广度及影响。HITL2 入口先展示当前可靠结论、限制/争议、最有边际价值的一个下一步及理由。

用户可直接说“按这个开始”、“按这个出报告”或自然语言修正。Agent 在 HITL1/HITL2 accepted boundary 内负责将语义映射到现有 enum/fields，内部 canonical 名不作为用户必须学习的主界面。字母快捷选项可作辅助 affordance，但不得替代推荐与自然语言。

替代方案：删除 enum 或新增一个 natural-language schema field。不采用，因为现有 enum 是有效的 machine contract，新字段只会复制决定真相。

### 4. 删除 blanket confirmation，保留最小风险边界

用户已经清楚说“按这个开始”或“继续补资本约束”时，Agent 直接映射、记录并执行，不再问一次无信息增益的“确定吗”。HITL2 在推荐 rerun 等 material-effort 动作时先用当前事实披露可预见影响；用户在披露后接受就是确认。只有表达存在实质歧义、实际动作超出已披露成本/当前权限或触发不可逆风险时，Agent 才问那个最小边界。

这不是“所有选择都不确认”的新 blanket rule。HITL1/HITL2 的责任是得到清楚的研究语义，而不是满足一个固定轮数。

### 5. Silent 只禁止 framework-initiated surfacing

非终端 `stop:no` 的稳定不变式是：没有用户主动输入时，Agent 不发进度、idle、partial delivery、普通错误求助或继续确认；它应修复、换策略、消费合法 handoff 或 silent hold。

若用户在正常 conversation/message boundary 主动发来消息，Agent 应回应该回合，而不是用 silent contract 忽略用户。回应不将当前 node 转为 `stop:yes`，不创建 HITL loop、permission、state transition、mutation/reentry authority 或持久 intent。用户没有另行通过 accepted path 改变任务时，原 run 的 current node/status/next action 与对应 continuation obligation 保持不变；这不声称 async scheduling 或证明回答后已经继续执行。若用户要求的动作没有现有 accepted path，Agent 回应最小边界，不伪造执行。

Final 由 `content-delivery-phase-content` 专门定义：`non-interactive` 是不主动发起 question/wait/loop，不是静音。Final artifact 前，用户主动回合只得到 verified facts/最小边界，不得冒充 delivery 或变成 progress/partial-report offer；terminal cue 保持不变。合法 delivery 后，普通事实回复仍可回答，只有 explicit rerun 才可进入 audited post-final recovery。SWE 仍只拥有 non-terminal stop:no，不为 Final 建第二套 silent contract。

`surfacing_intent` 仅用于 Agent 自己准备发起 prohibited progress/question/partial-delivery 时；不应对“回应一条用户主动消息”记录 would-have-surfaced 违规。Harness/task notification 仍不等于用户在 conversation 中的主动消息，不得触发 status reply。

替代方案：新增 pause/interruption state 或 message queue。不采用，因为“可以回答用户”不需要新 runtime truth。

### 6. `repair_kind` 分配行动责任，不放置交互

Engine 继续输出现有 `agent_action|engine_operation|user_decision|external_action|missing_contract`，但这个 enum 只回答“谁能处理、最小边界是什么”，不回答“现在能否主动联系用户”。三种非机械 kind 不能混成统一 escalation：`user_decision` 可在 HITL 问最小决定，`external_action` 可在 HITL 请求不可代理动作，`missing_contract` 只陈述 unavailable capability，绝不等待用户确认来“满足”缺失 contract。交互放置的唯一 owner 是当前 phase frontmatter/manifest 的 `stop` contract：HITL1/HITL2 的 `stop:yes` 可以邀请并等待前两类最小输入；非终端 `stop:no` 不得从 hint 推导出提问、批准请求、状态输出或 acknowledgement wait。

因此 `stop:no` 的后三类 hint 仍必须保留直接事实，不能被改写成假 pass 或吞掉：Agent 可以继续其他合法 repair、换策略、降级、handoff，或者在当前 checkpoint silent hold。若用户主动发来的正常 conversation turn 正好触及这个 blocker，Agent 回答最小边界，但不因此记录决定、扩权、暂停或改变 current checkpoint。外部前置条件经 accepted surface 满足后，机械执行和 same-check rerun 回到 Agent。Producer 审计还必须纠正 owner 错位：例如 profile 已记录而 `research_style_params` 缺失时，现有 `apply-research-style.mjs` 是 `engine_operation`，不能继续标成 `user_decision`；只有 profile 语义本身缺失才保留 decision boundary。

这条规则收敛现有 `check-inspect-feedback`、Wave phase、dry-submit、Gate/Inspect producer、canonical topic-state findings、generated work-unit task 和 Agent-facing hint consumers。Producer 对后三类边界只返回直接缺失事实、existing owner/unavailable boundary 和 same-check rerun，不输出“现在问用户”“返回 HITL”“enter sanctioned rerun”或“involve the user”；HITL controller 依据 `stop:yes` 发起最小问题/外部动作请求，silent controller 依据 `stop:no` 继续或 hold，missing contract 在任何 placement 都不伪装成可确认输入。Shared repair/anti-cheating baseline 直接采用同一语义，删除 silent guidance 为覆盖矛盾 baseline 而维护的大型 override table；不修改 Gate hint schema/enum，不让 Engine 读取 conversation，也不新增 blocker delivery、interaction controller 或第三个 framework-initiated wait。

Rerun Gate definition 的 `failure_message` 保持原 bytes。Accepted Gate contract 已把它降为非权威 compatibility detail，post-final lineage 又绑定 definition digest；本 change 只修正实际进入 action-bearing `advice[]` 的 structured finding producer，并保持 active rule/operator/value 与 definition digest 不变。

替代方案：允许 `stop:no` 对“严重 blocker”主动做一次 terminal surfacing。不采用，因为 severity/classification 会变成与 `stop` 并列的第二个交互 owner，并实质建立第三个框架主动打断点。

### 7. Continuation projection 保留，`prohibited` 改为 `do_not_initiate`

无状态 continuation cue 仍然有价值：它在 Gate、phase entry/status sync 和 work-unit claim 的立即决策点提供一个 `next_action`，抑制 Agent 因上下文疲劳而主动浮出。但 `interaction: prohibited` 同时声称“任何 interaction 都禁止”，与新不变式冲突。

因此 stop:no 投影统一为：

```json
{
  "interaction": "do_not_initiate",
  "next_action": "execute_loaded_node|consume_check_next|repair_and_rerun_gate|inspect_and_poll_claimed_work"
}
```

`do_not_initiate` 是 Agent-facing enum projection，只说“不要主动联系用户”。`required` 继续表示已加载 HITL node 的最近动作是等待用户，`terminal_delivery` 继续表示 Final 交付；全部 `next_action`、locator、Gate/status/work-unit authority 不变。

这是 breaking output-token migration，但不是状态/schema migration。仓库内没有生产 machine consumer 依赖 `interaction` 分支；现有 consumers 是 Agent-facing docs、tests 和 experiment assertions，将在同一 apply 中原子更新。

替代方案 A：保留 `prohibited` 并加一段解释。不采用，因为 token 本身仍持续制造歧义。替代方案 B：删除 `interaction` 字段。不采用，因为它会删除已通过真实 Agent 问题引入的决策点防疲劳提醒，而精确 rename 已能解决问题。

### 8. Engine 不获得新的 interaction 判断职责

Engine 仍只从已拥有的 node frontmatter 和 command outcome 投影 cue。它不读 conversation、不判断一条消息是否来自用户、不拦截 chat、不暂停执行，也不保存 interaction state。

`AUTONOMOUS_MODE_HEADER`、`shared-silent-execution.md` 与 Gate fatigue advice 作为 Agent-facing guidance 同步更新：禁止 Agent 主动发起询问/进度/确认，但明确对用户主动回合的正常回应不在此禁令中。现有 `TERMINAL_DELIVERY_HEADER` 同步采用 CDP-004 的 Final specialization：不发起 question/wait/loop，但不禁止回答已经收到的 factual turn，且 terminal cue 不变。不增加新 header、shared node 或 checker，也不改变 fatigue threshold/verdict。

### 9. Rerun limit 只保留一个数值真相

`gate-rerun-ready.definition.json` 的 active `rerun_count_valid` rule 是当前 limit 唯一 Source of Record。Phase/shared Markdown 不再写具体 `<3` 或 `>=3`，只引用 active max-rerun rule/CLI feedback。Requirement registry 中 REI-003/REI-005 的描述改为不硬编码数值的 stable semantics。

Rerun-ready integration test 与 active `case-304` experiment 在运行时读 active definition，提取 `less_than` 边界，并验证 `limit - 1` 通过、`limit` 和 `limit + n` 失败。`RUN_EXPS.md` 不再把某个具体 count 写成当前边界。不新建 max-rerun helper 或第二个 config field；shared guidance 中独立的 fatigue threshold 保持不变。

HITL2 必须在向用户推荐或接受 rerun 时避免一条已知必败路径。`phase-hitl2.md` 拥有一条 repo-root、只读的 inline Node ESM invocation，直接从现有 barrel import `loadGateDefinition('rerun-ready')`；它只返回 loader 已解析的 definition，不写文件、trace 或 state，`brief/hitl2.md` 只消费 phase 得出的可用性结论。Agent 不得 raw-parse definition、从 `failure_message` 推断语义，或临场发明 wrapper/CLI/helper。

Common Gate schema 只保证共同结构，不保证 rerun rule 的 operator/value semantics。因此 phase 必须 fail closed 地确认 `definition.gate === 'rerun-ready'`，并找到唯一满足 `id === 'rerun_count_valid'`、`check === 'rerun_count_limit'`、`target === 'rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count'`、`operator === 'less_than'` 且 `value` 为正整数的 rule。Current count 缺失按现有初始语义视为 `0`，否则必须是非负整数；phase 计算 `next_count = current_count + 1`，仅当 `next_count < rule.value` 时才把 rerun 作为当前 bundle 的可执行建议。任何 loader exception、identity mismatch、missing/duplicate/unsupported rule 或 invalid count 都只产生 unavailable boundary。

这个判断是从同一 direct authority 得出的 conversation advice，不持久化、不生成另一个 pass/fail artifact，也不替代 rerun-ready Gate。已知不可能时，HITL2 只问是否为该 scope 新建 bundle。Boundary proof 必须区分 pre-increment advice 与 post-increment Gate：当 current count 为 `limit - 1` 时，HITL2 得出 next count 等于 limit 并禁止推荐/记录 rerun；正式 Gate 则在 increment 后接受 `limit - 1`、拒绝 limit 及以上。

替代方案 A：在文档/测试 helper 中各保留一个常量。不采用，因为这正是本次 drift 的原因。替代方案 B：新增 HITL2 eligibility Gate/helper。不采用，因为 current count、现有 increment 和 active rule 已足以在 decision point 排除已知必败建议，正式 legality 仍有现成 Gate。

### 10. 删除没有 owner 的 HITL 微控制

HITL 对话不再追踪探索轮数或在固定第 3/5 轮触发不同 prompt。Agent 根据对话是否仍有信息增益判断：有进展就继续回答；重复停滞时总结共识/缺口，给一个推荐并邀请接受或修正。这保留模型判断，不新增计数器或状态。

用户不知道 must-answer 时，Agent 不把“不确定”原话写成 `gap_queue_backed` 文本暗号，也不让 Seed Topics 用关键词猜状态。Agent 先基于原始问题提出具体 must-answer，用户接受或修正后，只有具体问题进入现有 `root_must_answer_set`。这删除了 parser-like prose contract，同时保留用户语义 ownership。

替代方案：给 `gap_queue_backed` 建正式 schema 字段。不采用，因为此处没有需要跨 invocation 独立持有、且不能由 accepted must-answer 重建的新 truth。

这次局部清理不扩张到其他机制中的 retry/fatigue 数值控制；那些阈值有独立 owner 和用途。这里只删除 HITL conversation 中没有 deterministic authority 需求的消息计数与文本暗号。

### 11. 验证分为确定性 contract 与真实 Agent 观察

- `unit`：continuation pure projection 覆盖 `do_not_initiate|required|terminal_delivery`、原 `next_action` 不变和未知 frontmatter fail-closed。
- `integration`：真实 Gate/`enter-phase`/`advance-status`/claim stdout 与 Markdown/header/HITL docs 同步；同一 Markdown contract 扫描全部非终端 stop:no hint consumers，证明 classification 不再自动发起用户交互；rerun boundary test 从 active definition 读取边界。
- 现有 continuation CLI integration claim 还覆盖 rerun、seed-topics、queue、canonical topic-state、generated work-unit task 与 Wave1/Wave2 的代表性 non-mechanical failure producer：`hints[]`/verdict/route 保持，action-bearing advice 变为 placement-neutral，已有 mechanical owner 的 Wave style failure 改回 `engine_operation`。不新增第四个 Agent behavior case，因为 case 711 已证明无 unsolicited surfacing，case 713 已证明 non-terminal user-initiated reply。
- `deterministic_e2e`：不选择。本 change 不改变 transition 或多 phase deterministic state chain，现有 rerun chain 已有验证；重复一条 JS-led chain 不能证明自然语言 Agent 行为。
- `agent_flow_e2e`：使用真实 subject Agent 从 production phase/dependency surface 自己生成 HITL1 recommendation/HITL2 brief，再接收固定自然语言用户回合，观察持久化/Gate/continue。Runner prompt 不复述 enum、无二次确认规则、command chain、no-mutation 边界或 expected next action。用户主动回合用例只裁决真实回应、authority hashes/current node/status/next action 不变，不声称存在 async interrupt transport 或持续执行证明；Final-specific reply contract 由 CDP-004 Markdown/header integration assertions 覆盖，不让 case 713 overclaim。

Deterministic assertions 只能证明 prompt/cue/owner 可达，不能声称真实 Agent 一定不主动浮出。Agent behavior verdict 必须来自真实 transcript + bundle/trace、Gate output 等 direct evidence，不用 mock 或手写结果。

### 12. Apply target manifest

Apply 开始时用一份受任务追踪的 target manifest 核对控制面，但不新建 runtime manifest。目标形状为：

| Control surface | Add | Remove / narrow | Unchanged authority |
|---|---|---|---|
| HITL prompts/phase guidance | Agent one-recommendation + natural-language mapping | enum-first UI and blanket confirmation | profile fields, Gate, enum set |
| HITL conversation control | semantic-progress judgment + concrete must-answer proposal | fixed round counters and `gap_queue_backed` text sentinel | user acceptance, `root_must_answer_set` |
| Silent shared/header guidance | explicit user-initiated-turn exception | absolute no-reply / user-unavailable wording | stop:no autonomy, repair/continue/hold |
| Failure hint consumption | Agent-facing smallest boundary under current `stop` | classification-driven user escalation/wait and silent override table | hint enum/schema, Engine verdict, exact repair coordinates |
| Gate/Inspect boundary advice | direct fact + owner boundary + same-check rerun | stop:no `ask user` / `return to HITL` / `surface blocker` commands | verdict, route, hints, definition bytes/digest |
| HITL2 rerun availability | current count + loader-returned exact supported rule at decision point | known-impossible rerun recommendation/recording | active rule as sole numeric truth; rerun-ready Gate formal verdict |
| Continuation projection | `do_not_initiate` token | `prohibited` token | stateless helper, `next_action`, locators |
| Iterative positioning | short Charter/RUN/README posture | one-shot or enum-console framing | guidance/spec authority order |
| Rerun limit references | active-definition lookup/reference | duplicated numeric constants | active Gate rule and loop protection |
| Version requirement wording | generic proposal-declared-version rule + changelog/banner equality | accepted historical v0.6/v0.7 current pins | concrete v0.32 in this proposal/tasks, CHANGELOG version authority |

Apply 中一旦需要新建 state、CLI、Gate、transition、message transport 或持久 intent，说明已超出本 design，必须停止并回到 Explore/Proposal，不得在实现中顺手增长。

## Risks / Trade-offs

- [Risk] `do_not_initiate` 仍可能被误读为“不要互动” -> accepted spec、shared header 和 cue docs 同时给出单一定义：只禁止 framework-initiated surfacing；focused tests 禁止旧 absolute wording。
- [Risk] 用户主动消息被误当成 mid-run mutation permission -> spec 明确回应不改变 run，任何后续动作必须通过现有 accepted owner/path；没有 path 时报告边界。
- [Risk] `stop:no` 遇到真正不可代理的 blocker 后无法继续 -> 保留最小 Agent-facing boundary 和 direct diagnostic，继续其他合法工作或 silent hold；只在 HITL1/HITL2 或当前用户主动回合表达，不用一次“特殊严重错误”重建第三个主动打断点。
- [Risk] 只改 consumer 而 producer 继续注入交互命令 -> focused CLI integration 直接断言代表性 stop:no failure 的 hints/verdict/route 不变且 action-bearing advice placement-neutral；定义文件保持 byte-stable，避免 post-final digest churn。
- [Risk] 去掉统一二次确认导致 Agent 过度猜测 -> 只在语义清楚时直接记录；实质歧义或新风险/成本/权限仍必须问最小确认。
- [Risk] 每次 rerun 都被重新解释成成本扩张并触发确认 -> HITL2 先披露当前可见 material impact；用户接受已披露影响就是确认，只问新增边界。
- [Risk] HITL2 availability advice 漂移成第二个 rerun verdict -> 用 phase-owned read-only ESM invocation 复用现有 loader，验证 exact supported rule identity/shape，再把 current count 计入既有 increment；不 raw-parse、不持久化、不复制数值、不代替 rerun-ready Gate，并分别用 Markdown contract 与 Gate boundary test 锁定调用面和 formal verdict。
- [Risk] HITL 推荐被误当成 Agent 代替用户决定 -> recommendation 仅是 conversation projection，用户接受/修正后才进入 durable owner。
- [Risk] cue token 变更破坏仓库内 assertion -> 在同一 apply 中原子更新 helper、specs、docs、tests 和 controlled playbook；version bump 到 v0.32。
- [Risk] 验证为了模拟“随时插话”而建 async harness -> agent_flow case 只使用正常 conversation turn 边界，明确不证明中断传输、暂停或持久化。
- [Trade-off] context-dependent HITL2 branch 仍可能存在可达性缺口 -> 保留诚实边界，不用一个 generic controller 在本 change 中掩盖它们。
- [Trade-off] 用户中途提供的新语义可能不会立即进入当前 run -> 本 change 优先修正交谈体验，而不在没有真实需求证据前建设 durable interrupt subsystem。

## Migration Plan

1. 在 apply 开始前运行 verification routing plan check，并用 target manifest 复核没有新 runtime control surface。
2. 先更新 accepted-owner 对应的 Markdown/Agent Flow 和 focused tests：HITL UX、HITL1/HITL2 phase/brief、Final phase/terminal header、silent shared/header，并扫描全部非终端 stop:no phase、shared Sub-agent protocol、actor-decision playbook、generated work-unit task 和 action-bearing Gate/Inspect/topic-state/queue producer；同时删除 round-count 和 `gap_queue_backed` consumer。
3. 在一个原子实现步骤中将 continuation helper 的 stop:no token 改为 `do_not_initiate`，并同步所有 Gate/entry/status/claim tests 和 Agent-facing consumers。
4. 清理 rerun-limit 副本，使 boundary test 与 active experiment 读 active definition；运行 focused regression 证明 active limit 和独立 fatigue threshold 均未改变。
5. 更新 Charter/RUN/README/COMMANDS 等高频表面、`CHANGELOG.md` 和 v0.32 banner。
6. 执行 focused unit/integration 与真实 agent-flow playbooks，再运行 verification assets check、OpenSpec/governance 检查。

回滚时可原子恢复 cue token 与对应 docs/tests；本 change 无 bundle state 或 schema migration，不需要转换已有 runtime bundle。但若 rollback 恢复 `prohibited`，必须同时恢复对应 accepted semantics，不得留下 token 与 prose 含义冲突。

## Open Questions

无。首个 change 的边界已固定：只有 HITL1/HITL2 是框架主动等待用户决定的位置；entry 是用户主动 trigger，不再追加路由澄清；silent middle 不主动打扰；用户主动回合必须回应但不创建 lifecycle/authority；Final 只主动交付，不发起新的决定/修复环，但会回答已经收到的事实性回合。
