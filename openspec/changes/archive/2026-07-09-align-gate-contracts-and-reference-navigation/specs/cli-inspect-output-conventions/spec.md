> req: IOC-005

## ADDED Requirements

### Requirement: Inspect output SHALL classify blocking, advisory, and diagnostic-only findings accurately

Inspect CLIs and shared inspect helpers SHALL classify findings according to the command result they affect:

- `blocking`: contributes to `check.passed: false` for the current command or names a gate failure condition.
- `advisory`: does not fail the current command but recommends repair or follow-up.
- `diagnostic-only`: cannot by itself establish or revoke gate coverage and does not contribute to current command failure.

A finding SHALL NOT be labeled `diagnosticOnly: true` or described as diagnostic-only when the CLI counts it toward `check.passed: false`. Gate and inspect output MAY still explain that a return map does not create evidence authority, but that wording SHALL be separate from whether the current navigation check is blocking.

For blocking deterministic contract findings, inspect output SHALL also be self-sufficient enough for repair: it SHALL name the failing artifact/ref/field or rule, the expected deterministic shape or canonical value, and the nearest repair surface. Inspect output SHALL NOT force the Agent to read Engine helper source to discover why the command failed.

Inspect summary fields SHALL not contradict the command result. If return-map findings contribute to `checks_failed` or `check.passed: false`, the output SHALL NOT include a summary flag such as `return_map_diagnostic_only: true` for those findings.

#### Scenario: failed inspect command does not call its blocker diagnostic-only

- **WHEN** `inspect-wave1-output.mjs` fails because an evidence-bearing seed-topic return map has no concrete existing `reference/*.md`
- **THEN** the output SHALL classify that finding as blocking for the inspect command
- **AND** it SHALL NOT label that finding diagnostic-only
- **AND** its summary metadata SHALL NOT claim return-map findings are diagnostic-only

#### Scenario: advisory map-shape issue remains advisory

- **WHEN** a return-map issue does not affect the current command pass/fail
- **THEN** inspect output MAY classify it as advisory or diagnostic-only
- **AND** it SHALL explain that submitted ledgers and gate checks remain evidence authority

#### Scenario: gate output names blocking status

- **WHEN** a gate fails because a return-map or reference-navigation rule is configured as blocking
- **THEN** gate output SHALL name the issue as blocking
- **AND** advice SHALL direct the Agent to the concrete artifact/ref repair path

#### Scenario: blocking inspect finding includes repair coordinates

- **WHEN** an inspect command fails because a deterministic output contract is not satisfied
- **THEN** the finding SHALL name the failing bundle-relative surface and expected shape
- **AND** the advice SHALL name the nearest repair surface, such as a seed-topic return-map entry, work-unit result declaration, depth-review ref, or concrete `reference/*.md` file
