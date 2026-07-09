> req: GSK-011

## ADDED Requirements

### Requirement: Active gate rule audit SHALL be executable

The project SHALL include a static audit test or validator for active gate definitions. The audit SHALL read active `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json` files and verify that every active rule id has a known `check` implementation in the relevant gate CLI or shared helper.

The audit SHALL fail on unknown check names, unsupported delegated-provenance check names, or rule shapes that cannot be routed to a known implementation. It SHALL also require an artifact-contract inventory source for each active rule id, either in the current change design/apply evidence or in a maintained framework audit mapping.

The artifact-contract inventory SHALL be rule-id granular even when design prose groups related rules. For each active rule id, the inventory SHALL identify the runtime surface category, producer instruction surface when an Agent-produced artifact is involved, checker implementation route, diagnostic/advice surface when the rule can fail, pass/fail classification, and regression/static guard.

Archived OpenSpec changes and historical gate definitions outside the active framework SHALL NOT be included in this audit.

#### Scenario: every active rule has known implementation

- **WHEN** the static gate audit scans active gate definitions
- **THEN** every rule id SHALL map to a known CLI dispatch or shared helper
- **AND** the audit SHALL pass only when no unknown active check names remain

#### Scenario: unsupported check name fails audit

- **WHEN** an active gate definition contains `check: "removed_check_name"`
- **THEN** the audit SHALL fail
- **AND** diagnostics SHALL name the gate file, rule id, and check value

#### Scenario: artifact contract inventory is required

- **WHEN** an active gate rule id exists
- **THEN** the audit or companion test SHALL be able to identify its artifact contract category
- **AND** missing inventory SHALL fail with a diagnostic that asks for design/apply evidence or maintained mapping update

#### Scenario: closure inventory is required for blocking rules

- **WHEN** an active rule contributes to gate pass/fail
- **THEN** the audit or companion mapping SHALL identify producer instruction, runtime authority, checker implementation route, diagnostic/advice surface, pass/fail classification, and test guard
- **AND** missing closure inventory SHALL fail unless the row records an explicit non-Agent-produced exemption

#### Scenario: grouped design rows expand to rule-id inventory

- **WHEN** design evidence groups several active rule ids under one shared helper or artifact shape
- **THEN** apply evidence or maintained audit mapping SHALL still enumerate each active rule id
- **AND** the static audit SHALL fail if a rule id is missing producer/diagnostic/pass-fail inventory without an explicit non-Agent-produced exemption

#### Scenario: archives are not audited

- **WHEN** archived OpenSpec changes contain stale gate wording
- **THEN** this active gate audit SHALL ignore those archives
- **AND** it SHALL only validate current framework gate definitions and current helper/CLI implementation
