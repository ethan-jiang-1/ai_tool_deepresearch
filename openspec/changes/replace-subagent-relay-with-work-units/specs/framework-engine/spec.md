> req: FRE-001, FRE-004, FRE-005

## ADDED Requirements

### Requirement: operate-work-unit owns delegated execution attempts

The Framework Engine SHALL provide `operate-work-unit` as the only production delegated-work CLI. It SHALL implement `claim`, `submit`, `fail`, `timeout`, `abandon`, and `inspect` against an explicit bundle path. All configuration SHALL be passed through CLI flags, file arguments, or bundle state; environment variables SHALL NOT be required.

#### Scenario: delegated claim command creates envelope

- **WHEN** `operate-work-unit claim <bundle> --phase wave0 --count 2` runs against two eligible queue-front delegated items
- **THEN** the Engine SHALL create two work-unit envelopes
- **AND** the command output SHALL include both generated prompts and both `work_id` values

### Requirement: Work-unit index is Engine-owned allocation registry

The Framework Engine SHALL maintain `_work_units/_index.json` as the allocation and attempt-state registry. The index SHALL store wave/batch counters, kind registry, work-unit entries, lease/deadline fields, optional runtime refs, status counts, and inspect projection. Agents and sub-agents SHALL NOT edit `_work_units/_index.json`.

#### Scenario: index projection mismatch fails inspect

- **WHEN** `_work_units/_index.json` status counts disagree with the `work_units` records
- **THEN** `operate-work-unit inspect` SHALL fail closed
- **AND** it SHALL identify the mismatched projection fields

### Requirement: Work-unit transaction journal protects multi-file mutations

The Framework Engine SHALL acquire a bundle-scoped lock before mutating queue, index, work-unit files, or ledger. Multi-file work-unit mutations SHALL write `_work_units/_transactions/{tx_id}.json` before mutation and mark it committed only after all authority surfaces agree.

#### Scenario: uncommitted transaction blocks authority

- **WHEN** inspect finds an uncommitted work-unit transaction journal
- **THEN** inspect SHALL fail closed
- **AND** it SHALL not silently heal queue, index, or ledger state

### Requirement: Work-unit ID validation is deterministic

The Framework Engine SHALL validate `work_id` with `^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$` and SHALL reject IDs whose encoded fields disagree with directory path, manifest, index, result, or ledger fields.

#### Scenario: two-digit batch is invalid

- **WHEN** a work-unit path or result uses `wu-w0-b00-src-i0001`
- **THEN** Engine validation SHALL reject the ID
- **AND** `wu-w0-b000-src-i0001` SHALL pass format validation before cross-field checks

## MODIFIED Requirements

### Requirement: Engine code canonical location

Production work-unit Engine code SHALL live under `DPT_FRAMEWORK/engine/` and production CLI entrypoints SHALL live under `DPT_FRAMEWORK/cli/`. Runtime bundle state SHALL live in the active bundle under `rb_queue.json`, `rb_output_declarations.jsonl`, and `_work_units/`; `DPT_FRAMEWORK/` SHALL remain reusable framework assets, not run state.

#### Scenario: work-unit state is written to bundle

- **WHEN** `operate-work-unit claim` runs against a bundle
- **THEN** work-unit envelope files SHALL be written under the bundle `_work_units/`
- **AND** no run-specific state SHALL be written under `DPT_FRAMEWORK/`

### Requirement: Queue manager internal module and regression layout

Queue Manager internals SHALL be updated from single-current-item delegated completion to queue v2 and work-unit binding helpers while preserving the public framework boundary for non-delegated queue operations. Regression coverage SHALL move from non-work-unit delegated completion to work-unit claim/submit state transitions.

#### Scenario: queue manager no longer completes delegated relay results

- **WHEN** Queue Manager receives a delegated completion request that lacks a work-unit submit transaction
- **THEN** it SHALL reject the request
- **AND** it SHALL not append output declarations

## REMOVED Requirements

### Requirement: Subagent relay internal module layout

**Reason**: Relay internals are no longer a production mechanism after this replacement.

**Migration**: Implement work-unit engine modules and remove active production imports, tests, docs, and CLI demand for relay module behavior.

#### Scenario: relay internals are not production imports

- **WHEN** production framework code dispatches delegated work
- **THEN** it SHALL import work-unit helpers
- **AND** it SHALL NOT depend on relay staging/commit helpers as the production path
