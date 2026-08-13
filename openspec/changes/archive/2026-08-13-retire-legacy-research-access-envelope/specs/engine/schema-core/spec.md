## MODIFIED Requirements

### Requirement: Six Zod contracts

The system SHALL retain Zod contracts for bundle control file validation,
including the Queue contract's queue-v2 demand and work-unit distinctions. The
Profile contract SHALL keep `research_access` optional: new bundle templates
initialize it as `status: unprobed`, while a profile without the field remains
schema-valid outside a checkpoint that explicitly requires a completed
observation.

`unprobed` SHALL contain only `status: unprobed`. A completed current observation
SHALL be strict and status-discriminated, require an ISO 8601 `probed_at`, and
carry one complete statically bounded direct-sample observation for every
controller-declared sample. Each sample entry SHALL contain its fixed sample ID,
matching source group, and one terminal outcome; only a `content` outcome MAY
carry one truthful executor-neutral surface category. No field may carry a URL,
body, header, credential, query, candidate, response status, retry/attempt
history, provider identity, source-class envelope, or access-boundary field.

The current writer SHALL set `status: available` only when at least one
non-diagnostic core sample returned real content. It SHALL set `status:
unavailable` when no core sample returned real content. An unavailable current
observation SHALL also retain one non-empty direct summary reason. A current
observation may include a transport-inconclusive or round-budget-not-attempted
sample terminal outcome without claiming a network owner. The profile schema
validates the declared data shape and the status/content invariant; it SHALL NOT
infer source relevance, choose a repair, decide whether the user may proceed, or
predict later network availability.

The whole-probe no-request branch SHALL be `status: unavailable`, carry the
required direct summary reason, contain every declared sample exactly once with
`outcome: not_attempted`, and carry no retrieval surface. It SHALL not be used for
a sample that was skipped after the round began; that sample uses
`round_budget_not_attempted`. Neither no-attempt branch asserts that its sample is
unreachable or establishes an `access_boundary`.

An earlier URL/fetch/search/candidate/source-class/access-boundary research-access
envelope SHALL fail ProfileSchema as an unsupported current shape. The schema
SHALL NOT default, convert, migrate, upgrade, retain a discriminator for, or infer
a direct-sample observation from that envelope.

The Profile contract SHALL NOT store a derived gate verdict, response body, query
text or history, candidate URL list, retry list, or HTTP status matrix for this
observation. The statically bounded direct-sample set SHALL NOT become such a
matrix: it SHALL retain at most one closed-enumeration result per declared sample
and SHALL NOT retain per-attempt records, response bodies, HTTP status codes,
query text, or candidate URL lists for any sample.

#### Scenario: Queue contract validates queue v2

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** queue demand items SHALL validate with `queue_item_id`
- **AND** delegated in-flight entries SHALL bind to Engine-allocated `work_id` values

#### Scenario: queue demand identity is distinct from work-unit identity

- **WHEN** a queue demand item uses `work_id` as its demand identifier
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

#### Scenario: Current observation records both source groups

- **WHEN** a current HITL1 probe completes a round
- **THEN** ProfileSchema SHALL require exactly one terminal entry for every declared
  China and overseas sample and reject duplicate, missing, or group-mismatched IDs
- **AND** it SHALL reject a current observation that contains a URL, candidate list,
  response body, retry history, provider-specific field, source-class envelope, or
  access-boundary field

#### Scenario: Current availability follows real content

- **WHEN** a complete current observation has at least one core `content` sample
- **THEN** `status: available` SHALL be valid and `status: unavailable` SHALL fail
- **WHEN** no core sample has real content
- **THEN** `status: unavailable` with a non-empty direct summary reason SHALL be
  valid and `status: available` SHALL fail

#### Scenario: Legacy observations remain readable

- **WHEN** `research_access` uses an earlier URL, fetch, search, candidate,
  source-class, or access-boundary form
- **THEN** ProfileSchema SHALL reject the profile as an unsupported current shape
- **AND** it SHALL not default, migrate, normalize, or infer the current
  direct-sample observation

#### Scenario: source-class envelope stays statically bounded

- **WHEN** a retired observation records any source-class reachability envelope
- **THEN** ProfileSchema SHALL reject the whole observation rather than retain a
  source-class parser or accept a partial legacy shape
- **AND** it SHALL not infer a current direct-sample result from a class entry,
  its status, or its reason text

#### Scenario: access boundary is paired, closed, and status-consistent

- **WHEN** a retired observation records a boundary-location, boundary-extent, or
  paired `access_boundary` value
- **THEN** ProfileSchema SHALL reject the whole observation regardless of whether
  the historical values are paired, closed, or status-consistent
- **AND** it SHALL not retain, default, or project a current owner from those
  values

#### Scenario: unclassified legacy observation remains valid

- **WHEN** a retired available or unavailable observation omits
  `access_boundary` and otherwise carries its historical required facts
- **THEN** ProfileSchema SHALL reject the whole observation
- **AND** it SHALL not infer, default, normalize, or classify a current direct
  observation from the reason text

#### Scenario: bounded candidate metadata is internally consistent

- **WHEN** a retired observation records any candidate count, ordinal, URL, or
  other candidate metadata, including internally consistent values
- **THEN** ProfileSchema SHALL reject the whole observation
- **AND** it SHALL not retain a candidate metadata validator or infer a current
  direct-sample observation

#### Scenario: legacy profile is unprobed rather than available

- **WHEN** a profile has no `research_access` field
- **THEN** ProfileSchema SHALL accept the profile
- **AND** a checkpoint that requires a completed observation SHALL retain its own
  recorded-observation failure boundary

#### Scenario: Unprobed cannot claim probe material

- **WHEN** `research_access.status` is `unprobed` with a timestamp, direct-sample
  entries, old URL/fetch/candidate metadata, reason, surface, or boundary fields
- **THEN** ProfileSchema SHALL fail rather than silently accepting contradictory data

#### Scenario: No-request relay fact is distinct from a spent round budget

- **WHEN** the isolated probe cannot begin any direct page request because its relay
  failed or the current executor has no already-permitted direct surface
- **THEN** ProfileSchema SHALL accept only the complete unavailable whole-probe
  `not_attempted` form with a direct summary reason
- **AND** it SHALL reject using `round_budget_not_attempted` as a relay substitute,
  or mixing the whole-probe no-request outcome with attempted sample results
