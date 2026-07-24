> req: SCO-002

## MODIFIED Requirements

### Requirement: Six Zod contracts

The system SHALL provide Zod contracts for bundle control file validation. The Queue contract SHALL validate queue v2 `rb_queue.json` with queue demand items keyed by `queue_item_id`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`. Work-unit attempt state SHALL be validated through work-unit index, manifest, result, receipt, and ledger schemas rather than queue demand item schema.

The Profile contract SHALL support an optional legacy-compatible `research_access` observation. New bundle templates SHALL initialize it with `status: unprobed`. The observation SHALL use strict status-discriminated branches and validate only direct recorded facts:

- `unprobed` SHALL contain only `status: unprobed` and SHALL NOT carry URL, fetch success, timestamp, reason, tool-surface, candidate-count, or candidate-ordinal claims;
- `available` SHALL require an ISO 8601 `probed_at`, an HTTP(S) `result_url`, and `fetch_outcome: success`; optional trim-non-empty `search_surface` and `fetch_surface` strings MAY record audit labels;
- `unavailable` SHALL require an ISO 8601 `probed_at`, `fetch_outcome: failed | blocked | not_attempted`, and a trim-non-empty `reason`; optional `result_url` SHALL be HTTP(S) when present, and optional `search_surface` / `fetch_surface` SHALL be trim-non-empty when present.

The `available` and `unavailable` branches MAY carry the legacy-compatible bounded candidate metadata pair:

- `eligible_candidate_count` SHALL be an integer from `0` through `3`, representing the number of syntactically eligible search candidates actually considered by the completed probe;
- when `eligible_candidate_count` is greater than zero, `final_candidate_ordinal` SHALL be an integer from `1` through `eligible_candidate_count` and identify the final attempted or successful candidate;
- when `eligible_candidate_count` is zero, `final_candidate_ordinal` SHALL be absent; and
- both fields MAY be absent together for legacy profiles, but the current HITL1 writer SHALL record the internally consistent count/ordinal shape for every completed probe.

Missing `research_access` in a legacy profile SHALL remain schema-readable and SHALL be treated by HITL1 checks as unprobed, not as available. The Profile contract SHALL NOT store a derived gate verdict, response body, query text or history, candidate URL list, retry list, or HTTP status matrix for this observation.

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
- **THEN** ProfileSchema SHALL require an ISO probe timestamp, HTTP(S) result URL, and `fetch_outcome: success`
- **AND** missing or contradictory available observations SHALL fail validation

#### Scenario: unavailable research access carries direct failure facts

- **WHEN** `research_access.status` is `unavailable`
- **THEN** ProfileSchema SHALL require an ISO probe timestamp, non-success fetch outcome, and non-empty reason
- **AND** a success claim in the unavailable branch SHALL fail validation

#### Scenario: bounded candidate metadata is internally consistent

- **WHEN** an available observation records `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`, or an unavailable no-candidate observation records `eligible_candidate_count: 0` without an ordinal
- **THEN** ProfileSchema SHALL accept the observation when its status-specific facts are otherwise valid
- **AND** it SHALL reject an ordinal without a positive count, an ordinal greater than the count, a count outside `0..3`, or an ordinal on a zero-count observation

#### Scenario: legacy observation remains readable without candidate metadata

- **WHEN** a legacy available or unavailable `research_access` observation has no candidate metadata fields
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** the current writer requirement SHALL NOT turn old bundle bytes into a migration prerequisite

#### Scenario: unprobed cannot claim success or probe metadata

- **WHEN** `research_access.status` is `unprobed` with timestamp, URL, outcome, reason, tool-surface, candidate-count, or candidate-ordinal fields
- **THEN** ProfileSchema SHALL fail validation rather than silently accepting contradictory fields

#### Scenario: legacy profile is unprobed rather than available

- **WHEN** an existing profile has no `research_access` field
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** HITL1 checks SHALL treat the capability as unprobed
