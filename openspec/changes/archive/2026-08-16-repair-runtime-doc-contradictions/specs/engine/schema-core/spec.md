> req: SCO-001

## MODIFIED Requirements

### Requirement: Six domain enums defined as Zod schemas

The schema SHALL retain the current lifecycle and HITL/profile Zod enums, including
`CurrentGate` and the six-value `HITL2UserDecision` set. `CurrentGate` values SHALL
be the snake_case rendering of the `DEEP_RESEARCH_HARNESS/workflows/manifest.json`
gate keys in manifest lifecycle order, with `readiness_passed` before `rerun_ready`,
followed by the terminal sentinel `none`. The manifest–enum correspondence and order
SHALL remain regression-locked; Agent-facing documentation SHALL state the mechanical
`-` ↔ `_` derivation rule and point to the manifest and `schema/enums.mjs` as the two
single sources instead of maintaining a second hand-written mapping. It SHALL
additionally define closed research-access vocabulary for `china` and `overseas`
source groups, the declared fixed sample IDs, compact sample terminal outcomes, and
executor-neutral direct retrieval surface categories. Retired source-class,
candidate, and access-boundary vocabulary SHALL NOT remain a current enum or profile
contract surface.

The new access vocabulary SHALL distinguish real content, login-required,
challenge, HTTP-denied, rate-limited, transport-inconclusive, other failed,
whole-probe no-request, and round-budget-not-attempted terminal outcomes.
Whole-probe no-request means no declared page request began because the isolated
probe relay failed or the executor had no already-permitted direct retrieval surface;
it is distinct from a known individual sample that could not start before the round
budget. It SHALL not encode a provider, tool name, user language, VPN state,
IP/geography, HTTP status code, retry count, or network diagnosis.

`HITL2UserDecision` SHALL contain six schema values:

- `not_started` as the pre-decision sentinel; and
- `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked` as the five recorded decision values accepted by the HITL2 gate.

The presence of the `not_started` schema sentinel SHALL NOT make it a gate-pass decision. `human_decision_checkpoints.hitl2.status: recorded` still requires one of the five actionable values.

#### Scenario: Direct-sample vocabulary is closed

- **WHEN** ProfileSchema receives a current direct-sample observation
- **THEN** it SHALL accept only declared source groups, sample IDs, outcome values,
  and surface categories
- **AND** it SHALL reject an undeclared sample, provider name, or status-code field

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

#### Scenario: HITL2UserDecision has 6 schema values

- **WHEN** `HITL2UserDecision.safeParse()` is called for `not_started` or any of the five recorded decision values
- **THEN** it returns `{ success: true }`
- **WHEN** it is called with `repair_and_rerun` or another unsupported value
- **THEN** it returns `{ success: false }`

#### Scenario: FinalReportView has 7 values

- **WHEN** `FinalReportView.safeParse('executive_brief')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: CurrentGate accepts rerun_ready

- **WHEN** `CurrentGate.safeParse('rerun_ready')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: StatusSchema accepts rerun_ready as current_gate

- **WHEN** `StatusSchema.safeParse({ current_mode: 'execution', state: 'in_progress', current_gate: 'rerun_ready', next_gate: 'seed_topics_ready' })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: CurrentGate order matches manifest lifecycle order

- **WHEN** the `CurrentGate` enum values are read in declaration order
- **THEN** they SHALL match the manifest gate key order, with `readiness_passed` before `rerun_ready`
- **AND** the terminal sentinel `none` SHALL be last
- **AND** the existing manifest–enum regression SHALL fail if the correspondence or order drifts
