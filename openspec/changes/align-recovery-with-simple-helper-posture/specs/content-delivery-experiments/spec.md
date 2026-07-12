> req: CDE-001, CDE-002, CDE-003, CDE-004, CDE-005

## MODIFIED Requirements

### Requirement: HITL2 decision recorded playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-132-standard-hitl2-decision.md` SHALL verify the current HITL2 gate contract with a real disposable bundle and the real gate CLI. It SHALL follow `guidelines/command-experiments.md`, use existing shared runtime-context infrastructure plus thin case-local Node.js fixture setup, and SHALL NOT hand-roll a framework template copy or introduce a second runner.

The playbook SHALL establish the legal Wave2-to-HITL2 predecessor handoff and source-gate status window before invoking the gate. It SHALL verify:

- valid decision brief plus recorded five-enum profile decision passes;
- missing or empty decision brief fails;
- missing decision fails;
- an invalid decision outside `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked` fails; and
- absence of a separate phase-authored `hitl2_recorded` event does not by itself fail the gate, while the CLI still writes `gate_attempt`.

The verdict SHALL come from real bundle/trace evidence. The playbook SHALL NOT hand-write a gate result or use console confidence as verdict authority.

#### Scenario: Valid proceed decision passes

- **WHEN** the playbook creates a legal HITL2 entry, writes a valid decision brief, and records `user_decision: proceed_to_readiness`
- **THEN** the real gate CLI SHALL exit 0
- **AND** `check.next` SHALL be `phases/phase-readiness.md`
- **AND** a matching `gate_attempt` SHALL exist in the bundle trace

#### Scenario: Missing phase event is not a blocking rule

- **WHEN** all definition facts and the predecessor handoff are valid but no separate `hitl2_recorded` phase event exists
- **THEN** the real gate CLI SHALL still pass
- **AND** the playbook SHALL verify the CLI-authored `gate_attempt`

#### Scenario: Invalid decision facts fail closed

- **WHEN** the playbook removes the decision brief or writes an empty/invalid `user_decision`
- **THEN** the real gate CLI SHALL exit 1
- **AND** structured inspect/advice SHALL identify the direct fact to repair

### Requirement: Readiness gate precheck playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-135-standard-readiness-precheck.md` SHALL verify the readiness gate boundary with a real disposable bundle and the real gate CLI. It SHALL follow `guidelines/command-experiments.md` and reuse the existing shared experiment infrastructure rather than creating a parallel fixture framework.

The playbook SHALL use the legal HITL2-to-readiness handoff/status window and verify:

- complete required artifacts, all manifest-derived prior gate passes, valid profile YAML, and valid trace JSONL pass;
- a missing required artifact fails;
- a missing manifest-derived prior gate pass fails and names the gate;
- unparseable YAML fails; and
- corrupt JSONL fails.

#### Scenario: Complete readiness input passes

- **WHEN** all required artifacts, prior gate evidence, parseable profile, valid trace, and legal readiness entry exist
- **THEN** the readiness gate SHALL pass
- **AND** its terminal routing result SHALL remain consistent with the current transition contract

#### Scenario: Readiness input defects fail with direct diagnostics

- **WHEN** an artifact, prior gate pass, YAML parse, or JSONL parse prerequisite is invalid
- **THEN** the gate SHALL fail
- **AND** inspect/advice SHALL name the missing or invalid direct fact

### Requirement: Full delivery chain playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-131-standard-delivery-full-chain.md` SHALL follow `guidelines/command-experiments.md` and verify the current delivery tail using real gate output and witnessed handoffs:

```text
Wave2 passed handoff
  -> HITL2 proceed_to_readiness gate output
  -> enter readiness + source-gate status synchronization
  -> readiness gate pass
  -> final terminal entry
```

The playbook SHALL NOT pre-seed a target gate as already current in order to bypass the predecessor handoff. It SHALL verify both gate attempts in trace and preserve final `gate: none` terminal semantics.

#### Scenario: Sequential delivery tail uses legal handoffs

- **WHEN** the playbook drives a valid HITL2 proceed decision and readiness precheck
- **THEN** HITL2 SHALL emit `phases/phase-readiness.md`
- **AND** the playbook SHALL consume the selected target before synchronizing the HITL2 source-gate status
- **AND** readiness SHALL pass through its normal terminal handoff

#### Scenario: Final remains terminal

- **WHEN** the playbook reaches `phase-final.md`
- **THEN** final SHALL have `gate: none`
- **AND** `transitions.chain.json` SHALL NOT define an outgoing final transition

### Requirement: HITL2 rerun branch playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-133-standard-hitl2-rerun.md` SHALL follow `guidelines/command-experiments.md` and verify the current deterministic HITL2 rerun branch.

The playbook SHALL establish a legal Wave2-to-HITL2 predecessor handoff, record `user_decision: rerun`, invoke the real HITL2 gate CLI, and verify:

- the gate passes with exit 0;
- `routing.kind` is `next` and `check.next` is `phases/phase-rerun.md`;
- the CLI appends a matching `gate_attempt` rather than the playbook hand-writing one;
- the transition chain preserves both `passed -> phases/phase-readiness.md` and `rerun -> phases/phase-rerun.md`;
- `enter-phase` consumes the selected rerun target;
- source-gate status synchronization establishes `current_gate: hitl2_recorded` and `next_gate: rerun_ready`; and
- rerun preflight accepts that witnessed route.

The playbook SHALL NOT claim that the chain always returns readiness, that rerun is an Agent-level override of `check.next`, or that the lifecycle restarts from instantiation.

#### Scenario: Real gate output selects the rerun node

- **WHEN** the recorded HITL2 decision is `rerun` and all direct gate facts pass
- **THEN** the real gate CLI SHALL emit `check.next: phases/phase-rerun.md`
- **AND** the trace SHALL contain the matching CLI-authored `gate_attempt`

#### Scenario: Rerun handoff remains deterministic through preflight

- **WHEN** the playbook consumes the selected rerun target and synchronizes the source gate
- **THEN** the rerun phase preflight SHALL accept the witnessed HITL2-to-rerun route
- **AND** the playbook SHALL NOT substitute a readiness handoff or hand-written trace event

### Requirement: Delivery repair loop playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-134-standard-delivery-repair.md` SHALL follow `guidelines/command-experiments.md` and verify the delivery PDCA loop with current legal handoffs and real gate output:

- HITL2 gate fails on a missing decision brief, the Agent repairs the direct artifact, reruns the same gate, and passes; and
- readiness gate fails on a missing required artifact, the Agent repairs it, reruns the same gate, and passes.

The playbook SHALL preserve the legal predecessor handoff/status window across repair attempts and SHALL derive the verdict from real trace evidence.

#### Scenario: HITL2 repair returns to the same gate

- **WHEN** the HITL2 gate fails because the decision brief is missing
- **THEN** the Agent SHALL create the brief and rerun the same HITL2 gate
- **AND** trace SHALL contain the real failed and passed gate attempts

#### Scenario: Readiness repair returns to the same gate

- **WHEN** the readiness gate fails because a required artifact is missing
- **THEN** the Agent SHALL create the artifact and rerun the same readiness gate
- **AND** trace SHALL contain the real failed and passed gate attempts
