# schema-core Specification

> req: SCO-001, SCO-002, SCO-003, SCO-004, SCO-005, SCO-006, SCO-007, SCO-008, SCO-009
> inv: INV-SOR-001

## Purpose
Deep Research 的类型地基。定义所有领域枚举 (10 个) 和契约 (6 个)，以及 Gate 状态机转换表。纯 JavaScript (.mjs)，零编译，node 直接 import。

## Requirements
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

The system SHALL provide six Zod contracts for bundle control file validation:

| Contract | Target File | Schema |
|----------|------------|--------|
| Gate contract | `rb_status.json` | Gate state machine schema |
| Plan contract | `rb_plan.md` | Topic plan schema |
| Profile contract | `rb_profile.yaml` | Research profile schema |
| Queue contract | `rb_queue.json` | Queue state schema with structured `QueueWorkUnitSchema` |
| Status contract | `rb_status.json` | Run state schema |
| Trace contract | `rb_trace.jsonl` | Trace entry schema |

The ProfileSchema SHALL replace hardcoded `z.literal('recorded')` and `z.literal('not_started')` with `HumanCheckpointStatus`. HITL2 section SHALL include `answerability_class` (AnswerabilityClass), `user_decision` (HITL2UserDecision), `final_report_view` (FinalReportView), and optional `custom_slug` (string). The Queue contract SHALL use `QueueWorkUnitSchema` for structured queue slot validation, replacing the previous skeleton placeholder slots.

#### Scenario: ProfileSchema accepts valid hitl2 skeleton
- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects invalid hitl2 status
- **WHEN** hitl2 status is `'invalid'`
- **THEN** it returns `{ success: false }`

#### Scenario: Queue contract validates structured slots

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** each of the 5 active window slots (`slot_1_current` through `slot_5_tail`) SHALL validate against `QueueWorkUnitSchema` (nullable)
- **AND** `refill_pool` SHALL validate as `z.array(QueueWorkUnitSchema)`

#### Scenario: QueueWorkUnitSchema validates a complete task card

- **WHEN** a queue item with all required fields (`work_id`, `title`, `target`, `action`, `producer_rule`, `required_receipts`, `completion_receipt`, `status`) is validated
- **THEN** it SHALL pass Zod validation

#### Scenario: QueueWorkUnitSchema rejects missing required fields

- **WHEN** a queue item missing `producer_rule` or `required_receipts` is validated
- **THEN** Zod validation SHALL throw

#### Scenario: Backward compatible with null slots

- **WHEN** a bundle has `null` values in queue slots (e.g., empty queue)
- **THEN** Zod validation SHALL pass (slots are `.nullable()`)

### Requirement: Gate transition table covers all states
The GateTransitionTable SHALL define transitions for all 8 GateMachineState values: instantiation_complete, setup_ready, wave0_complete, wave1_complete, wave2_complete, hitl2_pending_user, readiness_passed, blocked_terminal. Terminal states (readiness_passed, blocked_terminal) SHALL have empty transition arrays.

#### Scenario: Every non-terminal state has at least one transition
- **WHEN** the GateTransitionTable is validated
- **THEN** the 6 non-terminal states each have ≥ 1 transition entry

#### Scenario: PASS events follow correct gate order
- **WHEN** PASS_SETUP fires from instantiation_complete
- **THEN** next state is setup_ready
- **WHEN** PASS_WAVE0 fires from setup_ready
- **THEN** next state is wave0_complete

#### Scenario: REOPEN returns to correct prior gate
- **WHEN** REOPEN fires from wave0_complete
- **THEN** next state is setup_ready
- **WHEN** REOPEN fires from wave1_complete
- **THEN** next state is wave0_complete

#### Scenario: HITL2 user actions route correctly
- **WHEN** USER_PROCEED fires from hitl2_pending_user
- **THEN** next state is readiness_passed
- **WHEN** USER_REPAIR fires from hitl2_pending_user
- **THEN** next state is wave1_complete

### Requirement: Schema is directly importable by node
All schema files SHALL be valid JavaScript (.mjs) that `node` can import directly without compilation.

#### Scenario: node imports schema
- **WHEN** `node -e "import('./DPT_FRAMEWORK/schema/index.mjs')"` is run
- **THEN** it succeeds without errors

