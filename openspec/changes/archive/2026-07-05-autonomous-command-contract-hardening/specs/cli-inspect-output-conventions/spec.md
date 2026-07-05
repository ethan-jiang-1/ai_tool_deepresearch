## ADDED Requirements

> req: IOC-004

### Requirement: Inspect CLIs are documented non-gate structured-output commands

Wave inspect CLIs SHALL be documented as non-gate structured-output commands under the framework CLI exit-code convention.

Inspect CLI stdout SHALL remain the actionable Agent decision surface and SHALL include the command's documented structured output, currently `{ check, inspect, advice }` without routing. Numeric exit code SHALL remain coarse:

- `0` when the inspected structure passes;
- `1` when the inspect check fails with actionable diagnostics; and
- `2` for caller invocation errors such as missing required flags.

Inspect CLIs SHALL NOT be documented as phase-routing gates, SHALL NOT emit or require `routing`, and SHALL NOT encode morale or continuation encouragement in exit code.

#### Scenario: Inspect failure is repairable output failure

- **WHEN** an inspect-wave CLI detects malformed or missing wave artifacts
- **THEN** it SHALL emit structured inspect/advice detail
- **AND** it SHALL use the documented non-gate failure class rather than phase-routing semantics

#### Scenario: Missing bundle is invocation error

- **WHEN** an inspect-wave CLI is called without the required bundle argument
- **THEN** it MAY use code `2` as caller invocation error
- **AND** the framework exit-code docs SHALL list this as a non-gate command class
