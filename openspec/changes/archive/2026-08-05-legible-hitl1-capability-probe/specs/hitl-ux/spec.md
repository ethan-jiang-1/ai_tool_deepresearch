# hitl-ux

> req: HIU-002

## MODIFIED Requirements

### Requirement: HITL1 recommendation-first alignment prompt

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

`brief/hitl1.md` SHALL also be the exact-text owner for the user-facing communication around the existing research-access probe that follows the recorded HITL1 decision. Before the probe starts, the brief SHALL provide this exact Chinese notice:

> 在进入静默研究前，我会做一次快速的中性能力检查，确认搜索和网页抓取是否可用。这不是当前研究内容，也不需要你作出新的决定。

After the existing probe records `research_access.status: available`, the brief SHALL provide this exact Chinese result:

> 研究访问能力已确认。我会先完成现有 HITL1 检查；通过后将进入静默自主执行。

After the existing probe records `research_access.status: unavailable`, the brief SHALL provide this exact Chinese result:

> 当前环境尚不能完成搜索和网页抓取能力检查。已记录的 HITL1 选择仍然有效；这不是新的研究决定。

PRP-002 controls when the Phase renders these templates: the notice is before the one bounded search, and the corresponding result is directly after the observation and before the existing HITL1 Gate. The available result SHALL NOT claim that the Gate has passed. The existing silent-execution exit remains available only after that Gate passes. The unavailable result SHALL preserve recorded choices and keep the Agent at the existing smallest external boundary plus the same probe/Gate path; it SHALL NOT ask the user to repeat their recorded choices or create another interaction checkpoint. These templates are framework Markdown outputs only. They SHALL NOT promise to hide, replace, summarize as success, or otherwise control selected-host-native tool calls, policy failures, transport/security errors, or permitted shell output.

must-answer 收集 SHALL 满足：
- Agent SHALL 基于原始问题先提出拟定 must-answer；用户可以直接接受或用自然语言修正；
- 如果用户不确定或说“先帮我拆问题”，Agent SHALL 基于原始问题和当前对话提出一组具体、可接受或可修改的 must-answer 问题；
- 只有用户接受或修正后的具体问题进入现有 `root_must_answer_set`。Agent SHALL NOT 把“不确定”等原话当作机器暗号、通过文本模式伪造 `gap_queue_backed` 状态，或新增 intake/status 字段。

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
- **THEN** Agent SHALL 根据原始研究问题和已知语境提出一组具体 must-answer 建议
- **AND** 用户 SHALL 能直接接受或自然语言修正该建议，而不必自己从空白开始拆题
- **AND** Agent SHALL 只把接受后的具体问题写入 `root_must_answer_set`
- **AND** Agent SHALL NOT 写入文本暗号、sentinel 或新增结构化状态来表示不确定

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
- **WHEN** the selected host renders a native tool call, policy failure, transport/security error, or permitted fallback output during the probe
- **THEN** the framework's notice/result contract SHALL remain additive and SHALL NOT claim that the host output is hidden, suppressed, or a framework success/failure verdict

#### Scenario: HITL1 exit sets silent phase expectation
- **WHEN** Agent completes HITL1 (the user decision is recorded and the Gate passes)
- **THEN** Agent SHALL, after the direct available result and before advancing to setup, use the existing exit text to tell the user:
  - 即将进入静默自主执行阶段（Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2）；
  - 时长取决于研究范围，可能几十分钟到一两天；
  - 框架不会主动浮出报告进度、普通错误、idle 或请求继续确认，Agent 会沿现有合法路径自行处理；
  - 可以关闭终端，系统从 durable state 恢复；
  - 下一个框架主动邀请并等待用户决定的位置是 HITL2。
- **AND** Agent SHALL NOT 给出虚假的精确时间估计
