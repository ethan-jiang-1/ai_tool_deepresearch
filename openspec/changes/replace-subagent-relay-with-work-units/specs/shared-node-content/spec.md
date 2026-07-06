> req: SHC-002, SHC-003

## MODIFIED Requirements

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL provide Agent-facing summaries of gate purpose and check direction. Content SHALL mark itself `authority: generated-summary` and SHALL state that gate definition JSON and gate CLI output are deterministic rule authority. Wave gate summaries SHALL describe delegated source/evidence coverage as work-unit ledger coverage plus cross-checks.

#### Scenario: Agent reads gate summary before running gate

- **WHEN** an Agent prepares to run a wave gate
- **THEN** the summary SHALL explain that delegated output coverage is based on submitted work-unit rows
- **AND** the body SHALL state that deterministic truth comes from gate CLI output

### Requirement: Shared schemas content matches current executable surface

Shared schema guidance SHALL describe current executable surfaces for profile, status, queue v2, plan, trace, gate definitions, work-unit manifests/results/receipts, output declarations, cache trails, and wave artifacts. Delegated Wave1/Wave2 schema examples SHALL describe work-unit-backed evidence/reference outputs.

#### Scenario: shared schemas name work-unit-backed outputs

- **WHEN** shared schema guidance lists delegated evidence artifacts
- **THEN** those artifacts SHALL be described as covered by submitted work-unit declarations
