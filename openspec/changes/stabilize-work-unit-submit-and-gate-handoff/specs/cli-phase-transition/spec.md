> req: CPT-008

## ADDED Requirements

### Requirement: Phase transition tooling SHALL fail closed on failed or missing source-gate handoffs

Phase transition tooling SHALL NOT allow failed gates, missing handoff witnesses, manual status edits, artifact presence, or `current_node` alone to authorize downstream lifecycle state. `advance-status` SHALL continue to synchronize only the just-passed source gate after a trace-durable clean or degraded handoff has been consumed through a route-bound entry witness. The tooling SHALL NOT provide a broad force option that writes downstream `current_gate`, `next_gate`, or terminal state without the accepted handoff evidence chain.

The accepted evidence chain for covered lifecycle handoff remains:

`gate_attempt(passed=true,next=<target>)` -> later route-bound `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)` -> `advance-status --to <source_gate_enum>` -> matching `phase_transition`.

Degraded passes SHALL be accepted only when they satisfy the existing degraded handoff contract: `passed: true`, `degraded: true`, durable non-null `next`, route-bound entry witness, and no runtime-truth blocker.

#### Scenario: failed source gate cannot authorize downstream status

- **WHEN** the latest gate attempt for a source lifecycle phase failed with `passed: false` or `next: null`
- **AND** `advance-status` is invoked for that source gate or a downstream gate
- **THEN** `advance-status` SHALL exit non-zero with structured diagnostics
- **AND** it SHALL NOT mutate `rb_status.json`
- **AND** it SHALL NOT append `phase_transition`

#### Scenario: missing route-bound entry witness blocks status sync

- **WHEN** a source gate has `gate_attempt(passed=true,next=<target>)`
- **AND** `rb_trace.jsonl` lacks a later route-bound `load_complete` for that target bound to the same attempt
- **THEN** `advance-status --to <source_gate_enum>` SHALL fail closed
- **AND** advice SHALL name the required `enter-phase --bundle <bundle> --node <target>` path

#### Scenario: manual downstream status is diagnostic only

- **WHEN** `rb_status.json` claims a downstream status window that cannot be derived from the latest passed source gate, route-bound entry witness, and matching `phase_transition`
- **THEN** phase status audit SHALL report `status_drift`, `manual_bypass_suspected`, or `failed_gate_downstream_status`
- **AND** audit SHALL NOT repair the file or treat the edited status as authority

#### Scenario: premature final lifecycle state is rejected

- **WHEN** `rb_status.json` claims terminal or final-adjacent state
- **AND** trace lacks the required HITL2/readiness source-gate passes and readiness-to-final route-bound entry witness
- **THEN** transition tooling SHALL report missing lifecycle evidence
- **AND** it SHALL NOT treat final artifacts or `current_node: "phases/phase-final.md"` as a substitute for the missing handoff

#### Scenario: degraded source pass remains legal only with full route evidence

- **WHEN** a source gate emitted a degraded pass with `passed: true`, `degraded: true`, and non-null `next`
- **AND** a later route-bound `load_complete` consumes that exact attempt
- **AND** runtime-truth preconditions are satisfied
- **THEN** `advance-status --to <source_gate_enum>` MAY synchronize the normal source-gate status window
- **AND** diagnostics SHALL preserve degraded context rather than presenting it as a clean quality pass

#### Scenario: broad force advance is unavailable

- **WHEN** a caller attempts to bypass missing source-gate or route-bound entry evidence through a force-style status transition
- **THEN** transition tooling SHALL reject the invocation or treat it as unsupported
- **AND** no downstream lifecycle status SHALL be written by that bypass path
