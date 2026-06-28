# Trace Writer (delta)

> req: TRW-005

## ADDED Requirements

### Requirement: rb_trace.jsonl SHALL be the only trace sink

System SHALL use bundle root `rb_trace.jsonl` as the only trace JSONL sink for runtime audit events and command experiment verdict check events.

All trace writers SHALL append to `rb_trace.jsonl`:

- bundle creation `traceInit()`
- gate attempt writing
- `log-event.mjs`
- `advance-status.mjs`
- `queue-manager.mjs`
- `subagent-relay.mjs`
- `wff-playbook-utils.mjs` `recordCheck()` / `verdict()`

No code path SHALL write, read, require, or document another trace JSONL as trace truth. `inspect-bundle.mjs --timeline` SHALL read trace events only from `rb_trace.jsonl`; it MAY read `_logs/run.log` as process log context, but not as trace truth.

#### Scenario: All touched writers append to rb_trace.jsonl

- **WHEN** a bundle executes queue operations, relay operations, gate checks, and playbook verdict checks
- **THEN** updated trace events SHALL appear in bundle root `rb_trace.jsonl`
- **AND** updated code SHALL NOT create any other trace JSONL

#### Scenario: inspect-bundle timeline uses rb_trace as trace truth

- **WHEN** `inspect-bundle.mjs --timeline` runs
- **THEN** trace events SHALL come from `rb_trace.jsonl`
- **AND** `_logs/run.log` MAY provide process log context only
- **AND** no trace sink labels such as `[queue]` or `[subagent]` SHALL be required

### Requirement: Trace path unification SHALL update specs and playbook infrastructure

Trace unification SHALL update not only implementation files, but also accepted specs, playbook schema/tests, experiment README/RUN_EXPS references, workflow shared docs, bundle log templates, and playbook utility docs so they describe only `rb_trace.jsonl` as the trace surface.

After this change, command experiment verdict `check` events SHALL be written to `rb_trace.jsonl` by the playbook thin driver. Gate CLI stdout SHALL remain the machine-readable gate result, and gate attempt entries SHALL also be recorded in `rb_trace.jsonl`.

Command experiment verdict events SHALL use `event: "check"` with boolean `passed`. Updated trace readers, summaries, and playbook verdict logic SHALL NOT count any other event name as a verdict check.

#### Scenario: Accepted specs no longer require separate experiment verdict trace

- **WHEN** accepted specs describe command experiment verdict evidence
- **THEN** they SHALL point to `rb_trace.jsonl`
- **AND** they SHALL NOT require any other trace JSONL

#### Scenario: Playbook tests validate unified trace path

- **WHEN** playbook schema/tests validate trace path references
- **THEN** they SHALL expect `rb_trace.jsonl`
- **AND** they SHALL reject any other trace JSONL references in updated playbooks

## MODIFIED Requirements

### Requirement: Trace entries include bundle field

All modules writing to `rb_trace.jsonl` SHALL include `bundle` where the existing trace contract requires it. The value SHALL be derived from active bundle state, normally `rb_status.json`, not from chat memory.

#### Scenario: Queue trace includes bundle

- **WHEN** `queue-manager.mjs` writes a queue lifecycle event
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Subagent trace includes bundle

- **WHEN** `subagent-relay.mjs` writes a relay lifecycle event
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Independent CLI processes agree on bundle

- **WHEN** multiple CLIs append events to the same bundle trace
- **THEN** their `bundle` field values SHALL match active `rb_status.json`
