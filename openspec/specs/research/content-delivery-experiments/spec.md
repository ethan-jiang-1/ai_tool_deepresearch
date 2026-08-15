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

For `proceed_to_readiness`, the case SHALL additionally prove that a complete
current-round composition handoff and explicit delivery view are required, and
that the real `gate_attempt` carries a normalized receipt whose projection
fingerprint matches the accepted profile projection. Missing, partial, unknown,
`not_started`, unresolved custom, and rerun-mismatched values SHALL fail with
direct diagnostics. Every non-delivery decision SHALL retain existing Gate
behavior without a composition blocker or receipt. This fixture-backed case
proves the deterministic Gate contract only; it SHALL not claim a real Subject
Agent recommended sensible values or interpreted natural language.

#### Scenario: Valid proceed decision emits an accepted witness

- **WHEN** the case creates legal HITL2 entry and records a complete current-
  round proceed profile
- **THEN** the real Gate CLI SHALL pass and route to Readiness
- **AND** a matching CLI-authored receipt-bearing `gate_attempt` SHALL exist

#### Scenario: Invalid composition facts fail closed

- **WHEN** the case removes or corrupts one required composition fact, uses
  `not_started`, mismatches the round, or leaves custom semantics unresolved
- **THEN** the real Gate CLI SHALL fail
- **AND** inspect/advice SHALL identify the direct profile fact rather than a
  Final fallback

#### Scenario: Non-delivery action does not require a handoff

- **WHEN** the case records one of four non-delivery decisions without a
  composition handoff
- **THEN** the real Gate SHALL retain existing pass/routing behavior
- **AND** its trace event SHALL carry no composition receipt

### Requirement: Readiness gate precheck playbook

The Readiness composition witness, restore, refusal, and legacy-migration
boundaries SHALL be verified by the selected JS-led production-CLI assets:
`tests/integration/cli/check-gate-readiness-passed.test.mjs` and
`tests/e2e/rerun-round-continuity.test.mjs`. They SHALL establish legal
HITL2-to-Readiness state through their declared production paths and SHALL NOT
hand-write a tested Readiness result or v1 accepted receipt.

Those assets SHALL verify that complete artifacts, manifest-derived prior Gate
evidence, valid profile/trace, witnessed handoff, and matching composition
fingerprints pass. They SHALL also verify pure projection drift restore and
same-checkpoint rerun, unrelated-drift refusal, closed failure for invalid
receipts, and one eligible pre-v1 migration whose context baseline begins at
commit.

`case-135-standard-readiness-precheck.md` SHALL remain at
`experiments_playbook/exp_extrem_slow/case-135-extreme-slow-readiness-precheck.md`,
with no active runner-manifest entry or Change-completion claim. Any playbook
with measured native runtime above 120 seconds SHALL follow the same quarantine
rule until a later Change makes it suitable for the active suite. This
deterministic proof SHALL NOT claim a human accepted migration input or that
Final composition is semantically useful.

#### Scenario: Complete readiness input passes

- **WHEN** all required artifacts, prior gate evidence, parseable profile, valid trace, and legal readiness entry exist
- **THEN** the readiness gate SHALL pass
- **AND** its terminal routing result SHALL remain consistent with the current transition contract

#### Scenario: Readiness input defects fail directly

- **WHEN** one direct readiness prerequisite is missing or invalid
- **THEN** the gate SHALL fail
- **AND** inspect/advice SHALL name that direct fact rather than relying on a hand-written verdict

#### Scenario: Matching accepted projection passes Readiness

- **WHEN** the selected HITL2 receipt matches the current profile projection and
  context and all existing Readiness facts pass
- **THEN** the real Readiness Gate SHALL pass
- **AND** its route SHALL remain the existing Final target

#### Scenario: Pure drift restores and reruns the same checkpoint

- **WHEN** the case mutates only a composition coordinate after HITL2 pass
- **THEN** Readiness SHALL fail with `operate-composition-handoff restore`
- **AND** after the real operation, the same Readiness Gate SHALL pass without
  changing unrelated profile or lifecycle facts

#### Scenario: V1 unrelated drift and unsafe migration do not mutate authority

- **WHEN** the case changes a non-composition profile fact after a v1 receipt
  or attempts migration outside the eligible pre-v1 boundary
- **THEN** the real operation SHALL refuse the write
- **AND** profile, trace, status, artifacts, and prior Gate history SHALL remain
  unchanged

#### Scenario: Legacy migration exposes its evidence start boundary

- **WHEN** an eligible pre-v1 predecessor has no historical profile-context
  fingerprint and migration commits one accepted projection
- **THEN** the case SHALL verify that the migration witness uses the committed
  result as its context baseline without claiming predecessor-era equality
- **AND** a later non-composition change SHALL fail Readiness against that new
  baseline

#### Scenario: Slow playbook leaves the active verification route

- **WHEN** a registered playbook's measured native run exceeds 120 seconds
- **THEN** it SHALL move to `exp_extrem_slow/` and leave the active manifest
- **AND** the selected JS-led proof assets SHALL remain the completion route for
  its deterministic contract until a later Change reintroduces a fast playbook

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

The delivery-tail case SHALL not pre-seed either tested Gate as passed or
fabricate the receipt. It SHALL verify the normalized route-bound receipt
lineage across both Gate attempts, legal entries, and Final's `gate: null`,
no-outgoing-transition semantics. It MAY use fixture-authored profile and
verified-state prerequisites and therefore proves deterministic delivery-chain
behavior only, not real HITL2 recommendation or report quality.

#### Scenario: Sequential delivery tail carries one accepted contract

- **WHEN** the case drives a valid HITL2 proceed decision and Readiness precheck
- **THEN** HITL2 SHALL emit Readiness with a normalized receipt and Readiness
  SHALL verify the same current profile projection before emitting Final
- **AND** both target entries SHALL use the existing witnessed handoff path

The one authorized CDE-003 case-137 invocation used the setup-only, single
Subject Final-composition scenario with the declared 30-second Subject,
45-second Headless, 5-second health, and 60-second retained-evidence bounds.
Retained Supervisor batch `53e68120-9201-45e0-9e9b-df83ad811779` recorded
`duration_ms: 45177`, native outcome `null`, lifecycle outcome `ERROR`, and
health `null` because the Playbook Agent timed out. The run-owned report and
logs remain diagnostic material; `agent-run-evidence.md` indexes them without
replacing their authority.

`experiments_playbook/exp_extrem_slow/case-137-extreme-slow-final-composition.md`
SHALL remain quarantined outside the active manifest. CDE-003 SHALL have no
active Final-composition Agent-behavior proof, no retry, and no Agent-behavior
PASS claim. Its retained source-contract test MAY verify the fixture shape,
process limits, explicit quarantine, and no-evidence record, but it SHALL NOT
substitute static proof, case-135/case-136 diagnostics, or fixture facts for a
real-Subject observation. It SHALL NOT assert report quality, reader-value,
semantic correctness, HITL2 interaction quality, cross-view behavior, a
real-human verdict, or an Engine report-quality verdict.

#### Scenario: One authorized run closes with no evidence

- **WHEN** the retained CDE-003 Supervisor result has no native completion,
  lifecycle `ERROR`, and no health outcome after the 45-second Headless timeout
- **THEN** the run SHALL remain retained diagnostic material rather than a
  completion claim
- **AND** the case SHALL be absent from the active manifest and remain in
  `exp_extrem_slow/` without an automatic retry in this Change
- **AND** the Change MAY close only with an explicit `no-evidence` outcome and
  no CDE-003 Agent-behavior PASS claim

#### Scenario: Historical material does not substitute for Subject behavior

- **WHEN** case-137 has its setup-only fixture facts, static contract checks,
  or retained diagnostics from case-135 or case-136 but no passing current
  real-Subject native completion
- **THEN** those materials SHALL NOT establish a CDE-003 Agent-behavior
  observation

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
