# Content Delivery Phase Content

> req: CDP-001, CDP-002, CDP-003, CDP-004, CDP-005

## Purpose

Define the complete 9-section phase body content for the three content-delivery lifecycle phases: HITL2 (`phase-hitl2.md`), readiness (`phase-readiness.md`), and final (`phase-final.md`). Each phase SHALL follow the standard phase node structure with correct frontmatter contracts and deterministic boundaries.

## Requirements

### Requirement: Phase HITL2 body completeness

`phase-hitl2.md` SHALL contain a complete 9-section body following the standard phase node structure. The node SHALL declare `phase: hitl2`, `gate: hitl2-recorded`, and `stop: "yes"`. Routing SHALL come from `transitions.chain.json` and the HITL2 gate result rather than a second frontmatter `next` authority.

The phase SHALL produce a decision brief summarizing research findings, open questions, and recommended actions. It SHALL present structured decision options to the user and record the user's structured decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2` before acting on that decision.

The allowed decision enum values SHALL be: `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked`.

The phase SHALL record a `hitl2_recorded` trace event. This event is diagnostic/audit evidence of the Phase Agent's recording action; it SHALL NOT become a second blocking substitute for the profile decision fields or the gate CLI's own `gate_attempt` event.

After gate pass, the Agent SHALL read `user_decision` from `rb_profile.yaml` and act accordingly:

- `proceed_to_readiness`: the gate CLI SHALL use the deterministic `passed` outcome; the Agent SHALL consume `check.next` for `phases/phase-readiness.md` through the accepted handoff path.
- `rerun`: the gate CLI SHALL use the deterministic `rerun` outcome; the Agent SHALL consume `check.next` for `phases/phase-rerun.md` through the accepted handoff path.
- `request_view_revision`: the Agent SHALL use the recorded rationale and current bundle state to determine the affected phase; this context-dependent action SHALL NOT default to readiness or gain a fixed chain entry.
- `repair`: the Agent SHALL use the recorded rationale to repair the current run through existing legal paths and rerun the HITL2 gate; it SHALL NOT restart from instantiation merely because the user chose repair.
- `stop_blocked`: the Agent SHALL terminate the lifecycle through the existing accepted stop behavior and preserve the reason.

`Human-directed` in this phase SHALL identify the source of the semantic decision. It SHALL NOT transfer ordinary command execution to the user or create permission by itself: after the decision is recorded, the Agent executes the remaining mechanical actions allowed by current host permission and accepted Engine paths. The Agent SHALL NOT invent a route, mutate deterministic authority by hand, or claim that the decision itself creates an unavailable override/reentry capability.

`transitions.chain.json` SHALL encode only HITL2 outcomes with fixed, context-independent next nodes: `passed` to `phases/phase-readiness.md` and `rerun` to `phases/phase-rerun.md`. `request_view_revision`, `repair`, and `stop_blocked` remain Agent-level decisions without fixed chain entries.

#### Scenario: HITL2 frontmatter contract

- **WHEN** `phase-hitl2.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-hitl2`, `phase: hitl2`, `gate: hitl2-recorded`, `stop: "yes"`
- **AND** `requires` SHALL include at least `shared/shared-profile`
- **AND** the phase SHALL NOT establish a competing frontmatter routing authority

#### Scenario: HITL2 decision brief production

- **WHEN** Agent executes the HITL2 phase
- **THEN** Agent SHALL produce a decision brief artifact at `artifacts/hitl2/decision-brief.md`
- **AND** the brief SHALL summarize research findings from wave artifacts
- **AND** the brief SHALL present structured decision options to the user

#### Scenario: HITL2 user decision recorded to profile

- **WHEN** user provides a structured decision
- **THEN** Agent SHALL write the decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`
- **AND** the `status` field SHALL be set to `recorded`
- **AND** the `user_decision` field SHALL be one of the five accepted enum values
- **AND** the decision SHALL NOT remain only in chat memory

#### Scenario: HITL2 stop behavior

- **WHEN** Agent reaches the stop point after producing the decision brief
- **THEN** Agent SHALL pause and wait for user input
- **AND** Agent SHALL NOT advance past the gate without the user providing a structured decision

#### Scenario: Human repair decision returns execution to the Agent

- **WHEN** the user chooses `repair` and the decision is recorded
- **THEN** the Agent SHALL perform the remaining legal repair actions described by the rationale
- **AND** it SHALL rerun the HITL2 gate after repair
- **AND** it SHALL NOT instruct the user to become the ordinary command runner
- **AND** it SHALL NOT restart the lifecycle from instantiation solely because repair was selected

#### Scenario: HITL2 rerun follows deterministic rerun handoff

- **WHEN** the user chooses `rerun`, the decision is recorded, and the HITL2 gate passes
- **THEN** the gate result SHALL use the `rerun` outcome
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the Agent SHALL consume that target through the accepted handoff path
- **AND** it SHALL NOT default the decision to readiness

#### Scenario: HITL2 proceed_to_readiness follows chain

- **WHEN** user chooses `proceed_to_readiness` and the HITL2 gate passes
- **THEN** the gate result SHALL use the `passed` outcome
- **AND** `check.next` SHALL be `phases/phase-readiness.md`
- **AND** the Agent SHALL advance through the accepted handoff path

#### Scenario: Context-dependent decisions do not gain fixed handoffs

- **WHEN** the recorded decision is `request_view_revision`, `repair`, or `stop_blocked`
- **THEN** the HITL2 gate SHALL NOT default `check.next` to readiness
- **AND** the Agent SHALL follow the decision-specific accepted behavior without inventing a chain edge

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

Post-final user feedback SHALL NOT be processed by Final or require reloading Final/HITL2 as a duplicate question loop. When the feedback is an explicit rerun request, the accepted post-final recovery operation SHALL persist the decision into the existing HITL2 `rerun` profile semantics and create one audited handoff to `phases/phase-rerun.md`. Unsupported repair/state-seed requests SHALL remain unavailable. Final SHALL NOT contain hidden next, hidden gate, implicit loop or generic override wording.

Delivery completion SHALL be evidenced by the existence of at least one report file under the `final/` directory. Because `phase-final.md` is a terminal node with `gate: none`, there is no gate CLI to write a `final_delivery` trace event, and the charter prohibits hand-writing trace events. Therefore the delivery fact is proven by file existence plus legal readiness→Final entry, not by a `final_delivery` event.

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

- **WHEN** user provides explicit rerun feedback after final delivery
- **THEN** the accepted post-final recovery operation SHALL write the current HITL2 rerun semantics and audited recovery lineage
- **AND** rework SHALL enter the existing `phases/phase-rerun.md` path without re-asking the same decision
- **AND** Final SHALL NOT implement a hidden loop back to earlier phases or claim unsupported generic repair authority

### Requirement: Final delivery is terminal non-interactive delivery and post-final feedback re-enters through HITL2

Content delivery phase docs SHALL distinguish terminal non-interactive Final delivery from interactive in-run decision checkpoints while providing the accepted post-final feedback routing contract.

For this capability:

- HITL1 and HITL2 are the only interactive in-run checkpoints;
- HITL2 remains the structured human decision vocabulary for review, repair, rerun, or stop decisions;
- readiness remains the structural precheck before final delivery;
- Final remains a terminal non-interactive delivery phase with `gate: none`, `next: none`, no hidden next phase, no hidden gate, and no implicit loop;
- final report delivery MAY surface final artifacts after they exist, but SHALL NOT ask the user whether to continue, whether partial output is enough, or whether to repair inside Final; and
- user feedback after final delivery SHALL use the accepted audited post-final recovery operation, which records the new decision as HITL2 `rerun` semantics and creates one legal handoff to the existing rerun phase rather than turning Final into a repair surface.

The post-final operation SHALL NOT require the user to repeat the same rerun decision at a newly loaded HITL2 prompt. After the semantic/risk decision and any host-required non-delegable approval, the Agent SHALL execute inspect/apply/recover, consume the legal rerun handoff and continue the existing canonical rerun pipeline. This is HITL2-mediated decision semantics, not a third checkpoint or Final-owned loop.

The previous Final delivery SHALL remain historical truth: the recovery audit SHALL bind the prior readiness→Final handoff/load, prior HITL2 decision/profile hash, status hash and final inventory digest. C5 SHALL NOT delete or rewrite existing gate attempts, entry witnesses, evidence, receipts, ledger rows or final artifacts to imply that delivery never occurred.

When the user has not requested another output language, Final phase guidance SHALL contain a soft instruction to prefer Chinese for user-facing report narrative and the terminal delivery summary. Internal enum values, file paths, field names, CLI commands, citations, and source titles SHALL retain canonical or source form. The language instruction SHALL NOT add a language detector, make non-Chinese output a deterministic delivery failure, or alter Final authorization and evidence requirements.

The language instruction SHALL NOT create a new Final gate, hidden next edge, post-delivery interaction loop, `final_delivery` trace authority, or chat/log summary that substitutes for legal readiness-to-final handoff and `final/` artifact existence.

This requirement SHALL NOT authorize generic repair, arbitrary state mutation or developer state-seed. Unsupported post-final actions SHALL remain a missing capability rather than being routed through the rerun exception.

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

#### Scenario: Post-final rerun uses audited HITL2 semantics

- **WHEN** user feedback after legal Final delivery explicitly requests a rerun and current host permission allows the operation
- **THEN** the Agent SHALL submit the retained post-final request through the accepted recovery operation
- **AND** the Engine SHALL record HITL2 `rerun` semantics and one lineage-bound handoff to `phases/phase-rerun.md`
- **AND** the user SHALL NOT be asked to run ordinary recovery commands or repeat the same decision at a Final-owned or duplicate HITL2 loop

#### Scenario: Post-final feedback keeps HITL2 routing
> **@deprecated** — The pre-C5 scenario name is retained for archive compatibility. Routing now means recording HITL2 rerun semantics through the audited recovery operation and entering the existing rerun node, not reloading a duplicate HITL2 prompt.

- **WHEN** user feedback arrives after final delivery and requests rerun
- **THEN** docs SHALL route the decision through the accepted post-final recovery operation into the existing HITL2 rerun contract
- **AND** they SHALL NOT add a hidden Final gate, hidden Final next edge, duplicate HITL2 question or Final-owned repair loop

#### Scenario: Unsupported post-final action remains unavailable

- **WHEN** post-final feedback requests arbitrary repair-in-place, status movement, history rewrite or developer state-seed rather than `post_final_rerun`
- **THEN** the framework SHALL report the missing capability/permission boundary
- **AND** SHALL NOT reinterpret the request as a rerun or generic override

#### Scenario: Prior Final lineage remains auditable

- **WHEN** a post-final rerun is accepted
- **THEN** existing Final gate/load/evidence/provenance history SHALL remain unchanged
- **AND** the recovery event SHALL bind the prior delivery lineage and current rerun lineage

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
