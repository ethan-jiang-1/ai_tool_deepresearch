# wave1-intake (delta)

> req: WAI-013

## ADDED Requirements

### Requirement: Wave1 topic deepening submit SHALL require non-empty structured source claims or explicit degraded capture

A `wave1_topic_deepening` work-unit result SHALL be rejected by `operate-work-unit submit` when its structured `source_claims[]` and `accepted_source_urls[]` are both empty and no explicit degraded-capture record is declared. This fail-fast SHALL run before ledger append, matching the existing contract that Wave1 results expose `source_claims[]` for gate coverage comparison (WAI-004).

The claim floor SHALL be scoped by the work-unit output contract: it SHALL apply only to kinds whose output contract declares `source_claims.allowed === true` (currently `wave1_topic_deepening`). Kinds without a `source_claims` contract (e.g. `wave0_source_intake`, `wave2_targeted_evidence`) SHALL keep the existing empty-set pass-through and SHALL NOT be rejected for missing claims.

The submit-time claim check SHALL treat a result as having claims when either `source_claims[]` is non-empty or `accepted_source_urls[]` is non-empty. It SHALL treat a result as degraded when it records an explicit degraded-capture/fetch-failure for the topic. A result with neither SHALL NOT reach the ledger.

#### Scenario: Zero-claim Wave1 result is rejected at submit

- **WHEN** a `wave1_topic_deepening` result declares `source_claims: []` and `accepted_source_urls: []` and no degraded-capture record
- **THEN** `operate-work-unit submit` SHALL reject the result with a diagnostic naming the missing claims requirement
- **AND** the ledger row SHALL NOT be appended
- **AND** inline backfill SHALL NOT run for that queue demand

#### Scenario: Result with claims passes claim validation

- **WHEN** a `wave1_topic_deepening` result declares one or more `source_claims[]` entries or `accepted_source_urls[]` entries
- **THEN** submit SHALL proceed to normal cache-trail, schema, and binding validation
- **AND** the remaining coverage checks SHALL apply as before

#### Scenario: Explicit degraded capture satisfies the claim floor

- **WHEN** a `wave1_topic_deepening` result declares an explicit degraded-capture/fetch-failure reason for the topic instead of source claims
- **THEN** submit SHALL accept the degraded declaration as satisfying the non-empty claim requirement
- **AND** the result SHALL NOT present that topic as fully fetched content
