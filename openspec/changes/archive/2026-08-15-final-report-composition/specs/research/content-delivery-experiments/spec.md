> req: CDE-001, CDE-002, CDE-003

## ADDED Requirements

### Requirement: HITL2 delivery playbook SHALL cover composition admission

The controlled experiment at
`experiments_playbook/exp_wff_delivery/case-132-standard-hitl2-decision.md`
SHALL verify the current HITL2 Gate contract with the real Gate CLI. It SHALL
establish the direct predecessor facts needed for legal HITL2 entry and SHALL
NOT hand-write the tested HITL2 Gate result.

The case SHALL verify:

- a `proceed_to_readiness` decision passes only with a complete current-round
  composition handoff and explicit delivery view;
- the resulting real `gate_attempt` carries a normalized
  `composition_handoff_receipt` whose projection fingerprint matches the
  accepted profile projection;
- missing/partial/unknown handoff values, `not_started` view, custom without
  instructions, rerun-count mismatch, and values outside the closed contract
  fail with direct diagnostics;
- each non-delivery decision retains its existing Gate behavior without a
  composition blocker or receipt; and
- absence of a separate phase-authored `hitl2_recorded` event does not by itself
  fail the Gate, while the CLI still writes its own `gate_attempt`.

The case is fixture-backed and SHALL prove only the deterministic Gate
contract. It SHALL NOT claim that a real Subject Agent recommended sensible
composition values or interpreted natural language.

#### Scenario: Valid proceed decision emits accepted witness

- **WHEN** the case creates legal HITL2 entry facts and records a complete
  current-round proceed profile
- **THEN** the real Gate CLI SHALL pass and route to Readiness
- **AND** a matching CLI-authored receipt-bearing `gate_attempt` SHALL exist

#### Scenario: Invalid composition facts fail closed

- **WHEN** the case removes or corrupts one required composition fact, uses
  `not_started`, mismatches the round, or leaves custom semantics unresolved
- **THEN** the real Gate CLI SHALL fail
- **AND** inspect/advice SHALL identify the direct profile fact rather than a
  Final fallback

#### Scenario: Non-delivery action does not require a handoff

- **WHEN** the case records one of the four non-delivery decisions without a
  composition handoff
- **THEN** the real Gate SHALL retain its existing pass/routing behavior
- **AND** its trace event SHALL carry no composition receipt

## MODIFIED Requirements

### Requirement: Readiness gate precheck playbook

The Readiness composition witness, restore, refusal, and legacy-migration
boundaries SHALL be verified by the selected JS-led production-CLI assets:
`tests/integration/cli/check-gate-readiness-passed.test.mjs` and
`tests/e2e/rerun-round-continuity.test.mjs`. They SHALL establish legal
HITL2-to-Readiness state through their declared production paths and SHALL NOT
hand-write a tested Readiness result or v1 accepted receipt.

Those assets SHALL verify that complete artifacts, manifest-derived prior Gate
evidence, valid profile/trace, witnessed handoff, and matching composition
fingerprints pass. They SHALL also verify:

- pure composition projection drift fails with exactly the bounded restore
  operation, that operation restores only the accepted projection, and rerunning
  the same Readiness Gate passes;
- unrelated profile drift refuses restore and remains blocked;
- missing, malformed, unsupported-version, or fingerprint-inconsistent receipts
  fail closed; and
- an eligible pre-v1 in-flight predecessor accepts exactly one explicit
  migration witness that establishes only a post-migration context baseline,
  while v1, post-Final, repeated, non-proceed, or current-lifecycle-conflicting
  migration attempts fail without mutation.

`case-135-standard-readiness-precheck.md` SHALL move as
`experiments_playbook/exp_extrem_slow/case-135-extreme-slow-readiness-precheck.md`, SHALL have no active runner-manifest
entry or Change-completion claim, and SHALL remain diagnostic history only. A
playbook with measured native runtime above 120 seconds SHALL follow the same
quarantine rule until a later Change makes it suitable for the active suite.
This deterministic proof SHALL NOT claim a human accepted the migration input
or that Final composition is semantically useful.

#### Scenario: Complete readiness input passes

- **WHEN** all required artifacts, prior gate evidence, parseable profile, valid
  trace, and legal readiness entry exist
- **THEN** the readiness gate SHALL pass
- **AND** its terminal routing result SHALL remain consistent with the current
  transition contract

#### Scenario: Readiness input defects fail directly

- **WHEN** one direct readiness prerequisite is missing or invalid
- **THEN** the gate SHALL fail
- **AND** inspect/advice SHALL name that direct fact rather than relying on a
  hand-written verdict

#### Scenario: Matching accepted projection passes Readiness

- **WHEN** the selected HITL2 receipt matches the current profile projection and
  context and all existing Readiness facts pass
- **THEN** the real Readiness Gate SHALL pass
- **AND** its route SHALL remain the existing Final target

#### Scenario: Pure drift restores and reruns the same checkpoint

- **WHEN** the case mutates only a composition coordinate after HITL2 pass
- **THEN** Readiness SHALL fail with `operate-composition-handoff restore`
- **AND** after that real operation, the same Readiness Gate SHALL pass without
  changing unrelated profile or lifecycle facts

#### Scenario: V1 unrelated drift and unsafe migration do not mutate authority

- **WHEN** the case changes a non-composition profile fact after a v1 receipt or
  attempts migration outside the eligible pre-v1 boundary
- **THEN** the real operation SHALL refuse the write
- **AND** profile, trace, status, artifacts, and prior Gate history SHALL remain
  unchanged

#### Scenario: Legacy migration exposes its evidence start boundary

- **WHEN** an eligible pre-v1 predecessor has no historical profile-context
  fingerprint and migration commits one accepted projection
- **THEN** the case SHALL verify the migration witness uses the committed result
  as its context baseline without claiming predecessor-era equality
- **AND** a later non-composition change SHALL fail Readiness against that new
  baseline

#### Scenario: Slow playbook leaves the active verification route

- **WHEN** a registered playbook's measured native run exceeds 120 seconds
- **THEN** it SHALL move to `exp_extrem_slow/` and leave the active manifest
- **AND** the selected JS-led proof assets SHALL remain the completion route for
  its deterministic contract until a later Change reintroduces a fast playbook

## ADDED Requirements

### Requirement: Full delivery chain playbook SHALL carry the accepted composition contract

The controlled experiment at
`experiments_playbook/exp_wff_delivery/case-131-standard-delivery-full-chain.md`
SHALL verify the delivery tail with real Gate output and witnessed handoffs:

```text
Wave2 passed handoff
  -> HITL2 complete composition handoff + accepted receipt
  -> readiness entry and profile/receipt consistency
  -> readiness gate pass
  -> final terminal entry
```

The case SHALL NOT pre-seed either tested Gate as passed or fabricate the
receipt. It SHALL verify both tested Gate attempts, the route-bound receipt
lineage, and Final's `gate: null`, no-outgoing-transition semantics. It MAY use
fixture-authored profile and verified-state prerequisites and therefore SHALL
prove only the deterministic delivery chain, not real HITL2 recommendation or
report quality.

#### Scenario: Sequential delivery tail carries one accepted contract

- **WHEN** the case drives a valid HITL2 proceed decision and Readiness precheck
- **THEN** HITL2 SHALL emit Readiness with a normalized receipt and Readiness
  SHALL verify the same current profile projection before emitting Final
- **AND** both target entries SHALL use the existing witnessed handoff path

#### Scenario: Final remains terminal

- **WHEN** the case reaches `phase-final.md`
- **THEN** Final SHALL have `gate: null`, no outgoing chain entry, and no
  composition Sub-agent or second terminal node
