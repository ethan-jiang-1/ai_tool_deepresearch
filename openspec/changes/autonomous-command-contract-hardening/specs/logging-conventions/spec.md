## ADDED Requirements

> req: LOC-011

### Requirement: log-event always-zero behavior is a documented exit-code exception

`log-event.mjs` SHALL remain a documented diagnostic/logging exception to the framework CLI exit-code convention.

The command MAY exit `0` even when the requested diagnostic log or trace write cannot be completed, because logging failure must not block Agent flow unless a separate accepted contract makes a specific trace write load-bearing. This always-zero behavior SHALL be visible in the top-level command contract and CLI implementer docs so Agent callers do not infer that every non-gate utility reports failures through the same numeric exit behavior.

This exception SHALL NOT authorize hand-writing trace, faking load-bearing gate evidence, or ignoring accepted trace requirements. Load-bearing gate attempts, handoff witnesses, and status synchronization remain governed by their own accepted specs.

#### Scenario: Logging failure does not block Agent flow

- **WHEN** `log-event.mjs` cannot append a diagnostic log line
- **THEN** it MAY still exit `0`
- **AND** the failure SHALL NOT be treated as proof that a load-bearing trace event was written

#### Scenario: Exception inventory names log-event

- **WHEN** the Agent reads the framework CLI exit-code convention
- **THEN** it SHALL see `log-event.mjs` listed as an always-zero diagnostic exception
- **AND** the docs SHALL distinguish that exception from gate, handoff, and status synchronization evidence
