> req: CDE-003

## MODIFIED Requirements

### Requirement: Delivery tail and Final refinement playbooks

The delivery tail and Final refinement playbooks SHALL remain the observable
contracts for the deterministic delivery tail and the real-Agent iterative
Subject case (case-138), with the following presentation-revision semantics:
a clear presentation-only feedback turn SHALL cause one CAS update of the
current latest primary bytes (version number unchanged, no new primary file
allocated); only an evidence-expanding turn SHALL allocate a new global version
through the audited post-final rerun path.

The Subject interaction SHALL have five bounded supplied turns:

1. first Final entry with no user feedback, requiring immediate publication of
   a compact `final/final.md` and a feedback invitation;
2. clear presentation-only feedback, requiring one CAS update of the current
   latest primary bytes (`final/final.md` base after turn 1, or the latest
   revision) with the version number unchanged;
3. clear feature-focused presentation feedback, requiring another CAS update
   of the current latest primary bytes with the version number unchanged; and
4. an explicit satisfaction response, requiring no new file or state change;
   then a per-turn observer SHALL freeze the inventory/status/profile/trace
   snapshot before any later input; and
5. a later explicit evidence-expanding request on the same Final lineage,
   requiring selection and acceptance of the existing ReopenResearchPass
   operation without publishing another primary report or completing the
   research rerun.

The retained native transcript/result, canonical inventory, publication
results, status/current node, profile, and trace SHALL establish only these
bounded observations: first delivery preceded the first feedback request; each
clear presentation request caused exactly one CAS update of the current latest
primary bytes with the version number unchanged and no new primary file
created; global numbering did not advance across presentation turns; all
versions independently passed submitted backing; current node stayed Final;
HITL2 handoff/profile and prior bytes remained unchanged; satisfaction
produced no file, Gate, status, or trace mutation through the frozen turn-4
snapshot; and no post-final rerun operation was invoked through turn 4. Turn 5
SHALL separately prove that the Subject selected and accepted
ReopenResearchPass without publishing another report or completing the rerun.

The real-Agent case SHALL use the supported iterative Subject runner, compact
report instructions, per-turn observers, and a hard total Subject-runtime cap
of 120 seconds, the accepted active-suite threshold. Exactly one canonical
authenticated native run is authorized by default for this Change. If it times
out, exceeds that threshold, lacks valid native completion/health, or otherwise
fails, the case SHALL be quarantined with retained diagnostics and `NOT_RUN`;
the selected Agent-flow claim/task SHALL remain incomplete for explicit replan,
and no automatic retry or Agent-behavior PASS claim is allowed. A
user-confirmed material replan MAY authorize exactly one replacement native run
under the same cap, preserving the first run's diagnostics; that replacement
SHALL not trigger another automatic retry. A static Markdown test MAY prove
fixture shape, prompts, registered routing, and verdict-boundary declarations;
it SHALL not substitute for the native multi-turn observation.

Neither case-138 nor any deterministic fixture SHALL claim that the report is
actually useful, technically deep, semantically superior, or satisfactory to a
real human. The Engine SHALL not judge those claims. The satisfaction turn
proves only that the Subject obeyed the no-new-mutation protocol after the
fixture-provided user expression; it does not prove genuine human satisfaction.

#### Scenario: Sequential delivery tail uses legal handoffs

- **WHEN** the delivery tail proceeds through readiness-to-Final handoffs
- **THEN** each handoff SHALL use the existing legal admission and prior-inventory witness contract
- **AND** no handoff SHALL bypass the audited post-final rerun path for evidence expansion

#### Scenario: Final remains terminal

- **WHEN** Final presents a committed report and invites feedback
- **THEN** the lifecycle SHALL remain terminal with no Gate, outgoing edge, or new HITL decision enum

#### Scenario: Sequential delivery tail carries one accepted contract

- **WHEN** the delivery tail commits a primary report
- **THEN** it SHALL carry the one accepted composition handoff for that lineage
- **AND** later lineages SHALL NOT rewrite earlier handoffs

#### Scenario: First Final turn delivers before asking

- **WHEN** case-138 starts a real Subject at legal Final with empty canonical inventory
- **THEN** retained native evidence SHALL show committed `final/final.md` before the Subject's feedback invitation
- **AND** no pre-delivery user confirmation SHALL be required

#### Scenario: Two feedback turns append two immutable versions

> **@deprecated name** — Retained as the historical scenario anchor. Presentation turns no longer append versions; they CAS-update the current latest primary bytes with the version number unchanged (see the scenario below).

- **WHEN** the Subject receives the two declared presentation-only feedback turns under the current presentation-revision semantics
- **THEN** inventory SHALL show the same version number after both turns (CAS byte updates of the current latest primary)
- **AND** all prior primary bytes SHALL remain unchanged and current node SHALL remain Final

#### Scenario: Two presentation turns CAS-update the same version

- **WHEN** the Subject receives the two declared presentation-only feedback turns
- **THEN** inventory SHALL show the same version number after both turns (CAS byte updates of the current latest primary, no new primary file allocated)
- **AND** all prior primary bytes SHALL remain unchanged and current node SHALL remain Final

#### Scenario: Satisfaction creates no new runtime fact

- **WHEN** the declared satisfaction turn follows the presentation turns
- **THEN** the turn-4 observer SHALL freeze before/after inventory, status, profile, and trace and show them unchanged before turn 5 begins

#### Scenario: Later evidence expansion selects audited rerun on the same lineage

- **WHEN** turn 5 explicitly requires a new source or research conclusion after the frozen satisfaction snapshot
- **THEN** the Subject SHALL not publish a presentation revision for that request
- **AND** it SHALL select and accept the existing post-final rerun owner on the same lineage without inventing a Final transition or completing the rerun

#### Scenario: One bounded native attempt cannot be amplified

- **WHEN** a native Subject run fails its declared bounds (timeout, threshold, or health)
- **THEN** the case SHALL be quarantined with retained diagnostics and NOT_RUN
- **AND** no automatic retry or Agent-behavior PASS claim SHALL be allowed

#### Scenario: User-confirmed replan authorizes one replacement attempt

- **WHEN** a user explicitly confirms a material replan after a quarantined NOT_RUN
- **THEN** exactly one replacement native run SHALL be authorized under the same cap
- **AND** the first run's diagnostics SHALL be preserved

#### Scenario: One authorized run closes with no evidence

- **WHEN** the single authorized native run completes without valid completion/health
- **THEN** the selected Agent-flow claim SHALL remain incomplete for explicit replan
- **AND** no fabricated PASS claim SHALL be recorded

#### Scenario: Historical material does not substitute for Subject behavior

- **WHEN** a static Markdown fixture claims multi-turn Subject behavior
- **THEN** it SHALL prove only fixture shape, prompts, routing, and verdict-boundary declarations
- **AND** it SHALL NOT substitute for the native multi-turn observation
