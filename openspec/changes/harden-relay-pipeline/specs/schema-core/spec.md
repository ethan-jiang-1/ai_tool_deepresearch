# Schema Core (delta)

> req: SCO-002

## Purpose

Update the queue slot count reference in the "Queue contract validates structured slots" scenario to reflect the expanded 20-slot active window defined in `agentic-queue` AGQ-019. All other contracts and scenarios in this requirement are preserved unchanged.

## MODIFIED Requirements

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

The Queue contract SHALL use `QueueWorkUnitSchema` for structured queue slot validation, replacing the previous skeleton placeholder slots.

#### Scenario: ProfileSchema accepts valid hitl2 skeleton
- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects invalid hitl2 status
- **WHEN** hitl2 status is `'invalid'`
- **THEN** it returns `{ success: false }`

#### Scenario: Queue contract validates structured slots

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** each of the 20 active window slots (`slot_1_current` through `slot_20_tail`) SHALL validate against `QueueWorkUnitSchema` (nullable)
- **AND** `refill_pool` SHALL validate as `z.array(QueueWorkUnitSchema)`

#### Scenario: QueueWorkUnitSchema validates a complete task card

- **WHEN** a queue item with all required fields (`work_id`, `title`, `targets`, `action`, `producer_rule`, `required_receipts`, `completion_receipt`, `status`) is validated
- **THEN** it SHALL pass Zod validation

#### Scenario: QueueWorkUnitSchema rejects missing required fields

- **WHEN** a queue item missing `producer_rule` or `required_receipts` is validated
- **THEN** Zod validation SHALL throw

#### Scenario: Backward compatible with null slots

- **WHEN** a bundle has `null` values in queue slots (e.g., empty queue)
- **THEN** Zod validation SHALL pass (slots are `.nullable()`)

## REMOVED Requirements

None.

## RENAMED Requirements

None.
