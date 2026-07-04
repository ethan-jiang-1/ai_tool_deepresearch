# Subagent Runtime Logging (delta)

> req: SRL-004

## MODIFIED Requirements

### Requirement: Lifecycle events are the execution-proof signal for provenance forensics

Lifecycle events emitted per SRL-001/SRL-002 SHALL be readable by gate provenance forensics as Layer-2 execution evidence. The absence of lifecycle events for an evidence-producing slot SHALL be reported by the `lifecycle_events_missing` diagnostic (RPG-011, advisory only) — giving SRL-004 a concrete read-side rather than a dangling assertion.

#### Scenario: Forensics reads lifecycle events as execution proof

- **WHEN** a gate forensic check inspects a slot that produced evidence
- **THEN** it SHALL be able to find lifecycle events in `_logs/run.log` carrying the slot's nonce
- **AND** absence SHALL be surfaced via the `lifecycle_events_missing` diagnostic (RPG-011), not a gate failure
