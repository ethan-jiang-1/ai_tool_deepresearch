> req: SCO-009

## MODIFIED Requirements

### Requirement: Six Zod contracts

The system SHALL provide Zod contracts for bundle control file validation. The Queue contract SHALL validate queue v2 `rb_queue.json` with queue demand items keyed by `queue_item_id`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`. Work-unit attempt state SHALL be validated through work-unit index, manifest, result, receipt, and ledger schemas rather than queue demand item schema.

#### Scenario: Queue contract validates queue v2

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** queue demand items SHALL validate with `queue_item_id`
- **AND** delegated in-flight entries SHALL bind to Engine-allocated `work_id` values

#### Scenario: queue demand identity is distinct from work-unit identity

- **WHEN** a queue demand item uses `work_id` as its demand identifier
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

