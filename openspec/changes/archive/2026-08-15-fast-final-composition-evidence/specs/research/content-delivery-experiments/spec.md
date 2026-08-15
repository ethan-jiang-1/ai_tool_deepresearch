> req: CDE-003

## MODIFIED Requirements

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
