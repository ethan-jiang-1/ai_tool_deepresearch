> req: HIU-003

## ADDED Requirements

### Requirement: HITL2 SHALL resolve composition intent inside its existing recommendation loop

Agent 在 HITL2 入口 SHALL 先写 research review，再给出一个明确推荐及其理由/预期影响，并提供自然语言决策入口。HITL2 SHALL 遵循 HIU-001 定义的环模型；本 requirement 定义 HITL2 独有的入口 prompt、recommendation、composition alignment 和 accepted decision mapping。

Research review SHALL 包含目前证据足够回答的内容、仍然不足或需要谨慎的地方、一个推荐的用户可理解下一步，以及推荐理由和预期影响。当推荐或用户动作涉及 rerun 或明显增加研究投入时，Agent SHALL 用 current direct facts 简短披露可预见的 material effort/cost impact；不增加 estimator、field 或 checker。用户在看见该影响后清楚接受，即已确认该已披露成本；只有实际动作超出已披露影响或当前权限时，Agent 才 SHALL 再问最小边界。

当当前推荐是交付或用户表达交付意图时，HITL2 SHALL 在同一入口中展示一份紧凑、完整、面向用户语义的交付建议，包含：读者及其熟悉程度、用途、首要焦点、报告视角、需要前置/可以压缩的内容、语言、篇幅、正文证据展开程度和附录姿态。Agent SHALL 用用户可理解的描述展示，不要求用户填写 schema field 或学习 enum。

Agent SHALL 依次使用 current HITL2 explicit correction、accepted HITL1 purpose/delivery controls、current root must-answer shape、selected view transparent defaults 和 disclosed system defaults 形成 candidate。Candidate 只是推荐，直到用户清楚接受、修正或委托后才成为 accepted handoff；recommendation 本身 SHALL NOT 产生用户 authority。

Agent 只有在两个或更多合理取值会实质改变 reader task、primary focus、primary spine、内容优先级、解释深度或 evidence exposure 时才 SHALL 主动澄清。所有当前可回答且相互独立的问题 MAY 合并为一条最多三个问题的 clarification message；每项 SHALL 给出推荐值和影响。依赖前一答案的问题 SHALL 等待下一轮。透明默认可解决或不会改变交付行为的细节 SHALL NOT 变成问题。

用户可以只回答部分问题、直接接受完整 candidate、自然语言修正，或委托 Agent 采用已经展示的推荐。清楚接受、修正或委托本身 SHALL 视为确认；Agent SHALL restate resolved meaning、写入现有 `final_report_view` owner 和 `composition_handoff` durable owner，然后运行 Gate，且 SHALL NOT 追加 blanket second confirmation。若 material ambiguity 仍未解决，`hitl2.status` SHALL 保持 `pending_user`，candidate 只留在 decision brief proposal，Agent SHALL NOT 写 `proceed_to_readiness` 或把半成品交给 Final。

用户说“交付”时，如果已展示 candidate 完整且没有 material ambiguity，该表达 SHALL 直接接受 candidate。如果仍有 material ambiguity，该表达只说明 delivery intent；Agent SHALL 询问最小缺失边界。用户回答后，先前 intent 与新答案 SHALL 共同完成决定，不得再要求第二次“确认交付”。在 pending candidate 中修正 view SHALL 更新 candidate；它 SHALL NOT 自动成为 `request_view_revision`，除非用户明确选择暂停交付并采用该 existing branch。

对于 `custom` view，Agent SHALL 在 HITL2 内取得并展示 reader、use、primary focus、不要什么以及希望如何组织/呈现的 resolved semantics，并写入 trim-non-empty `view_instructions`；`custom_slug` 只作 identifier。`not_started` 只作 pre-HITL2 sentinel；delivery candidate SHALL 把它规范化为 `profile_default` 或另一个明确 view。Agent SHALL NOT 从 `rationale`、decision brief、chat 或 slug 恢复缺失 composition semantics。

在把 rerun 描述为可执行推荐或记录用户的 rerun 决定之前，Agent SHALL 就近读取 current profile `rerun_count`。`phase-hitl2.md` SHALL 继续使用现有 repo-root、只读 inline Node ESM invocation 和 REI-003 shared evaluator 判断 rerun availability，不复制 rule/count semantics、写文件或制造第二个 Gate。Unavailable/unsupported behavior、cost disclosure、rationale focus capture 和 existing rerun route 均保持原 accepted contract。

HITL2 MAY 保留五个快捷选项（A/B/C/D/E），但 SHALL 以用户可理解的动作描述为主：`proceed_to_readiness`、`request_view_revision`、`rerun`、`repair`、`stop_blocked` 继续是唯一 existing enum。用户 SHALL 能自然语言选择这些动作。只有当前 accepted HITL2 decision boundary 可将清楚意图映射到现有 enum、rationale、`final_report_view` 和 `composition_handoff`；普通 non-HITL message 不获得 persistence、state mutation、permission 或 route authority。

决定写入 accepted owner 后，Gate、repair、handoff、status sync、composition drift restore 和后续执行 SHALL 回到 Agent。Agent SHALL 在展示 prompt 前完成 existing decision brief 和 `hitl2.status: pending_user` durable state。Decision brief MAY 展示 candidate/accepted projection 以支持人类审阅和 resume，但 SHALL NOT 成为 machine owner。

#### Scenario: User accepts complete delivery recommendation

- **WHEN** Agent 展示 HITL2 research review 和完整 composition recommendation，用户回复“够了，按这个出报告”或等价明确委托
- **THEN** Agent SHALL 记录 `proceed_to_readiness`、明确 `final_report_view`、完整 `composition_handoff` 和 `status: recorded`
- **AND** Agent SHALL NOT 追加第二次确认

#### Scenario: Material composition ambiguity gets one bounded frontier

- **WHEN** 当前有两个或更多 reader/use/view 解释会实质改变报告 spine、重点或 evidence exposure
- **THEN** Agent SHALL 在一条消息中展示最多三个独立问题，每项带推荐和影响
- **AND** Agent SHALL defer dependent questions and SHALL NOT turn HITL2 into a field-by-field questionnaire

#### Scenario: Delivery intent plus clarification completes one decision

- **WHEN** 用户先说“直接交付”，但一个 material composition boundary 仍 unresolved，随后清楚回答该最小问题
- **THEN** earlier delivery intent 与该答案 SHALL 共同形成 resolved handoff
- **AND** Agent SHALL write the accepted owner and continue without asking the user to confirm delivery again

#### Scenario: User corrects the displayed candidate

- **WHEN** 用户说“读者改成管理层，篇幅简短，但保留关键证据”
- **THEN** Agent SHALL update the candidate, restate the resolved effect, and persist the corrected values when no material ambiguity remains
- **AND** it SHALL not require a letter choice, map the pending correction to `request_view_revision`, or leave the correction only in chat

#### Scenario: Custom view remains pending until executable

- **WHEN** 用户选择 custom 但尚未说明足以形成 `view_instructions` 的 reader/use/focus/organization semantics
- **THEN** Agent SHALL keep `pending_user` and ask only the smallest missing boundary
- **AND** it SHALL not use slug, rationale, decision brief, or chat as a fallback Final contract

#### Scenario: User chooses a non-delivery action

- **WHEN** 用户清楚选择 `request_view_revision`、`rerun`、`repair` 或 `stop_blocked`
- **THEN** Agent SHALL preserve the existing action-specific mapping, availability, cost, rationale, honesty, and route behavior
- **AND** absence of `composition_handoff` SHALL not force a delivery question or authorize Final

#### Scenario: Decision brief supports resume without becoming authority

- **WHEN** HITL2 session interrupts while a composition candidate is pending
- **THEN** Agent MAY use `decision-brief.md` to restore conversational context and continue waiting
- **AND** only a subsequently accepted profile handoff SHALL authorize Readiness or Final

#### Scenario: Ordinary mid-run message is not a HITL2 composition decision

- **WHEN** 用户在非 HITL `stop: no` phase 主动发送普通交付偏好或问题
- **THEN** HIU-003 SHALL NOT authorize writing or changing `composition_handoff`, `final_report_view`, HITL2 decision, route, or permission from that message alone
- **AND** the message SHALL NOT become a third HITL checkpoint

#### Scenario: HITL2 exit sets final generation expectation

- **WHEN** 用户在 HITL2 中接受完整 handoff，Agent 记录 `proceed_to_readiness` 且 Gate pass
- **THEN** Agent SHALL 在推进到 readiness 前告知用户即将按已接受的交付目标生成最终报告
- **AND** it SHALL state that Readiness/Final do not initiate another decision interaction and ordinary mechanical work remains Agent-owned
