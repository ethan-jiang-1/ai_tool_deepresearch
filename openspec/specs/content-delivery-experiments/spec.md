# Content Delivery Experiments

> req: CDE-001, CDE-002, CDE-003, CDE-004, CDE-005

## Purpose

Define experiment playbooks that verify the three content-delivery lifecycle phases (HITL2, readiness, final). Cover gate behavior, full-chain delivery, HITL2 rerun branching, and repair-loop PDCA cycles for delivery phases.

## Requirements

### Requirement: HITL2 decision recorded playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-132-standard-hitl2-decision.md` SHALL verify the current HITL2 gate contract with the real gate CLI. It SHALL establish the direct predecessor facts needed for legal HITL2 entry and SHALL NOT hand-write the tested HITL2 gate result.

The case SHALL verify:

- a valid decision brief plus one of the five recorded decisions passes;
- missing or empty decision facts fail with direct repair diagnostics;
- `not_started` and values outside the five recorded decisions fail; and
- absence of a separate phase-authored `hitl2_recorded` event does not by itself fail the gate, while the CLI still writes its own `gate_attempt`.

#### Scenario: Valid proceed decision passes

- **WHEN** the case creates legal HITL2 entry facts, writes a valid decision brief, and records `user_decision: proceed_to_readiness`
- **THEN** the real gate CLI SHALL pass
- **AND** `check.next` SHALL be `phases/phase-readiness.md`
- **AND** a matching CLI-authored `gate_attempt` SHALL exist

#### Scenario: Invalid decision facts fail closed

- **WHEN** the case removes the decision brief or writes an empty, sentinel, or invalid `user_decision`
- **THEN** the real gate CLI SHALL fail
- **AND** inspect/advice SHALL identify the direct fact to repair

### Requirement: Readiness gate precheck playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-135-standard-readiness-precheck.md` SHALL verify the readiness gate boundary with the real gate CLI. It SHALL establish a legal HITL2-to-readiness entry and SHALL NOT hand-write the tested readiness gate result.

The case SHALL verify that complete required artifacts, manifest-derived prior gate evidence, valid profile YAML, and valid trace JSONL pass; a missing required artifact, missing prior gate pass, unparseable YAML, or corrupt JSONL fails with direct diagnostics.

#### Scenario: Complete readiness input passes

- **WHEN** all required artifacts, prior gate evidence, parseable profile, valid trace, and legal readiness entry exist
- **THEN** the readiness gate SHALL pass
- **AND** its terminal routing result SHALL remain consistent with the current transition contract

#### Scenario: Readiness input defects fail directly

- **WHEN** one direct readiness prerequisite is missing or invalid
- **THEN** the gate SHALL fail
- **AND** inspect/advice SHALL name that direct fact rather than relying on a hand-written verdict

### Requirement: Full delivery chain playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-131-standard-delivery-full-chain.md` SHALL verify the current delivery tail with real gate output and witnessed handoffs:

```text
Wave2 passed handoff
  -> HITL2 proceed_to_readiness output
  -> readiness entry and source-gate status synchronization
  -> readiness gate pass
  -> final terminal entry
```

The case SHALL NOT pre-seed a target gate as already passed to bypass the predecessor handoff. It SHALL verify both tested gate attempts and preserve final `gate: none` terminal semantics.

#### Scenario: Sequential delivery tail uses legal handoffs

- **WHEN** the case drives a valid HITL2 proceed decision and readiness precheck
- **THEN** HITL2 SHALL emit `phases/phase-readiness.md`
- **AND** the selected target SHALL be entered before source-gate status synchronization
- **AND** readiness SHALL pass through its normal terminal handoff

#### Scenario: Final remains terminal

- **WHEN** the case reaches `phase-final.md`
- **THEN** final SHALL have `gate: none`
- **AND** `transitions.chain.json` SHALL NOT define an outgoing final transition

### Requirement: HITL2 rerun branch playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-133-standard-hitl2-rerun.md` SHALL verify the current deterministic HITL2 rerun branch with the real HITL2 gate output.

The case SHALL establish legal HITL2 entry, record `user_decision: rerun`, and verify:

- the gate passes and emits `check.next: phases/phase-rerun.md` with a matching CLI-authored `gate_attempt`;
- the chain preserves both `passed -> phases/phase-readiness.md` and `rerun -> phases/phase-rerun.md`;
- `enter-phase`, source-gate status synchronization, and rerun preflight accept the selected rerun route; and
- active prose does not claim that the Agent overrides `check.next` or restarts from instantiation.

#### Scenario: Real gate output selects and witnesses rerun

- **WHEN** `user_decision: rerun` is recorded and all direct HITL2 facts pass
- **THEN** the gate SHALL select `phases/phase-rerun.md`
- **AND** the case SHALL consume that target through the accepted handoff path
- **AND** rerun preflight SHALL accept the resulting route/status window

### Requirement: Delivery repair loop playbook

The controlled experiment at `experiments_playbook/exp_wff_delivery/case-134-standard-delivery-repair.md` SHALL verify same-check repair for the delivery tail with real gate output:

- HITL2 fails on a missing decision brief, the Agent repairs that artifact, reruns the same gate, and passes; and
- readiness fails on a missing required artifact, the Agent repairs that artifact, reruns the same gate, and passes.

The legal predecessor handoff/status window SHALL remain valid across repair attempts, and the verdict SHALL include the real failed and passed gate attempts.

#### Scenario: Delivery repair returns to the same checkpoint

- **WHEN** HITL2 or readiness fails on one repairable direct fact
- **THEN** the Agent SHALL repair that fact and rerun the same gate
- **AND** the case SHALL prove both attempts from real trace evidence
