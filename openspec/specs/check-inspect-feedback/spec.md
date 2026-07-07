# Check & Inspect Feedback Loop
> req: CHI-001, CHI-002

## Purpose

Check 硬性验证 + Inspect 诊断 + 反馈 → 纠正闭环。LLM-JS C&I 协作原则的实现。

## Requirements

### Requirement: Check validates state with Zod schema before accepting output
Every state mutation SHALL be validated with a Zod schema before being persisted. Invalid output is rejected.

#### Scenario: Valid state passes Check
- **WHEN** state is validated against its Zod schema and all fields match
- **THEN** Check returns `{ ok: true }` and the state is accepted

#### Scenario: Invalid state fails Check
- **WHEN** state has a required field missing or an invalid enum value
- **THEN** Check returns `{ ok: false, error: "..." }` and the state is NOT persisted

### Requirement: Inspect diagnoses Check failures and generates feedback

When Inspect reports multiple failures from the same checkpoint, it SHALL distinguish root causes from downstream symptoms whenever the Engine can determine the dependency. Root-cause diagnostics SHALL appear before symptom diagnostics in the Agent-facing feedback surface.

Feedback SHALL preserve complete diagnostic detail in durable artifacts when available, but the primary `inspect[]` and `advice[]` surfaces SHALL give the Agent concise next repair targets. Advice SHALL avoid telling the Agent to perform manual edits to deterministic authority files when a valid Engine path is required.

#### Scenario: Root cause is listed before symptoms

- **WHEN** a cache coverage failure causes downstream provenance coverage symptoms
- **THEN** Inspect SHALL present cache coverage as the root cause first
- **AND** downstream symptoms SHALL identify their upstream cause when known

#### Scenario: Advice stays actionable

- **WHEN** a checkpoint returns many related failures
- **THEN** advice SHALL group related symptoms under a small number of repair targets
- **AND** advice SHALL NOT contain multiple conflicting manual repair instructions for authority files

### Requirement: Feedback drives reflection and correction
The diagnostic from Inspect SHALL be returned to the repair checkpoint or LLM as structured feedback. After correction, the state SHALL re-enter Check.

#### Scenario: Feedback loop corrects and passes
- **WHEN** Check fails, Inspect generates diagnostic, and repair uses it to fix state
- **THEN** the corrected state passes Check on re-validation

### Requirement: C&I 反馈环 fork 变体 (CHI-002)
fork 变体的 Check & Inspect 反馈环 SHALL 在 fork 版 WorkflowState (含 `topicReadiness` 多维字段) 上运行: Check 用 Zod `safeParse` 校验含 topicReadiness 的约束; 失败时 Inspect 将 ZodError 转为结构化诊断 `{ field, issue, code, fix }`, 反馈给 repair, 修正后重回 Check。多维护度重叠时按优先级 `blocked > fail_b > fail_a > pass` 确定分支。

#### Scenario: topicReadiness 无效触发 Check 失败
- **WHEN** fork 版 state 的 `topicReadiness` 不满足 Zod 约束 (如多维护度重叠未按优先级确定)
- **THEN** Check 返回 `{ ok: false }`, state 不被持久化

#### Scenario: Inspect 结构化诊断并反馈修复
- **WHEN** Check 因 topicReadiness 校验失败
- **THEN** Inspect 生成诊断 `{ field: "topicReadiness", issue, code, fix }`, repair 据此修正后 state 重回 Check 并 PASS
