# Check & Inspect Feedback Loop
> req: CHI-001

Check 硬性验证 + Inspect 诊断 + 反馈 → 纠正闭环。LLM-JS C&I 协作原则的实现。

## ADDED Requirements

### Requirement: Check validates state with Zod schema before accepting output
Every state mutation SHALL be validated with a Zod schema before being persisted. Invalid output is rejected.

#### Scenario: Valid state passes Check
- **WHEN** state is validated against its Zod schema and all fields match
- **THEN** Check returns `{ ok: true }` and the state is accepted

#### Scenario: Invalid state fails Check
- **WHEN** state has a required field missing or an invalid enum value
- **THEN** Check returns `{ ok: false, error: "..." }` and the state is NOT persisted

### Requirement: Inspect diagnoses Check failures and generates feedback
When Check fails, the Inspect step SHALL generate a structured diagnostic report describing what failed and why, suitable as feedback to the LLM.

#### Scenario: Diagnostic report from Check failure
- **WHEN** Zod validation fails on a QueueWorkUnit missing `producer_rule`
- **THEN** Inspect produces a diagnostic: `{ field: "producer_rule", issue: "required field missing", fix: "add producer_rule value" }`

### Requirement: Feedback drives reflection and correction
The diagnostic from Inspect SHALL be returned to the repair segment (or LLM) as structured feedback. After correction, the state SHALL re-enter Check.

#### Scenario: Feedback loop corrects and passes
- **WHEN** Check fails, Inspect generates diagnostic, and repair uses it to fix state
- **THEN** the corrected state passes Check on re-validation
