> req: TRW-005

## MODIFIED Requirements

### Requirement: Trace SHALL capture relay bypass suspicion

The system SHALL define delegated bypass trace diagnostics written by gate or inspect CLIs when phase artifacts indicate evidence/search work but matching submitted work-unit coverage is absent. The diagnostic event name SHALL be `delegated_bypass_suspected`. Detection SHALL be phase-aware and SHALL remain diagnostic only; filesystem-only artifacts SHALL NOT count toward gate pass.

#### Scenario: delegated bypass suspicion recorded in trace

- **WHEN** gate evaluation detects delegated artifacts without submitted work-unit coverage
- **THEN** a `delegated_bypass_suspected` event SHALL be appended to `rb_trace.jsonl`
- **AND** the event SHALL include what was found and what work-unit coverage was missing

