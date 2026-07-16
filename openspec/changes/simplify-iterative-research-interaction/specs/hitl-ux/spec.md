> req: HIU-001, HIU-002, HIU-003

## MODIFIED Requirements

### Requirement: HITL conversational loop model

HITL1 和 HITL2 的用户交互 SHALL 遵循**环（loop）**模型——用户进入 HITL 后可以探索、提问、获得帮助后再做出决定，Agent 在出口条件满足后写入 accepted owner 并推进。HITL 不是线性问卷，也不是要求用户学习内部 enum 的控制台；Agent SHALL NOT 将用户逐问驱赶。

环 SHALL 包含四个阶段：
- **入口**：Agent 一次性展示准备好的语境、一个明确推荐及其理由/影响、可选快捷选项，并明确告知用户可以直接接受、用自然语言修正或继续提问。**入口的具体 prompt 格式由 HIU-002（HITL1）和 HIU-003（HITL2）分别定义**——本 requirement 定义的是环的结构性阶段，不重复入口 prompt 的具体字段
- **环内**：Agent 根据用户行为响应——清楚接受或修正（快出口）、对比询问（解释差异后继续等）、BTW 问题（回答后轻推回主路径）、改变主意（重新讨论推荐/选项）、无关输入（礼貌回应后轻推回主路径）
- **出口**：用户清楚表达接受、修正或其他决定后，该表达本身 SHALL 视为确认。Agent SHALL 在当前 accepted HITL boundary 内把自然语言映射到现有 profile/decision contract，写入 accepted owner，运行 Gate 并继续现有合法链；SHALL NOT 对每个清楚决定统一追加无信息增益的二次确认
- **最小确认边界**：只有当用户表达存在实质歧义、下一步会扩张真实成本或权限、或存在不可逆风险时，Agent SHALL 只确认该最小边界；确认不得扩张为让用户逐步批准普通机械命令
- **防无限环**：Agent SHALL 采用两级轻推策略——第 3 轮左右开始温和引导（如“目前为止我们讨论了 X 和 Y，我建议先按 Z 开始，因为……”），避免突然打断用户的探索节奏；5+ 轮仍未决定时升级为总结已讨论内容 + 给一个明确建议 + 重申可直接接受或修正。Agent SHALL NOT 设硬性最大轮数

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
- **AND** Agent SHALL 回答后轻推：“还有其他问题吗？也可以直接按我的建议开始，或告诉我哪里要改。”
- **AND** HITL 环继续等待用户决定

#### Scenario: User is stuck after many rounds
- **WHEN** 用户已问 5+ 轮仍未做出决定
- **THEN** Agent SHALL 总结已讨论内容，给一个明确建议及理由，并重申用户可以直接接受或自然语言修正
- **AND** Agent SHALL NOT 替用户决定或静默写入 decision owner

#### Scenario: User sends irrelevant or off-topic message
- **WHEN** 用户发送与当前 HITL 决策无关的消息（如闲聊、不相关请求或粘贴不相关内容）
- **THEN** Agent SHALL 简短回应，并轻推回当前研究对齐或审阅问题
- **AND** HITL 环继续等待用户决定，不因无关输入而出口或阻塞

#### Scenario: Minimum confirmation is limited to a real boundary
- **WHEN** 用户表达可以合理映射为两个不同研究语义，或下一步需要新的真实成本/权限，或存在不可逆风险
- **THEN** Agent SHALL 只询问区分该边界所需的一个最小问题
- **AND** 用户澄清或授权后，Agent SHALL 自己执行剩余合法机械步骤
- **AND** Agent SHALL NOT 把该例外扩张为所有选择的统一二次确认

### Requirement: HITL1 entry prompt with letter menu

Agent 在 HITL1 入口 SHALL 使用 recommendation-first 的预设 prompt 文本。prompt 文本 SHALL 存放在独立的 `brief/hitl1.md` 中，`phase-hitl1.md` 通过 `suggested_context` 引用。

入口推荐 SHALL 至少包含：
- Agent 对原始问题的目标与范围理解；
- 一组拟定的“最终报告必须回答什么”；
- 初始 topic preview；
- 一个建议的研究深度/广度（映射到现有 `research_profile`）及其理由和投入影响。

快捷选项 SHALL 满足：
- A/B/C MAY 作为辅助快捷方式保留，Agent 的当前推荐 SHALL 清楚标记；
- 用户可以直接说“按你的建议开始”，也可以用自然语言修正目标、must-answer、topic 或深度/广度；
- 用户敲一个字母（A/B/C）仍可选择，不需要打出完整 canonical name；
- canonical enum 值（`quick_factual`/`exploratory_map`/`claim_verification`）不得作为用户必须学习的主要操作面。

自然语言映射 SHALL 只发生在当前 accepted HITL1 `stop: yes` decision boundary 内。用户的清楚接受或修正 SHALL 直接成为 HITL1 决定；Agent SHALL NOT 再追加 blanket second confirmation。只有存在实质歧义、真实成本/权限扩张或不可逆风险时，Agent 才 SHALL 请求最小确认。普通非 HITL 消息不因本 requirement 获得 profile/topic 持久化或 mutation authority。

must-answer 收集 SHALL 满足：
- Agent SHALL 基于原始问题先提出拟定 must-answer；用户可以直接接受或用自然语言修正；
- 如果用户不确定，可以写“我不确定，先帮我拆问题”；
- 不确定不是错误——Agent SHALL 将条目标记为 `gap_queue_backed` 状态。此状态通过条目文本模式编码（如包含“不确定”/“先帮我拆”/“不知道具体该问什么”等语义标记），不依赖结构化元数据字段。下游 phase（seed-topics）SHALL 通过文本模式识别 `gap_queue_backed` 条目，将其排入 question decomposition task card。

#### Scenario: User accepts the HITL1 recommendation in natural language
- **WHEN** Agent 已展示目标、must-answer、topic preview、recommended profile 及其影响，用户回复“按这个开始”
- **THEN** Agent SHALL 将推荐中已清楚展示的语义映射到现有 HITL1 profile/topic fields
- **AND** Agent SHALL NOT 要求用户再选择字母或再次确认相同内容
- **AND** Agent SHALL 执行后续 apply/style/probe/Gate 机械链

#### Scenario: User corrects the HITL1 recommendation in natural language
- **WHEN** 用户回复“范围不变，但重点放资本约束，报告必须回答监管变化会怎样影响现金流”
- **THEN** Agent SHALL 将该修正反映到 proposed must-answer/topic intent，并保持未被修正的推荐部分
- **AND** 当修正后的语义清楚时，Agent SHALL 直接记录决定而不重复确认
- **AND** Agent SHALL NOT 借映射发明用户没有表达的新约束

#### Scenario: User picks profile by letter
- **WHEN** Agent 展示 recommendation-first HITL1 prompt，用户清楚回复“B”
- **THEN** Agent SHALL 将 B 翻译为 `exploratory_map` 写入 `rb_profile.yaml#/research_profile`
- **AND** Agent SHALL 仅追问尚未由推荐或用户回答覆盖的 required semantics
- **AND** canonical enum 值 `exploratory_map` 不得作为用户 prompt 的主要操作要求
- **AND** Agent SHALL NOT 对该清楚选择统一追加二次确认

#### Scenario: User is unsure about must-answer
- **WHEN** 用户对于“最终报告必须回答什么”回复“我不确定，先帮我拆问题”
- **THEN** Agent SHALL 在 `root_must_answer_set` 中写入用户原话（如“我不确定，先帮我拆问题”），此条目即被标记为 `gap_queue_backed`（通过文本模式识别）
- **AND** HITL1 gate SHALL pass（`root_must_answer_set` 非空即满足）
- **AND** Agent SHALL NOT 阻塞流程或要求用户必须给出具体问题

#### Scenario: HITL1 asks only for a genuinely ambiguous field
- **WHEN** 用户的回复同时可能表示缩小范围或只改变报告视角，且两种解释会写入不同 accepted semantics
- **THEN** Agent SHALL 只询问区分该语义所需的最小问题
- **AND** 澄清后 Agent SHALL 记录决定并自行执行后续机械链

#### Scenario: HITL1 exit sets silent phase expectation
- **WHEN** Agent 完成 HITL1（用户决定已记录且 gate pass）
- **THEN** Agent SHALL 在推进到 setup 之前告知用户：
  - 即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2）；
  - 时长取决于研究范围，可能几十分钟到一两天；
  - 框架不会主动浮出报告进度、普通错误、idle 或请求继续确认，Agent 会沿现有合法路径自行处理；
  - 可以关闭终端，系统从 durable state 恢复；
  - 下一个框架主动邀请并等待用户决定的位置是 HITL2。
- **AND** Agent SHALL NOT 给出虚假的精确时间估计

### Requirement: HITL2 entry prompt with context narrative

Agent 在 HITL2 入口 SHALL 先写 research review，再给出一个明确推荐及其理由/预期影响，并提供自然语言决策入口。HITL2 SHALL 遵循 HIU-001 定义的环模型——用户进入 HITL2 后可以探索、提问、获得帮助后再做出决定。本 requirement 定义 HITL2 独有的入口 prompt、recommendation 和 accepted decision mapping；环内行为规则由 HIU-001 统一覆盖。

research review SHALL 包含四个部分：
- 目前证据足够回答的是：{概括能回答的内容}；
- 仍然不足或需要谨慎的地方是：{缺口、限制、争议}；
- Agent 推荐的一个下一步：{交付、换视角、继续研究、修复或停止中的一个用户可理解动作}；
- 推荐理由和预期影响：{为什么现在最值得这样做，以及它大致会改变什么}。

HITL2 MAY 保留五个快捷选项（A/B/C/D/E），但 SHALL 以用户可理解的动作描述为主，canonical enum 只作内部 contract：
- A: 继续生成最终报告（`proceed_to_readiness`）；
- B: 换一种报告视角（`request_view_revision`）；
- C: 继续补某个研究方向（`rerun`）；
- D: 修复当前研究问题（`repair`）；
- E: 停止并保留阻塞原因（`stop_blocked`）。

用户 SHALL 能用自然语言表达“够了，按这个出报告”“换成管理层视角”“资本约束这部分还不够，再补一下”“这里的证据似乎有错，先修正”或“先停在这里”。Agent SHALL 仅在当前 accepted HITL2 decision boundary 内把清楚意图映射到现有五个 enum、rationale 和现有可写字段；recommendation 本身 SHALL NOT 替代用户决定。普通非 HITL 中途消息不因本 requirement 获得 HITL2 decision persistence、state mutation、permission 或 route authority。

用户的清楚决定本身 SHALL 视为确认。Agent SHALL NOT 对 `proceed_to_readiness`、`request_view_revision`、`repair`、`rerun` 或 `stop_blocked` 统一要求第二次确认；只有表达存在实质歧义、执行需要新的真实成本/权限或存在不可逆风险时，Agent SHALL 请求该最小确认。决定写入 accepted owner 后，Gate、repair、handoff、status sync 和后续执行 SHALL 回到 Agent。

Agent SHALL 在向用户展示 prompt 之前，先完成 durable state 写入：`artifacts/hitl2/decision-brief.md` 已写完，`hitl2.status` 设为 `pending_user`。

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
- **THEN** Agent SHALL 写入 `user_decision: rerun`，并在 `rationale` 中记录用户的补充方向
- **AND** 当 rerun 未跨越新的真实成本/权限边界时，Agent SHALL NOT 追加 blanket second confirmation
- **AND** 若需要新的真实成本或权限，Agent SHALL 只确认该边界；确认后由 Agent 继续机械执行
- **AND** Gate pass 后 Agent SHALL 用 `rerun` outcome 进入 `phase-rerun.md`

#### Scenario: User chooses repair to fix issues
- **WHEN** 用户清楚回复“这里的证据似乎有错，先修正”或快捷选项“D”并描述问题
- **THEN** Agent SHALL 写入 `user_decision: repair`，在 `rationale` 中记录用户要求修复的具体问题
- **AND** Agent SHALL 根据 rationale 通过现有合法路径就地修复
- **AND** 修复完成后 Agent SHALL rerun HITL2 gate，重新向用户展示反映修复结果的 decision brief
- **AND** Agent SHALL NOT 要求用户执行普通 repair 命令

#### Scenario: User chooses stop blocked
- **WHEN** 用户清楚回复“先停在这里”或快捷选项“E”
- **THEN** Agent SHALL 写入 `user_decision: stop_blocked`，在 `rationale` 中记录停止原因
- **AND** Agent SHALL NOT 因统一规则重复询问同一停止决定
- **AND** Agent SHALL 通过现有 accepted stop behavior 终止 lifecycle 并保留原因，不得手工创造状态 authority

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
- **WHEN** 用户在 HITL2 中选择 `proceed_to_readiness`
- **AND** Agent 已记录决策并 gate pass
- **THEN** Agent SHALL 在推进到 readiness 之前告知用户：
  - 即将生成最终报告；
  - 框架期间不会主动浮出；
  - 完成后 Final 只交付结果，不再发起第三次决定交互。
