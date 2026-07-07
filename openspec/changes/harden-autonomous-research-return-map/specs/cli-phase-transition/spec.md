## ADDED Requirements

> req: CPT-006

### Requirement: Phase status drift audit SHALL detect impossible current_gate/next_gate windows and manual bypass suspicion

The phase transition tooling SHALL provide an audit that compares `rb_status.json` with deterministic route evidence from `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json`. The audit SHALL identify status windows that are not authorized by the latest passed source gate, route-bound `load_complete`, and `phase_transition` evidence.

The audit SHALL be diagnostic and fail-closed. It SHALL NOT mutate `rb_status.json`, invent a degradation route, or treat manual edits as valid handoff evidence.

The audit SHALL expose a closed diagnostic outcome vocabulary so downstream advice and tests do not infer ad-hoc meanings. At minimum, outcomes SHALL include `passed`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, and `bootstrap_exception`. `bootstrap_exception` SHALL name the explicit compatibility exception that was applied; it SHALL NOT be a generic escape hatch.

#### Scenario: Status claims later phase without trace authorization

- **WHEN** `rb_status.json` claims `current_gate: "hitl2_recorded"` or `next_gate: "readiness_passed"`
- **AND** trace lacks the required passed wave1/wave2/HITL2 deterministic handoffs and route-bound phase entries
- **THEN** the audit SHALL report phase status drift
- **AND** diagnostics SHALL name the missing predecessor gate or entry witness

#### Scenario: Manual status edit suspicion is reported

- **WHEN** `rb_status.json` changes to a status window that cannot be derived from the latest passed deterministic handoff and `advance-status` trace
- **THEN** the audit SHALL report manual bypass suspicion
- **AND** it SHALL advise returning to the latest authorized phase target rather than continuing from the edited status

#### Scenario: Failed gate cannot authorize next phase status

- **WHEN** the latest `gate_attempt` for a source phase failed with `next: null`
- **AND** `rb_status.json` indicates a downstream phase window
- **THEN** the audit SHALL fail with an impossible status window diagnostic
- **AND** it SHALL NOT write a corrective status file

#### Scenario: Legal witnessed handoff passes audit

- **WHEN** trace contains a passed source gate with non-null `next`, a later route-bound `load_complete` for that target, and a matching `phase_transition`
- **AND** `rb_status.json` reflects the corresponding source-gate status window
- **THEN** the audit SHALL pass without drift diagnostics

#### Scenario: Bootstrap exception is explicit and narrow

- **WHEN** the audit accepts a bootstrap compatibility status window
- **THEN** the result SHALL use outcome `bootstrap_exception`
- **AND** diagnostics SHALL name the exact exception rather than treating arbitrary missing witnesses as acceptable
