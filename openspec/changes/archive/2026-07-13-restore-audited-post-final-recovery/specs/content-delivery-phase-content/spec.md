> req: CDP-003, CDP-004

## MODIFIED Requirements

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
