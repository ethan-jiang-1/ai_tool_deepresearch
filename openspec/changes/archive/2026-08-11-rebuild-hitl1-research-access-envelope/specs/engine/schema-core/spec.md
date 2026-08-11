# engine/schema-core (delta)

## MODIFIED Requirements

### Requirement: Six Zod contracts

The system SHALL provide Zod contracts for bundle control file validation. The Queue contract SHALL validate queue v2 `rb_queue.json` with queue demand items keyed by `queue_item_id`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`. Work-unit attempt state SHALL be validated through work-unit index, manifest, result, receipt, and ledger schemas rather than queue demand item schema.

The Profile contract SHALL support an optional legacy-compatible `research_access` observation. New bundle templates SHALL initialize it with `status: unprobed`. The observation SHALL record what research access the run currently has, not the transcript of one probe attempt. It SHALL use strict status-discriminated branches and validate only direct recorded facts:

- `unprobed` SHALL contain only `status: unprobed` and SHALL NOT carry URL, fetch success, timestamp, reason, tool-surface, candidate-count, candidate-ordinal, or source-class claims;
- `available` SHALL require an ISO 8601 `probed_at`, an HTTP(S) `result_url`, and `fetch_outcome: success`; optional trim-non-empty `search_surface` and `fetch_surface` strings MAY record audit labels;
- `unavailable` SHALL require an ISO 8601 `probed_at`, `fetch_outcome: failed | blocked | not_attempted`, and a trim-non-empty `reason`; optional `result_url` SHALL be HTTP(S) when present, and optional `search_surface` / `fetch_surface` SHALL be trim-non-empty when present.

The `available` and `unavailable` branches SHALL support a statically bounded source-class envelope describing the run's current reachability. The envelope SHALL be bounded by a statically declared source-class set and SHALL NOT grow with attempt count:

- each entry SHALL identify one declared source class and one closed-enumeration reachability result for that class; the current HITL1 writer SHALL emit one entry for every currently declared source class and mark every class after an available first-success as `not_attempted`;
- the envelope SHALL contain at most one entry per declared source class, and SHALL NOT contain an entry for an undeclared class;
- an `available` observation SHALL record at least one reachable class, and its `result_url` SHALL be the retained final considered URL of a reachable class;
- an `unavailable` observation SHALL record no reachable class; and
- the envelope SHALL be optional so that legacy observations recorded before this contract remain readable.

The `available` and `unavailable` branches SHALL support one optional `access_boundary` object recording the boundary that owns the inaccessible part and the extent of that boundary:

- the boundary-location value SHALL be one closed enumeration identifying which boundary owns the failure;
- the boundary-extent value SHALL be one closed enumeration distinguishing a boundary that applies to every declared source class from one that applies only to a subset;
- both values SHALL be present together or absent together;
- an `available` observation carrying `access_boundary` SHALL use `class_scoped` extent and record at least one reachable and one unreachable declared source class;
- an `unavailable` observation carrying `access_boundary` SHALL use `universal` extent and SHALL record no reachable source class; and
- either branch without this classification SHALL remain schema-valid and SHALL be treated as explicitly unclassified rather than as any particular boundary.

The Profile contract SHALL validate the shape and closed enumerations of the envelope and classification. It SHALL NOT select the owning boundary, derive a repair route, or decide admission.

The `available` and `unavailable` branches MAY carry the legacy-compatible bounded candidate metadata pair:

- `eligible_candidate_count` SHALL be an integer from `0` through `3`, representing the number of syntactically eligible search candidates actually considered by the completed probe;
- when `eligible_candidate_count` is greater than zero, `final_candidate_ordinal` SHALL be an integer from `1` through `eligible_candidate_count` and identify the final considered candidate, including a branch that stops before fetch because no legal surface is available;
- when `eligible_candidate_count` is zero, `final_candidate_ordinal` SHALL be absent; and
- both fields MAY be absent together for legacy profiles, but the current HITL1 writer SHALL record the internally consistent count/ordinal shape for every completed probe.

When candidate metadata is present on `available`, its count SHALL be at least `1` and its ordinal SHALL be present. A current observation with positive candidate count SHALL retain the final considered HTTP(S) `result_url`; `unavailable` MAY record count `0` with no ordinal and no URL for a search that produced no considered candidate, or a positive count with its final ordinal and URL for an attempted or no-legal-path branch. Legacy observations without the metadata pair remain readable under the preceding compatibility rule.

Missing `research_access` in a legacy profile SHALL remain schema-readable and SHALL be treated by HITL1 checks as unprobed, not as available. The Profile contract SHALL NOT store a derived gate verdict, response body, query text or history, candidate URL list, retry list, or HTTP status matrix for this observation. The statically bounded source-class envelope SHALL NOT become such a matrix: it SHALL retain at most one closed-enumeration result per declared class and SHALL NOT retain per-attempt records, response bodies, HTTP status codes, query text, or candidate URL lists for any class.

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

#### Scenario: source-class envelope stays statically bounded

- **WHEN** an observation records unique closed-enumeration reachability results for declared source classes
- **THEN** ProfileSchema SHALL accept it when its status-specific facts are otherwise valid
- **AND** it SHALL reject a duplicate class entry, an undeclared class entry, an available observation with no reachable class, an unavailable observation with a reachable class, and any per-class attempt list, response body, HTTP status code, query text, or candidate URL list

#### Scenario: access boundary is paired, closed, and status-consistent

- **WHEN** an available or unavailable observation records a boundary-location and boundary-extent value
- **THEN** ProfileSchema SHALL accept only values inside the two closed enumerations
- **AND** it SHALL reject a boundary location without its extent, an extent without its location, `available` with universal extent or without both reachable and unreachable classes, `unavailable` with class-scoped extent, and either value on unprobed observation

#### Scenario: unclassified observation remains valid

- **WHEN** an available or unavailable observation has no `access_boundary` value (and an unavailable branch carries its required non-empty reason)
- **THEN** ProfileSchema SHALL accept the observation
- **AND** it SHALL NOT infer, default, or normalize a boundary value from the reason text

#### Scenario: bounded candidate metadata is internally consistent

- **WHEN** an available observation records `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`, or an unavailable no-candidate observation records `eligible_candidate_count: 0` without an ordinal
- **THEN** ProfileSchema SHALL accept the observation when its status-specific facts are otherwise valid
- **AND** it SHALL reject an ordinal without a positive count, an ordinal greater than the count, a count outside `0..3`, an ordinal on a zero-count observation, an available observation with zero candidate count, or a metadata-bearing positive-count observation without its final `result_url`

#### Scenario: legacy observation remains readable without candidate metadata

- **WHEN** a legacy available or unavailable `research_access` observation has no candidate metadata fields
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** the current writer requirement SHALL NOT turn old bundle bytes into a migration prerequisite

#### Scenario: legacy observation remains readable without envelope or access boundary

- **WHEN** a legacy available or unavailable `research_access` observation has no source-class envelope and no `access_boundary`
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** the observation SHALL be treated as explicitly unclassified rather than migrated, defaulted, or reinterpreted into any boundary

#### Scenario: unprobed cannot claim success or probe metadata

- **WHEN** `research_access.status` is `unprobed` with timestamp, URL, outcome, reason, tool-surface, candidate-count, candidate-ordinal, source-class envelope, or `access_boundary` fields
- **THEN** ProfileSchema SHALL fail validation rather than silently accepting contradictory fields

#### Scenario: legacy profile is unprobed rather than available

- **WHEN** an existing profile has no `research_access` field
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** HITL1 checks SHALL treat the capability as unprobed
