# schema-core Specification (Delta)

## MODIFIED Requirements

### Requirement: Six domain enums defined as Zod schemas
The schema SHALL define 10 Zod enums: the original 6 (CurrentGate, StopAuthorizationState, QueueHealth, RunState, ResearchProfile, GateResult) plus 4 HITL enums (HumanCheckpointStatus, AnswerabilityClass, HITL2UserDecision, FinalReportView). Each SHALL use `z.enum()` with the exact value set from V12 CONSTANTS.md.

#### Scenario: HumanCheckpointStatus has 5 values
- **WHEN** `HumanCheckpointStatus.safeParse('pending_user')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `HumanCheckpointStatus.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: AnswerabilityClass has 4 values
- **WHEN** `AnswerabilityClass.safeParse('ready_substantive')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `AnswerabilityClass.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: HITL2UserDecision has 5 values
- **WHEN** `HITL2UserDecision.safeParse('proceed_to_readiness')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: FinalReportView has 7 values
- **WHEN** `FinalReportView.safeParse('executive_brief')` is called
- **THEN** it returns `{ success: true }`

### Requirement: Six Zod contracts
The ProfileSchema SHALL replace hardcoded `z.literal('recorded')` and `z.literal('not_started')` with `HumanCheckpointStatus`. HITL2 section SHALL include `answerability_class` (AnswerabilityClass), `user_decision` (HITL2UserDecision), `final_report_view` (FinalReportView), and optional `custom_slug` (string).

#### Scenario: ProfileSchema accepts valid hitl2 skeleton
- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects invalid hitl2 status
- **WHEN** hitl2 status is `'invalid'`
- **THEN** it returns `{ success: false }`
