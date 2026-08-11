# engine/schema-core (delta)

## MODIFIED Requirements

### Requirement: Six domain enums defined as Zod schemas

The schema SHALL retain the current lifecycle and HITL/profile Zod enums, including
`CurrentGate` with `rerun_ready` between `hitl2_recorded` and `readiness_passed` and
the six-value `HITL2UserDecision` set. It SHALL additionally define closed
research-access vocabulary for `china` and `overseas` source groups, the declared
fixed sample IDs, compact sample terminal outcomes, and executor-neutral direct
retrieval surface categories. The existing source-class and candidate vocabulary
remains readable only for legacy observations; it SHALL NOT constrain the current
direct-sample writer.

The new access vocabulary SHALL distinguish real content, login-required,
challenge, HTTP-denied, rate-limited, transport-inconclusive, other failed,
whole-probe no-request, and round-budget-not-attempted terminal outcomes.
Whole-probe no-request means no declared page request began because the isolated
probe relay failed or the executor had no already-permitted direct retrieval surface;
it is distinct from a known individual sample that could not start before the round
budget. It SHALL not encode a provider, tool name, user language, VPN state,
IP/geography, HTTP status code, retry count, or network diagnosis.

#### Scenario: Direct-sample vocabulary is closed

- **WHEN** ProfileSchema receives a current direct-sample observation
- **THEN** it SHALL accept only declared source groups, sample IDs, outcome values,
  and surface categories
- **AND** it SHALL reject an undeclared sample, provider name, or status-code field

#### Scenario: Legacy vocabulary remains readable

- **WHEN** a legacy profile contains the previous source-class envelope or bounded
  candidate metadata
- **THEN** the existing legacy schema branch SHALL remain readable
- **AND** the current HITL1 writer SHALL not emit those search-derived fields

### Requirement: Six Zod contracts

The system SHALL retain Zod contracts for bundle control files, including the Queue
contract's queue-v2 demand and work-unit distinctions. The Profile contract SHALL
retain optional legacy-compatible `research_access`; new bundle templates initialize
it as `status: unprobed`, and a legacy profile without the field remains readable as
unprobed.

`unprobed` SHALL contain only `status: unprobed`. A completed current observation
SHALL be strict and status-discriminated, require an ISO 8601 `probed_at`, and carry
one complete statically bounded direct-sample observation for every controller
declared sample. Each sample entry SHALL contain its fixed sample ID, matching
source group, and one terminal outcome; only a `content` outcome MAY carry one
truthful executor-neutral surface category. No field may carry a URL, body, header,
credential, query, candidate, response status, retry/attempt history, or provider
identity.

The current writer SHALL set `status: available` only when at least one non-
diagnostic core sample returned real content. It SHALL set `status: unavailable`
when no core sample returned real content. An unavailable current observation SHALL
also retain one non-empty direct summary reason. A current observation may include a
transport-inconclusive or round-budget-not-attempted sample terminal outcome without
claiming a network owner. The profile schema validates the declared data shape and
the status/content invariant; it SHALL NOT infer source relevance, choose a repair,
decide whether the user may proceed, or predict later network availability.

The whole-probe no-request branch SHALL be `status: unavailable`, carry the required
direct summary reason, contain every declared sample exactly once with
`outcome: not_attempted`, and carry no retrieval surface. It SHALL not be used for a
sample that was skipped after the round began; that sample uses
`round_budget_not_attempted`. Neither no-attempt branch asserts that its sample is
unreachable or establishes an `access_boundary`.

Legacy available and unavailable observations with their HTTP(S) result URL,
search/fetch labels, candidate metadata, source-class envelope, and optional paired
access-boundary fields SHALL remain readable without migration. The current
direct-sample format and the legacy search-derived format SHALL NOT be mixed in one
observation. The optional legacy `access_boundary` continues to be paired and closed
when present; the new per-sample outcomes do not fabricate a boundary classification.

#### Scenario: Current observation records both source groups

- **WHEN** a current HITL1 probe completes a round
- **THEN** ProfileSchema SHALL require exactly one terminal entry for every declared
  China and overseas sample and reject duplicate, missing, or group-mismatched IDs
- **AND** it SHALL reject a current observation that contains a URL, candidate list,
  response body, retry history, or provider-specific field

#### Scenario: Current availability follows real content

- **WHEN** a complete current observation has at least one core `content` sample
- **THEN** `status: available` SHALL be valid and `status: unavailable` SHALL fail
- **WHEN** no core sample has real content
- **THEN** `status: unavailable` with a non-empty direct summary reason SHALL be
  valid and `status: available` SHALL fail

#### Scenario: Legacy observations remain readable

- **WHEN** an earlier `research_access` observation uses its existing URL,
  candidate, source-class, or paired-boundary form
- **THEN** ProfileSchema SHALL accept it under the legacy branch without defaulting
  it into the new direct-sample format
- **AND** the new writer requirement SHALL not rewrite existing bundle bytes

#### Scenario: Unprobed cannot claim probe material

- **WHEN** `research_access.status` is `unprobed` with a timestamp, direct-sample
  entries, legacy URL/candidate metadata, reason, surface, or boundary fields
- **THEN** ProfileSchema SHALL fail rather than silently accepting contradictory data

#### Scenario: No-request relay fact is distinct from a spent round budget

- **WHEN** the isolated probe cannot begin any direct page request because its relay
  failed or the current executor has no already-permitted direct surface
- **THEN** ProfileSchema SHALL accept only the complete unavailable whole-probe
  `not_attempted` form with a direct summary reason
- **AND** it SHALL reject using `round_budget_not_attempted` as a relay substitute,
  or mixing the whole-probe no-request outcome with attempted sample results
