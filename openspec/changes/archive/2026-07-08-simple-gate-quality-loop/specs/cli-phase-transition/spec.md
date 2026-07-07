## MODIFIED Requirements

> req: CPT-003, CPT-004, CPT-007

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

`enter-phase` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness when it has the same route-binding fields required for a clean pass: source gate, source node, target node, `passed: true`, non-null `next`, and durable trace position.

The tooling SHALL preserve the degraded marker in diagnostics and SHALL NOT reinterpret degraded handoff as clean phase completion. A degraded handoff SHALL authorize loading the next Markdown control surface, but SHALL NOT prove target-phase work completion and SHALL NOT erase degraded quality context.

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate attempt has `passed: true`, `degraded: true`, and `next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** `enter-phase` SHALL accept the route if all normal predecessor binding checks pass
- **AND** the resulting `load_complete` SHALL remain bound to the degraded source attempt index

#### Scenario: Degraded marker alone is insufficient for entry

- **WHEN** trace contains a degraded-looking event without `passed: true`, without non-null `next`, without route-bound source metadata, or without durable latest-source status
- **THEN** `enter-phase` SHALL reject it
- **AND** advice SHALL require rerunning the gate through the Engine path

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs (CPT-004)

Source-gate `advance-status` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness only when all normal source-gate, target-node, and route-bound `load_complete` checks pass.

Successful status synchronization after a degraded handoff SHALL establish the normal source-gate status window for the target lifecycle phase. It SHALL preserve the degraded marker in diagnostics or trace context and SHALL NOT reinterpret degraded handoff as clean phase completion.

#### Scenario: Advance status preserves degraded handoff context

- **WHEN** `advance-status --bundle <bundle> --to wave0_complete` synchronizes after a route-bound degraded wave0 pass and target-node load
- **THEN** it SHALL write the normal source-gate status window
- **AND** it SHALL NOT clear `rb_status.json.current_node`
- **AND** diagnostics or trace context SHALL preserve that the source handoff was degraded

#### Scenario: Degraded marker alone is insufficient for status sync

- **WHEN** trace contains a degraded-looking event without `passed: true`, without non-null `next`, without route-bound source metadata, or without a matching later `load_complete`
- **THEN** `advance-status` SHALL reject it
- **AND** advice SHALL require rerunning the gate and consuming `check.next` through `enter-phase`

### Requirement: current_node records active loaded lifecycle control surface

`current_node` SHALL continue to record the most recently loaded lifecycle control surface after a clean or degraded source-gate handoff. It SHALL NOT prove target-phase work completion, SHALL NOT convert a degraded handoff into clean quality evidence, and SHALL NOT erase degraded quality context.

#### Scenario: Current node survives degraded source-gate status sync

- **WHEN** Wave0 emits a degraded pass with `check.next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` succeeds
- **AND** `advance-status --bundle <bundle> --to wave0_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_node: "phases/phase-wave1.md"`
- **AND** the source-gate status window SHALL be synchronized normally
- **AND** degraded quality context SHALL remain available to downstream diagnostics
