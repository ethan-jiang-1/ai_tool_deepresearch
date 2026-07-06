> req: TRW-001, TRW-003, TRW-005

## ADDED Requirements

### Requirement: Trace SHALL capture delegated bypass suspicion

The system SHALL define delegated bypass trace diagnostics written by gate or inspect CLIs when phase artifacts indicate evidence/search work but matching submitted work-unit coverage is absent. The diagnostic event name SHALL be `delegated_bypass_suspected`. Detection SHALL be phase-aware and SHALL remain diagnostic only; filesystem-only artifacts SHALL NOT count toward gate pass.

#### Scenario: delegated bypass suspicion recorded in trace

- **WHEN** gate evaluation detects delegated artifacts without submitted work-unit coverage
- **THEN** a `delegated_bypass_suspected` event SHALL be appended to `rb_trace.jsonl`
- **AND** the event SHALL include what was found and what work-unit coverage was missing

## MODIFIED Requirements

### Requirement: Unified trace writer with configurable behavior

The unified trace writer SHALL continue to append JSONL events with configurable behavior. Examples for delegated work SHALL use queue and work-unit lifecycle events as the diagnostic vocabulary.

#### Scenario: work-unit trace example is appended

- **WHEN** `traceEntry('work_unit_submit', { passed: true, detail: 'submitted work unit' })` is called
- **THEN** a JSON line SHALL be appended with the event, pass state, detail, timestamp, and configured trace fields

### Requirement: Trace entries include bundle field

All modules writing to `rb_trace.jsonl` SHALL include `bundle` where the existing trace contract requires it. The value SHALL be derived from active bundle state, normally `rb_status.json`, not from chat memory.

#### Scenario: Queue trace includes bundle

- **WHEN** queue Engine code writes a queue lifecycle event
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Work-unit trace includes bundle

- **WHEN** work-unit lifecycle code writes claim, submit, terminal, inspect, or provenance events
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Independent CLI processes agree on bundle

- **WHEN** multiple CLIs append events to the same bundle trace
- **THEN** their `bundle` field values SHALL match active `rb_status.json`

### Requirement: rb_trace.jsonl SHALL be the only trace sink

System SHALL use bundle root `rb_trace.jsonl` as the only trace JSONL sink for runtime audit events and command experiment verdict check events.

All trace writers SHALL append to `rb_trace.jsonl`, including bundle creation, gate attempt writing, Agent log events that also need trace, status advancement, queue lifecycle, work-unit lifecycle, provenance diagnostics, and playbook check/verdict utilities.

#### Scenario: Work-unit events use bundle trace

- **WHEN** a work-unit claim or submit event is recorded
- **THEN** it SHALL be appended to bundle-root `rb_trace.jsonl`

## REMOVED Requirements

### Requirement: Trace SHALL capture relay bypass suspicion

**Reason**: Relay-specific bypass wording and event naming are replaced by work-unit coverage diagnostics.

**Migration**: Use `Trace SHALL capture delegated bypass suspicion` and the `delegated_bypass_suspected` event.

#### Scenario: relay bypass event is no longer emitted

- **WHEN** gate evaluation detects delegated artifacts without submitted work-unit coverage
- **THEN** it SHALL emit `delegated_bypass_suspected`
- **AND** it SHALL NOT emit `relay_bypass_suspected`
