## REMOVED Requirements

### Requirement: HITL2 research-review recommendation prompt

- Reason: 粒度拆分(spec-lean mainline C3 megablock-requirement-split):HITL2 research-review recommendation prompt 超粒度,按深挖定稿分界拆为单主题子块。
- Migration: requirement 文本逐字节守恒拆为 2 个子 requirement: HITL2 review and rerun recommendations SHALL be brief-driven and profile-gated / HITL2 user decisions SHALL confirm through quick actions, candidates, and delivery。requirement 身份 = 标题稳定锚点;registry 与 spec header 零触碰(无新增/废弃 ID)。

## ADDED Requirements

### Requirement: HITL2 review and rerun recommendations SHALL be brief-driven and profile-gated

Agent 在 HITL2 入口 SHALL 先写 research review，再给出一个明确推荐及其理由/预期影响，并提供自然语言决策入口。HITL2 SHALL 遵循 HIU-001 定义的环模型；本 requirement 定义 HITL2 独有的入口 prompt、recommendation 和 accepted decision mapping。

research review SHALL 包含：目前证据足够回答的内容、仍然不足或需要谨慎的地方、一个推荐的用户可理解下一步，以及推荐理由和预期影响。当推荐或用户动作涉及 rerun 或明显增加研究投入时，Agent SHALL 用 current direct facts 简短披露可预见的 material effort/cost impact；不增加 estimator、field 或 checker。用户在看见该影响后清楚接受，即已确认该已披露成本；只有实际动作超出已披露影响或当前权限时，Agent 才 SHALL 再问最小边界。

在把 rerun 描述为可执行推荐或记录用户的 rerun 决定之前，Agent SHALL 就近读取 current profile `rerun_count`。`phase-hitl2.md` SHALL 拥有一条 repo-root、只读的 inline Node ESM invocation，从现有 `the gate-helpers family` barrel import `loadGateDefinition('rerun-ready')`、profile reader 和 shared pure rerun-availability evaluator。该 invocation SHALL 只把 loader/profile facts 交给 evaluator 并输出其 closed availability result；它不写文件、trace 或 state，`brief/hitl2.md` SHALL NOT 复制该调用。The phase SHALL pass the loader-parsed definition and full parsed profile to the REI-003 shared evaluator with `includeNextIncrement: true`; it SHALL NOT extract an optional-chained count before evaluation. The evaluator's rule/profile/count interpretation remains owned by REI-003. A missing/unparseable profile, absent HITL2 parent or unsupported rule SHALL return an unsupported boundary; only a supported result whose next required increment is unavailable proves exhaustion. HITL2 SHALL NOT raw-parse Gate JSON, read `failure_message` as semantics, reimplement operator/value/count comparison in Markdown, or invent a wrapper/CLI. HITL2 SHALL present/record rerun as executable only when the shared result is supported and available. When `supported: true` and `available: false`, Agent SHALL only recommend/ask whether to start a new bundle for that scope. Loader/profile/config/evaluator unsupported facts SHALL instead state the concrete contract boundary without guessing that a new bundle resolves it. The result is conversation advice over one shared deterministic evaluation, not a second Gate, persisted eligibility field or copied numeric truth.
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

### Requirement: HITL2 user decisions SHALL confirm through quick actions, candidates, and delivery

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
