# trace-writer (delta)

> req: TRW-007, TRW-008

## ADDED Requirements

### Requirement: Trace events SHALL carry writer identity and bundle consistency

Every `rb_trace.jsonl` event appended by the unified trace writer SHALL include a `writer` field (stable writer identity: `engine`, `cli`, `playbook`, or a named run-scoped module) and a `bundle` field equal to the canonical current-run bundle name — the bundle directory basename (e.g. `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`) — not the short name recorded in `rb_status.json#/bundle`. The `writer` field is distinct from the pre-existing `source` field on `run_start`/check events, which keeps its current per-event semantics. The trace schema SHALL validate these fields. The unified trace writer covers all engine trace append paths: the `trace.mjs` writer, the gate-attempt writer (`writeGateAttempt`), and the CLI `log-event` trace path — each SHALL stamp `writer` and the canonical `bundle` on events it appends after this change.

Gate `trace_event_present` rules SHALL NOT treat an event as satisfying the rule when its `bundle` field does not match the canonical bundle basename under evaluation. An event whose `bundle` equals the `rb_status.json#/bundle` short name but differs from the canonical basename SHALL still be treated as not matching. The writer identity field SHALL be required on all events appended by the unified writer after this change; at gate read time, an event that carries a `writer` field with a non-accepted identity SHALL NOT satisfy the rule, while an event without a `writer` field (pre-change historical events, e.g. engine-written `wave0_completion` records) SHALL NOT be rejected for its absence — the bundle check remains the fail-closed gate condition.

#### Scenario: Forged completion event with short-name bundle is ignored

- **WHEN** `rb_trace.jsonl` contains `{"ts":"...","event":"wave1_completion","bundle":"glm-5-3-deepseek-v4-domestic-chips"}` while the canonical current-run bundle basename is `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` (the `rb_status.json#/bundle` short name matches the forged event)
- **THEN** the `trace_event_present` rule for `wave1_completion` SHALL treat the event as not matching the canonical bundle
- **AND** the rule SHALL NOT pass on that event even though the short name matches `rb_status.json#/bundle`

#### Scenario: Engine/CLI-written event with canonical bundle passes

- **WHEN** a trace event appended by the unified writer (`engine` gate attempt or `cli` log-event) carries `bundle` equal to the canonical bundle basename and a recognized writer identity
- **THEN** the `trace_event_present` rule SHALL accept it subject to the remaining rule semantics

### Requirement: Audit SHALL verify trace completion events have passed gate witnesses

The audit command (`audit-phase-status.mjs`) SHALL read `rb_trace.jsonl` and verify lifecycle evidence integrity: completion events (`waveN_completion`, `final_report_complete`) SHALL be backed by a corresponding passed `gate_attempt` event, timestamps SHALL be monotonic with respect to append order, and completion events SHALL carry a `bundle` equal to the canonical bundle basename. A completion event without a passed gate witness, with a non-monotonic or implausible timestamp, or with a mismatched bundle SHALL be reported as integrity failure in the audit output. The `gate_attempt` witness check SHALL match on gate identity and passed status; audit SHALL NOT require historical `gate_attempt` events to carry the canonical bundle, since pre-change engine attempts record the `rb_status.json` short name.

Audit SHALL distinguish forged/unsupported completion evidence from legitimate engine-written events, and SHALL NOT treat a completion event with a mismatched bundle as satisfying lifecycle evidence even if the event name matches a real phase.

#### Scenario: Completion without passed gate witness is flagged

- **WHEN** `rb_trace.jsonl` contains `final_report_complete` or `wave2_completion` events but no corresponding passed `gate_attempt` for those phases (e.g., wave2 gate never ran)
- **THEN** audit SHALL report an integrity failure naming the event, its bundle, and the missing gate witness

#### Scenario: Mismatched bundle completion is flagged

- **WHEN** a completion event's `bundle` field does not equal the canonical bundle basename (whether missing, a `rb_status.json#/bundle` short name, or any other value)
- **THEN** audit SHALL report the event as integrity failure with the mismatched bundle value

#### Scenario: Legitimate gate-backed completion passes audit

- **WHEN** a completion event has a matching passed `gate_attempt` witness, consistent bundle, and plausible monotonic timestamp
- **THEN** audit SHALL treat it as valid lifecycle evidence
