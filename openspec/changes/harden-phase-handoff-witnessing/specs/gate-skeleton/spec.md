## ADDED Requirements

> req: GSK-007, GSK-008

### Requirement: Lifecycle gate handoff preflight

Lifecycle gate CLIs SHALL run a shared handoff preflight before evaluating their gate-specific content rules.

For every covered non-bootstrap manifest lifecycle phase that has an incoming deterministic transition, the preflight SHALL verify:

- the latest passed deterministic `gate_attempt` trace event with a non-null `next` has `next` equal to the current phase node fileRef and names the legal predecessor gate/currentNodeRef; and
- the current phase node has a later route-bound `load_complete(entry=<current phase node fileRef>)` trace event whose `handoff_source_attempt_index` points to the same predecessor `gate_attempt`, proving the Phase Agent consumed that prior gate's `check.next` through `enter-phase` or another accepted loader path that enforces the same predecessor-gate binding.

The preflight SHALL derive lifecycle membership and deterministic incoming edges from `manifest.json` and `transitions.chain.json`; it SHALL NOT infer lifecycle membership from file names alone. If a node has multiple deterministic incoming edges, the preflight SHALL accept the latest valid ordered pair for any legal predecessor edge.

For this change, covered non-bootstrap gate preflight targets are `phases/phase-seed-topics.md`, `phases/phase-wave0.md`, `phases/phase-wave1.md`, `phases/phase-wave2.md`, `phases/phase-hitl2.md`, `phases/phase-readiness.md`, and `phases/phase-rerun.md`. `phases/phase-final.md` has no gate preflight because Final has `gate: null`, but readiness→final entry still SHALL be witnessed before `advance-status --to readiness_passed` writes terminal status. Bootstrap inbound targets `phases/phase-instantiation.md`, `phases/phase-hitl1.md`, and `phases/phase-setup.md` are compatibility exceptions unless separately migrated. The validator allowlist SHALL name these exact bootstrap/final exceptions; no other lifecycle node may be omitted silently.

If the trace contains a newer `gate_attempt` for the same predecessor gate/currentNodeRef after an otherwise valid passed handoff, and that newer attempt failed or passed with a different `next`, the older passed handoff SHALL be treated as superseded and SHALL NOT satisfy preflight.

For branch-sensitive deterministic routes such as HITL2 proceed versus HITL2 rerun, the preflight SHALL validate the concrete target already emitted in `gate_attempt.next`. It SHALL NOT read profile state to choose a branch and SHALL NOT prefer a default `passed` edge when the trace authorizes a different legal deterministic target.

The HITL2 gate CLI SHALL emit the selected deterministic routing outcome for fixed-target HITL2 decisions. When `human_decision_checkpoints.hitl2.user_decision` is `proceed_to_readiness`, the gate's successful routing outcome SHALL be `passed`, yielding `check.next: "phases/phase-readiness.md"`. When the decision is `rerun`, the gate's successful routing outcome SHALL be `rerun`, yielding `check.next: "phases/phase-rerun.md"`. Non-deterministic HITL2 decisions (`request_view_revision`, `repair`, `stop_blocked`) SHALL NOT be defaulted to the readiness handoff.

For deterministic lifecycle gates covered by this change, gate status validation SHALL be derived from the same manifest/chain predecessor set rather than hardcoded to the gate's own enum as `current_gate` before the gate has passed. Before a covered current node's gate evaluates content rules:

- `rb_status.json#/next_gate` SHALL equal the current node's gate enum;
- `rb_status.json#/current_gate` SHALL equal a legal predecessor source gate enum whose passed `gate_attempt.next` points to the current node; and
- old hardcoded checks such as requiring wave2's `current_gate` to be `wave2_complete` before the wave2 gate passes SHALL be replaced or interpreted through this status-window rule.

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

#### Scenario: Gate rejects unbound load complete

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains a later `load_complete(entry="phases/phase-wave1.md")` whose `handoff_source_attempt_index` is missing or points to a different `gate_attempt`
- **THEN** the preflight SHALL NOT treat that load as a valid handoff witness
- **AND** the gate SHALL return `passed: false` with advice to rerun `enter-phase`

#### Scenario: Gate rejects superseded predecessor pass

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains an older passed `wave0-complete` attempt whose `next` points to `phases/phase-wave1.md`
- **AND** a newer `wave0-complete` attempt failed or passed with a different `next`
- **THEN** the preflight SHALL NOT treat the older pass as a valid handoff
- **AND** the gate SHALL return `passed: false` with advice to rerun the source gate and `enter-phase`

#### Scenario: Gate evaluates normal rules after witnessed handoff

- **WHEN** the prior gate pass has `next` equal to the current node and a later current-node `load_complete` witness is present
- **THEN** the gate SHALL continue to evaluate its existing definition rules
- **AND** pass/fail SHALL still be determined by the full rule set

#### Scenario: Downstream gate accepts source-gate status window

- **WHEN** wave1 has passed, `enter-phase` has loaded `phases/phase-wave2.md`, and source-gate status synchronization has written `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"`
- **AND** `check-gate-wave2-complete.mjs` is called for `phases/phase-wave2.md`
- **THEN** the shared gate status preflight SHALL accept the status window
- **AND** the gate SHALL NOT fail merely because `current_gate` is not yet `wave2_complete`
- **AND** the gate SHALL continue to evaluate wave2's normal content rules

#### Scenario: Rerun path accepts legal alternate predecessor

- **WHEN** rerun has passed with `gate_attempt(passed=true, gate="rerun-ready", currentNodeRef="phases/phase-rerun.md", next="phases/phase-seed-topics.md")`
- **AND** a later `load_complete(entry="phases/phase-seed-topics.md")` exists
- **AND** source-gate status synchronization has written `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`
- **THEN** the seed-topics gate preflight SHALL accept the rerun predecessor as legal
- **AND** it SHALL NOT require the setup predecessor for that run

#### Scenario: HITL2 rerun branch validates selected deterministic target

- **WHEN** HITL2 has produced a deterministic rerun handoff with `gate_attempt(passed=true, gate="hitl2-recorded", currentNodeRef="phases/phase-hitl2.md", next="phases/phase-rerun.md")`
- **AND** a later `load_complete(entry="phases/phase-rerun.md")` exists
- **THEN** the rerun gate preflight SHALL accept HITL2 as the legal predecessor for `phases/phase-rerun.md`
- **AND** it SHALL NOT replace the selected rerun target with `phases/phase-readiness.md`

#### Scenario: HITL2 gate emits rerun outcome from recorded decision

- **WHEN** `check-gate-hitl2-recorded.mjs` is called after `human_decision_checkpoints.hitl2.user_decision` is recorded as `rerun`
- **AND** all HITL2 gate rules pass
- **THEN** the gate result SHALL have `check.passed: true`
- **AND** routing SHALL use outcome `rerun`
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the resulting `gate_attempt` trace event SHALL contain `next: "phases/phase-rerun.md"`

#### Scenario: HITL2 gate does not default non-deterministic decisions to readiness

- **WHEN** `check-gate-hitl2-recorded.mjs` is called after `human_decision_checkpoints.hitl2.user_decision` is recorded as `request_view_revision`, `repair`, or `stop_blocked`
- **AND** the decision is otherwise validly recorded
- **THEN** the gate SHALL NOT emit `check.next: "phases/phase-readiness.md"` solely because HITL2 rules passed
- **AND** deterministic handoff witnessing SHALL NOT treat that decision as a readiness handoff

#### Scenario: Terminal final entry is witnessed before readiness status sync

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase` has written a later `load_complete(entry="phases/phase-final.md")`
- **THEN** `advance-status --to readiness_passed` SHALL be eligible to write `next_gate: "none"`
- **AND** final delivery SHALL still be governed by the Final node, not by the readiness gate itself

### Requirement: Lifecycle gate preflight wiring is enforced

The project SHALL include a regression check or validator that verifies every applicable lifecycle gate CLI invokes the shared handoff preflight/status-window helper.

The check SHALL fail if an applicable gate CLI omits the helper call or replaces it with ad hoc inline logic. The goal is to prevent a shared enforcement mechanism from existing without being wired into the real runtime path. Applicable covered gates include setup onward deterministic lifecycle gates and rerun-entry coverage where the runtime emits the corresponding deterministic handoff. Instantiation/HITL1 bootstrap exceptions SHALL be named explicitly in the validator allowlist rather than omitted silently.

The same validator or companion regression SHALL fail if a covered gate definition or gate-specific status check still requires `current_gate` to equal the gate's own enum before that gate has passed. Covered gates SHALL use the source-gate status window, except for explicitly allowlisted bootstrap compatibility cases.

#### Scenario: Missing preflight call fails validation

- **WHEN** an applicable lifecycle gate CLI does not invoke the shared handoff preflight helper
- **THEN** the wiring test or validator SHALL fail
- **AND** the failure SHALL name the gate CLI that is missing the call

#### Scenario: Stale own-gate status expectation fails validation

- **WHEN** a covered downstream gate definition still hardcodes `rb_status.json#/current_gate` to that same gate's enum before pass
- **THEN** the validator SHALL fail
- **AND** the failure SHALL name the stale rule or gate definition

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
