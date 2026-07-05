## ADDED Requirements

> req: WNC-011

### Requirement: Lifecycle node wording uses canonical phase-boundary terms

Lifecycle phase nodes and shared workflow Markdown SHALL use the canonical phase-boundary terminology when describing gate pass behavior.

On a deterministic gate pass, lifecycle wording SHALL preserve this order and meaning:

1. the gate CLI passes the current phase and emits structured stdout with `check.next`;
2. the Phase Agent consumes `check.next` through `enter-phase` or another accepted loader/check path;
3. the loader writes a route-bound `load_complete` entry witness for the target Markdown control surface;
4. `advance-status --to <source_gate_enum>` synchronizes the just-passed source gate in `rb_status.json`; and
5. the target phase's work remains unproven until the target phase performs its own work and passes its own gate.

Lifecycle Markdown SHALL NOT describe `advance-status` as entering/loading/executing the next phase, SHALL NOT describe `enter-phase` or `load_complete` as target work completion, and SHALL NOT call local artifact creation or queue drain a phase boundary unless the current gate has passed and emitted the accepted `check.next`.

#### Scenario: On Gate Pass wording preserves boundary order

- **WHEN** a lifecycle phase node documents deterministic Gate Pass behavior
- **THEN** it SHALL tell the Agent to read gate stdout, consume `check.next` through `enter-phase`, synchronize source status with `advance-status`, and continue from the rendered next node
- **AND** the wording SHALL distinguish source-gate status synchronization from target-phase work completion

#### Scenario: Static validation catches overclaiming

- **WHEN** a lifecycle node or shared workflow Markdown says that `advance-status` enters the next phase or that `enter-phase` completes the target phase
- **THEN** the docs validator or regression SHALL fail
- **AND** the failure SHALL identify the file and boundary term that overclaims
