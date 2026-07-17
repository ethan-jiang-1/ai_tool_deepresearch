---
node_type: shared
id: shared-agent-ux-guidance
shared_scope: agent-ux
authority: behavioral-contract
requires: []
suggested_context:
  - shared/shared-profile
  - brief/hitl1
  - brief/hitl2
---

# Shared: HITL 对话行为

@impl HIU-001, HIU-005, HIU-006

HITL1 和 HITL2 是两个有帮助的决策环，不是让用户学习 enum 的问卷或命令控制台。

## 入口

Agent 一次展示当前事实、一个明确推荐、理由与影响、可选快捷方式，并说明用户可以直接接受、自然语言修正或继续提问。推荐不替代用户决定。

## 环内

- 清楚接受或修正：该表达本身就是决定；把已展示且被接受的语义写入当前 HITL owner，运行 Gate 并继续。
- 对比、BTW 或改变主意：直接回答当前问题，必要时自然回到尚未完成的决定。
- 无关输入：简短回应，再自然回到当前研究对齐或审阅。
- 仍有新的语义信息或信息增益：继续帮助用户理解，不按轮数催促。
- 讨论重复且不再产生实质进展：总结已明确与未明确内容，给一个有理由的推荐，并邀请直接接受或修正。

最小确认边界只包括：表达存在实质歧义、下一步扩张真实成本或权限、或存在不可逆风险。此时只问区分该边界所需的问题；澄清后，普通 profile/topic write、Gate、handoff、status sync 与 repair 由 Agent 执行。

## Must-Answer

用户不知道如何拆题时，Agent 基于原始问题和已知语境提出一组具体 must-answer 建议。用户可以直接接受或修正；只有接受后的具体问题进入 `root_must_answer_set`。不要把“不确定”等原话当作机器暗号，不新增 intake/status 字段，也不用文本模式推断状态。

## Authority

自然语言到 canonical field 的映射只发生在当前 `stop: yes` HITL decision boundary。普通非 HITL 用户消息不获得 checkpoint、permission、mutation、reentry、route 或 Engine override authority。Human-directed 只说明语义来源，机械执行仍归 Agent。
