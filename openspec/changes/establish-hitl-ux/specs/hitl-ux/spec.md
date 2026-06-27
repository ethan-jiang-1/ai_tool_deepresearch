> req: HIU-001, HIU-002, HIU-003, HIU-004, HIU-005, HIU-006

## ADDED Requirements

### Requirement: HITL conversational loop model

HITL1 和 HITL2 的用户交互 SHALL 遵循**环（loop）**模型——用户进入 HITL 后可以探索、提问、获得帮助后再做出决定，Agent 在出口条件满足后写入 profile 并推进。HITL 不是线性问卷，Agent SHALL NOT 将用户逐问驱赶。

环 SHALL 包含四个阶段：
- **入口**：Agent 一次性展示准备好的内容 + 字母菜单 + 可选输入 + 明确的 "可以直接选，也可以问问题" 信号。**入口的具体 prompt 格式由 HIU-002（HITL1）和 HIU-003（HITL2）分别定义**——本 requirement 定义的是环的结构性阶段，不重复入口 prompt 的具体字段
- **环内**：Agent 根据用户行为分类响应——直接选择（快出口）、对比询问（解释差异后继续等）、BTW 问题（回答后轻推回主路径）、改变主意（重新讨论选项）、无关输入（礼貌轻推回主路径）
- **出口**：用户显式确认选择后，Agent 写入 profile → run gate → 链推进。出口条件是**用户确认**，不是"所有问题被回答"
- **防无限环**：Agent SHALL 采用两级轻推策略——第 3 轮左右开始温和引导（如 "目前为止我们讨论了 X 和 Y，你觉得哪个方向更适合？"），避免突然打断用户的探索节奏；5+ 轮仍未决定时升级为总结已讨论内容 + 给明确建议 + 重申出口方式。Agent SHALL NOT 设硬性最大轮数

#### Scenario: Experienced user takes fast exit
- **WHEN** 用户直接回复 "A" 或 "选 quick_factual"
- **THEN** Agent SHALL 回显用户的选择并做显式二次确认（如 "确定选 A（quick_factual）？确认后我会写入 profile。"）
- **AND** 用户确认后（如 "确定"），Agent SHALL 追问 must-answer（如果用户尚未填写）
- **AND** must-answer 就位后，Agent SHALL 写入 profile 后 run gate
- **AND** 用户不需要回答任何额外问题即可出口
- **AND** 如果用户回复 "不对，我其实想选 B"，Agent SHALL 视为改变主意，回到环内讨论

#### Scenario: New user explores before deciding
- **WHEN** 用户回复 "A 和 C 有什么区别？我的场景是跨境支付合规"
- **THEN** Agent SHALL 解释 quick_factual 与 claim_verification 在用户具体场景下的差异
- **AND** Agent SHALL 在解释后轻推回主路径："还有其他问题吗？还是可以选了？"
- **AND** 用户最终说 "OK 选 C" → Agent 确认 → 写入 profile → 出口

#### Scenario: User asks BTW question
- **WHEN** 用户问 "BTW，adversarial verification 是什么意思？"
- **THEN** Agent SHALL 回答 BTW 问题
- **AND** Agent SHALL 回答后轻推："还有其他问题吗？还是可以继续选 profile？"
- **AND** HITL 环继续等待用户决定

#### Scenario: User is stuck after many rounds
- **WHEN** 用户已问 5+ 轮仍未做出 profile 选择
- **THEN** Agent SHALL 总结已讨论内容，给一个明确建议（"基于你刚才说的，我建议选 B，因为…"），并重申出口方式（"你随时可以说 A/B/C 选定"）
- **AND** Agent SHALL NOT 替用户决定或静默选择

#### Scenario: User sends irrelevant or off-topic message
- **WHEN** 用户发送与当前 HITL 决策无关的消息（如 "今天天气真好"、"帮我查一下明天的天气"、或粘贴不相关内容）
- **THEN** Agent SHALL 简短回应（对于闲聊：礼貌回应后轻推回主路径；对于不相关请求：说明当前处于研究设置阶段，该请求可在研究完成后处理）
- **AND** Agent SHALL 在回应后轻推回主路径（"我们可以继续研究设置吗？你随时可以选 A/B/C，或者问我关于选项的问题。"）
- **AND** HITL 环继续等待用户决定，不因无关输入而出口或阻塞

### Requirement: HITL1 entry prompt with letter menu

Agent 在 HITL1 入口 SHALL 使用预设的 prompt 文本，包含 A/B/C 字母菜单 + 一句话 must-answer + 可选搜索偏好。prompt 文本 SHALL 存放在独立的 shared 文件中（`shared-hitl-prompt-templates.md`），phase-hitl1.md 通过 `requires` 引用。

字母菜单 SHALL 满足：
- 选项呈现为 A/B/C 字母标签，中文描述为主，英文 canonical name 在括号中二次出现
- 用户敲一个字母（A/B/C）即可选择，不需要打出完整的 canonical name
- canonical enum 值（`quick_factual`/`exploratory_map`/`claim_verification`）对用户不可见作为主要选项文本

must-answer 收集 SHALL 满足：
- 用户用一句话写下 "最终报告必须回答什么"
- 如果用户不确定，可以写 "我不确定，先帮我拆问题"
- 不确定不是错误——Agent SHALL 将条目标记为 `gap_queue_backed` 状态。此状态通过条目文本模式编码（如包含 "不确定"/"先帮我拆"/"不知道具体该问什么" 等语义标记），不依赖结构化元数据字段。下游 phase（seed-topics）SHALL 通过文本模式识别 `gap_queue_backed` 条目，将其排入 question decomposition task card

搜索偏好 SHALL 满足：
- 一个可选的自然语言输入
- prompt 中给出 3-4 个具体例子引导用户
- 用户不写就记录 `not_specified_use_profile_defaults`——Agent SHALL NOT 追问
- 搜索偏好的下游使用：Agent 在 wave0/1/2 搜索和提取证据时 SHALL 读取 `search_preference` 字段，将用户的自然语言偏好作为搜索策略的软约束（如用户写了 "优先找中文资料" → Agent 优先搜索中文源；用户写了 "关注 2024 年之后的研究" → Agent 优先检索近期文献）。`search_preference` 不替代 `research_style_params` 的硬参数（如 source quality tier），而是在硬参数框架内的搜索策略倾斜

#### Scenario: User picks profile by letter
- **WHEN** Agent 展示 HITL1 入口 prompt，用户回复 "B"
- **THEN** Agent SHALL 将 B 翻译为 `exploratory_map` 写入 `rb_profile.yaml#/research_profile`
- **AND** Agent SHALL 追问 must-answer（如果用户尚未提供）
- **AND** canonical enum 值 `exploratory_map` 不出现在用户 prompt 文本中作为主要选项

#### Scenario: User is unsure about must-answer
- **WHEN** 用户对于 "最终报告必须回答什么" 回复 "我不确定，先帮我拆问题"
- **THEN** Agent SHALL 在 `root_must_answer_set` 中写入用户原话（如 "我不确定，先帮我拆问题"），此条目即被标记为 `gap_queue_backed`（通过文本模式识别）
- **AND** HITL1 gate SHALL pass（`root_must_answer_set` 非空即满足）
- **AND** Agent SHALL NOT 阻塞流程或要求用户必须给出具体问题

#### Scenario: User skips search preference
- **WHEN** 用户未提供搜索偏好（未提或明确说 "没有"）
- **THEN** Agent SHALL 记录 `search_preference: not_specified_use_profile_defaults`
- **AND** Agent SHALL NOT 追问或要求用户必须提供

#### Scenario: HITL1 exit sets silent phase expectation
- **WHEN** Agent 完成 HITL1（用户已确认 profile 选择 + must-answer，gate pass）
- **THEN** Agent SHALL 在推进到 setup 之前告知用户：
  - 即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2）
  - 时长取决于研究范围，可能几十分钟到一两天
  - 期间不会浮出水面，遇错自动处理
  - **可以关闭终端**，系统从 durable state 恢复
  - 下次见面是 HITL2（最终审查决策）
- **AND** Agent SHALL NOT 给出虚假的精确时间估计

### Requirement: HITL2 entry prompt with context narrative

Agent 在 HITL2 入口 SHALL 先写语境叙事再展示字母决策菜单。HITL2 SHALL 遵循 HIU-001 定义的环模型——用户进入 HITL2 后同样可以探索、提问、获得帮助后再做出决定。本 requirement 定义 HITL2 独有的入口 prompt 结构和决策选项；环内行为规则（快出口、探索性提问、BTW 问题处理、5+ 轮轻推）由 HIU-001 统一覆盖，不在本 requirement 中重复。

语境叙事 SHALL 包含三个部分：
- 目前证据足够回答的是：{概括能回答的内容}
- 仍然不足或需要谨慎的地方是：{缺口、限制}
- 如果继续补证据/重跑会优先补：{具体主题、证据}

决策菜单 SHALL 包含 5 个选项（A/B/C/D/E）：
- A: 继续生成最终报告（proceed to final report）
- B: 换一种报告视角（change final report view）
- C: 继续补证据/重跑（rerun）
- D: 修复问题后重试（repair）
- E: 停止并保留阻塞原因（stop blocked）

Agent SHALL 在向用户展示 prompt 之前，先完成 durable state 写入：`decision-brief.md` 已写完，`hitl2.status` 设为 `pending_user`。

#### Scenario: User chooses proceed_to_readiness
- **WHEN** Agent 展示 HITL2 语境叙事 + 决策菜单，用户回复 "A"
- **THEN** Agent SHALL 记录 `hitl2.user_decision: proceed_to_readiness`
- **AND** Agent SHALL 写入 `hitl2.status: recorded`
- **AND** HITL2 gate SHALL pass（user_decision 在有效 enum 集合内）

#### Scenario: User wants to change report view
- **WHEN** 用户回复 "B"
- **THEN** Agent SHALL 记录 `user_decision: request_view_revision`
- **AND** Agent SHALL 向用户询问具体想要哪种视角（`executive_brief`/`evidence_map`/`claim_judgment`/`technical_deep_dive`/`custom`）
- **AND** 此视角选择过程 SHALL 遵循 HIU-001 环模型——用户可探索不同视角的含义、对比差异、问 BTW 问题后再确定视角名，不限于单轮问答
- **AND** 视角选择子环的探索轮数 SHALL 独立计数（不与外层 HITL2 环的轮数合并）——用户选择 B 已经做出了一个决策，视角名选择是新的探索维度。子环内的轻推策略与外层相同（第 3 轮温和引导、5+ 轮总结建议），但子环中的轮数不影响外层 HITL2 的轻推进度
- **AND** 用户选择后 Agent 写入 `hitl2.final_report_view`，保持 `user_decision: request_view_revision`（语义为"换视角后继续"——不覆盖为 `proceed_to_readiness`，以保留完整的审计记录）
- **AND** 如果用户在视角选择中途反悔（如 Agent 问"什么视角？"用户回"算了还是 A 吧"），Agent SHALL 将 `user_decision` 改为 `proceed_to_readiness` 并写入 `final_report_view: profile_default`

#### Scenario: User chooses rerun to adjust direction
- **WHEN** 用户回复 "C"（rerun）
- **THEN** Agent SHALL 显式确认："确定要从 seed-topics 重新跑？当前的 wave 研究结果将被保留但新 run 会基于调整后的方向重新展开。"
- **AND** 用户确认后 Agent SHALL 写入 `user_decision: rerun`，在 `rationale` 中记录用户的重跑原因
- **AND** Gate pass 后 Agent 用 `rerun` outcome 查 chain → 进入 `phase-rerun.md`

#### Scenario: User chooses repair to fix issues
- **WHEN** 用户回复 "D"（repair）
- **THEN** Agent SHALL 写入 `user_decision: repair`，在 `rationale` 中记录用户要求修复的具体问题
- **AND** Agent SHALL 根据 rationale 就地修复（如补充缺失的 evidence、修正 artifact 错误、重跑失败的 task card）
- **AND** 修复完成后 rerun HITL2 gate，重新向用户展示更新后的 decision brief（此时语境叙事应反映修复结果）

#### Scenario: User chooses stop blocked
- **WHEN** 用户回复 "E"（stop_blocked）
- **THEN** Agent SHALL 显式确认："确定要停止当前研究？研究状态将被保留，你可以稍后恢复。"
- **AND** 用户确认后 Agent SHALL 写入 `user_decision: stop_blocked`，在 `rationale` 中记录停止原因
- **AND** Agent SHALL 将 `rb_status.json` state 设为 `blocked`（这是静默阶段之外的合法 block——用户主动选择停止）
- **AND** lifecycle 终止，Agent 告知用户可随时恢复

#### Scenario: Decision brief must exist before prompting
- **WHEN** Agent 准备向用户展示 HITL2 prompt
- **THEN** `artifacts/hitl2/decision-brief.md` SHALL 已存在且非空
- **AND** `hitl2.status` SHALL 已设为 `pending_user`
- **AND** session 断掉后 Agent 恢复时 SHALL 能通过 `rb_status.json` 定位到 HITL2 phase，从 `hitl2.status = pending_user` 得知用户尚未回复，从 `decision-brief.md` 恢复语境后继续等待用户决策

#### Scenario: HITL2 exit sets final generation expectation
- **WHEN** 用户在 HITL2 中选择 `proceed_to_readiness`（A）
- **AND** Agent 已记录决策并 gate pass
- **THEN** Agent SHALL 在推进到 readiness 之前告知用户：
  - 即将生成最终报告
  - 期间不会浮出水面
  - 完成后交付

### Requirement: Chinese-first interaction convention

所有用户可见的 HITL 交互 SHALL 使用中文。内部 enum 值、文件路径、字段名、CLI 命令 SHALL 保持英文 canonical form。

#### Scenario: User prompt is in Chinese
- **WHEN** Agent 向用户展示 HITL1 或 HITL2 prompt
- **THEN** 选项描述和引导文字 SHALL 为中文
- **AND** 英文 canonical name SHALL 只在括号中作为辅助参考出现
- **AND** 内部字段写入（`research_profile: claim_verification`）SHALL 使用英文 canonical form

### Requirement: Graceful degradation for uncertain users

当用户对 must-answer 问题不确定时，系统 SHALL 提供优雅降级路径——记录不确定性为可见的待澄清缺口，而非阻塞流程或替用户猜测。

#### Scenario: Uncertain must-answer creates gap not block
- **WHEN** 用户表达 must-answer 不确定（"我不确定"/"先帮我拆"/"不知道具体该问什么"）
- **THEN** Agent SHALL 将该条目标记为 `gap_queue_backed` 状态（条目文本内容本身表达不确定性——如 "我不确定，先帮我拆问题"——下游 phase 通过文本模式识别，不依赖结构化元数据字段）
- **AND** 该 gap SHALL 在 seed-topics 阶段被排入具体的澄清/拆解任务
- **AND** HITL1 gate SHALL pass（profile schema 验证通过）

### Requirement: Anti-infinite-loop nudge strategy

Agent SHALL 在 HITL 环中追踪用户探索轮数。**一轮的定义**：用户发送一条非直接选择的探索性消息（如对比询问、BTW 问题、改变主意）算一轮；用户直接选字母（A/B/C）不算探索轮，立即进入出口流程。

Agent SHALL 在第 3 轮左右开始温和引导（如 "目前为止我们讨论了 X 和 Y，你觉得哪个方向更适合？"），而非等到第 5 轮突然轻推。当用户 5+ 轮仍未做出决定时，Agent SHALL 主动总结已讨论内容、给出明确建议并重申出口方式。Agent SHALL NOT 设置硬性最大轮数导致强制退出。

#### Scenario: Agent nudges after extended exploration
- **WHEN** 用户在 HITL1 环中探索了 5 轮以上仍未选择 profile
- **THEN** Agent SHALL 执行轻推：总结已讨论 + 给建议 + 重申出口
- **AND** 如果用户继续探索（不是 stuck 而是 productive），Agent SHALL 继续响应
- **AND** 轻推 SHALL NOT 强制结束环

