# Content Delivery Phase Content

> req: CDP-001, CDP-002, CDP-003, CDP-004, CDP-005

## Purpose

Define the complete 9-section phase body content for the three content-delivery lifecycle phases: HITL2 (`phase-hitl2.md`), readiness (`phase-readiness.md`), and final (`phase-final.md`). Each phase SHALL follow the standard phase node structure with correct frontmatter contracts and deterministic boundaries.

## Requirements

### Requirement: Phase HITL2 body completeness

`phase-hitl2.md` SHALL contain a complete 9-section body following the standard phase node structure. The node SHALL declare `phase: hitl2`, `gate: hitl2-recorded`, `next: readiness`, `stop: "yes"`.

The phase SHALL produce a decision brief summarizing research findings, open questions, and recommended actions. It SHALL present structured decision options to the user and record the user's structured decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`.

The allowed decision enum values SHALL be: `proceed_to_readiness`, `request_view_revision`, `repair_and_rerun`, `stop_blocked`.

The phase SHALL record a `hitl2_recorded` trace event.

After gate pass, the Agent SHALL read `user_decision` from `rb_profile.yaml` and act accordingly:
- `proceed_to_readiness`: Agent SHALL follow the chain's normal next (`readiness`).
- `request_view_revision`: Agent SHALL determine the affected phase and return there for revision.
- `repair_and_rerun`: Agent SHALL restart the lifecycle from instantiation, carrying updated requirements in `rb_profile.yaml`.
- `stop_blocked`: Agent SHALL terminate the lifecycle and record the reason.

`transitions.chain.json` SHALL only encode the `proceed_to_readiness` path (as the deterministic normal next). The other three decisions are Agent-level routing, not encoded in the transition table.

#### Scenario: HITL2 frontmatter contract

- **WHEN** `phase-hitl2.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-hitl2`, `phase: hitl2`, `gate: hitl2-recorded`, `stop: "yes"`
- **AND** `next` SHALL be `readiness`
- **AND** `requires` SHALL include at least `shared/shared-profile`

#### Scenario: HITL2 decision brief production

- **WHEN** Agent executes the HITL2 phase
- **THEN** Agent SHALL produce a decision brief artifact at `artifacts/hitl2/decision-brief.md`
- **AND** the brief SHALL summarize research findings from wave artifacts
- **AND** the brief SHALL present structured decision options to the user

#### Scenario: HITL2 user decision recorded to profile

- **WHEN** user provides structured decision
- **THEN** Agent SHALL write the decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`
- **AND** the `status` field SHALL be set to `recorded`
- **AND** the `user_decision` field SHALL be one of the accepted enum values
- **AND** the decision SHALL NOT remain only in chat memory

#### Scenario: HITL2 stop behavior

- **WHEN** Agent reaches the stop point after producing the decision brief
- **THEN** Agent SHALL pause and wait for user input
- **AND** Agent SHALL NOT advance past the gate without user providing a structured decision

#### Scenario: HITL2 repair_and_rerun restarts lifecycle

- **WHEN** user chooses `repair_and_rerun`
- **AND** gate passes
- **THEN** Agent SHALL restart the lifecycle from instantiation
- **AND** updated requirements SHALL be carried in `rb_profile.yaml`
- **AND** this routing SHALL NOT be encoded in `transitions.chain.json`

#### Scenario: HITL2 proceed_to_readiness follows chain

- **WHEN** user chooses `proceed_to_readiness`
- **AND** gate passes
- **THEN** `resolveNodeTransitionDetailed` SHALL return `kind: 'next'` with `next: 'phases/phase-readiness.md'`
- **AND** Agent SHALL advance to readiness

### Requirement: Phase Readiness body completeness

`phase-readiness.md` SHALL contain a complete 9-section body. The node SHALL declare `phase: readiness`, `gate: readiness-passed`, `next: final`, `stop: "no"`.

The phase SHALL execute a deterministic precheck before final delivery:
- Verify required artifacts are reachable and parseable
- Verify all prior non-terminal gate passage statuses are auditable from trace evidence (the CLI derives the expected prior gate set at runtime from `manifest.json` topology — all phases before readiness with `gate != null`; readiness-passed itself is not counted)
- Verify profile/status/queue/trace cross-file consistency
- Verify final delivery input comes from verified bundle state

The phase SHALL NOT judge semantic quality or writing quality. It SHALL only perform structural, existence, and consistency checks.

#### Scenario: Readiness frontmatter contract

- **WHEN** `phase-readiness.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-readiness`, `phase: readiness`, `gate: readiness-passed`, `stop: "no"`
- **AND** `next` SHALL be `final`

#### Scenario: Readiness artifact reachability check

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL verify required artifacts exist and are parseable
- **AND** required artifacts SHALL include at minimum: `seed_topics/`, `reference/_INDEX.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`

#### Scenario: Readiness gate audit

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL verify all prior non-terminal gate passage statuses are auditable (derived from manifest topology, not a hardcoded count)
- **AND** evidence SHALL come from `rb_trace.jsonl` gate_attempt events with `passed: true`

#### Scenario: Readiness cross-file consistency

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL check profile/status/queue/trace for internal contradictions
- **AND** inconsistencies SHALL be reported in inspect/advice output

#### Scenario: Readiness does not judge quality

- **WHEN** Agent executes the readiness phase
- **THEN** the phase body SHALL NOT instruct semantic quality judgment of synthesis or decision brief content
- **AND** SHALL restrict checks to structural/existence/consistency criteria enforced by the readiness gate

### Requirement: Phase Final body completeness

`phase-final.md` SHALL contain a complete 9-section body. The node SHALL declare `phase: final`, `gate: none`, `next: none`, `stop: "no"`. It SHALL be a terminal node — no outgoing gate, no normal next phase.

The phase SHALL generate final report artifact(s) from verified bundle state. The report SHALL source content from verified wave artifacts and profile, not from chat memory.

Post-final user feedback SHALL enter through HITL2 repair/rerun: feedback written to `rb_profile.yaml` under HITL2/user feedback location, then routed back to the affected phase or repair path. Final SHALL NOT contain hidden next, hidden gate, or implicit loop.

Delivery completion SHALL be evidenced by the existence of at least one report file under the `final/` directory. Because `phase-final.md` is a terminal node with `gate: none`, there is no gate CLI to write a `final_delivery` trace event, and the charter prohibits hand-writing trace events. Therefore the delivery fact is proven by file existence, not by a trace event.

#### Scenario: Final frontmatter contract

- **WHEN** `phase-final.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-final`, `phase: final`, `gate: none`, `next: none`, `stop: "no"`
- **AND** `gate` being `none` SHALL mean no outgoing gate CLI runs after this phase

#### Scenario: Final report generation

- **WHEN** Agent executes the final phase
- **THEN** Agent SHALL generate at least 1 final report artifact in the `final/` directory
- **AND** report content SHALL be sourced from verified bundle state (wave artifacts, profile, status)

#### Scenario: Final terminal semantics

- **WHEN** final phase completes
- **THEN** the lifecycle SHALL have no normal next phase
- **AND** `transitions.chain.json` SHALL NOT contain an entry for `phases/phase-final.md`

#### Scenario: Post-final feedback routing

- **WHEN** user provides feedback after final delivery
- **THEN** feedback SHALL be written to `rb_profile.yaml` under HITL2/user feedback location
- **AND** rework SHALL enter through HITL2 repair/rerun (re-running `phase-hitl2.md`)
- **AND** final SHALL NOT implement a hidden loop back to earlier phases

### Requirement: Final delivery is terminal non-interactive delivery and post-final feedback re-enters through HITL2

Content delivery phase docs SHALL distinguish terminal non-interactive Final delivery from interactive in-run decision checkpoints while preserving the existing post-final feedback routing contract.

For this capability:

- HITL1 and HITL2 are the only interactive in-run checkpoints;
- HITL2 remains the structured in-run human decision checkpoint for review, repair, rerun, or stop decisions;
- readiness remains the structural precheck before final delivery;
- Final remains a terminal non-interactive delivery phase with `gate: none`, `next: none`, no hidden next phase, no hidden gate, and no implicit loop;
- final report delivery MAY surface final artifacts after they exist, but SHALL NOT ask the user whether to continue, whether partial output is enough, or whether to repair inside Final; and
- any user feedback after final delivery SHALL re-enter through the accepted HITL2 feedback / repair / rerun path rather than turning Final into a post-delivery repair surface.

When the user has not requested another output language, Final phase guidance SHALL contain a soft instruction to prefer Chinese for user-facing report narrative and the terminal delivery summary. Internal enum values, file paths, field names, CLI commands, citations, and source titles SHALL retain canonical or source form. The language instruction SHALL NOT add a language detector, make non-Chinese output a deterministic delivery failure, or alter Final authorization and evidence requirements.

The language instruction SHALL NOT create a new Final gate, hidden next edge, post-delivery interaction loop, `final_delivery` trace authority, or chat/log summary that substitutes for legal readiness-to-final handoff and `final/` artifact existence.

This requirement SHALL NOT remove post-final feedback support. It only preserves the boundary that feedback after delivery is a new HITL2-mediated repair/rerun input, not an interactive Final-phase continuation, a third interactive in-run checkpoint, or a mid-pipeline progress checkpoint.

#### Scenario: Final delivery is not a third in-run checkpoint

- **WHEN** `phase-final.md` delivers final report artifacts
- **THEN** the docs SHALL treat that delivery as terminal output after final artifacts exist
- **AND** they SHALL NOT describe Final as a confirmation loop, progress report, or interactive repair checkpoint

#### Scenario: Final narrative prefers Chinese without translating canonical tokens

- **WHEN** `phase-final.md` generates and delivers final artifacts
- **AND** the user has not requested another output language
- **THEN** Agent-facing guidance SHALL instruct the Agent to prefer Chinese for report narrative and the delivery summary
- **AND** citations, source titles, paths, commands, field names, and enum values SHALL remain in canonical or source form
- **AND** language preference SHALL NOT replace legal Final entry or final artifact evidence
- **AND** it SHALL NOT require or imply a `final_delivery` gate/trace event as delivery authority

#### Scenario: Post-final feedback keeps HITL2 routing

- **WHEN** user feedback arrives after final delivery
- **THEN** docs SHALL route the feedback through the accepted HITL2 feedback / repair / rerun mechanism
- **AND** they SHALL NOT add a hidden Final gate, hidden Final next edge, or Final-owned repair loop

### Requirement: Final artifacts SHALL count as delivery evidence only after legal readiness-to-final handoff and final node entry

Final report files under `final/` SHALL count as terminal delivery evidence only when the lifecycle has legally reached `phase-final.md`: readiness has passed with `check.next` targeting `phases/phase-final.md`, `enter-phase` has written a route-bound `load_complete` for Final, and status synchronization reflects the readiness source gate after that load witness.

Files under `final/` created from wave0, wave1, wave2, setup, seed-topics, HITL2, readiness before pass, rerun, or any other non-Final context SHALL be diagnostic evidence only. They SHALL NOT prove delivery, SHALL NOT authorize user-facing final report presentation, and SHALL NOT replace readiness or prior gate checks.

#### Scenario: Legal final delivery uses readiness handoff evidence

- **WHEN** readiness gate passes with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase` writes a route-bound `load_complete` for `phases/phase-final.md`
- **AND** status synchronization records the readiness source gate window
- **AND** the Agent writes `final/report.md` while executing Final
- **THEN** the final report file MAY count as terminal delivery evidence

#### Scenario: Premature final report is phase-boundary violation

- **WHEN** the active authorized phase is wave0, wave1, wave2, or another non-Final phase
- **AND** a file appears under `final/`
- **THEN** inspection, readiness, or phase status audit SHALL report premature terminal output or phase-boundary violation
- **AND** the file SHALL NOT count as terminal delivery evidence

#### Scenario: Final file existence does not bypass readiness

- **WHEN** `final/report.md` exists
- **AND** trace lacks a passed readiness gate and route-bound Final `load_complete`
- **THEN** readiness/final audit SHALL treat the file as non-authoritative
- **AND** it SHALL direct the Agent back to the latest legal phase or repair path
