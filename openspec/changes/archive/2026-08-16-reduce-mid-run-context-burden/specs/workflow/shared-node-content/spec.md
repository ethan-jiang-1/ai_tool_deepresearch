## MODIFIED Requirements

### Requirement: Shared anti-cheating rules content

`shared-anti-cheating-rules.md` SHALL 列举所有 phase 共享的底线禁令，并给出正确替代动作。

内容 SHALL 至少包含以下禁令：
- 禁止手写 trace event、receipt、gate result
- 禁止在 gate 未 pass 时修改 control files 冒充 pass
- 禁止跳过 retry / escalation
- 禁止把 chat memory 当 runtime state
- 禁止在 instantiation / setup 阶段声称 evidence coverage 或 synthesis quality
- 禁止在 `stop: yes` 节点未等用户输入就继续
- 禁止在 HITL2 阶段伪造用户 decision 或绕过用户输入
- 禁止在 readiness 阶段评判语义质量或写作质量
- 禁止从 chat memory 生成 final report——必须 sourced from verified bundle state
- 禁止在 final phase 实现 hidden loop 用于 post-delivery rework

When a phase node's `requires` includes `shared/shared-anti-cheating-rules`, its
local anti-cheating section SHALL NOT verbatim-repeat the shared file's
prohibition sentences. The phase node SHALL instead keep only phase-specific
prohibitions and point to the shared file for the common baseline. A phase
whose `requires` does NOT include the shared file SHALL either add it to
`requires` before trimming its local list, or keep the local list complete.
The shared file remains the single Agent-facing statement of the common
baseline; phase-local sections add only phase-specific prohibitions.

#### Scenario: Agent reads anti-cheating rules before phase execution

- **WHEN** Agent 加载任一 pre-research phase node
- **THEN** it SHOULD be able to use `shared-anti-cheating-rules.md` as the shared baseline
- **AND** the node SHALL explain the correct alternative action for each prohibition

#### Scenario: phase local anti-cheating section points instead of repeating

- **WHEN** a phase node's `requires` includes `shared/shared-anti-cheating-rules`
  and its local anti-cheating section repeats a prohibition sentence from the
  shared file
- **THEN** the deterministic workflow consistency check SHALL fail and name the
  phase node and the repeated sentence
- **AND** the phase node SHALL be edited to keep only phase-specific
  prohibitions plus a pointer to the shared file

#### Scenario: phase without the shared file keeps its complete local list

- **WHEN** a phase node's `requires` does NOT include
  `shared/shared-anti-cheating-rules` and its local anti-cheating section
  covers common prohibitions
- **THEN** the phase SHALL add the shared file to `requires` before trimming
  the local list
- **AND** it SHALL NOT silently weaken its in-context anti-cheating closure
