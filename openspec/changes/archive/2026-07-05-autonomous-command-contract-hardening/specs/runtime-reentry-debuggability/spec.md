## ADDED Requirements

> req: RRD-006

### Requirement: Reentry CLI exit-code semantics align with convention

Runtime reentry checking SHALL be documented as a non-gate CLI class that aligns with the framework CLI exit-code convention.

For `check-reentry.mjs`, structured stdout SHALL be the primary decision surface. Numeric exit code SHALL be interpreted as:

- `0` when the requested reentry target is consistent and passes;
- `1` when the target is known but runtime state or artifacts fail the reentry check; and
- `2` when the target, arguments, configuration, or caller request is invalid.

The command's code `2` semantics SHALL be documented as caller/configuration error, not gate-rule failure and not morale signal. Any drift between header docs and emitted codes SHALL be recorded in the CLI exception/drift inventory rather than hidden.

#### Scenario: Unknown reentry target is caller/config error

- **WHEN** `check-reentry.mjs --at <unknown>` is called
- **THEN** it SHALL return structured inspect/advice naming valid target examples
- **AND** numeric code `2` SHALL be documented as caller/config error

#### Scenario: Reentry drift remains structured detail

- **WHEN** a known target fails because runtime files drifted
- **THEN** stdout SHALL describe the drift severity and repair direction
- **AND** the numeric exit code SHALL remain a coarse branch signal only
