> req: CDP-004

## MODIFIED Requirements

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
