# engine/trace-writer (delta)

> req: TRW-008

## MODIFIED Requirements

### Requirement: Audit SHALL verify trace completion events have passed gate witnesses

The audit command (`audit-phase-status.mjs`) SHALL read `rb_trace.jsonl` and verify lifecycle evidence integrity: completion events (`waveN_completion`, `final_report_complete`) SHALL be backed by a corresponding passed `gate_attempt` event, timestamps SHALL be monotonic with respect to append order, and completion events SHALL carry a `bundle` equal to the canonical bundle basename. A completion event without a passed gate witness, with a non-monotonic or implausible timestamp, or with a mismatched bundle SHALL be reported as integrity failure in the audit output.

The `gate_attempt` witness check SHALL match on gate identity and passed status only; it SHALL NOT require any temporal ordering between the completion event and its witness, because the phase flow records the completion event before running the formal gate (the gate's own `trace_event_present` rule requires the completion event to exist before the gate can pass). A completion event written before its passed gate attempt is legitimate lifecycle evidence when a matching passed `gate_attempt` exists. Timestamp order consistency is enforced separately by the monotonicity check on append order; audit SHALL NOT reject a completion event merely because its timestamp precedes its witness's timestamp.

Audit SHALL NOT require historical `gate_attempt` events to carry the canonical bundle, since pre-change engine attempts record the `rb_status.json` short name.

Audit SHALL distinguish forged/unsupported completion evidence from legitimate engine-written events, and SHALL NOT treat a completion event with a mismatched bundle as satisfying lifecycle evidence even if the event name matches a real phase.

#### Scenario: Completion without passed gate witness is flagged

- **WHEN** `rb_trace.jsonl` contains `final_report_complete` or `wave2_completion` events but no corresponding passed `gate_attempt` for those phases (e.g., wave2 gate never ran)
- **THEN** audit SHALL report an integrity failure naming the event, its bundle, and the missing gate witness

#### Scenario: Mismatched bundle completion is flagged

- **WHEN** a completion event's `bundle` field does not equal the canonical bundle basename (whether missing, a `rb_status.json#/bundle` short name, or any other value)
- **THEN** audit SHALL report the event as integrity failure with the mismatched bundle value

#### Scenario: Legitimate gate-backed completion passes audit

- **WHEN** a completion event has a matching passed `gate_attempt` witness, consistent bundle, and plausible monotonic timestamp — including a completion event written before its passed gate attempt, as the phase flow requires (record completion evidence, then run the formal gate)
- **THEN** audit SHALL treat it as valid lifecycle evidence

#### Scenario: Completion timestamp older than a later event is flagged

- **WHEN** a completion event's timestamp is older than the timestamp of a preceding appended event (non-monotonic append order)
- **THEN** audit SHALL report the event as an integrity failure with reason `trace_integrity_non_monotonic_ts`
