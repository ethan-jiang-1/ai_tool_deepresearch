> req: HIU-004

## MODIFIED Requirements

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
