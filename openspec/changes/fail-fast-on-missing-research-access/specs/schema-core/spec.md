> req: SCO-002

## MODIFIED Requirements

### Requirement: Six Zod contracts

The system SHALL provide Zod contracts for bundle control file validation. The Queue contract SHALL validate queue v2 `rb_queue.json` with queue demand items keyed by `queue_item_id`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`. Work-unit attempt state SHALL be validated through work-unit index, manifest, result, receipt, and ledger schemas rather than queue demand item schema.

The Profile contract SHALL support an optional legacy-compatible `research_access` observation. New bundle templates SHALL initialize it with `status: unprobed`. The observation SHALL use a closed status enum `unprobed | available | unavailable` and SHALL validate only direct recorded facts:

- `available` requires a non-empty probe timestamp, named search/fetch tool surface, URL-parseable `result_url`, and `fetch_outcome: success`;
- `unavailable` requires a non-empty probe timestamp, `fetch_outcome` other than success or an absent tool, and a non-empty `reason`;
- `unprobed` SHALL NOT claim successful URL/fetch evidence.

Missing `research_access` in a legacy profile SHALL remain schema-readable and SHALL be treated by pre-research checks as unprobed, not as available.

#### Scenario: Queue contract validates queue v2

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** queue demand items SHALL validate with `queue_item_id`
- **AND** delegated in-flight entries SHALL bind to Engine-allocated `work_id` values

#### Scenario: queue demand identity is distinct from work-unit identity

- **WHEN** a queue demand item uses `work_id` as its demand identifier
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

#### Scenario: available research access is internally consistent

- **WHEN** `research_access.status` is `available`
- **THEN** ProfileSchema SHALL require a parseable result URL and successful fetch outcome
- **AND** incomplete available observations SHALL fail validation

#### Scenario: unavailable research access carries a reason

- **WHEN** `research_access.status` is `unavailable`
- **THEN** ProfileSchema SHALL require a non-empty reason and probe timestamp

#### Scenario: legacy profile is unprobed rather than available

- **WHEN** an existing profile has no `research_access` field
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** HITL1/pre-research checks SHALL treat the capability as unprobed
