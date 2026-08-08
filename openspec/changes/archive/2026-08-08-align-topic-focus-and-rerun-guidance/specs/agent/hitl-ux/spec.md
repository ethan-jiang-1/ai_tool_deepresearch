# HITL UX Delta

> req: HIU-002, HIU-003

## MODIFIED Requirements

### Requirement: HITL1 recommendation-first alignment prompt

Agent 在 HITL1 入口 SHALL 使用 recommendation-first 的预设 prompt 文本。prompt
文本 SHALL 存放在独立的 `brief/hitl1.md` 中，`phase-hitl1.md` 通过
`suggested_context` 引用。

入口推荐 SHALL 至少包含：
- Agent 对原始问题的目标与范围理解；
- 一组拟定的“最终报告必须回答什么”；
- 初始 Topic preview，按最小独立 Topic map 表达；
- 一个建议的研究深度/广度（映射到现有 `research_profile`）及其理由和投入影响；
- 可选的 `research focus brief` 入口：用户可以用普通语言说明希望对哪个
  Topic 多理解什么，Agent SHALL 给出简短、可由用户纠正的理解。

最小独立 Topic map SHALL 保留研究问题、证据路径或交付价值上真正独立的
问题。它在用户批准前不创建 canonical Topic identity，且必须包含至少一个
proposed Topic；用户批准后才由既有 path 满足至少一个 approved Topic 的下界。
它 SHALL NOT 以 `3-5`、任何预设上限、数值预算、
source floor 或权重作为推荐目标。地图较大时，Agent SHALL 把相关 Topics
归入可审阅的研究线程并解释拆分理由，而不是要求用户管理 Topic 数量。

快捷选项 SHALL 满足：
- A/B/C MAY 作为辅助快捷方式保留，Agent 的当前推荐 SHALL 清楚标记；
- 用户可以直接说“按你的建议开始”，也可以用自然语言修正目标、must-answer、
  Topic、深度/广度或 focus；
- 用户敲一个字母（A/B/C）仍可选择，不需要打出完整 canonical name；
- canonical enum 值（`quick_factual`/`exploratory_map`/`claim_verification`）
  不得作为用户必须学习的主要操作面。

自然语言映射 SHALL 只发生在当前 accepted HITL1 `stop: yes` decision
boundary 内。用户的清楚接受或修正 SHALL 直接成为 HITL1 决定；Agent SHALL
NOT 再追加 blanket second confirmation。只有存在实质歧义、真实成本/权限扩张
或不可逆风险时，Agent 才 SHALL 请求最小确认。普通非 HITL 消息不因本
requirement 获得 profile/topic 持久化或 mutation authority。

当用户提供并接受 focus 时，Agent SHALL 让同一 HITL1 轮中可见的已有
User Research Controls literal snapshot 保留两个清楚标注的叙事部分：用户
focus 原话和 Agent 的简短当前理解。前者 SHALL 保持 verbatim；后者 SHALL
在接受前明确可纠正。它们是已有 snapshot 内的研究指导，不是 profile field、
Topic field、Gate input、source quota、parser result 或 Engine semantic verdict。
没有 focus 时，既有 balanced common-baseline 路径和 no-controls compatibility
form SHALL 保持不变。

`brief/hitl1.md` SHALL also be the exact-text owner for the user-facing
communication around the existing research-access probe that follows the
recorded HITL1 decision. Before the probe starts, the brief SHALL provide this
exact Chinese notice:

> 在进入静默研究前，我会做一次快速的中性能力检查，确认搜索和网页抓取是否可用。这不是当前研究内容，也不需要你作出新的决定。

After the existing probe records `research_access.status: available`, the
brief SHALL provide this exact Chinese result:

> 研究访问能力已确认。我会先完成现有 HITL1 检查；通过后将进入静默自主执行。

After the existing probe records `research_access.status: unavailable`, the
brief SHALL provide this exact Chinese result:

> 当前环境尚不能完成搜索和网页抓取能力检查。已记录的 HITL1 选择仍然有效；这不是新的研究决定。

PRP-002 controls when the Phase renders these templates: the notice is before
the one bounded search, and the corresponding result is directly after the
observation and before the existing HITL1 Gate. The available result SHALL NOT
claim that the Gate has passed. The existing silent-execution exit remains
available only after that Gate passes. The unavailable result SHALL preserve
recorded choices and keep the Agent at the existing smallest external boundary
plus the same probe/Gate path; it SHALL NOT ask the user to repeat their
recorded choices or create another interaction checkpoint. These templates are
framework Markdown outputs only. They SHALL NOT promise to hide, replace,
summarize as success, or otherwise control selected-host-native tool calls,
policy failures, transport/security errors, or permitted shell output.

must-answer 收集 SHALL 满足：
- Agent SHALL 基于原始问题先提出拟定 must-answer；用户可以直接接受或用
  自然语言修正；
- 如果用户不确定或说“先帮我拆问题”，Agent SHALL 基于原始问题和当前对话
  提出一组具体、可接受或可修改的 must-answer 问题；
- 只有用户接受或修正后的具体问题进入现有 `root_must_answer_set`。Agent
  SHALL NOT 把“不确定”等原话当作机器暗号、通过文本模式伪造
  `gap_queue_backed` 状态，或新增 intake/status 字段。

#### Scenario: One independent Topic is sufficient
- **WHEN** one proposed Topic preserves the only independent must-answer
  question, evidence route, and delivery value in scope
- **THEN** Agent SHALL present that one-Topic preview as valid rather than split it
  to meet a cardinality target
- **AND** the user may accept or correct it through the existing HITL1 loop

#### Scenario: Broad map exceeds five Topics when semantically necessary
- **WHEN** the original question needs more than five independent Topics to
  preserve distinct must-answer questions, evidence routes, or delivery value
- **THEN** Agent SHALL present the larger map grouped into reviewable research
  threads with a reason for the split
- **AND** Agent SHALL NOT ask the user to reduce it merely to satisfy a
  number, weight, or source-count budget

#### Scenario: User accepts the HITL1 recommendation in natural language
- **WHEN** Agent 已展示目标、must-answer、Topic preview、recommended profile
  及其影响，用户回复“按这个开始”
- **THEN** Agent SHALL 将推荐中已清楚展示的语义映射到现有 HITL1 profile/topic
  fields
- **AND** Agent SHALL NOT 要求用户再选择字母或再次确认相同内容
- **AND** Agent SHALL 执行后续 apply/style/probe/Gate 机械链

#### Scenario: User adds or corrects a focus in natural language
- **WHEN** the user says that one stated Topic should additionally examine a
  described concern, comparison, source boundary, or delivery angle
- **THEN** Agent SHALL echo a concise interpretation and let the user correct
  it before the existing HITL1 decision is accepted
- **AND** once accepted, the existing literal controls snapshot SHALL retain
  the user's focus wording verbatim and the separately labelled interpretation
- **AND** Agent SHALL NOT create a Topic focus field, numeric weight, source
  quota, Gate override, or additional HITL

#### Scenario: User corrects the HITL1 recommendation in natural language
- **WHEN** 用户回复“范围不变，但重点放资本约束，报告必须回答监管变化会怎样影响现金流”
- **THEN** Agent SHALL 将该修正反映到 proposed must-answer/topic intent，
  并保持未被修正的推荐部分
- **AND** 当修正后的语义清楚时，Agent SHALL 直接记录决定而不重复确认
- **AND** Agent SHALL NOT 借映射发明用户没有表达的新约束

#### Scenario: User picks profile by letter
- **WHEN** Agent 展示 recommendation-first HITL1 prompt，用户清楚回复“B”
- **THEN** Agent SHALL 将 B 翻译为 `exploratory_map` 写入
  `rb_profile.yaml#/research_profile`
- **AND** Agent SHALL 仅追问尚未由推荐或用户回答覆盖的 required semantics
- **AND** canonical enum 值 `exploratory_map` 不得作为用户 prompt 的主要操作要求
- **AND** Agent SHALL NOT 对该清楚选择统一追加二次确认

#### Scenario: User is unsure about must-answer
- **WHEN** 用户对于“最终报告必须回答什么”回复“我不确定，先帮我拆问题”
- **THEN** Agent SHALL 根据原始研究问题和已知语境提出一组具体 must-answer 建议
- **AND** 用户 SHALL 能直接接受或自然语言修正该建议，而不必自己从空白开始拆题
- **AND** Agent SHALL 只把接受后的具体问题写入 `root_must_answer_set`
- **AND** Agent SHALL NOT 写入文本暗号、sentinel 或新增结构化状态来表示不确定

#### Scenario: User omits focus and uses the normal path
- **WHEN** the user accepts or corrects the recommendation without expressing
  additional Topic emphasis
- **THEN** Agent SHALL preserve the existing balanced common-baseline path
- **AND** it SHALL NOT create an empty focus placeholder, inferred focus, or
  focus-specific Gate requirement

#### Scenario: User skips search preference
- **WHEN** 用户未提供旧 prompt 曾询问的搜索偏好
- **THEN** Agent SHALL 继续基于推荐、用户接受的 must-answer 和现有 research profile 执行
- **AND** Agent SHALL NOT 追问该已退役输入、写入 `search_preference` 或记录 `not_specified_use_profile_defaults`

#### Scenario: HITL1 asks only for a genuinely ambiguous field
- **WHEN** 用户的回复同时可能表示缩小范围或只改变报告视角，且两种解释会写入不同 accepted semantics
- **THEN** Agent SHALL 只询问区分该语义所需的最小问题
- **AND** 澄清后 Agent SHALL 记录决定并自行执行后续机械链

#### Scenario: Recorded decision is followed by an explained non-decision check
- **WHEN** the user has made and the Agent has recorded a valid HITL1 research decision
- **THEN** the Agent SHALL present the exact pre-probe notice before the research-access search/fetch sequence
- **AND** the notice SHALL state that the action is not research content and needs no new user decision

#### Scenario: Direct available result is not a Gate verdict
- **WHEN** the existing probe records `research_access.status: available`
- **THEN** the Agent SHALL present the exact available result before the existing HITL1 Gate
- **AND** that result SHALL say only that the remaining HITL1 check will run
- **AND** it SHALL NOT announce silent autonomous execution until the Gate passes

#### Scenario: Unavailable access does not reopen HITL1 semantics
- **WHEN** the existing probe records `research_access.status: unavailable`
- **THEN** the Agent SHALL present the exact unavailable result and preserve the recorded HITL1 choices
- **AND** it SHALL keep the existing same-probe/Gate repair path rather than ask for another research decision or create a new checkpoint

#### Scenario: Selected-host-native rendering remains an honest residual
- **WHEN** the selected host renders a native tool call, policy failure,
  transport/security error, or permitted fallback output during the probe
- **THEN** the framework's notice/result contract SHALL remain additive and
  SHALL NOT claim that the host output is hidden, suppressed, or a framework
  success/failure verdict

#### Scenario: HITL1 exit sets silent phase expectation
- **WHEN** Agent completes HITL1 (the user decision is recorded and the Gate passes)
- **THEN** Agent SHALL, after the direct available result and before advancing to setup, use the existing exit text to tell the user:
  - 即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2）；
  - 时长取决于研究范围，可能几十分钟到一两天；
  - 框架不会主动浮出报告进度、普通错误、idle 或请求继续确认，Agent 会沿现有合法路径自行处理；
  - 可以关闭终端，系统从 durable state 恢复；
  - 下一个框架主动邀请并等待用户决定的位置是 HITL2。
- **AND** Agent SHALL NOT give a false precise duration estimate

### Requirement: HITL2 research-review recommendation prompt

Agent 在 HITL2 入口 SHALL 先写 research review，再给出一个明确推荐及其理由/预期影响，并提供自然语言决策入口。HITL2 SHALL 遵循 HIU-001 定义的环模型；本 requirement 定义 HITL2 独有的入口 prompt、recommendation 和 accepted decision mapping。

research review SHALL 包含：目前证据足够回答的内容、仍然不足或需要谨慎的地方、一个推荐的用户可理解下一步，以及推荐理由和预期影响。当推荐或用户动作涉及 rerun 或明显增加研究投入时，Agent SHALL 用 current direct facts 简短披露可预见的 material effort/cost impact；不增加 estimator、field 或 checker。用户在看见该影响后清楚接受，即已确认该已披露成本；只有实际动作超出已披露影响或当前权限时，Agent 才 SHALL 再问最小边界。

在把 rerun 描述为可执行推荐或记录用户的 rerun 决定之前，Agent SHALL 就近读取 current profile `rerun_count`。`phase-hitl2.md` SHALL 拥有一条 repo-root、只读的 inline Node ESM invocation，从现有 `engine/helpers/gate-helpers.mjs` barrel import `loadGateDefinition('rerun-ready')`、profile reader 和 shared pure rerun-availability evaluator。该 invocation SHALL 只把 loader/profile facts 交给 evaluator 并输出其 closed availability result；它不写文件、trace 或 state，`brief/hitl2.md` SHALL NOT 复制该调用。The phase SHALL pass the loader-parsed definition and full parsed profile to the REI-003 shared evaluator with `includeNextIncrement: true`; it SHALL NOT extract an optional-chained count before evaluation. The evaluator's rule/profile/count interpretation remains owned by REI-003. A missing/unparseable profile, absent HITL2 parent or unsupported rule SHALL return an unsupported boundary; only a supported result whose next required increment is unavailable proves exhaustion. HITL2 SHALL NOT raw-parse Gate JSON, read `failure_message` as semantics, reimplement operator/value/count comparison in Markdown, or invent a wrapper/CLI. HITL2 SHALL present/record rerun as executable only when the shared result is supported and available. When `supported: true` and `available: false`, Agent SHALL only recommend/ask whether to start a new bundle for that scope. Loader/profile/config/evaluator unsupported facts SHALL instead state the concrete contract boundary without guessing that a new bundle resolves it. The result is conversation advice over one shared deterministic evaluation, not a second Gate, persisted eligibility field or copied numeric truth.

HITL2 MAY 保留五个快捷选项（A/B/C/D/E），但 SHALL 以用户可理解的动作描述为主：`proceed_to_readiness`、`request_view_revision`、`rerun`、`repair`、`stop_blocked` 继续是唯一 existing enum。用户 SHALL 能自然语言选择这些动作；recommendation 本身 SHALL NOT 替代用户决定。只有当前 accepted HITL2 decision boundary 可将清楚意图映射到现有 enum、rationale 和现有可写字段；普通 non-HITL message 不获得 persistence、state mutation、permission 或 route authority。

用户的清楚决定本身 SHALL 视为确认。Agent SHALL NOT 对五个 existing actions 统一要求第二次确认；只有实质歧义、真实成本/权限扩张或不可逆风险才请求最小确认。决定写入 accepted owner 后，Gate、repair、handoff、status sync 和后续执行 SHALL 回到 Agent。Agent SHALL 在展示 prompt 前完成 existing decision brief 和 `hitl2.status: pending_user` durable state。

当用户选择 legal `rerun` 并表达新的或修订的 focus 时，Agent SHALL 在当前 HITL2 loop 中反映一段简短、可纠正的理解。用户接受后，existing `rationale` SHALL 保留两个 labelled narrative parts: the user's focus wording verbatim and the Agent's current interpretation. 它们不改变 enum、availability evaluation、Gate、route 或 prior evidence 的 provenance；未表达 focus 的 rerun 继续使用既有 rationale form。

#### Scenario: User chooses proceed_to_readiness
- **WHEN** Agent 展示 HITL2 research review + one recommendation，用户回复“够了，按这个出报告”或快捷选项“A”
- **THEN** Agent SHALL 记录 `hitl2.user_decision: proceed_to_readiness`
- **AND** Agent SHALL 写入 `hitl2.status: recorded`
- **AND** Agent SHALL NOT 对清楚决定追加第二次确认
- **AND** HITL2 gate SHALL pass（`user_decision` 在有效 enum 集合内）

#### Scenario: User wants to change report view
- **WHEN** 用户清楚回复“换成管理层视角”
- **THEN** Agent SHALL 记录 `user_decision: request_view_revision`，并把清楚的目标视角映射到现有 `final_report_view` contract
- **AND** Agent SHALL NOT 要求用户先选择字母或重复确认
- **AND** 如果用户只说“换个视角”而目标视角确有实质歧义，Agent SHALL 只询问具体视角；该探索过程仍遵循 HIU-001 环模型
- **AND** 如果用户在视角讨论中途反悔（如“算了，还是直接出报告”），Agent SHALL 将 `user_decision` 改为 `proceed_to_readiness` 并写入 `final_report_view: profile_default`

#### Scenario: User chooses rerun to adjust direction
- **WHEN** 用户清楚回复“资本约束这部分还不够，再补一下”或快捷选项“C”并给出方向
- **AND** the shared rerun-availability result for current profile count plus the required increment is supported and available
- **THEN** Agent SHALL 写入 `user_decision: rerun`，并在 `rationale` 中记录用户的补充方向
- **AND** 当 rerun 未跨越新的真实成本/权限边界时，Agent SHALL NOT 追加 blanket second confirmation
- **AND** 若需要新的真实成本或权限，Agent SHALL 只确认该边界；确认后由 Agent 继续机械执行
- **AND** Gate pass 后 Agent SHALL 用 `rerun` outcome 进入 `phase-rerun.md`
- **AND** 如果 prompt 已披露当前 rerun 的 material effort/cost impact，用户的清楚选择 SHALL 同时视为对该已披露影响的确认

#### Scenario: User chooses rerun with a focus correction
- **WHEN** the user clearly asks to rerun a stated Topic and says what new
  understanding, comparison, source boundary, or delivery angle matters
- **AND** the shared `includeNextIncrement: true` availability result is supported and available
- **THEN** Agent SHALL record `user_decision: rerun` and a rationale containing the verbatim focus wording plus separately labelled current interpretation
- **AND** Agent SHALL NOT turn either text into a profile field, Gate input, weight, or source quota
- **AND** Gate pass SHALL use the existing `rerun` outcome and handoff to `phase-rerun.md`

#### Scenario: Unavailable rerun is not offered as executable
- **WHEN** the shared result is supported but unavailable because the required next increment reaches the exclusive active limit
- **THEN** Agent SHALL NOT recommend or record rerun as an executable current-bundle action
- **AND** Agent SHALL ask only whether to start a new bundle for the requested scope
- **AND** if the active rule/profile/HITL2 parent cannot be read reliably, Agent SHALL state that unsupported contract boundary and SHALL NOT assume a new bundle fixes it

#### Scenario: User chooses repair to fix issues
- **WHEN** 用户清楚回复“这里的证据似乎有错，先修正”或快捷选项“D”并描述问题
- **THEN** Agent SHALL 写入 `user_decision: repair`，在 `rationale` 中记录用户要求修复的具体问题
- **AND** 如果现有 accepted path 支持该修复，Agent SHALL 根据 rationale 就地修复并 rerun HITL2 gate
- **AND** 如果当前没有合法修复 path，Agent SHALL 说明最小缺失边界，不得声称已修复或发明 route

#### Scenario: User chooses stop blocked
- **WHEN** 用户清楚回复“先停在这里”或快捷选项“E”
- **THEN** Agent SHALL 写入 `user_decision: stop_blocked`，在 `rationale` 中记录停止原因
- **AND** Agent SHALL NOT 因统一规则重复询问同一停止决定
- **AND** 如果现有 accepted stop behavior 在当前位置可用，Agent SHALL 用它终止 lifecycle 并保留原因
- **AND** 如果当前没有该合法 path，Agent SHALL 保持诚实边界，不得手工创造 blocked 状态或 route

#### Scenario: Context-dependent action without a legal path remains honest
- **WHEN** 用户在 HITL2 清楚选择 `request_view_revision`、`repair` 或 `stop_blocked`，但 direct facts 表明当前位置没有支持该具体动作的 accepted path
- **THEN** Agent SHALL 记录或保留用户已表达的语义，并说明最小缺失 capability/path boundary
- **AND** Agent SHALL NOT 把该动作描述为已经执行、默认路由到 readiness 或手工创建 transition/status authority

#### Scenario: Ambiguous HITL2 intent gets one minimum question
- **WHEN** 用户说“这部分再处理一下”，而当前语境无法区分是只修复错误还是继续扩展研究
- **THEN** Agent SHALL 只询问区分 `repair` 与 `rerun` 所需的最小问题
- **AND** 澄清后 Agent SHALL 记录对应 enum/rationale 并自行执行后续合法步骤

#### Scenario: Decision brief must exist before prompting
- **WHEN** Agent 准备向用户展示 HITL2 prompt
- **THEN** `artifacts/hitl2/decision-brief.md` SHALL 已存在且非空
- **AND** decision brief SHALL 包含 research review、一个 Agent recommendation、理由和预期影响
- **AND** `hitl2.status` SHALL 已设为 `pending_user`
- **AND** session 断掉后 Agent 恢复时 SHALL 能通过 `rb_status.json` 定位到 HITL2 phase，从 `hitl2.status = pending_user` 得知用户尚未回复，从 `decision-brief.md` 恢复语境后继续等待用户决策

#### Scenario: Ordinary mid-run message is not a HITL2 decision
- **WHEN** 用户在非 HITL `stop: no` phase 主动发送普通消息
- **THEN** HIU-003 SHALL NOT authorize the Agent to write `human_decision_checkpoints.hitl2`, mutate current run state, or select a HITL2 route from that message alone
- **AND** 该消息 SHALL NOT 成为第三个 HITL checkpoint 或 permission source

#### Scenario: HITL2 exit sets final generation expectation
- **WHEN** 用户在 HITL2 中选择 `proceed_to_readiness` 且 Agent 已记录决策并 gate pass
- **THEN** Agent SHALL 在推进到 readiness 之前告知用户：
  - 即将生成最终报告；
  - 此期间框架不会主动浮出报告进度、普通错误、idle 或请求继续确认，Agent 沿现有合法路径自行处理；
  - Final 是交付，不再发起第三次决定交互。
