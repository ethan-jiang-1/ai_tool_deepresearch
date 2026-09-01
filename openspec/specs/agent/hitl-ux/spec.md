# hitl-ux

> req: HIU-001, HIU-002, HIU-003, HIU-004, HIU-005, HIU-006, HIU-007

## Purpose

HITL UX 定义了 Agent 与用户在场时的对话行为契约——环模型（loop model）、入口 prompt 格式、中文优先约定、不确定性优雅降级、以及防无限环轻推策略。HITL1（研究设置）和 HITL2（最终审查决策）是两个交互式决策点，共享统一的对话环规则，但各有独立的入口 prompt 结构和决策选项。
## Requirements
### Requirement: HITL conversational loop model

HITL1 和 HITL2 的用户交互 SHALL 遵循**环（loop）**模型——用户进入 HITL 后可以探索、提问、获得帮助后再做出决定，Agent 在出口条件满足后写入 accepted owner 并推进。HITL 不是线性问卷，也不是要求用户学习内部 enum 的控制台；Agent SHALL NOT 将用户逐问驱赶。

环 SHALL 包含三个阶段和两个贯穿规则：
- **入口**：Agent 一次性展示准备好的语境、一个明确推荐及其理由/影响、可选快捷选项，并明确告知用户可以直接接受、用自然语言修正或继续提问。**入口的具体 prompt 格式由 HIU-002（HITL1）和 HIU-003（HITL2）分别定义**——本 requirement 定义的是环的结构性阶段，不重复入口 prompt 的具体字段
- **环内**：Agent 根据用户当前意图响应——清楚接受或修正（快出口）、对比询问（解释差异后继续等）、BTW 问题（回答后自然回到主路径）、改变主意（重新讨论推荐/选项）、无关输入（简短回应后自然回到主路径）
- **出口**：用户清楚表达接受、修正或其他决定后，该表达本身 SHALL 视为确认。Agent SHALL 在当前 accepted HITL boundary 内把自然语言映射到现有 profile/decision contract，写入 accepted owner，运行 Gate 并继续现有合法链；SHALL NOT 对每个清楚决定统一追加无信息增益的二次确认
- **最小确认边界**：只有当用户表达存在实质歧义、下一步会扩张真实成本或权限、或存在不可逆风险时，Agent SHALL 只确认该最小边界；确认不得扩张为让用户逐步批准普通机械命令
- **停滞引导**：Agent SHALL 根据讨论是否仍产生新的语义信息来判断是否需要引导。讨论仍有实质进展时继续回答；出现重复困惑或不再产生新信息时，Agent 总结已明确/未明确内容，给一个有理由的推荐，并重申可直接接受或修正。Agent SHALL NOT 追踪固定轮数、设置硬性最大轮数或用计数器驱动对话

用户决定进入 accepted owner 后，普通 profile 写入、topic operation、Gate、handoff、status sync、repair 和 checkpoint rerun SHALL 立即回到 Agent 执行。`Human-directed` 只说明决定来源；它 SHALL NOT 创造 permission、mutation authority、缺失 route 或 Engine override。

#### Scenario: Experienced user takes fast exit
- **WHEN** HITL1 已展示完整推荐，用户清楚回复“按你的建议开始”或“就按这个，但重点放在跨境支付合规”
- **THEN** Agent SHALL 将该回复分别视为清楚接受或清楚修正
- **AND** Agent SHALL NOT 再问“是否确定”
- **AND** 当 required semantics 已齐备时，Agent SHALL 写入 accepted profile/topic owners、run gate 并继续
- **AND** 如果用户在写入前说“不对，我其实想改成 B”，Agent SHALL 视为改变主意，回到环内讨论

#### Scenario: New user explores before deciding
- **WHEN** 用户回复“A 和 C 有什么区别？我的场景是跨境支付合规”
- **THEN** Agent SHALL 解释两种研究姿态在用户具体场景下的差异，并给出一个有理由的推荐
- **AND** Agent SHALL 在解释后邀请用户直接接受、修正或继续提问
- **AND** 用户最终清楚说“OK，就按 C 做”时，Agent SHALL 直接映射并出口，不要求 blanket second confirmation

#### Scenario: User asks BTW question
- **WHEN** 用户问“BTW，adversarial verification 是什么意思？”
- **THEN** Agent SHALL 回答 BTW 问题
- **AND** Agent SHALL 在有助于对话时自然回到尚未完成的研究决定，并允许用户直接接受、修正或继续提问
- **AND** HITL 环继续等待用户决定

#### Scenario: User is stuck after many rounds
- **WHEN** HITL 讨论开始重复且不再产生新的研究语义，但用户仍未做出决定
- **THEN** Agent SHALL 总结已讨论内容，给一个明确建议及理由，并重申用户可以直接接受或自然语言修正
- **AND** Agent SHALL NOT 替用户决定或静默写入 decision owner
- **AND** Agent SHALL NOT 依据固定轮数强制结束或升级对话

#### Scenario: User sends irrelevant or off-topic message
- **WHEN** 用户发送与当前 HITL 决策无关的消息（如闲聊、不相关请求或粘贴不相关内容）
- **THEN** Agent SHALL 简短回应，并轻推回当前研究对齐或审阅问题
- **AND** HITL 环继续等待用户决定，不因无关输入而出口或阻塞

#### Scenario: Minimum confirmation is limited to a real boundary
- **WHEN** 用户表达可以合理映射为两个不同研究语义，或下一步需要新的真实成本/权限，或存在不可逆风险
- **THEN** Agent SHALL 只询问区分该边界所需的一个最小问题
- **AND** 用户澄清或授权后，Agent SHALL 自己执行剩余合法机械步骤
- **AND** Agent SHALL NOT 把该例外扩张为所有选择的统一二次确认

### Requirement: Chinese-first interaction convention

所有用户可见的 HITL 交互 SHALL 使用中文，包括 prompt 模板的固定文案以及 Agent 动态填入的 topic rewrite、topic preview、decision-brief summary、证据缺口、建议和确认文案。内部 enum 值、文件路径、字段名、CLI 命令和需要保留原文的来源标题 SHALL 保持英文或来源的 canonical form。

#### Scenario: User prompt is in Chinese
- **WHEN** Agent 向用户展示 HITL1 或 HITL2 prompt
- **THEN** 选项描述和引导文字 SHALL 为中文
- **AND** 英文 canonical name SHALL 只在括号中作为辅助参考出现
- **AND** 内部字段写入（`research_profile: claim_verification`）SHALL 使用英文 canonical form

#### Scenario: Dynamic HITL content follows the same convention

- **WHEN** Agent 把 topic rewrite、topic preview、decision brief、证据缺口或建议动态填入 HITL prompt
- **THEN** 面向用户的叙述 SHALL 使用中文
- **AND** enum、路径、命令、字段名和来源标题 SHALL 保持 canonical form

### Requirement: Graceful degradation for uncertain users

当用户对 must-answer 问题不确定时，Agent SHALL 通过模型判断和现有研究语境把空白选择转化为一组具体建议，而不是阻塞、替用户静默决定，或创建靠文本暗号识别的伪状态。用户仍拥有研究语义：Agent 提出问题，用户接受或修正，只有接受后的具体 must-answer 进入现有 profile owner。

这一降级 SHALL 使用现有 HITL1 conversation、`root_must_answer_set` 和 Gate，不新增 `gap_queue_backed`、`intake_status`、sentinel、文本模式 parser、queue marker 或 schema 字段。Seed Topics 后续只消费已接受的具体 must-answer，不负责从“不确定”暗号反推用户意图。

#### Scenario: Uncertain must-answer creates gap not block
- **WHEN** 用户表示不知道最终报告应该回答什么，并请 Agent 帮助拆解
- **THEN** Agent SHALL 基于原始问题和当前对话提出具体 must-answer 建议
- **AND** 用户 SHALL 能接受或修正该建议
- **AND** 接受后的问题 SHALL 写入现有 `root_must_answer_set`
- **AND** raw uncertainty wording SHALL NOT become a hidden state or downstream text-pattern trigger

### Requirement: Anti-infinite-loop nudge strategy

Agent SHALL 用语义进展而不是消息计数判断 HITL 对话是否需要引导。只要用户仍在提出有信息增益的问题、澄清约束或比较方案，Agent SHALL 继续正常协作，不因固定轮次打断。若讨论重复、停滞或用户明显难以形成决定，Agent SHALL 总结已知事实和剩余边界，给出一个明确推荐及理由，并邀请用户接受、修正或继续问一个有信息增益的问题。

该策略 SHALL NOT 维护探索轮数、子环计数、固定第 3/5 轮阈值或硬性最大轮数，也 SHALL NOT 让 Agent 在没有用户决定时静默写入 accepted owner。

#### Scenario: Agent nudges after extended exploration
- **WHEN** HITL 对话出现重复困惑且连续回复没有增加新的研究语义
- **THEN** Agent SHALL 总结当前共识与未决点，给出一个有理由的推荐，并重申自然语言出口
- **AND** 如果用户随后继续提供有信息增益的内容，Agent SHALL 继续协作
- **AND** Agent SHALL NOT 因消息数量达到某个阈值而强制结束对话或替用户决定

### Requirement: HITL1 recommendation-first alignment prompt

HITL1 SHALL retain its existing recommendation-first brief: the Agent's scope
understanding, proposed must-answer set, minimum independent Topic map,
recommended research profile with impact, optional natural-language focus,
A/B/C shortcuts, direct natural-language acceptance/correction, and the
existing single HITL1 semantic decision boundary. The brief remains the
exact-text owner; accepted focus remains in the existing literal controls
snapshot, not a profile/Topic/Gate/parser field. Clear decisions still avoid a
blanket second confirmation, and the existing Gate-pass-only exit still states
the silent phase expectation. This requirement preserves every other HIU-002
behavior and scenario: one-or-more independent Topic maps without a numeric
target, reviewable larger maps, natural-language and letter selection,
uncertainty handling, focus capture, no-focus and retired-search-preference
behavior, honest host-rendering residual, and the full existing post-Gate
silent-phase expectation.

Before the Agent writes the accepted `research_profile`, accepted
`root_must_answer_set`, canonical Topic state, or HITL1 status, the brief SHALL
render a concise Chinese **研究对齐草案**. The draft SHALL state the Agent's
current understanding of the user's goal, research object, decision or delivery
use, and scope; it SHALL show the recommended must-answer set, proposed minimum
independent Topic map, and recommended profile. These are recommendations, not
new structured state or a second decision boundary.

When the Agent judges that a currently answerable answer would materially change
one or more existing structured decisions -- the must-answer set, proposed Topic
map, research profile, explicit scope exclusion, source/evidence constraint, or
delivery emphasis -- it MAY present a bounded first batch of at most three
independent frontier questions. Each question SHALL state a recommendation or
transparent default and the structured decision it would change. A question that
depends on an unresolved answer SHALL wait for a later HITL1 turn. The batch is a
presentation shape, not a round counter: HITL1 SHALL NOT persist a question count,
queue, `clarification_mode`, sentinel, or hard maximum number of conversation
rounds.

This HITL1-specific qualification applies before the user has accepted the draft
and does not weaken HIU-001's minimum-confirmation rule for one already-expressed
ambiguous decision. Details that the Agent can handle with a transparent default,
or that do not change the research route, SHALL NOT create a proactive question.
The user MAY answer only part of a batch, directly accept the recommendation, make
a natural-language correction, or explicitly delegate remaining decisions to the
Agent. A clear acceptance, correction, or delegation SHALL use the existing HITL1
exit semantics; the Agent SHALL restate the resolved understanding and SHALL NOT
ask a blanket second confirmation.

After the recorded decision, `brief/hitl1.md` SHALL own these exact user-facing
current-observation messages:

> 开始研究前，我先直接检查当前环境对中国和海外公开页面的实际取用情况，请稍候。

> 当前环境的直接取用观察已经记录。它只反映这一次探测，不保证后续网络保持不变。

When the Phase Agent judges an observed group limitation material to the user's
explicit research semantics, it SHALL render this bounded Chinese prompt with the
bracketed values grounded only in the current observation and the already recorded
research semantics:

> 这次探测显示，和本轮研究相关的<来源范围或约束>目前存在直接取用限制（<当前观察>）。你可以调整网络后让我重新完整探测、修改来源范围，或明确“按当前取用范围继续”。

The prompt SHALL not use Chinese UI, user language, presumed country, VPN state, or
tool/provider name as evidence of source relevance. It SHALL not promise restoration,
coverage, a fixed duration, a provider result, automatic retry, or future stability.
It offers a user decision only when the Agent has established a material gap. A clear
request to retry after the user manages their own environment or to proceed under the
current scope is a normal HITL1 loop response, not a new checkpoint or a blanket
confirmation. The Agent does not verify, store, or infer the network change.

If no material gap exists, the Phase SHALL render the recorded-observation message
without asking the user another question. If a material gap exists, the Agent SHALL
not render a “normal access” claim or begin silent research before a clear resolution
and the existing Gate pass. Accepting current scope records a research limitation; it
does not assert that an unreachable source became available or erase a hard source
constraint.

PRP-002 controls their timing. The Phase Agent renders the first notice before
spawning the one isolated probe agent. It renders the second only after the
Phase has recorded a completed observation, and the bounded material-gap prompt
only after it has judged a limitation material. Either result precedes the
existing HITL1 Gate. “当前环境的直接取用观察已经记录” is an observation message,
not a claim that the Gate has passed or that silent execution has started.

These templates are framework Markdown only. They SHALL NOT promise to hide,
suppress, replace, or reinterpret selected-host-native tool calls, policy
failures, transport/security errors, or permitted fallback output. They SHALL
not promise a duration, host permission, provider success, or automatic retry.

#### Scenario: Independent material forks use one bounded first presentation

- **WHEN** the draft contains two independent, currently answerable interpretations
  whose answers would change different existing research decisions
- **THEN** HITL1 MAY present both questions in the same first batch, with one
  recommendation/default and stated impact for each
- **AND** it SHALL present no more than three independent questions in that batch
- **AND** it SHALL not create a counter, queue, state, or new checkpoint

#### Scenario: Dependent or non-material details do not make a questionnaire

- **WHEN** a candidate question depends on an unresolved answer, or its answer can
  be handled by a transparent default without changing the research route
- **THEN** HITL1 SHALL defer or omit that question
- **AND** it SHALL retain the direct acceptance, correction, and delegation exits

#### Scenario: Delegation resolves the existing HITL1 boundary

- **WHEN** the user says to proceed according to the displayed recommendation or
  delegates unresolved material decisions to the Agent
- **THEN** the Agent SHALL restate the resulting research understanding and use the
  existing accepted-owner and Gate path
- **AND** it SHALL not request a blanket second confirmation or create a new HITL

#### Scenario: Recorded decision is followed by an explained non-decision check

- **WHEN** the user has made and the Agent has recorded a valid HITL1 decision
- **THEN** the Agent SHALL present the exact first message before spawning the
  isolated direct-sample probe
- **AND** it SHALL state no new research decision is needed

#### Scenario: Completed observation is reported without a questionnaire

- **WHEN** the Phase Agent records a completed current direct-sample observation
  and judges no material gap
- **THEN** it SHALL present the exact recorded-observation message before the
  existing HITL1 Gate
- **AND** it SHALL not ask the user to approve a non-material network fact

#### Scenario: Material overseas limitation receives one bounded choice

- **WHEN** the current observation limits overseas samples and the user's recorded
  must-answer set or explicit source constraint makes that limitation material
- **THEN** the Agent SHALL render the bounded access-alignment prompt in Chinese
- **AND** it SHALL allow a fresh probe after user-managed environment adjustment, a
  source-semantics revision, or clear acceptance of the current scope

#### Scenario: Non-material limitation does not create a questionnaire

- **WHEN** a completed observation has a limitation that the Agent judges unrelated
  to the recorded question, must-answer set, Topic map, and controls
- **THEN** the Agent SHALL state only the current-observation message and continue
  through the existing Gate path
- **AND** it SHALL not ask the user to approve a non-material network fact

#### Scenario: Accepted limitation is not a false success claim

- **WHEN** the user says to proceed under the current access scope
- **THEN** the Agent SHALL retain the limitation in the controls snapshot and the
  truthful direct observation
- **AND** it SHALL not promise source completeness, restored access, or future
  network stability

#### Scenario: Selected-host-native rendering remains an honest residual

- **WHEN** the selected host renders a native tool call, policy failure,
  transport/security error, or permitted fallback output during the probe
- **THEN** the framework's notice/result contract SHALL remain additive and SHALL
  not claim that the host output is hidden, suppressed, or a framework verdict

#### Scenario: HITL1 exit sets silent phase expectation

- **WHEN** the recorded user decision and existing HITL1 Gate both pass
- **THEN** the Agent SHALL use the existing exit text before advancing to setup
- **AND** it SHALL not give a false precise duration estimate

### Requirement: HITL2 research-review recommendation prompt

Agent 在 HITL2 入口 SHALL 先写 research review，再给出一个明确推荐及其理由/预期影响，并提供自然语言决策入口。HITL2 SHALL 遵循 HIU-001 定义的环模型；本 requirement 定义 HITL2 独有的入口 prompt、recommendation 和 accepted decision mapping。

research review SHALL 包含：目前证据足够回答的内容、仍然不足或需要谨慎的地方、一个推荐的用户可理解下一步，以及推荐理由和预期影响。当推荐或用户动作涉及 rerun 或明显增加研究投入时，Agent SHALL 用 current direct facts 简短披露可预见的 material effort/cost impact；不增加 estimator、field 或 checker。用户在看见该影响后清楚接受，即已确认该已披露成本；只有实际动作超出已披露影响或当前权限时，Agent 才 SHALL 再问最小边界。

在把 rerun 描述为可执行推荐或记录用户的 rerun 决定之前，Agent SHALL 就近读取 current profile `rerun_count`。`phase-hitl2.md` SHALL 拥有一条 repo-root、只读的 inline Node ESM invocation，从现有 `the gate-helpers family` barrel import `loadGateDefinition('rerun-ready')`、profile reader 和 shared pure rerun-availability evaluator。该 invocation SHALL 只把 loader/profile facts 交给 evaluator 并输出其 closed availability result；它不写文件、trace 或 state，`brief/hitl2.md` SHALL NOT 复制该调用。The phase SHALL pass the loader-parsed definition and full parsed profile to the REI-003 shared evaluator with `includeNextIncrement: true`; it SHALL NOT extract an optional-chained count before evaluation. The evaluator's rule/profile/count interpretation remains owned by REI-003. A missing/unparseable profile, absent HITL2 parent or unsupported rule SHALL return an unsupported boundary; only a supported result whose next required increment is unavailable proves exhaustion. HITL2 SHALL NOT raw-parse Gate JSON, read `failure_message` as semantics, reimplement operator/value/count comparison in Markdown, or invent a wrapper/CLI. HITL2 SHALL present/record rerun as executable only when the shared result is supported and available. When `supported: true` and `available: false`, Agent SHALL only recommend/ask whether to start a new bundle for that scope. Loader/profile/config/evaluator unsupported facts SHALL instead state the concrete contract boundary without guessing that a new bundle resolves it. The result is conversation advice over one shared deterministic evaluation, not a second Gate, persisted eligibility field or copied numeric truth.

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

When the current recommendation is delivery or the user expresses delivery
intent, HITL2 SHALL present a compact, complete, user-semantic composition
recommendation in the same entry. It SHALL cover reader and familiarity,
intended use, primary focus, report view, foreground/compress priorities,
language, length, evidence exposure, and appendix posture without requiring the
user to fill schema fields or learn enums.

The Agent SHALL form that candidate in this order: current HITL2 explicit
correction, accepted HITL1 purpose/delivery controls, current root must-answer
shape, selected-view transparent defaults, then disclosed system defaults. A
candidate is a recommendation only until the user clearly accepts, corrects, or
delegates it. Only when two or more reasonable values would materially change
reader task, primary focus, primary spine, content priority, explanatory depth,
or evidence exposure SHALL the Agent ask a clarification. It MAY group no more
than three currently independent recommended questions in one message; dependent
questions SHALL wait, and transparent or non-material details SHALL NOT become
questions.

Clear acceptance, correction, or delegation SHALL itself confirm the resolved
candidate. The Agent SHALL restate its meaning, write the existing
`final_report_view` owner and the durable `composition_handoff` owner, then run
the existing Gate without a blanket second confirmation. If material ambiguity
remains, `hitl2.status` SHALL stay `pending_user`; the candidate may remain a
decision-brief proposal, but the Agent SHALL NOT write `proceed_to_readiness`
or hand an incomplete object to Final.

When the user says delivery after a complete candidate with no material
ambiguity, that statement SHALL accept the candidate. If a material boundary
remains, it expresses delivery intent only; the smallest missing boundary SHALL
be asked, and the answer plus the prior intent SHALL complete the decision
without another delivery confirmation. A correction to a pending view updates
the candidate and SHALL NOT become `request_view_revision` unless the user
explicitly chooses to defer delivery through that existing branch.

For `custom`, HITL2 SHALL obtain and show resolved reader, use, primary focus,
what to avoid, and desired organization/presentation semantics, and write
trim-non-empty `view_instructions`; `custom_slug` remains only an identifier.
`not_started` is pre-HITL2 only and a delivery candidate SHALL normalize it to
`profile_default` or another explicit view. The Agent SHALL NOT recover missing
composition semantics from `rationale`, decision brief, chat, or slug.

#### Scenario: User accepts a complete delivery recommendation

- **WHEN** Agent displays a HITL2 research review and complete composition
  recommendation, and the user says “够了，按这个出报告” or an equivalent clear
  delegation
- **THEN** Agent SHALL record `proceed_to_readiness`, an explicit
  `final_report_view`, a complete `composition_handoff`, and `status: recorded`
- **AND** Agent SHALL NOT add a second confirmation

#### Scenario: Material composition ambiguity gets one bounded frontier

- **WHEN** two or more current reader/use/view interpretations would materially
  change report spine, focus, or evidence exposure
- **THEN** Agent SHALL use one message with no more than three independent
  questions, each with a recommendation and impact
- **AND** it SHALL defer dependent questions and SHALL NOT turn HITL2 into a
  field-by-field questionnaire

#### Scenario: Delivery intent plus clarification completes one decision

- **WHEN** the user first says “直接交付”, one material composition boundary
  remains unresolved, and the user then clearly answers that minimum question
- **THEN** the earlier delivery intent and answer SHALL jointly form the
  resolved handoff
- **AND** Agent SHALL write the accepted owner and continue without asking the
  user to confirm delivery again

#### Scenario: User corrects the displayed candidate

- **WHEN** the user says “读者改成管理层，篇幅简短，但保留关键证据”
- **THEN** Agent SHALL update the candidate, restate the resolved effect, and
  persist the corrected values when no material ambiguity remains
- **AND** it SHALL not require a letter choice, map the pending correction to
  `request_view_revision`, or leave the correction only in chat

#### Scenario: Custom view remains pending until executable

- **WHEN** the user chooses `custom` without enough reader/use/focus/
  organization semantics to form `view_instructions`
- **THEN** Agent SHALL keep `pending_user` and ask only the smallest missing
  boundary
- **AND** it SHALL not use slug, rationale, decision brief, or chat as a
  fallback Final contract

#### Scenario: Non-delivery action remains unblocked without a handoff

- **WHEN** the user clearly chooses `request_view_revision`, `rerun`, `repair`,
  or `stop_blocked`
- **THEN** Agent SHALL preserve the existing action-specific mapping,
  availability, cost, rationale, honesty, and route behavior
- **AND** absence of `composition_handoff` SHALL not force a delivery question
  or authorize Final

#### Scenario: Decision brief supports resume without becoming authority

- **WHEN** a HITL2 session interrupts while a composition candidate is pending
- **THEN** Agent MAY use `decision-brief.md` to restore conversational context
  and continue waiting
- **AND** only a subsequently accepted profile handoff SHALL authorize
  Readiness or Final

### Requirement: HITL2 research review surfaces declared-focus coverage

HITL2 的 research review SHALL，对每个可从当前 controls baseline（`rb_plan.md## Constraints > ### User Research Controls`）与 newest complete Decisions revision 识别的已声明 research focus，显式呈现该 Topic 的当前 focus_coverage 结果（`covered` / `partial` / `blocked` / `not declared`）。Agent SHALL 从该 Topic 的 `artifacts/wave1/{topic}/depth-review.yaml#/focus_coverage`（或 reference evidence map 的 current focus increments）读取当前结果；一个已声明但结果缺失或与用户意图不符的 focus SHALL 在 review 中可见，不得静默省略。

此呈现 SHALL NOT 新增 Gate、profile field、weight、source quota 或第三个 checkpoint；SHALL NOT 改变 focus_coverage 既有 absence = `not declared` 语义（wave1-intake），也不把 controls snapshot 或 focus 措辞解析为结构化 authority（user-research-controls）。它是面向用户的可见性呈现，判断（是否 rerun / repair / 接受）仍归 HITL2 现有 enum（HIU-003）。

#### Scenario: Declared focus coverage is visible at HITL2

- **WHEN** a Topic has a declared focus identifiable from the controls baseline or the newest Decisions revision
- **THEN** the HITL2 research review SHALL present that Topic's current focus_coverage outcome
- **AND** a declared-but-not-carried focus SHALL be visible rather than silently omitted

#### Scenario: Focus visibility introduces no new authority

- **WHEN** HITL2 surfaces declared-focus coverage
- **THEN** no new Gate, profile field, weight, source quota, or third checkpoint SHALL be introduced
- **AND** focus_coverage absence SHALL keep its existing `not declared` meaning
