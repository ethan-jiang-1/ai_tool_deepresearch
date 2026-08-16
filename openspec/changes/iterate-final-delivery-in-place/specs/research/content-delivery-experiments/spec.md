> req: CDE-003

## RENAMED Requirements

- FROM: `### Requirement: Full delivery chain playbook`
- TO: `### Requirement: Delivery tail and Final refinement playbooks`

## MODIFIED Requirements

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
authenticated native run is authorized for this Change. If it times out,
exceeds that threshold, lacks valid native completion/health, or otherwise
fails, the case SHALL be quarantined with retained diagnostics and `NOT_RUN`;
the selected Agent-flow claim/task SHALL remain incomplete for explicit replan,
and no automatic retry or Agent-behavior PASS claim is allowed. A
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
