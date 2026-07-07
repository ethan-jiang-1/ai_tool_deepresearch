# experiment-ref-integrity Specification

> req: EXR-001, EXR-002, EXR-003, EXR-004, EXR-005, EXR-006

## Purpose

Define the engine-boundary experiment suite that guards Agent/Engine provenance integrity across delegated completion, ledger-driven gate input discovery, trace single-sink behavior, and the real Sub-agent boundary path.
## Requirements
### Requirement: case-401 SHALL verify positive Agent-Engine boundary path

case-401 SHALL verify the positive work-unit Agent-Engine boundary path: queue demand is claimed as a work unit, sub-agent output is submitted by `work_id`, ledger row is written by the Engine, and gate coverage passes through work-unit provenance.

#### Scenario: positive boundary uses work-unit submit

- **WHEN** case-401 runs
- **THEN** its delegated completion SHALL use `operate-work-unit submit`

### Requirement: case-403 SHALL verify content_dedup via Engine-generated ledger

case-403 SHALL verify content checks through Engine-generated work-unit ledger rows and SHALL reject direct/orphan files without submitted coverage.

#### Scenario: content check uses submitted ledger

- **WHEN** duplicate content is present only in orphan files
- **THEN** the case SHALL not treat those files as accepted delegated coverage

### Requirement: case-404 SHALL verify queue boundary contract

case-404 SHALL verify queue v2 boundaries, including `queue_item_id` identity, `delegated_in_flight`, out-of-order submit, and the prohibition on delegated `operate-queue complete`.

#### Scenario: delegated operate-queue complete rejects

- **WHEN** case-404 attempts to complete an in-flight delegated queue item via `operate-queue complete`
- **THEN** the command SHALL fail closed

### Requirement: case-405 SHALL verify rb_trace.jsonl is the only trace sink

`experiments_playbook/exp_engine-boundary/case-405-light-trace-single-sink.md` SHALL exist. It SHALL be a light runtime guard that creates a disposable bundle, triggers current trace writing, and verifies that no trace JSONL exists outside bundle-root `rb_trace.jsonl`.

#### Scenario: Non-canonical trace sinks are absent

- **WHEN** case-405 triggers a trace event
- **THEN** the event SHALL appear in bundle-root `rb_trace.jsonl`
- **AND** no other trace JSONL SHALL exist in the bundle

### Requirement: case-406 SHALL verify real Sub-agent boundary path

case-406 SHALL verify a real sub-agent boundary through work-unit claim, work-unit task/beacon, lifecycle receipt, submit, ledger, and gate coverage. It SHALL use only the work-unit delegated CLI path.

#### Scenario: real sub-agent returns through submit

- **WHEN** the real sub-agent completes its assigned task
- **THEN** the return SHALL be accepted only through `operate-work-unit submit`

### Requirement: case-402 SHALL verify work-unit submit rejection matrix

case-402 SHALL be rewritten as a work-unit submit rejection matrix. It SHALL verify invalid submit is non-terminal, terminal attempt commands fail closed where appropriate, and late submit from terminal attempts is rejected.

#### Scenario: invalid submit leaves attempt claimed

- **WHEN** case-402 submits a result with a missing required output
- **THEN** the attempt SHALL remain `claimed`
- **AND** no ledger row SHALL be appended

