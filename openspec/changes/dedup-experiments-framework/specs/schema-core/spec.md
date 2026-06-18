> req: SCO-009

## Purpose

Delta spec for the `schema-core` capability. Upgrades the `rb_queue.json` contract from skeleton placeholder slots to a structured `QueueWorkUnitSchema` validated by the agentic-queue prototype experiments.

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
