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

### Requirement: Delivery tail and Final refinement playbooks

The controlled experiment at
`experiments_playbook/exp_wff_delivery/case-131-standard-delivery-full-chain.md`
SHALL continue to verify the deterministic delivery tail with real Gate output
and witnessed handoffs:

```text
Wave2 passed handoff
  -> HITL2 proceed_to_readiness output
  -> Readiness entry and source-gate status synchronization
  -> Readiness Gate pass
  -> terminal Final entry with no outgoing transition
```

The case SHALL not pre-seed either tested target Gate as passed or fabricate the
composition receipt. It SHALL verify the route-bound receipt lineage, both
tested Gate attempts, legal entries, and Final's `gate: null` / no-transition
semantics. Fixture-authored profile and verified-state prerequisites mean it
proves deterministic delivery-chain behavior only, not real HITL2 interaction,
Final writing, or report quality.

#### Scenario: Sequential delivery tail uses legal handoffs

- **WHEN** case-131 drives valid HITL2 proceed and Readiness precheck
- **THEN** each target SHALL be entered before source-gate status synchronization
- **AND** Readiness SHALL pass through its normal Final handoff

#### Scenario: Final remains terminal

- **WHEN** case-131 reaches `phase-final.md`
- **THEN** Final SHALL have `gate: null`, `stop: "yes"`, and no outgoing transition-table entry

#### Scenario: Sequential delivery tail carries one accepted contract

- **WHEN** case-131 drives a valid accepted composition contract
- **THEN** HITL2 SHALL emit a normalized receipt and Readiness SHALL verify the same current profile projection
- **AND** both entries SHALL use the witnessed handoff path

One new bounded real-Agent case at
`experiments_playbook/exp_wff_delivery/case-138-standard-final-refinement.md`
SHALL observe the Final interaction protocol in one real disposable bundle and
one continuous real Subject session with no network research. A
setup-only fixture MAY establish legal Final entry, one accepted composition
handoff, exactly one minimal verified/submitted-backed finding represented by
one Final Evidence Map row, and an empty primary
Final inventory. It SHALL not create a report, publication result, Subject
prompt/transcript/result, simulated user response, native completion, or
Agent-behavior verdict before the Subject runs.

The Subject interaction SHALL have five bounded supplied turns:

1. first Final entry with no user feedback, requiring immediate publication of
   a compact `final/final.md` and a feedback invitation;
2. clear presentation-only feedback, requiring one unlabelled
   `final/final_v1.md` revision;
3. clear feature-focused presentation feedback, requiring
   `final/final_technical_deep_dive_v2.md`; and
4. an explicit satisfaction response, requiring no new file or state change;
   then a per-turn observer SHALL freeze the inventory/status/profile/trace
   snapshot before any later input; and
5. a later explicit evidence-expanding request on the same Final lineage,
   requiring selection and acceptance of the existing C5 operation without
   publishing another primary report or completing the research rerun.

The retained native transcript/result, canonical inventory, publication
results, status/current node, profile, and trace SHALL establish only these
bounded observations: first delivery preceded the first feedback request; each
clear presentation request caused exactly one new immutable committed version;
global numbering crossed labelled/unlabelled names; all versions independently
passed submitted backing; current node stayed Final; HITL2 handoff/profile and
prior bytes remained unchanged; satisfaction produced no file, Gate, status, or
trace mutation through the frozen turn-4 snapshot; and no post-final rerun
operation was invoked through turn 4. Turn 5 SHALL separately prove that the
Subject selected and accepted C5 without publishing another report or completing
the rerun.

The real-Agent case SHALL use the supported iterative Subject runner, compact
report instructions, per-turn observers, and a hard total Subject-runtime cap
of 120 seconds, the accepted active-suite threshold. Exactly one canonical
authenticated native run is authorized by default for this Change. If it times
out,
exceeds that threshold, lacks valid native completion/health, or otherwise
fails, the case SHALL be quarantined with retained diagnostics and `NOT_RUN`;
the selected Agent-flow claim/task SHALL remain incomplete for explicit replan,
and no automatic retry or Agent-behavior PASS claim is allowed. A
user-confirmed material replan MAY authorize exactly one replacement native run
under the same cap, preserving the first run's diagnostics; that replacement
SHALL not trigger another automatic retry. A
static Markdown test MAY prove fixture shape, prompts, registered routing, and
verdict-boundary declarations; it SHALL not substitute for the native
multi-turn observation.

Neither case-138 nor any deterministic fixture SHALL claim that the report is
actually useful, technically deep, semantically superior, or satisfactory to a
real human. The Engine SHALL not judge those claims. The satisfaction turn
proves only that the Subject obeyed the no-new-mutation protocol after the
fixture-provided user expression; it does not prove genuine human satisfaction.

#### Scenario: First Final turn delivers before asking

- **WHEN** case-138 starts a real Subject at legal Final with empty canonical inventory
- **THEN** retained native evidence SHALL show committed `final/final.md` before the Subject's feedback invitation
- **AND** no pre-delivery user confirmation SHALL be required

#### Scenario: Two feedback turns append two immutable versions

- **WHEN** the Subject receives the two declared presentation-only feedback turns
- **THEN** inventory SHALL add exactly `final/final_v1.md` and `final/final_technical_deep_dive_v2.md`
- **AND** all prior primary bytes SHALL remain unchanged and current node SHALL remain Final

#### Scenario: Satisfaction creates no new runtime fact

- **WHEN** the declared satisfaction turn follows version 2
- **THEN** the turn-4 observer SHALL freeze before/after inventory, status, profile, and trace and show them unchanged before turn 5 begins
- **AND** the observation SHALL not be described as proof of genuine human satisfaction

#### Scenario: Later evidence expansion selects audited rerun on the same lineage

- **WHEN** turn 5 explicitly requires a new source or research conclusion after the frozen satisfaction snapshot
- **THEN** the Subject SHALL not publish a presentation revision for that request
- **AND** it SHALL select and accept the existing post-final rerun owner on the same lineage without inventing a Final transition or completing the rerun

#### Scenario: One bounded native attempt cannot be amplified

- **WHEN** case 138 exceeds 120 seconds, times out, lacks valid native completion/health, or otherwise fails its single authorized native run
- **THEN** retained diagnostics SHALL be quarantined and the result SHALL be `NOT_RUN`
- **AND** no automatic retry, historical-case substitution, or selected Agent-flow completion claim SHALL occur

#### Scenario: User-confirmed replan authorizes one replacement attempt

- **WHEN** the original authorized case-138 run is quarantined `NOT_RUN` and the user explicitly confirms a material replan
- **THEN** exactly one replacement native run MAY execute under the same 120-second cap while retaining the original diagnostics
- **AND** another automatic retry, historical-case substitution, or selected Agent-flow completion claim without a passing replacement remains forbidden

#### Scenario: One authorized run closes with no evidence

- **WHEN** the retained historical case-137 Supervisor result has no native completion, lifecycle `ERROR`, and no health outcome
- **THEN** it SHALL remain diagnostic no-evidence in `exp_extrem_slow/`
- **AND** it SHALL not be retried automatically or count as a case-138 Agent-behavior PASS

#### Scenario: Historical material does not substitute for Subject behavior

- **WHEN** prior case-137 diagnostics, setup fixtures, static contracts, or case-138 prompt text exist without a passing current native multi-turn completion
- **THEN** those materials SHALL not establish the Final-refinement Agent-behavior claim

The historical one-shot case-137 result SHALL remain quarantined at
`experiments_playbook/exp_extrem_slow/case-137-extreme-slow-final-composition.md`
as diagnostic no-evidence. Its earlier timeout SHALL not be relabelled as proof
for case-138, and this Change SHALL not automatically retry it.

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
