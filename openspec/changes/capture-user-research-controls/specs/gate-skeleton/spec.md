## MODIFIED Requirements

> req: GSK-005

### Requirement: Shared gate attempt audit helper

The existing Gate attempt write ownership SHALL remain unchanged: formal Gate wrappers SHALL continue to call the accepted shared `writeGateAttempt(bundlePath, result)` helper at their current durability boundary, and this change SHALL NOT introduce a new finalizer, wrapper trace writer, or duplicate checkpoint writer. The existing durable Gate failure diagnostic SHALL preserve the emitted result's `hints[]` alongside `check`, `routing`, `inspect`, and `advice`; a pass diagnostic MAY preserve `hints: []` for shape consistency.

Persisted hints SHALL remain diagnostic projection only. They SHALL NOT become Gate verdict, routing authority, repair permission, or a fallback source that overrides a newer direct evaluation.

For the setup-ready Gate only, `writeGateAttempt()` SHALL support the RRD-011 staged route mode. A candidate with passed content rules and non-null route SHALL not be reported as a passed/consumable handoff until the helper has durably created its required route-pending checkpoint and appended the bound trace event. The pending checkpoint SHALL identify its content evaluation with `trigger: setup_route_pending` and SHALL NOT claim an existing or passed `gate_attempt`; only the bound trace event is route authority. That route event SHALL carry the RRD-011 `gate_attempt_id`, safe bundle-relative `checkpoint_ref`, and `plan_sha256` binding, rather than relying on trace position or a later diagnostic to identify its checkpoint. The staged invocation SHALL return one structured `route_outcome` instead of throwing a persistence error that would make its caller invoke the ordinary helper a second time. If checkpoint or route persistence fails, the caller SHALL project that one outcome into the ordinary failed Gate envelope (`check.passed: false`, `check.next: null`) with a structured authority-integrity persistence finding and same-checkpoint rerun, then emit it without a second audit-helper call. This is a narrow route-evidence exception, not a change to audit tolerance for failed attempts, non-routing diagnostics, or other Gates.

#### Scenario: Failure diagnostic preserves the actionable hint

- **WHEN** a formal Gate emits a failed result with one or more primary hints and writes its existing failure diagnostic
- **THEN** the diagnostic SHALL contain the same `hints[]` entries as the emitted result
- **AND** no additional trace writer, wrapper finalizer, or diagnostic-derived verdict SHALL be introduced

#### Scenario: Ordinary gate pass writes to both destinations with bundle

- **WHEN** a gate CLI other than setup-ready calls `writeGateAttempt(bundlePath, result)` with a passed result
- **THEN** a `gate_attempt` JSONL event SHALL be appended to `rb_trace.jsonl` containing `bundle`
- **AND** a logger INFO line SHALL be appended to `_logs/run.log` containing `bundle`

#### Scenario: Setup-ready route persistence fails closed

- **WHEN** setup-ready content rules pass but its required route-bound checkpoint or bound trace cannot be made durable
- **THEN** the shared helper SHALL NOT leave a routable passed `gate_attempt`
- **AND** the CLI SHALL emit the standard failed envelope with the persistence boundary as the direct finding
- **AND** it SHALL not create a second checkpoint or rerun ordinary attempt audit for that same staged invocation
- **AND** it SHALL NOT make the user run a command or create a second trace/checkpoint authority

#### Scenario: Gate CLI MUST NOT inline trace write

- **WHEN** implementing a new gate CLI or modifying an existing one
- **THEN** the CLI SHALL NOT contain `appendFileSync` calls targeting `rb_trace.jsonl`
- **AND** SHALL use `writeGateAttempt(bundlePath, result)` as the sole trace/log write mechanism

#### Scenario: Non-routing audit write failure remains tolerant

- **WHEN** a failed attempt, non-routing diagnostic, or a Gate other than setup-ready cannot write an audit destination
- **THEN** `writeGateAttempt()` SHALL retain its existing diagnostic tolerance
- **AND** the Gate result SHALL still be emitted via `emitGateResult()`
