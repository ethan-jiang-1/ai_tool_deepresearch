## ADDED Requirements

> req: GSK-013

### Requirement: Gate degradation eligibility SHALL be schema-parsed, default-false policy metadata

The common Gate rule schema SHALL expose parsed `degradation_eligible: boolean`, defaulting to `false` when absent in an existing definition. Only Wave0/Wave1/Wave2 formal adapters SHALL consume this field. A formal Wave degraded handoff SHALL be considered only when every unmasked blocking finding has a stable `rule_id` that exactly matches a parsed definition-owned `required_floor` rule whose field is `true`; checker-owned, unmatched, and non-`required_floor` roots SHALL be ineligible. `hints[]`, `inspect[]`, advice text, `finding.id`, suffix stripping, or attempt count SHALL NOT create eligibility or change a failing authority root into a degraded pass. Formal Gate alone retains lifecycle, durability, routing, and handoff authority.

#### Scenario: missing eligibility metadata fails closed

- **WHEN** an active Wave rule has no explicit eligible-degradation metadata
- **THEN** the shared projection SHALL treat that rule as ineligible
- **AND** repeated failure SHALL remain a formal Gate failure unless every existing handoff condition independently permits it

#### Scenario: checker or formal root fails closed even beside an eligible floor

- **WHEN** a lifecycle, trace, routing, configuration, direct-output, or checker-owned blocking finding appears with an otherwise eligible floor
- **THEN** a degraded handoff SHALL not be emitted
- **AND** the finding SHALL retain its normal failed owner or missing-contract boundary

#### Scenario: topic-scoped identity is not recovered heuristically

- **WHEN** a per-topic finding has `id` containing a topic suffix and its stable `rule_id` names the parsed rule
- **THEN** eligibility SHALL use that exact `rule_id`
- **AND** the adapter SHALL NOT split, trim, or otherwise infer eligibility from `id`

#### Scenario: hint output cannot authorize degradation

- **WHEN** a finding produces a root-first hint or fatigue diagnostic
- **THEN** the output SHALL retain the finding's repair coordinate and current verdict
- **AND** it SHALL NOT create a handoff, partial pass, mutation, or new retry path
