> req: FRE-001, FRE-004, FRE-005

## MODIFIED Requirements

### Requirement: Engine code canonical location

Production work-unit Engine code SHALL live under `DPT_FRAMEWORK/engine/` and production CLI entrypoints SHALL live under `DPT_FRAMEWORK/cli/`. Runtime bundle state SHALL live in the active bundle under `rb_queue.json`, `rb_output_declarations.jsonl`, and `_work_units/`; `DPT_FRAMEWORK/` SHALL remain reusable framework assets, not run state.

Framework import and location guidance SHALL describe deterministic queue, gate, loader, and work-unit mechanisms. It SHALL NOT describe retired relay/slot engine modules as production mechanisms outside explicit negative, deprecated, legacy/backlog, or historical contexts.

#### Scenario: work-unit state is written to bundle

- **WHEN** `operate-work-unit claim` runs against a bundle
- **THEN** work-unit envelope files SHALL be written under the bundle `_work_units/`
- **AND** no run-specific state SHALL be written under `DPT_FRAMEWORK/`

#### Scenario: framework guidance avoids retired engine authority

- **WHEN** a current framework doc describes delegated production engine modules
- **THEN** it SHALL identify work-unit helpers and CLIs
- **AND** it SHALL NOT name a retired relay engine as production authority

### Requirement: Queue manager internal module and regression layout

Queue Manager internals SHALL be updated from single-current-item delegated completion to queue v2 and work-unit binding helpers while preserving the public framework boundary for non-delegated queue operations. Regression coverage SHALL move from non-work-unit delegated completion to work-unit claim/submit state transitions.

Regression coverage SHALL keep negative tests for retired relay/slot tokens only as rejection or hygiene cases. Such tests SHALL NOT read as production usage examples.

#### Scenario: queue manager rejects non-work-unit delegated completion

- **WHEN** Queue Manager receives a delegated completion request that lacks a work-unit submit transaction
- **THEN** it SHALL reject the request
- **AND** it SHALL not append output declarations

#### Scenario: old token regression is negative

- **WHEN** a regression test mentions a retired relay/slot token
- **THEN** the test SHALL assert rejection, hygiene failure, or diagnostic classification
- **AND** it SHALL NOT use that token as a successful delegated production path

### Requirement: operate-work-unit owns delegated execution attempts

The Framework Engine SHALL provide `operate-work-unit` as the only production delegated-work CLI. It SHALL implement `claim`, `submit`, `fail`, `timeout`, `abandon`, and `inspect` against an explicit bundle path. All configuration SHALL be passed through CLI flags, file arguments, or bundle state; environment variables SHALL NOT be required.

No current production CLI or documentation SHALL present a retired relay/slot command as delegated execution authority.

#### Scenario: delegated claim command creates envelope

- **WHEN** `operate-work-unit claim <bundle> --phase wave0 --count 2` runs against two eligible queue-front delegated items
- **THEN** the Engine SHALL create two work-unit envelopes
- **AND** the command output SHALL include both generated prompts and both `work_id` values

#### Scenario: delegated CLI surface is singular

- **WHEN** current command docs list delegated production operations
- **THEN** they SHALL list `operate-work-unit` lifecycle commands
- **AND** they SHALL NOT list retired relay/slot commands as production operations
