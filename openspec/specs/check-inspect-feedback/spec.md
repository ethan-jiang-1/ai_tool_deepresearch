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

When Inspect reports multiple failures from the same checkpoint, it SHALL distinguish independent root causes from downstream symptoms whenever the Engine can determine the direct dependency. Root-cause diagnostics SHALL appear before symptom diagnostics in the Agent-facing feedback surface.

A prerequisite failure SHALL short-circuit dependent checks in primary feedback when those checks cannot produce an independent repair action. Primary `inspect[]` and `advice[]` SHALL present the smallest actionable root-cause set and one nearest repair target per root cause. Independent root causes MAY remain side by side.

Complete post-mortem detail MAY be preserved by an existing formal durable diagnostic path, but SHALL NOT be repeated as a large flat wall of derivative failures in primary feedback. A side-effect-free inspect command SHALL keep such detail in memory/stdout only and SHALL NOT create a durable artifact for the sake of completeness.

Advice SHALL avoid manual edits to deterministic authority files when a valid Engine path is required. It SHALL not encode a presentation preference as blocking when direct structured authority already proves the required fact, and SHALL direct repair back to the same visible inspect/checkpoint whenever possible.

#### Scenario: Root cause is listed before symptoms

- **WHEN** a cache coverage failure causes downstream provenance coverage symptoms
- **THEN** Inspect SHALL present cache coverage as the root cause first
- **AND** any retained downstream detail SHALL identify or remain grouped under that upstream cause

#### Scenario: Root cause short-circuits non-actionable symptoms

- **WHEN** a missing or unparseable parent artifact makes downstream provenance, enum, eligibility, handoff, or backing checks non-actionable
- **THEN** Inspect SHALL present the parent artifact failure as the primary root cause
- **AND** dependent checks SHALL be masked, omitted, or grouped outside the primary repair list

#### Scenario: Advice stays actionable

- **WHEN** a checkpoint detects several related and independent failures
- **THEN** advice SHALL group related symptoms and provide one nearest repair target for each independent root cause
- **AND** advice SHALL NOT contain conflicting manual repair instructions for authority files

#### Scenario: Presentation preference does not obscure authority

- **WHEN** a Markdown presentation difference is semantically equivalent and direct structured authority is valid
- **THEN** Inspect SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT displace or contradict the direct authority result

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
