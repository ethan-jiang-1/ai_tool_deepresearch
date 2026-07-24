## ADDED Requirements

> req: GSK-013

### Requirement: Gate degradation eligibility SHALL be schema-parsed, default-false policy metadata

Wave rule eligibility for an existing degraded handoff SHALL be read only from the schema-parsed Gate definition and evaluated with the same structured findings that produce formal Gate output. Absent, malformed, or false metadata SHALL be ineligible. `hints[]`, `inspect[]`, advice text, or attempt count SHALL NOT create eligibility or change a failing authority root into a degraded pass. Formal Gate alone retains lifecycle, durability, routing, and handoff authority.

#### Scenario: missing eligibility metadata fails closed

- **WHEN** an active Wave rule has no explicit eligible-degradation metadata
- **THEN** the shared projection SHALL treat that rule as ineligible
- **AND** repeated failure SHALL remain a formal Gate failure unless every existing handoff condition independently permits it

#### Scenario: hint output cannot authorize degradation

- **WHEN** a finding produces a root-first hint or fatigue diagnostic
- **THEN** the output SHALL retain the finding's repair coordinate and current verdict
- **AND** it SHALL NOT create a handoff, partial pass, mutation, or new retry path
