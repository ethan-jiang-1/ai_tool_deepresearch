# schema-core (Delta)

> req: SCO-001, SCO-002

## MODIFIED Requirements

### Requirement: Six domain enums defined as Zod schemas

The schema SHALL define 11 Zod enums: the original 10 plus `rerun_ready` added to `CurrentGate`. `CurrentGate` SHALL include `rerun_ready` between `hitl2_recorded` and `readiness_passed` in its value set.

#### Scenario: CurrentGate accepts rerun_ready

- **WHEN** `CurrentGate.safeParse('rerun_ready')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: StatusSchema accepts rerun_ready as current_gate

- **WHEN** `StatusSchema.safeParse({ current_mode: 'execution', state: 'in_progress', current_gate: 'rerun_ready', next_gate: 'seed_topics_ready' })` is called
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

The ProfileSchema SHALL add `rerun_count` to the HITL2 section. HITL2 section SHALL include `answerability_class` (AnswerabilityClass), `user_decision` (HITL2UserDecision), `final_report_view` (FinalReportView), optional `custom_slug` (string), and optional `rerun_count` (non-negative integer, default 0). The Queue contract SHALL use `QueueWorkUnitSchema` for structured queue slot validation, replacing the previous skeleton placeholder slots.

#### Scenario: ProfileSchema accepts valid hitl2 skeleton

- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects invalid hitl2 status

- **WHEN** hitl2 status is `'invalid'`
- **THEN** it returns `{ success: false }`

#### Scenario: ProfileSchema accepts rerun_count

- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'recorded', answerability_class: 'ready_substantive', user_decision: 'rerun', final_report_view: 'profile_default', rerun_count: 1 } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects negative rerun_count

- **WHEN** `rerun_count` is `-1`
- **THEN** it returns `{ success: false }`

## ADDED Requirements

### Requirement: Rerun tracking field in HITL2 profile

The HITL2 section of `rb_profile.yaml` SHALL support one optional field for rerun tracking:

- `rerun_count`: non-negative integer, default 0. Tracks how many times the rerun path has been taken.

The field SHALL be optional to maintain backward compatibility with existing bundles. Bundles without this field SHALL be treated as `rerun_count: 0`.

Rerun direction hints (topic adjustment plan) SHALL be written into `seed_topics/{slug}.md` files as a `## 本轮重跑方向` section, NOT into the profile. This keeps per-topic instructions co-located with the topic data that downstream phases already read.

#### Scenario: Old bundle without rerun_count is valid

- **WHEN** a bundle created before this change is validated
- **THEN** missing `rerun_count` SHALL default to 0 and validation SHALL pass
