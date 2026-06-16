# schema-core Specification

## Purpose
TBD - created by archiving change schema-core. Update Purpose after archive.
## Requirements
### Requirement: Six domain enums defined as Zod schemas
The schema SHALL define 6 Zod enums: CurrentGate, StopAuthorizationState, QueueHealth, RunState, ResearchProfile, GateResult. Each SHALL use `z.enum()` with the exact value set from the specification.

#### Scenario: CurrentGate has 6 values
- **WHEN** `CurrentGate.safeParse('wave0_complete')` is called
- **THEN** it returns `{ success: true, data: 'wave0_complete' }`

#### Scenario: CurrentGate rejects unknown
- **WHEN** `CurrentGate.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: StopAuthorizationState has 4 values
- **WHEN** `StopAuthorizationState.safeParse('unauthorized_continue_required')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: QueueHealth accepts valid values
- **WHEN** `QueueHealth.safeParse('ready')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `QueueHealth.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: RunState accepts valid values
- **WHEN** `RunState.safeParse('in_progress')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `RunState.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: ResearchProfile accepts valid values
- **WHEN** `ResearchProfile.safeParse('exploratory_map')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `ResearchProfile.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: GateResult accepts valid values
- **WHEN** `GateResult.safeParse('pass')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `GateResult.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

### Requirement: Six Zod contracts
The schema SHALL define 6 Zod contracts: StatusSchema (rb_status.json), QueueSchema (rb_queue.json), ProfileSchema (rb_profile.yaml), PlanSchema (rb_plan.md frontmatter), TraceSchema (rb_trace.jsonl), and GateTransitionTable (gate state machine). Each SHALL use `z.object()` with the minimal required fields.

#### Scenario: StatusSchema accepts valid skeleton
- **WHEN** `StatusSchema.safeParse({ current_mode: 'execution', state: 'not_started', current_gate: 'setup_ready', next_gate: 'wave0_complete' })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: QueueSchema accepts valid skeleton
- **WHEN** `QueueSchema.safeParse({ queue_health: 'ready', stop_authorization_state: 'unauthorized_continue_required', slot_1_current: null, slot_2_next: null, slot_3_pending: null, slot_4_pending: null, slot_5_tail: null, refill_pool: [] })` is called
- **THEN** it returns `{ success: true }`

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

