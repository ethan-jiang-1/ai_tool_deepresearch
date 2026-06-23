# Content Delivery Experiments

> req: CDE-001, CDE-002, CDE-003, CDE-004, CDE-005

## Purpose

Define experiment playbooks that verify the three content-delivery lifecycle phases (HITL2, readiness, final). Cover gate behavior, full-chain delivery, HITL2 rerun branching, and repair-loop PDCA cycles for delivery phases.

## Requirements

### Requirement: HITL2 decision recorded playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_workflow-foundation/test-simple-hitl2-decision-recorded.md` that verifies HITL2 gate behavior:
- Happy path: bundle with decision brief + valid profile decision + trace event → gate pass
- Missing decision brief → gate fail
- Missing user_decision → gate fail
- Invalid user_decision value → gate fail

The playbook SHALL use a disposable bundle (`dpt_disp_*`), import real framework gate CLI, and read verdict from `_trace.jsonl`. It SHALL follow the standard playbook structure per `guidelines/command-experiments.md`.

#### Scenario: Happy path gate pass

- **WHEN** the playbook pre-seeds a post-wave2 bundle with valid decision brief, profile decision, and trace event
- **AND** runs `check-gate-hitl2-recorded.mjs`
- **THEN** the gate SHALL pass (exit code 0)
- **AND** the playbook SHALL extract check events to `_trace.jsonl`
- **AND** the verdict SHALL be PASS

#### Scenario: Missing decision brief fails gate

- **WHEN** the playbook removes `artifacts/hitl2/decision-brief.md` from the bundle
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL reference the missing decision brief

#### Scenario: Missing user decision fails gate

- **WHEN** the playbook removes or empties `user_decision` from `rb_profile.yaml`
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL reference the missing or empty user_decision field

#### Scenario: Invalid decision value fails gate

- **WHEN** the playbook writes an invalid `user_decision` value (not in accepted enum) to `rb_profile.yaml`
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL list the accepted enum values

### Requirement: Readiness gate precheck playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_workflow-foundation/test-medium-readiness-precheck.md` that verifies readiness gate boundary behavior:
- Happy path: complete bundle with all artifacts, all prior gate gate_attempt(passed=true) in trace, valid YAML, valid JSONL → gate pass
- Missing artifact → gate fail
- Missing prior gate passes in trace → gate fail (CLI reports which specific gates)
- Unparseable YAML profile → gate fail
- Corrupt JSONL trace → gate fail

#### Scenario: Happy path all conditions met

- **WHEN** the playbook pre-seeds a bundle with all required artifacts, all prior-gate gate_attempt events with passed=true, valid profile YAML, and valid trace JSONL
- **AND** runs `check-gate-readiness-passed.mjs`
- **THEN** the gate SHALL pass
- **AND** the verdict SHALL be PASS

#### Scenario: Missing artifact fails gate

- **WHEN** the playbook removes `artifacts/wave2/synthesis.md` from the bundle
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL reference the missing artifact

#### Scenario: Missing prior gate passes fails gate

- **WHEN** the playbook modifies trace to have gate_attempt(passed=true) for only a subset of prior gates (e.g., 5 of the 8 expected)
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL name which specific prior gate(s) are missing from the trace

#### Scenario: Unparseable YAML fails gate

- **WHEN** the playbook corrupts `rb_profile.yaml` with invalid YAML syntax
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL indicate the YAML parse error

#### Scenario: Corrupt JSONL fails gate

- **WHEN** the playbook inserts a non-JSON line into `rb_trace.jsonl`
- **AND** runs the gate CLI
- **THEN** the gate SHALL fail (exit code 1)
- **AND** the inspect output SHALL indicate the JSONL parse error

### Requirement: Full delivery chain playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_workflow-foundation/test-simple-delivery-full-chain.md` that verifies the complete delivery tail:
- hitl2 gate pass → readiness gate pass → final phase loads (gate=none terminal)
- The playbook SHALL verify sequential gate passage and final terminal semantics

#### Scenario: Sequential gate passage

- **WHEN** the playbook pre-seeds a bundle with hitl2 decision recorded and all prior gates passed
- **AND** runs hitl2-recorded gate then readiness-passed gate sequentially
- **THEN** both gates SHALL pass
- **AND** the trace SHALL record both gate_attempt events

#### Scenario: Final phase terminal semantics

- **WHEN** the playbook inspects the manifest for the final phase
- **THEN** `phase-final.md` SHALL have `gate: none`
- **AND** `transitions.chain.json` SHALL NOT have a transition from `phases/phase-final.md`

### Requirement: HITL2 rerun branch playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_workflow-foundation/test-simple-hitl2-rerun-branch.md` that verifies the unique HITL2 behavior where gate PASSES but the Agent does NOT advance to readiness — because the user chose `repair_and_rerun`.

The playbook SHALL verify:
- Gate passes (all checks satisfied) with `user_decision: repair_and_rerun`
- The routing result from `resolveNodeTransitionDetailed` still returns `kind: 'next'` with `next: 'phases/phase-readiness.md'` (chain always returns the normal next)
- The Agent, reading `user_decision` from profile, SHALL decide to restart from instantiation instead of following the chain to readiness
- This decision is an Agent-level routing choice, not encoded in the transition table

This is the only phase in the lifecycle where gate pass does not equal advance — the defining behavior of HITL2's authority boundary.

#### Scenario: Gate passes but Agent restarts lifecycle

- **WHEN** the playbook pre-seeds a post-wave2 bundle with valid decision brief, `user_decision: repair_and_rerun`, and trace event
- **AND** runs `check-gate-hitl2-recorded.mjs`
- **THEN** the gate SHALL pass (exit code 0)
- **AND** `resolveNodeTransitionDetailed` SHALL return `kind: 'next'` with `next: 'phases/phase-readiness.md'`
- **AND** the playbook SHALL verify that the Agent, having read `user_decision: repair_and_rerun` from profile, restarts from instantiation instead of advancing to readiness

#### Scenario: Chain does not encode the rerun branch

- **WHEN** the playbook inspects `transitions.chain.json`
- **THEN** there SHALL be only one entry for `phases/phase-hitl2.md`: `{ "passed": "phases/phase-readiness.md" }`
- **AND** no entry for `repair_and_rerun` or any other user_decision SHALL exist in the chain

### Requirement: Delivery repair loop playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_workflow-foundation/test-medium-delivery-repair-loop.md` that verifies the PDCA cycle works for delivery phases: gate fail → read inspect/advice → Agent repairs → rerun gate → pass.

The playbook SHALL verify at minimum:
- HITL2 gate fails on missing decision brief → Agent creates brief → rerun → pass
- Readiness gate fails on missing artifact → Agent creates artifact → rerun → pass

#### Scenario: HITL2 repair loop

- **WHEN** the playbook pre-seeds a bundle missing `artifacts/hitl2/decision-brief.md`
- **AND** runs `check-gate-hitl2-recorded.mjs` — gate fails
- **AND** Agent reads inspect output and creates the decision brief
- **AND** reruns the gate
- **THEN** the gate SHALL pass on the second attempt
- **AND** the trace SHALL contain both the fail and pass gate_attempt events

#### Scenario: Readiness repair loop

- **WHEN** the playbook pre-seeds a bundle missing `artifacts/wave2/synthesis.md`
- **AND** runs `check-gate-readiness-passed.mjs` — gate fails on missing artifact
- **AND** Agent reads inspect output and creates the missing artifact
- **AND** reruns the gate
- **THEN** the gate SHALL pass on the second attempt
- **AND** the trace SHALL contain both the fail and pass gate_attempt events
