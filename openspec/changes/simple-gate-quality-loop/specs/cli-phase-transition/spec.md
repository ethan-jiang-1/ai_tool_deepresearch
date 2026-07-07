## MODIFIED Requirements

> req: CPT-003, CPT-004, CPT-007

### Requirement: Phase handoff tooling SHALL consume degraded gate attempts as explicit handoff witnesses

`enter-phase` and source-gate `advance-status` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness when it has the same route-binding fields required for a clean pass: source gate, source node, target node, `passed: true`, non-null `next`, and durable trace position.

The tooling SHALL preserve the degraded marker in diagnostics and SHALL NOT reinterpret degraded handoff as clean phase completion. A degraded handoff SHALL authorize loading the next Markdown control surface and synchronizing the source-gate status window, but SHALL NOT prove target-phase work completion and SHALL NOT erase degraded quality context.

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate attempt has `passed: true`, `degraded: true`, and `next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** `enter-phase` SHALL accept the route if all normal predecessor binding checks pass
- **AND** the resulting `load_complete` SHALL remain bound to the degraded source attempt index

#### Scenario: Advance status preserves degraded handoff context

- **WHEN** `advance-status --bundle <bundle> --to wave0_complete` synchronizes after a route-bound degraded wave0 pass and target-node load
- **THEN** it SHALL write the normal source-gate status window
- **AND** it SHALL NOT clear `rb_status.json.current_node`
- **AND** diagnostics or trace context SHALL preserve that the source handoff was degraded

#### Scenario: Degraded marker alone is insufficient

- **WHEN** trace contains a degraded-looking event without `passed: true`, without non-null `next`, without route-bound source metadata, or without durable latest-source status
- **THEN** `enter-phase` and `advance-status` SHALL reject it
- **AND** advice SHALL require rerunning the gate through the Engine path
