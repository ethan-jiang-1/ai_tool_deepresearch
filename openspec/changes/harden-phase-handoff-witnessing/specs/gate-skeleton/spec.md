## ADDED Requirements

> req: GSK-007, GSK-008

### Requirement: Lifecycle gate handoff preflight

Lifecycle gate CLIs SHALL run a shared handoff preflight before evaluating their gate-specific content rules.

For every manifest lifecycle phase that has an incoming deterministic transition, the preflight SHALL verify:

- the latest passed deterministic `gate_attempt` trace event with a non-null `next` has `next` equal to the current phase node fileRef and names the legal predecessor gate/currentNodeRef; and
- the current phase node has a later route-bound `load_complete(entry=<current phase node fileRef>)` trace event proving the Phase Agent consumed that prior gate's `check.next` through `enter-phase` or another accepted loader path that enforces the same predecessor-gate binding.

The preflight SHALL derive lifecycle membership and deterministic incoming edges from `manifest.json` and `transitions.chain.json`; it SHALL NOT infer lifecycle membership from file names alone. If a node has multiple deterministic incoming edges, the preflight SHALL accept the latest valid ordered pair for any legal predecessor edge. The instantiation entry phase is exempt from the prior-handoff preflight because the runtime bundle may not exist before instantiation.

If preflight fails, the gate CLI SHALL return normal gate failure output (`passed: false`, exit 1) with `inspect` and `advice` naming the missing trace evidence. It SHALL NOT change routing authority or select a next node.

#### Scenario: Gate fails when prior gate pass is missing

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** the latest passed deterministic `gate_attempt` with non-null `next` is not `gate: "wave0-complete"`, `currentNodeRef: "phases/phase-wave0.md"`, `next: "phases/phase-wave1.md"`
- **THEN** the gate SHALL return `passed: false`
- **AND** `inspect` SHALL identify the missing current predecessor handoff pass

#### Scenario: Gate fails when current phase was not entered

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` lacks `load_complete` for `phases/phase-wave1.md`
- **THEN** the gate SHALL return `passed: false`
- **AND** `advice` SHALL tell the Agent to run `enter-phase --bundle <bundle> --node phases/phase-wave1.md`

#### Scenario: Gate rejects stale or mismatched load complete

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains `load_complete(entry="phases/phase-wave1.md")` before the matching `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **THEN** the preflight SHALL NOT treat that stale load as a valid handoff witness
- **AND** the gate SHALL return `passed: false` with advice to rerun `enter-phase`

#### Scenario: Gate evaluates normal rules after witnessed handoff

- **WHEN** the prior gate pass has `next` equal to the current node and a later current-node `load_complete` witness is present
- **THEN** the gate SHALL continue to evaluate its existing definition rules
- **AND** pass/fail SHALL still be determined by the full rule set

### Requirement: Lifecycle gate preflight wiring is enforced

The project SHALL include a regression check or validator that verifies every applicable lifecycle gate CLI invokes the shared handoff preflight helper.

The check SHALL fail if an applicable gate CLI omits the helper call or replaces it with ad hoc inline logic. The goal is to prevent a shared enforcement mechanism from existing without being wired into the real runtime path.

#### Scenario: Missing preflight call fails validation

- **WHEN** an applicable lifecycle gate CLI does not invoke the shared handoff preflight helper
- **THEN** the wiring test or validator SHALL fail
- **AND** the failure SHALL name the gate CLI that is missing the call

### Requirement: Engine-derived gate attempt diagnostics

Gate result construction SHALL include Engine-derived attempt diagnostics based on trace and diagnostic artifacts, not solely on Agent-reported `--attempt`.

The diagnostics SHALL include:

- `attempt_count`: count of relevant attempts for the current gate in the current phase context;
- `attempt_trend`: one of `first`, `converging`, `stalled`, or `regressed`;
- `newly_passing`: rule IDs that failed in the previous comparable attempt and now pass;
- `still_failing`: rule IDs that failed in both previous and current comparable attempts;
- `regressed`: rule IDs that previously passed and now fail.

When a gate passes after the fatigue threshold, the gate result SHALL include stop-mode-safe autonomous continuation advice: `check.next` must be consumed through `enter-phase`, final delivery happens at `phase-final`, and high gate friction does not authorize premature chat synthesis.

The existing `--attempt N` flag SHALL remain accepted as an Agent-reported hint, but it SHALL NOT be the authoritative source for the Engine-derived attempt diagnostics.

#### Scenario: High-attempt pass emits autonomous continuation advice

- **WHEN** a gate passes after the Engine-derived attempt count reaches the fatigue threshold
- **THEN** the gate result SHALL include advice telling the Agent to consume `check.next` through `enter-phase`
- **AND** the advice SHALL state that final report delivery occurs at `phase-final`
- **AND** the advice SHALL NOT ask the user whether to continue

#### Scenario: Delta diagnostics report converging repair

- **WHEN** the current gate attempt fixes at least one rule that failed in the previous comparable attempt
- **THEN** the gate result or diagnostic artifact SHALL list that rule ID under `newly_passing`
- **AND** `attempt_trend` SHALL be `converging` unless other regressions dominate

### Requirement: Cascade-masked diagnostics remain non-authority

Wave0 gate diagnostics SHALL mark downstream rule failures as masked when an upstream per-topic parse or schema failure makes those downstream checks non-independent.

Masked diagnostics SHALL clarify root cause and reduce duplicate failure noise. They SHALL NOT count as passing rules, SHALL NOT hide the upstream failure, and SHALL NOT change gate pass/fail truth.

#### Scenario: Downstream count is masked by schema failure

- **WHEN** a topic source file cannot be parsed or fails schema validation
- **AND** a downstream count-floor check for the same topic cannot be meaningfully evaluated
- **THEN** the diagnostic artifact SHALL mark the downstream count-floor result as `masked: true`
- **AND** the gate SHALL still fail because the upstream schema/parse rule failed
